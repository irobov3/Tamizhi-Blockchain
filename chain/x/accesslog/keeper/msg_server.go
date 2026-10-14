package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"

	"github.com/tamizhi/chain/x/accesslog/types"
)

type msgServer struct{ Keeper }

func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

func (k msgServer) LogAccess(goCtx context.Context, msg *types.MsgLogAccess) (*types.MsgLogAccessResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Verify the creator is an active employee before logging
	if !k.identityKeeper.IsActiveEmployee(ctx, msg.Creator) {
		return nil, types.ErrNotActiveEmployee
	}

	id, err := k.Keeper.LogAccess(ctx, msg.EmployeeID, msg.FileHash, msg.FileName, msg.Action, msg.IPFSCid)
	if err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeLogAccess,
		sdk.NewAttribute(types.AttributeKeyEmployee, msg.EmployeeID),
		sdk.NewAttribute(types.AttributeKeyFileHash, msg.FileHash),
		sdk.NewAttribute(types.AttributeKeyAction, msg.Action),
	))

	return &types.MsgLogAccessResponse{LogID: id}, nil
}

func (k msgServer) UpdateParams(ctx context.Context, msg *types.MsgUpdateAccessLogParams) (*types.MsgUpdateAccessLogParamsResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	govAddr := authtypes.NewModuleAddress("gov").String()
	if msg.Authority != govAddr {
		return nil, fmt.Errorf("unauthorized: only governance can update params")
	}
	if err := k.Keeper.SetParams(sdkCtx, msg.Params); err != nil {
		return nil, err
	}
	return &types.MsgUpdateAccessLogParamsResponse{}, nil
}
