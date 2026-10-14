package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/accesslog/types"
)

// Querier wraps Keeper to implement types.QueryServer without name conflicts.
type Querier struct{ Keeper }

var _ types.QueryServer = Querier{}

func NewQuerier(k Keeper) Querier { return Querier{k} }

func (q Querier) GetLog(goCtx context.Context, req *types.QueryGetLogRequest) (*types.QueryGetLogResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	entry, found := q.Keeper.GetLogByID(ctx, req.Id)
	if !found {
		return nil, fmt.Errorf("log entry %d not found", req.Id)
	}
	return &types.QueryGetLogResponse{Entry: &entry}, nil
}

func (q Querier) GetLogsByEmployee(goCtx context.Context, req *types.QueryGetLogsByEmployeeRequest) (*types.QueryGetLogsByEmployeeResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	entries := q.Keeper.GetLogsByEmployee(ctx, req.EmployeeID)
	ptrs := make([]*types.AccessLogEntry, len(entries))
	for i := range entries {
		e := entries[i]
		ptrs[i] = &e
	}
	return &types.QueryGetLogsByEmployeeResponse{Entries: ptrs}, nil
}

func (q Querier) ListLogs(goCtx context.Context, _ *types.QueryListLogsRequest) (*types.QueryListLogsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	entries := q.Keeper.GetAllLogs(ctx)
	ptrs := make([]*types.AccessLogEntry, len(entries))
	for i := range entries {
		e := entries[i]
		ptrs[i] = &e
	}
	return &types.QueryListLogsResponse{Entries: ptrs}, nil
}
