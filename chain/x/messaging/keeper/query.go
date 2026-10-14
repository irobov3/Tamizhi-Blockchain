package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/messaging/types"
)

// Querier wraps Keeper to implement types.QueryServer without method name conflicts.
type Querier struct{ Keeper }

var _ types.QueryServer = Querier{}

// NewQuerier returns a new Querier backed by the given Keeper.
func NewQuerier(k Keeper) Querier { return Querier{k} }

// ---------------------------------------------------------------------------
// GetSessionID
// ---------------------------------------------------------------------------

// GetSessionID returns the Session ID record for the given wallet address.
func (q Querier) GetSessionID(goCtx context.Context, req *types.QueryGetSessionIDRequest) (*types.QueryGetSessionIDResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	sid := q.Keeper.GetSessionIDByWallet(ctx, req.WalletAddress)
	if sid == nil {
		return nil, fmt.Errorf("%s: wallet address %q", types.ErrSessionIDNotFound, req.WalletAddress)
	}
	return &types.QueryGetSessionIDResponse{SessionId: sid}, nil
}

// ---------------------------------------------------------------------------
// GetSessionIDByPubKey
// ---------------------------------------------------------------------------

// GetSessionIDByPubKey returns the Session ID record for the given Ed25519 pubkey (hex).
func (q Querier) GetSessionIDByPubKey(goCtx context.Context, req *types.QueryGetSessionIDByPubKeyRequest) (*types.QueryGetSessionIDByPubKeyResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	sid := q.Keeper.GetSessionIDByPubKey(ctx, req.PubKey)
	if sid == nil {
		return nil, fmt.Errorf("%s: pubkey %q", types.ErrSessionIDNotFound, req.PubKey)
	}
	return &types.QueryGetSessionIDByPubKeyResponse{SessionId: sid}, nil
}

// ---------------------------------------------------------------------------
// GetGroup
// ---------------------------------------------------------------------------

// GetGroup returns the group conversation with the given group ID.
func (q Querier) GetGroup(goCtx context.Context, req *types.QueryGetGroupRequest) (*types.QueryGetGroupResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	group := q.Keeper.GetGroup(ctx, req.GroupID)
	if group == nil {
		return nil, fmt.Errorf("%s: group ID %q", types.ErrGroupNotFound, req.GroupID)
	}
	return &types.QueryGetGroupResponse{Group: group}, nil
}

// ---------------------------------------------------------------------------
// ListGroupsByMember
// ---------------------------------------------------------------------------

// ListGroupsByMember returns all group conversations that the given Session pubkey belongs to.
func (q Querier) ListGroupsByMember(goCtx context.Context, req *types.QueryListGroupsByMemberRequest) (*types.QueryListGroupsByMemberResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	groups := q.Keeper.GetGroupsByMember(ctx, req.SessionPubKey)
	ptrs := make([]*types.GroupConversation, len(groups))
	for i := range groups {
		g := groups[i]
		ptrs[i] = &g
	}
	return &types.QueryListGroupsByMemberResponse{Groups: ptrs}, nil
}

// ---------------------------------------------------------------------------
// ListActiveNodes (proxy to nodes module)
// ---------------------------------------------------------------------------

// ListActiveNodes proxies to the nodes module and returns active service nodes
// as ServiceNodeRef summaries.
func (q Querier) ListActiveNodes(goCtx context.Context, _ *types.QueryListActiveNodesRequest) (*types.QueryListActiveNodesResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	nodes := q.Keeper.GetActiveNodes(ctx)
	refs := make([]*types.ServiceNodeRef, len(nodes))
	for i, n := range nodes {
		refs[i] = &types.ServiceNodeRef{
			Id:       n.Id,
			SwarmID:  n.SwarmID,
			Endpoint: n.Endpoint,
			Status:   n.Status,
		}
	}
	return &types.QueryListActiveNodesResponse{Nodes: refs}, nil
}
