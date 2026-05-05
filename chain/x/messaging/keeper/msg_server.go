package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/tamizhi/chain/x/messaging/types"
)

// msgServer implements types.MsgServer by delegating to the Keeper.
type msgServer struct{ Keeper }

var _ types.MsgServer = msgServer{}

// NewMsgServerImpl returns a new MsgServer backed by the given Keeper.
func NewMsgServerImpl(k Keeper) types.MsgServer {
	return &msgServer{Keeper: k}
}

// ---------------------------------------------------------------------------
// RegisterSessionID
// ---------------------------------------------------------------------------

// RegisterSessionID registers a new Session ID for the signing wallet.
// Each wallet may only hold one active Session ID; an error is returned if one
// already exists.
func (m msgServer) RegisterSessionID(goCtx context.Context, msg *types.MsgRegisterSessionID) (*types.MsgRegisterSessionIDResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	sid := types.SessionID{
		WalletAddress: msg.WalletAddress,
		SessionPubKey: msg.SessionPubKey,
		DisplayName:   msg.DisplayName,
	}
	if err := m.Keeper.RegisterSessionID(ctx, sid); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeRegisterSessionID,
		sdk.NewAttribute(types.AttributeKeyWalletAddress, msg.WalletAddress),
		sdk.NewAttribute(types.AttributeKeySessionPubKey, msg.SessionPubKey),
	))
	return &types.MsgRegisterSessionIDResponse{SessionPubKey: msg.SessionPubKey}, nil
}

// ---------------------------------------------------------------------------
// UpdateSessionID
// ---------------------------------------------------------------------------

// UpdateSessionID updates mutable fields (DisplayName, AvatarIPFS) of an existing
// Session ID. The caller must be the wallet that owns the Session ID being updated.
func (m msgServer) UpdateSessionID(goCtx context.Context, msg *types.MsgUpdateSessionID) (*types.MsgUpdateSessionIDResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Ensure the caller owns the Session ID being updated.
	existing := m.Keeper.GetSessionIDByPubKey(ctx, msg.SessionPubKey)
	if existing == nil {
		return nil, types.ErrSessionIDNotFound
	}
	if existing.WalletAddress != msg.Creator {
		return nil, sdkerrors.ErrUnauthorized.Wrap("only the wallet owner can update their Session ID")
	}

	if err := m.Keeper.UpdateSessionID(ctx, msg.SessionPubKey, msg.DisplayName, msg.AvatarIPFS); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeUpdateSessionID,
		sdk.NewAttribute(types.AttributeKeyWalletAddress, msg.Creator),
		sdk.NewAttribute(types.AttributeKeySessionPubKey, msg.SessionPubKey),
	))
	return &types.MsgUpdateSessionIDResponse{}, nil
}

// ---------------------------------------------------------------------------
// CreateGroup
// ---------------------------------------------------------------------------

// CreateGroup creates a new on-chain group conversation. The caller becomes the
// group admin.
func (m msgServer) CreateGroup(goCtx context.Context, msg *types.MsgCreateGroup) (*types.MsgCreateGroupResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	group := types.GroupConversation{
		Name:         msg.Name,
		Description:  msg.Description,
		AdminAddress: msg.Creator,
		Encrypted:    msg.Encrypted,
		Status:       types.GroupStatusActive,
	}

	groupID, err := m.Keeper.CreateGroup(ctx, group)
	if err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeCreateGroup,
		sdk.NewAttribute(types.AttributeKeyGroupID, groupID),
		sdk.NewAttribute(types.AttributeKeyWalletAddress, msg.Creator),
	))
	return &types.MsgCreateGroupResponse{GroupID: groupID}, nil
}

// ---------------------------------------------------------------------------
// AddGroupMember
// ---------------------------------------------------------------------------

// AddGroupMember adds a new member to an existing group. Only the group admin may call this.
func (m msgServer) AddGroupMember(goCtx context.Context, msg *types.MsgAddGroupMember) (*types.MsgAddGroupMemberResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := m.Keeper.AddGroupMember(ctx, msg.GroupID, msg.Creator, msg.MemberSessionPubKey); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeAddGroupMember,
		sdk.NewAttribute(types.AttributeKeyGroupID, msg.GroupID),
		sdk.NewAttribute(types.AttributeKeyMember, msg.MemberSessionPubKey),
	))
	return &types.MsgAddGroupMemberResponse{}, nil
}

// ---------------------------------------------------------------------------
// RemoveGroupMember
// ---------------------------------------------------------------------------

// RemoveGroupMember removes a member from an existing group. Only the group admin may call this.
func (m msgServer) RemoveGroupMember(goCtx context.Context, msg *types.MsgRemoveGroupMember) (*types.MsgRemoveGroupMemberResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := m.Keeper.RemoveGroupMember(ctx, msg.GroupID, msg.Creator, msg.MemberSessionPubKey); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeRemoveGroupMember,
		sdk.NewAttribute(types.AttributeKeyGroupID, msg.GroupID),
		sdk.NewAttribute(types.AttributeKeyMember, msg.MemberSessionPubKey),
	))
	return &types.MsgRemoveGroupMemberResponse{}, nil
}
