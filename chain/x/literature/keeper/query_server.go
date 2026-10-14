package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/tamizhi/chain/x/literature/types"
)

// QueryServer implements the gRPC query handlers for the literature module.
type QueryServer struct {
	Keeper
}

// NewQueryServer creates a new QueryServer.
func NewQueryServer(keeper Keeper) QueryServer {
	return QueryServer{Keeper: keeper}
}

// Ensure QueryServer implements the types.QueryServer interface.
var _ types.QueryServer = QueryServer{}

// GetWork returns a single literary work by its ID.
func (q QueryServer) GetWork(goCtx context.Context, req *types.QueryGetWorkRequest) (*types.QueryGetWorkResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request: nil")
	}
	if req.WorkId == "" {
		return nil, status.Error(codes.InvalidArgument, "work ID cannot be empty")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	work, err := q.Keeper.GetWork(ctx, req.WorkId)
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "work not found: %s", err)
	}

	return &types.QueryGetWorkResponse{Work: work}, nil
}

// ListWorks returns a paginated list of all literary works.
func (q QueryServer) ListWorks(goCtx context.Context, req *types.QueryListWorksRequest) (*types.QueryListWorksResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request: nil")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	allWorks, err := q.Keeper.GetAllWorks(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get works: %s", err)
	}

	total := uint64(len(allWorks))

	// Apply offset
	if req.Offset >= total {
		return &types.QueryListWorksResponse{Works: []types.LiteraryWork{}, Total: total}, nil
	}
	allWorks = allWorks[req.Offset:]

	// Apply limit
	if req.Limit > 0 && uint64(len(allWorks)) > req.Limit {
		allWorks = allWorks[:req.Limit]
	}

	return &types.QueryListWorksResponse{Works: allWorks, Total: total}, nil
}

// GetWorksByAuthor returns all works submitted by a given address.
func (q QueryServer) GetWorksByAuthor(goCtx context.Context, req *types.QueryGetWorksByAuthorRequest) (*types.QueryGetWorksByAuthorResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request: nil")
	}
	if req.Author == "" {
		return nil, status.Error(codes.InvalidArgument, "author address cannot be empty")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	works, err := q.Keeper.GetWorksByAuthor(ctx, req.Author)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get works by author: %s", err)
	}

	return &types.QueryGetWorksByAuthorResponse{Works: works}, nil
}

// GetWorkCount returns the total number of literary works on chain.
func (q QueryServer) GetWorkCount(goCtx context.Context, req *types.QueryGetWorkCountRequest) (*types.QueryGetWorkCountResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request: nil")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	count, err := q.Keeper.GetWorkCount(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get work count: %s", err)
	}

	return &types.QueryGetWorkCountResponse{Count: count}, nil
}

// GetWorkByIPFS returns the work associated with a given IPFS CID.
// This is a convenience method not exposed via the standard gRPC interface.
func (q QueryServer) GetWorkByIPFS(goCtx context.Context, ipfsCid string) (*types.QueryGetWorkResponse, error) {
	if ipfsCid == "" {
		return nil, status.Error(codes.InvalidArgument, "IPFS CID cannot be empty")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)

	work, err := q.Keeper.GetWorkByIPFS(ctx, ipfsCid)
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "work not found for IPFS CID %s: %s", ipfsCid, err)
	}

	return &types.QueryGetWorkResponse{Work: work}, nil
}

// Ensure fmt is used.
var _ = fmt.Sprintf
