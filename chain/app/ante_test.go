package app

import (
	"testing"

	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	protov2 "google.golang.org/protobuf/proto"
)

// ---------------------------------------------------------------------------
// mockSecurityKeeper — in-memory SecurityKeeper for tests
// ---------------------------------------------------------------------------

type mockSecurityKeeper struct {
	blocked map[string]string // address -> reason
}

func newMockSecurityKeeper() *mockSecurityKeeper {
	return &mockSecurityKeeper{blocked: make(map[string]string)}
}

func (m *mockSecurityKeeper) Block(addr, reason string) {
	m.blocked[addr] = reason
}

func (m *mockSecurityKeeper) IsBlocked(_ sdk.Context, address string) (bool, string) {
	reason, ok := m.blocked[address]
	return ok, reason
}

// ---------------------------------------------------------------------------
// mockFeeTx — minimal sdk.Tx + sdk.FeeTx implementation
// ---------------------------------------------------------------------------

type mockFeeTx struct {
	feePayerBytes []byte
	fees          sdk.Coins
}

// sdk.Tx interface
func (m *mockFeeTx) GetMsgs() []sdk.Msg                     { return nil }
func (m *mockFeeTx) GetMsgsV2() ([]protov2.Message, error)  { return nil, nil }

// sdk.FeeTx interface
func (m *mockFeeTx) GetGas() uint64            { return 200_000 }
func (m *mockFeeTx) GetFee() sdk.Coins         { return m.fees }
func (m *mockFeeTx) FeePayer() []byte          { return m.feePayerBytes }
func (m *mockFeeTx) FeeGranter() []byte        { return nil }

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// terminalHandler is the no-op chain terminal used in all tests.
func terminalHandler(ctx sdk.Context, _ sdk.Tx, _ bool) (sdk.Context, error) {
	return ctx, nil
}

// newTestContext returns a minimal sdk.Context at the given block height.
func newTestContext(height int64) sdk.Context {
	return sdk.NewContext(nil, cmtproto.Header{Height: height}, false, nil)
}

// newTestAddr builds a deterministic 20-byte AccAddress from a seed byte.
func newTestAddr(seed byte) sdk.AccAddress {
	addr := make([]byte, 20)
	addr[0] = seed
	return sdk.AccAddress(addr)
}

// ---------------------------------------------------------------------------
// BlocklistDecorator tests
// ---------------------------------------------------------------------------

func TestBlocklistDecorator_AllowsNonBlocked(t *testing.T) {
	keeper := newMockSecurityKeeper()
	dec := NewBlocklistDecorator(keeper)
	ctx := newTestContext(1)

	addr := newTestAddr(1)
	tx := &mockFeeTx{feePayerBytes: addr}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err != nil {
		t.Fatalf("expected no error for non-blocked address, got: %v", err)
	}
}

func TestBlocklistDecorator_BlocksBlocklisted(t *testing.T) {
	keeper := newMockSecurityKeeper()
	addr := newTestAddr(2)
	keeper.Block(addr.String(), "sanctions")

	dec := NewBlocklistDecorator(keeper)
	ctx := newTestContext(1)

	tx := &mockFeeTx{feePayerBytes: addr}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err == nil {
		t.Fatal("expected error for blocked address, got nil")
	}
	if !sdkerrors.ErrUnauthorized.Is(err) {
		t.Fatalf("expected ErrUnauthorized, got: %v", err)
	}
}

func TestBlocklistDecorator_NilKeeperSkipsCheck(t *testing.T) {
	dec := NewBlocklistDecorator(nil)
	ctx := newTestContext(1)

	addr := newTestAddr(3)
	tx := &mockFeeTx{feePayerBytes: addr}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err != nil {
		t.Fatalf("nil keeper should skip check, got: %v", err)
	}
}

func TestBlocklistDecorator_NoFeePayerSkipsCheck(t *testing.T) {
	keeper := newMockSecurityKeeper()
	dec := NewBlocklistDecorator(keeper)
	ctx := newTestContext(1)

	// Empty feePayerBytes — check should be skipped.
	tx := &mockFeeTx{feePayerBytes: nil}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err != nil {
		t.Fatalf("empty fee payer should skip check, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// RateLimitDecorator tests
// ---------------------------------------------------------------------------

func TestRateLimitDecorator_AllowsUnderLimit(t *testing.T) {
	dec := NewRateLimitDecorator()
	ctx := newTestContext(10)
	addr := newTestAddr(10)
	tx := &mockFeeTx{
		feePayerBytes: addr,
		fees:          sdk.NewCoins(sdk.NewInt64Coin("utmz", 1000)),
	}

	for i := 0; i < maxTxsPerAddressPerBlock; i++ {
		_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
		if err != nil {
			t.Fatalf("tx %d: expected no error, got: %v", i+1, err)
		}
	}
}

func TestRateLimitDecorator_BlocksOverLimit(t *testing.T) {
	dec := NewRateLimitDecorator()
	ctx := newTestContext(20)
	addr := newTestAddr(20)
	tx := &mockFeeTx{
		feePayerBytes: addr,
		fees:          sdk.NewCoins(sdk.NewInt64Coin("utmz", 1000)),
	}

	// Exhaust the limit.
	for i := 0; i < maxTxsPerAddressPerBlock; i++ {
		if _, err := dec.AnteHandle(ctx, tx, false, terminalHandler); err != nil {
			t.Fatalf("tx %d unexpectedly failed: %v", i+1, err)
		}
	}

	// The 51st tx must be rejected.
	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err == nil {
		t.Fatal("expected rate-limit error on 51st tx, got nil")
	}
	if !ErrTooManyRequests.Is(err) {
		t.Fatalf("expected ErrTooManyRequests, got: %v", err)
	}
}

func TestRateLimitDecorator_ResetsOnNewBlock(t *testing.T) {
	dec := NewRateLimitDecorator()
	addr := newTestAddr(30)
	tx := &mockFeeTx{
		feePayerBytes: addr,
		fees:          sdk.NewCoins(sdk.NewInt64Coin("utmz", 1000)),
	}

	// Fill block 1 to the limit.
	ctx1 := newTestContext(1)
	for i := 0; i < maxTxsPerAddressPerBlock; i++ {
		if _, err := dec.AnteHandle(ctx1, tx, false, terminalHandler); err != nil {
			t.Fatalf("block1 tx %d: %v", i+1, err)
		}
	}

	// First tx in block 2 should be allowed (counter reset).
	ctx2 := newTestContext(2)
	_, err := dec.AnteHandle(ctx2, tx, false, terminalHandler)
	if err != nil {
		t.Fatalf("first tx of new block should be allowed, got: %v", err)
	}
}

func TestRateLimitDecorator_SimulateExempt(t *testing.T) {
	dec := NewRateLimitDecorator()
	ctx := newTestContext(50)
	addr := newTestAddr(50)
	tx := &mockFeeTx{feePayerBytes: addr}

	// Simulate flag exempts from rate limiting — should never error even past limit.
	for i := 0; i < maxTxsPerAddressPerBlock+10; i++ {
		if _, err := dec.AnteHandle(ctx, tx, true, terminalHandler); err != nil {
			t.Fatalf("simulated tx %d should not be rate-limited, got: %v", i+1, err)
		}
	}
}

func TestRateLimitDecorator_IndependentCountsPerAddress(t *testing.T) {
	dec := NewRateLimitDecorator()
	ctx := newTestContext(100)

	addrA := newTestAddr(60)
	addrB := newTestAddr(61)
	txA := &mockFeeTx{feePayerBytes: addrA, fees: sdk.NewCoins(sdk.NewInt64Coin("utmz", 1000))}
	txB := &mockFeeTx{feePayerBytes: addrB, fees: sdk.NewCoins(sdk.NewInt64Coin("utmz", 1000))}

	// Fill addrA to the limit.
	for i := 0; i < maxTxsPerAddressPerBlock; i++ {
		if _, err := dec.AnteHandle(ctx, txA, false, terminalHandler); err != nil {
			t.Fatalf("addrA tx %d: %v", i+1, err)
		}
	}

	// addrB should still be allowed.
	if _, err := dec.AnteHandle(ctx, txB, false, terminalHandler); err != nil {
		t.Fatalf("addrB should not be rate-limited, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// MinFeeDecorator tests
// ---------------------------------------------------------------------------

func TestMinFeeDecorator_AllowsExactMinimum(t *testing.T) {
	dec := NewMinFeeDecorator()
	ctx := newTestContext(1)
	addr := newTestAddr(40)
	tx := &mockFeeTx{
		feePayerBytes: addr,
		fees:          sdk.NewCoins(sdk.NewInt64Coin("utmz", 1000)),
	}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err != nil {
		t.Fatalf("exact minimum fee should be accepted, got: %v", err)
	}
}

func TestMinFeeDecorator_AllowsAboveMinimum(t *testing.T) {
	dec := NewMinFeeDecorator()
	ctx := newTestContext(1)
	addr := newTestAddr(41)
	tx := &mockFeeTx{
		feePayerBytes: addr,
		fees:          sdk.NewCoins(sdk.NewInt64Coin("utmz", 5000)),
	}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err != nil {
		t.Fatalf("fee above minimum should be accepted, got: %v", err)
	}
}

func TestMinFeeDecorator_RejectsBelowMinimum(t *testing.T) {
	dec := NewMinFeeDecorator()
	ctx := newTestContext(1)
	addr := newTestAddr(42)
	tx := &mockFeeTx{
		feePayerBytes: addr,
		fees:          sdk.NewCoins(sdk.NewInt64Coin("utmz", 500)),
	}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err == nil {
		t.Fatal("expected insufficient fee error, got nil")
	}
	if !sdkerrors.ErrInsufficientFee.Is(err) {
		t.Fatalf("expected ErrInsufficientFee, got: %v", err)
	}
}

func TestMinFeeDecorator_AllowsZeroFee(t *testing.T) {
	dec := NewMinFeeDecorator()
	ctx := newTestContext(1)
	addr := newTestAddr(43)
	// Empty coins == free tx (module account path).
	tx := &mockFeeTx{feePayerBytes: addr, fees: sdk.Coins{}}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err != nil {
		t.Fatalf("zero-fee (free) tx should be allowed, got: %v", err)
	}
}

func TestMinFeeDecorator_RejectsWrongDenom(t *testing.T) {
	dec := NewMinFeeDecorator()
	ctx := newTestContext(1)
	addr := newTestAddr(44)
	// Pays in wrong denom — utmz amount is effectively 0.
	tx := &mockFeeTx{
		feePayerBytes: addr,
		fees:          sdk.NewCoins(sdk.NewInt64Coin("uatom", 5000)),
	}

	_, err := dec.AnteHandle(ctx, tx, false, terminalHandler)
	if err == nil {
		t.Fatal("expected insufficient fee error for wrong denom, got nil")
	}
	if !sdkerrors.ErrInsufficientFee.Is(err) {
		t.Fatalf("expected ErrInsufficientFee, got: %v", err)
	}
}
