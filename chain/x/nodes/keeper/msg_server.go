package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"

	"github.com/tamizhi/chain/x/nodes/types"
)

type msgServer struct{ Keeper }

// NewMsgServerImpl returns an implementation of types.MsgServer.
func NewMsgServerImpl(k Keeper) types.MsgServer { return &msgServer{k} }

// RegisterNode validates the message, stakes TMZ, and persists the new node.
func (s *msgServer) RegisterNode(goCtx context.Context, msg *types.MsgRegisterNode) (*types.MsgRegisterNodeResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	node := types.ServiceNode{
		Id:           msg.NodeID,
		OwnerAddress: msg.Creator,
		Endpoint:     msg.Endpoint,
		StakedAmount: msg.Stake,
		RegisteredAt: ctx.BlockTime().Unix(), // Must use block time, not wall clock
	}

	if err := s.Keeper.RegisterNode(ctx, node); err != nil {
		return nil, err
	}

	registered, err := s.Keeper.GetNode(ctx, node.Id)
	if err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeRegisterNode,
		sdk.NewAttribute(types.AttributeKeyNodeID, msg.NodeID),
		sdk.NewAttribute(types.AttributeKeySwarmID, registered.SwarmID),
		sdk.NewAttribute(types.AttributeKeyEndpoint, msg.Endpoint),
	))

	return &types.MsgRegisterNodeResponse{SwarmID: registered.SwarmID}, nil
}

// DeregisterNode validates ownership, returns stake, and removes the node.
func (s *msgServer) DeregisterNode(goCtx context.Context, msg *types.MsgDeregisterNode) (*types.MsgDeregisterNodeResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	if err := s.Keeper.DeregisterNode(ctx, msg.NodeID, msg.Creator); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeDeregisterNode,
		sdk.NewAttribute(types.AttributeKeyNodeID, msg.NodeID),
	))

	return &types.MsgDeregisterNodeResponse{}, nil
}

// UpdateNodeEndpoint changes the public endpoint of a node the caller owns.
func (s *msgServer) UpdateNodeEndpoint(goCtx context.Context, msg *types.MsgUpdateNodeEndpoint) (*types.MsgUpdateNodeEndpointResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	if err := s.Keeper.UpdateNodeEndpoint(ctx, msg.NodeID, msg.Creator, msg.NewEndpoint); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeUpdateNodeEndpoint,
		sdk.NewAttribute(types.AttributeKeyNodeID, msg.NodeID),
		sdk.NewAttribute(types.AttributeKeyEndpoint, msg.NewEndpoint),
	))

	return &types.MsgUpdateNodeEndpointResponse{}, nil
}

// ClaimNodeReward computes and distributes accumulated TMZ rewards to the node owner.
// The reward is calculated as a fixed per-block amount proportional to uptime score.
// In the MVP the reward pool is minted; replace with a proper distribution module later.
func (s *msgServer) ClaimNodeReward(goCtx context.Context, msg *types.MsgClaimNodeReward) (*types.MsgClaimNodeRewardResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	node, err := s.Keeper.GetNode(ctx, msg.NodeID)
	if err != nil {
		return nil, err
	}
	if node.OwnerAddress != msg.Creator {
		return nil, types.ErrNotNodeOwner
	}
	if node.Status == types.NodeStatusJailed {
		return nil, types.ErrNodeJailed
	}

	// Enforce a minimum 1-hour cooldown between reward claims to prevent
	// operators from draining the mint by calling every block.
	const rewardCooldownSecs = int64(3600) // 1 hour
	if node.LastRewardAt > 0 && ctx.BlockTime().Unix()-node.LastRewardAt < rewardCooldownSecs {
		nextClaimAt := node.LastRewardAt + rewardCooldownSecs
		return nil, types.ErrRewardCooldown.Wrapf(
			"last claim was at %d; next claim allowed at %d (now %d)",
			node.LastRewardAt, nextClaimAt, ctx.BlockTime().Unix(),
		)
	}

	// Reward = uptime_score * 1_000 utmz per claim (placeholder formula).
	rewardAmt := int64(node.UptimeScore) * 1_000
	reward := sdk.NewInt64Coin("utmz", rewardAmt)

	if rewardAmt > 0 {
		ownerAddr, _ := sdk.AccAddressFromBech32(msg.Creator)
		if err := s.Keeper.bankKeeper.MintCoins(ctx, types.ModuleName, sdk.NewCoins(reward)); err != nil {
			return nil, err
		}
		if err := s.Keeper.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, ownerAddr, sdk.NewCoins(reward)); err != nil {
			return nil, err
		}
	}

	// Update last reward timestamp.
	node.LastRewardAt = ctx.BlockTime().Unix() // Must use block time, not wall clock
	if err := s.Keeper.setNode(ctx, *node); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeNodeReward,
		sdk.NewAttribute(types.AttributeKeyNodeID, msg.NodeID),
		sdk.NewAttribute(types.AttributeKeyRewardAmt, reward.String()),
	))

	// Convert sdk.Coin to proto Coin for response.
	protoCoin := &types.Coin{
		Denom:  reward.Denom,
		Amount: reward.Amount.String(),
	}
	return &types.MsgClaimNodeRewardResponse{RewardAmount: protoCoin}, nil
}

func (s *msgServer) UpdateParams(ctx context.Context, msg *types.MsgUpdateNodeParams) (*types.MsgUpdateNodeParamsResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	govAddr := authtypes.NewModuleAddress("gov").String()
	if msg.Authority != govAddr {
		return nil, fmt.Errorf("unauthorized: only governance can update params")
	}
	if err := s.Keeper.SetParams(sdkCtx, msg.Params); err != nil {
		return nil, err
	}
	return &types.MsgUpdateNodeParamsResponse{}, nil
}
