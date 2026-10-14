package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/tamizhi/chain/x/nft/types"
)

// QueryServer implements the types.QueryServer interface for the NFT module.
type QueryServer struct {
	Keeper
}

// NewQueryServerImpl creates a new QueryServer.
func NewQueryServerImpl(k Keeper) QueryServer {
	return QueryServer{Keeper: k}
}

// Compile-time assertion.
var _ types.QueryServer = QueryServer{}

// GetNFT returns a single NFT by its token ID.
func (q QueryServer) GetNFT(goCtx context.Context, req *types.QueryGetNFTRequest) (*types.QueryGetNFTResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request: nil")
	}
	if req.TokenID == "" {
		return nil, status.Error(codes.InvalidArgument, "token_id cannot be empty")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	nft, err := q.Keeper.GetNFT(ctx, req.TokenID)
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "NFT not found: %s", err)
	}

	return &types.QueryGetNFTResponse{NFT: *nft}, nil
}

// ListNFTsByOwner returns all NFTs owned by a given address.
func (q QueryServer) ListNFTsByOwner(goCtx context.Context, req *types.QueryListNFTsByOwnerRequest) (*types.QueryListNFTsByOwnerResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request: nil")
	}
	if req.Owner == "" {
		return nil, status.Error(codes.InvalidArgument, "owner address cannot be empty")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	nfts := q.Keeper.GetNFTsByOwner(ctx, req.Owner)
	if nfts == nil {
		nfts = []types.LiteraryNFT{}
	}

	return &types.QueryListNFTsByOwnerResponse{NFTs: nfts}, nil
}

// ListNFTsByWork returns all NFTs linked to a given literary work.
func (q QueryServer) ListNFTsByWork(goCtx context.Context, req *types.QueryListNFTsByWorkRequest) (*types.QueryListNFTsByWorkResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request: nil")
	}
	if req.WorkID == "" {
		return nil, status.Error(codes.InvalidArgument, "work_id cannot be empty")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	nfts := q.Keeper.GetNFTsByWork(ctx, req.WorkID)
	if nfts == nil {
		nfts = []types.LiteraryNFT{}
	}

	return &types.QueryListNFTsByWorkResponse{NFTs: nfts}, nil
}
