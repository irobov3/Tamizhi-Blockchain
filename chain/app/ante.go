package app

import (
	"fmt"
	"sync"

	errorsmod "cosmossdk.io/errors"
	sdkmath "cosmossdk.io/math"
	txsigning "cosmossdk.io/x/tx/signing"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
)

// feeBurnKeeper is the minimal interface required by FeeBurnDecorator.
type feeBurnKeeper interface {
	BurnFee(ctx sdk.Context, payer sdk.AccAddress, coins sdk.Coins) error
}

// ErrTooManyRequests is returned when an address exceeds the per-block tx rate limit.
var ErrTooManyRequests = errorsmod.Register("ante", 1, "too many requests")

// SecurityKeeper defines the interface required for blocklist checks.
type SecurityKeeper interface {
	IsBlocked(ctx sdk.Context, address string) (bool, string)
}

// AnteHandlerOptions are the options required for constructing the Tamizhi AnteHandler.
type AnteHandlerOptions struct {
	AccountKeeper   authkeeper.AccountKeeper
	BankKeeper      bankkeeper.Keeper
	FeegrantKeeper  ante.FeegrantKeeper
	SignModeHandler *txsigning.HandlerMap
	SigGasConsumer  ante.SignatureVerificationGasConsumer
	TxFeeChecker    ante.TxFeeChecker
	// SecurityKeeper may be nil; if nil, the blocklist check is skipped.
	SecurityKeeper SecurityKeeper
	// FeeBurnKeeper may be nil; if nil, the fee-burn step is skipped.
	FeeBurnKeeper feeBurnKeeper
}

// -----------------------------------------------------------------------------
// BlocklistDecorator
// -----------------------------------------------------------------------------

// BlocklistDecorator rejects transactions from addresses on the security
// blocklist. If SecurityKeeper is nil the check is skipped, allowing the chain
// to start before the security module is wired up.
type BlocklistDecorator struct {
	keeper SecurityKeeper
}

// NewBlocklistDecorator returns a BlocklistDecorator. keeper may be nil.
func NewBlocklistDecorator(keeper SecurityKeeper) BlocklistDecorator {
	return BlocklistDecorator{keeper: keeper}
}

// AnteHandle implements sdk.AnteDecorator.
func (d BlocklistDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	if d.keeper == nil {
		// Security module not yet wired; allow the tx through.
		return next(ctx, tx, simulate)
	}

	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return next(ctx, tx, simulate)
	}

	payerBytes := feeTx.FeePayer()
	if len(payerBytes) == 0 {
		return next(ctx, tx, simulate)
	}

	addr := sdk.AccAddress(payerBytes).String()
	if blocked, reason := d.keeper.IsBlocked(ctx, addr); blocked {
		emitBlockedTx(addr)
		return ctx, sdkerrors.ErrUnauthorized.Wrapf("address %s is blocked: %s", addr, reason)
	}

	return next(ctx, tx, simulate)
}

// -----------------------------------------------------------------------------
// RateLimitDecorator
// -----------------------------------------------------------------------------

const maxTxsPerAddressPerBlock = 50

// RateLimitDecorator enforces a per-block transaction rate limit per address.
// The internal counter map resets whenever the block height changes.
type RateLimitDecorator struct {
	mu          sync.Mutex
	counts      map[string]int64
	blockHeight int64
}

// NewRateLimitDecorator returns a new RateLimitDecorator.
func NewRateLimitDecorator() *RateLimitDecorator {
	return &RateLimitDecorator{
		counts: make(map[string]int64),
	}
}

// AnteHandle implements sdk.AnteDecorator.
func (d *RateLimitDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	// Simulated transactions are exempt from rate limiting.
	if simulate {
		return next(ctx, tx, simulate)
	}

	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return next(ctx, tx, simulate)
	}

	payerBytes := feeTx.FeePayer()
	if len(payerBytes) == 0 {
		return next(ctx, tx, simulate)
	}

	addr := sdk.AccAddress(payerBytes).String()
	currentHeight := ctx.BlockHeight()

	d.mu.Lock()
	if currentHeight != d.blockHeight {
		// New block — reset all counters.
		d.counts = make(map[string]int64)
		d.blockHeight = currentHeight
	}
	d.counts[addr]++
	count := d.counts[addr]
	d.mu.Unlock()

	if count > maxTxsPerAddressPerBlock {
		emitRateLimited(addr)
		return ctx, ErrTooManyRequests.Wrapf(
			"address %s has exceeded the per-block transaction limit of %d",
			addr, maxTxsPerAddressPerBlock,
		)
	}

	return next(ctx, tx, simulate)
}

// -----------------------------------------------------------------------------
// MinFeeDecorator
// -----------------------------------------------------------------------------

const (
	minFeeDenom  = "utmz"
	minFeeAmount = int64(1000)
)

// MinFeeDecorator enforces a minimum fee of 1000 utmz per transaction.
// Transactions that carry no fee coins at all are considered "free" (e.g. from
// module accounts) and are allowed through unchanged.
type MinFeeDecorator struct{}

// NewMinFeeDecorator returns a MinFeeDecorator.
func NewMinFeeDecorator() MinFeeDecorator {
	return MinFeeDecorator{}
}

// AnteHandle implements sdk.AnteDecorator.
func (d MinFeeDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return next(ctx, tx, simulate)
	}

	fees := feeTx.GetFee()

	// Free tx (no fee coins at all) — skip enforcement.
	if fees.IsZero() {
		return next(ctx, tx, simulate)
	}

	// Ensure the fee contains at least minFeeAmount of minFeeDenom.
	if fees.AmountOf(minFeeDenom).LT(sdkmath.NewInt(minFeeAmount)) {
		emitInsufficientFee()
		return ctx, sdkerrors.ErrInsufficientFee.Wrapf(
			"minimum fee is %d%s, got %s", minFeeAmount, minFeeDenom, fees,
		)
	}

	return next(ctx, tx, simulate)
}

// -----------------------------------------------------------------------------
// FeeBurnDecorator
// -----------------------------------------------------------------------------

// FeeBurnDecorator burns 20% of every transaction fee by delegating to the
// feeburn keeper. If FeeBurnKeeper is nil or the burn fails, the transaction
// is still allowed to proceed (best-effort).
type FeeBurnDecorator struct {
	feeBurnKeeper feeBurnKeeper
}

// NewFeeBurnDecorator returns a FeeBurnDecorator. keeper may be nil.
func NewFeeBurnDecorator(k feeBurnKeeper) FeeBurnDecorator {
	return FeeBurnDecorator{feeBurnKeeper: k}
}

// AnteHandle implements sdk.AnteDecorator.
func (d FeeBurnDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	if d.feeBurnKeeper == nil || simulate {
		return next(ctx, tx, simulate)
	}
	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return next(ctx, tx, simulate)
	}
	fees := feeTx.GetFee()
	if fees.IsZero() {
		return next(ctx, tx, simulate)
	}
	payer := sdk.AccAddress(feeTx.FeePayer())
	// Best-effort: don't fail the tx if burn fails.
	if err := d.feeBurnKeeper.BurnFee(ctx, payer, fees); err != nil {
		ctx.Logger().Error("fee burn failed", "error", err)
	}
	return next(ctx, tx, simulate)
}

// -----------------------------------------------------------------------------
// NewAnteHandler
// -----------------------------------------------------------------------------

// NewAnteHandler creates the AnteHandler for the Tamizhi chain.
func NewAnteHandler(options AnteHandlerOptions) (sdk.AnteHandler, error) {
	if options.BankKeeper == nil {
		return nil, fmt.Errorf("bank keeper is required for AnteHandler")
	}
	if options.SignModeHandler == nil {
		return nil, fmt.Errorf("sign mode handler is required for AnteHandler")
	}

	anteDecorators := []sdk.AnteDecorator{
		ante.NewSetUpContextDecorator(),
		NewBlocklistDecorator(options.SecurityKeeper), // position 1 — after context setup
		NewRateLimitDecorator(),                       // position 2
		NewMinFeeDecorator(),                          // position 3
		NewFeeBurnDecorator(options.FeeBurnKeeper),    // position 4 — burn 20% of fees
		ante.NewExtensionOptionsDecorator(nil),
		ante.NewValidateBasicDecorator(),
		ante.NewTxTimeoutHeightDecorator(),
		ante.NewValidateMemoDecorator(options.AccountKeeper),
		ante.NewConsumeGasForTxSizeDecorator(options.AccountKeeper),
		ante.NewDeductFeeDecorator(
			options.AccountKeeper,
			options.BankKeeper,
			options.FeegrantKeeper,
			options.TxFeeChecker,
		),
		ante.NewSetPubKeyDecorator(options.AccountKeeper),
		ante.NewValidateSigCountDecorator(options.AccountKeeper),
		ante.NewSigGasConsumeDecorator(options.AccountKeeper, options.SigGasConsumer),
		ante.NewSigVerificationDecorator(options.AccountKeeper, options.SignModeHandler),
		ante.NewIncrementSequenceDecorator(options.AccountKeeper),
	}

	return sdk.ChainAnteDecorators(anteDecorators...), nil
}

// FeeCollectorAddress returns the module account address that collects fees.
func FeeCollectorAddress() sdk.AccAddress {
	return authtypes.NewModuleAddress(authtypes.FeeCollectorName)
}
