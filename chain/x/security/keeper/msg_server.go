package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"

	"github.com/tamizhi/chain/x/security/types"
)

type msgServer struct{ Keeper }

func NewMsgServerImpl(k Keeper) types.MsgServer { return &msgServer{k} }

func (k msgServer) RaiseThreatFlag(goCtx context.Context, msg *types.MsgRaiseThreatFlag) (*types.MsgRaiseThreatFlagResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	flag := types.ThreatFlag{
		EmployeeID:  msg.EmployeeID,
		Address:     msg.Address,
		ThreatType:  msg.ThreatType,
		Level:       msg.Level,
		Description: msg.Description,
		Action:      msg.Action,
		Source:      msg.Source,
	}
	id, err := k.Keeper.RaiseThreatFlag(ctx, flag)
	if err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		"raise_threat_flag",
		sdk.NewAttribute("flag_id", fmt.Sprintf("%d", id)),
		sdk.NewAttribute("employee_id", msg.EmployeeID),
		sdk.NewAttribute("level", msg.Level),
		sdk.NewAttribute("action", msg.Action),
	))
	return &types.MsgRaiseThreatFlagResponse{FlagID: id}, nil
}

func (k msgServer) ResolveThreatFlag(goCtx context.Context, msg *types.MsgResolveThreatFlag) (*types.MsgResolveThreatFlagResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := k.Keeper.ResolveThreatFlag(ctx, msg.FlagID, msg.Resolution); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		"resolve_threat_flag",
		sdk.NewAttribute("flag_id", fmt.Sprintf("%d", msg.FlagID)),
		sdk.NewAttribute("resolved_by", msg.Authority),
	))
	return &types.MsgResolveThreatFlagResponse{}, nil
}

func (k msgServer) LogSecurityEvent(goCtx context.Context, msg *types.MsgLogSecurityEvent) (*types.MsgLogSecurityEventResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	event := types.SecurityEvent{
		EmployeeID: msg.EmployeeID,
		Address:    msg.Address,
		EventType:  msg.EventType,
		DataHash:   msg.DataHash,
		DeviceID:   msg.DeviceID,
	}
	id, err := k.Keeper.LogSecurityEvent(ctx, event)
	if err != nil {
		return nil, err
	}
	return &types.MsgLogSecurityEventResponse{EventID: id}, nil
}

func (k msgServer) BlockAddress(goCtx context.Context, msg *types.MsgBlockAddress) (*types.MsgBlockAddressResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Only governance authority or Admin-role holders (checked by identity module via ante) may block
	if msg.Authority != k.Keeper.Authority() {
		return nil, sdkerrors.ErrUnauthorized.Wrap("only governance authority can block addresses")
	}

	if err := k.Keeper.BlockAddress(ctx, msg.Address, msg.Reason); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		"block_address",
		sdk.NewAttribute("address", msg.Address),
		sdk.NewAttribute("reason", msg.Reason),
	))
	return &types.MsgBlockAddressResponse{}, nil
}

func (k msgServer) UnblockAddress(goCtx context.Context, msg *types.MsgUnblockAddress) (*types.MsgUnblockAddressResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if msg.Authority != k.Keeper.Authority() {
		return nil, sdkerrors.ErrUnauthorized.Wrap("only governance authority can unblock addresses")
	}

	if err := k.Keeper.UnblockAddress(ctx, msg.Address); err != nil {
		return nil, err
	}
	return &types.MsgUnblockAddressResponse{}, nil
}

func (k msgServer) UpdateParams(ctx context.Context, msg *types.MsgUpdateSecurityParams) (*types.MsgUpdateSecurityParamsResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	govAddr := authtypes.NewModuleAddress("gov").String()
	if msg.Authority != govAddr {
		return nil, fmt.Errorf("unauthorized: only governance can update params")
	}
	if err := k.Keeper.SetParams(sdkCtx, msg.Params); err != nil {
		return nil, err
	}
	return &types.MsgUpdateSecurityParamsResponse{}, nil
}
