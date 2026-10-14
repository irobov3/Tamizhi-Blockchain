package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/feeburn/types"
)

// Querier wraps Keeper to implement types.QueryServer.
type Querier struct{ Keeper }

var _ types.QueryServer = Querier{}

// NewQuerier returns a new Querier backed by the given Keeper.
func NewQuerier(k Keeper) Querier { return Querier{k} }

// GetBurnStats returns the cumulative burn statistics.
func (q Querier) GetBurnStats(goCtx context.Context, _ *types.QueryGetBurnStatsRequest) (*types.QueryGetBurnStatsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	stats := q.Keeper.GetBurnStats(ctx)
	return &types.QueryGetBurnStatsResponse{Stats: stats}, nil
}
