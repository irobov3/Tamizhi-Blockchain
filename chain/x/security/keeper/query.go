package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/security/types"
)

// Querier wraps Keeper to implement types.QueryServer.
type Querier struct{ Keeper }

var _ types.QueryServer = Querier{}

func NewQuerier(k Keeper) Querier { return Querier{k} }

func (q Querier) GetThreatFlag(goCtx context.Context, req *types.QueryGetThreatFlagRequest) (*types.QueryGetThreatFlagResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	flag, found := q.Keeper.GetThreatFlag(ctx, req.FlagID)
	if !found {
		return nil, fmt.Errorf("threat flag %d not found", req.FlagID)
	}
	return &types.QueryGetThreatFlagResponse{Flag: &flag}, nil
}

func (q Querier) ListActiveThreatFlags(goCtx context.Context, _ *types.QueryListActiveThreatFlagsRequest) (*types.QueryListActiveThreatFlagsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	flags := q.Keeper.GetActiveThreatFlags(ctx)
	ptrs := make([]*types.ThreatFlag, len(flags))
	for i := range flags {
		f := flags[i]
		ptrs[i] = &f
	}
	return &types.QueryListActiveThreatFlagsResponse{Flags: ptrs}, nil
}

func (q Querier) ListThreatFlagsByEmployee(goCtx context.Context, req *types.QueryListThreatFlagsByEmployeeRequest) (*types.QueryListThreatFlagsByEmployeeResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	flags := q.Keeper.GetThreatFlagsByEmployee(ctx, req.EmployeeID)
	ptrs := make([]*types.ThreatFlag, len(flags))
	for i := range flags {
		f := flags[i]
		ptrs[i] = &f
	}
	return &types.QueryListThreatFlagsByEmployeeResponse{Flags: ptrs}, nil
}

func (q Querier) ListSecurityEvents(goCtx context.Context, _ *types.QueryListSecurityEventsRequest) (*types.QueryListSecurityEventsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	events := q.Keeper.GetSecurityEventsByEmployee(ctx, "") // empty string returns all
	ptrs := make([]*types.SecurityEvent, len(events))
	for i := range events {
		e := events[i]
		ptrs[i] = &e
	}
	return &types.QueryListSecurityEventsResponse{Events: ptrs}, nil
}

func (q Querier) IsBlocked(goCtx context.Context, req *types.QueryIsBlockedRequest) (*types.QueryIsBlockedResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	blocked, reason := q.Keeper.IsBlocked(ctx, req.Address)
	return &types.QueryIsBlockedResponse{Blocked: blocked, Reason: reason}, nil
}
