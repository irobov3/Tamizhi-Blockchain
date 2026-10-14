package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/nft/types"
)

// MsgServer implements the types.MsgServer interface for the NFT module.
type MsgServer struct {
	Keeper
}

// NewMsgServerImpl creates a new MsgServer.
func NewMsgServerImpl(k Keeper) MsgServer {
	return MsgServer{Keeper: k}
}

// Compile-time assertion.
var _ types.MsgServer = MsgServer{}

// MintNFT handles a MsgMintNFT and mints a new literary NFT.
func (m MsgServer) MintNFT(goCtx context.Context, msg *types.MsgMintNFT) (*types.MsgMintNFTResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	// Default collection if not provided.
	collectionID := msg.CollectionID
	if collectionID == "" {
		collectionID = types.DefaultCollection
	}

	tokenID := types.MakeTokenID(collectionID, msg.WorkID)

	nft := types.LiteraryNFT{
		TokenID:      tokenID,
		CollectionID: collectionID,
		WorkID:       msg.WorkID,
		Owner:        msg.Creator,
		Creator:      msg.Creator,
		Royalty:      msg.Royalty,
		Transferable: msg.Transferable,
		Metadata:     msg.Metadata,
	}

	if err := m.Keeper.MintNFT(ctx, nft); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			"mint_nft",
			sdk.NewAttribute("token_id", tokenID),
			sdk.NewAttribute("creator", msg.Creator),
			sdk.NewAttribute("work_id", msg.WorkID),
		),
	)

	return &types.MsgMintNFTResponse{TokenID: tokenID}, nil
}

// TransferNFT handles a MsgTransferNFT and transfers NFT ownership.
func (m MsgServer) TransferNFT(goCtx context.Context, msg *types.MsgTransferNFT) (*types.MsgTransferNFTResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	if err := m.Keeper.TransferNFT(ctx, msg.TokenID, msg.Owner, msg.Receiver); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			"transfer_nft",
			sdk.NewAttribute("token_id", msg.TokenID),
			sdk.NewAttribute("from", msg.Owner),
			sdk.NewAttribute("to", msg.Receiver),
		),
	)

	return &types.MsgTransferNFTResponse{}, nil
}

// BurnNFT handles a MsgBurnNFT and destroys an NFT permanently.
func (m MsgServer) BurnNFT(goCtx context.Context, msg *types.MsgBurnNFT) (*types.MsgBurnNFTResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	if err := m.Keeper.BurnNFT(ctx, msg.TokenID, msg.Owner); err != nil {
		return nil, err
	}

	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			"burn_nft",
			sdk.NewAttribute("token_id", msg.TokenID),
			sdk.NewAttribute("owner", msg.Owner),
		),
	)

	return &types.MsgBurnNFTResponse{}, nil
}
