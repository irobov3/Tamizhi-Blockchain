package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"

	"github.com/tamizhi/chain/x/rewards/types"
)

type msgServer struct{ Keeper }

func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

func (k msgServer) IssueReward(goCtx context.Context, msg *types.MsgIssueReward) (*types.MsgIssueRewardResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Only the governance authority may issue rewards — prevents arbitrary token minting.
	if msg.Authority != k.Authority() {
		return nil, sdkerrors.ErrUnauthorized.Wrapf(
			"only governance authority %s can issue rewards, got %s",
			k.Authority(), msg.Authority,
		)
	}

	id, err := k.Keeper.IssueReward(ctx, msg.EmployeeID, msg.RuleID, msg.Memo)
	if err != nil {
		return nil, err
	}

	rule, _ := k.GetRewardRule(ctx, msg.RuleID)
	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeIssueReward,
		sdk.NewAttribute(types.AttributeKeyRuleID, msg.RuleID),
		sdk.NewAttribute(types.AttributeKeyRecipient, msg.EmployeeID),
		sdk.NewAttribute(types.AttributeKeyRewardAmt, rule.Amount.String()),
	))

	return &types.MsgIssueRewardResponse{RecordID: id}, nil
}

func (k msgServer) CreateRewardRule(goCtx context.Context, msg *types.MsgCreateRewardRule) (*types.MsgCreateRewardRuleResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if msg.Authority != k.Authority() {
		return nil, sdkerrors.ErrUnauthorized.Wrapf("only governance authority can create rules")
	}

	if _, found := k.GetRewardRule(ctx, msg.Rule.ID); found {
		return nil, types.ErrRuleAlreadyExists.Wrapf("rule %s already exists", msg.Rule.ID)
	}

	if err := k.SetRewardRule(ctx, msg.Rule); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeUpdateRule,
		sdk.NewAttribute(types.AttributeKeyRuleID, msg.Rule.ID),
	))

	emitRuleCreated()
	return &types.MsgCreateRewardRuleResponse{}, nil
}

func (k msgServer) UpdateRewardRule(goCtx context.Context, msg *types.MsgUpdateRewardRule) (*types.MsgUpdateRewardRuleResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if msg.Authority != k.Authority() {
		return nil, sdkerrors.ErrUnauthorized.Wrapf("only governance authority can update rules")
	}

	if _, found := k.GetRewardRule(ctx, msg.Rule.ID); !found {
		return nil, types.ErrRuleNotFound
	}

	if err := k.SetRewardRule(ctx, msg.Rule); err != nil {
		return nil, err
	}

	return &types.MsgUpdateRewardRuleResponse{}, nil
}

func (ms msgServer) UpdateParams(ctx context.Context, msg *types.MsgUpdateRewardParams) (*types.MsgUpdateRewardParamsResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	govAddr := authtypes.NewModuleAddress("gov").String()
	if msg.Authority != govAddr {
		return nil, fmt.Errorf("unauthorized: only governance can update params")
	}
	if err := ms.Keeper.SetParams(sdkCtx, msg.Params); err != nil {
		return nil, err
	}
	return &types.MsgUpdateRewardParamsResponse{}, nil
}
