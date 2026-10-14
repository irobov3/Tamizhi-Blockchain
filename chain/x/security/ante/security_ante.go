// Package ante provides the security AnteDecorator that blocks flagged addresses.
package ante

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// SecurityKeeper is the subset of keeper.Keeper needed here.
type SecurityKeeper interface {
	IsBlocked(ctx sdk.Context, address string) (bool, string)
}

// SecurityAnteDecorator rejects transactions from addresses that have been
// blocked by the security module (BLOCK_ACCESS or LOCK_ACCOUNT threat actions).
type SecurityAnteDecorator struct {
	securityKeeper SecurityKeeper
}

func NewSecurityAnteDecorator(sk SecurityKeeper) SecurityAnteDecorator {
	return SecurityAnteDecorator{securityKeeper: sk}
}

func (d SecurityAnteDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	if ctx.BlockHeight() == 0 || simulate {
		return next(ctx, tx, simulate)
	}

	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return next(ctx, tx, simulate)
	}

	feePayerAddr := feeTx.FeePayer()
	if feePayerAddr == nil {
		return next(ctx, tx, simulate)
	}

	addrStr := sdk.AccAddress(feePayerAddr).String()
	blocked, reason := d.securityKeeper.IsBlocked(ctx, addrStr)
	if blocked {
		return ctx, sdkerrors.ErrUnauthorized.Wrapf(
			"address %s is blocked by security module: %s",
			addrStr, reason,
		)
	}

	return next(ctx, tx, simulate)
}
