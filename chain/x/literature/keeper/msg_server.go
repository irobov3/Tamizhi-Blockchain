package keeper

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/literature/types"
)

// MsgServer implements the literature module message handlers.
type MsgServer struct {
	Keeper
}

// NewMsgServer creates a new MsgServer.
func NewMsgServer(keeper Keeper) MsgServer {
	return MsgServer{Keeper: keeper}
}

// Ensure MsgServer implements the types.MsgServer interface.
var _ types.MsgServer = MsgServer{}

// SubmitWork handles a MsgSubmitWork and stores a new literary work.
func (m MsgServer) SubmitWork(goCtx context.Context, msg *types.MsgSubmitWork) (*types.MsgSubmitWorkResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	// Build the LiteraryWork from the message fields
	work := types.LiteraryWork{
		Title:               msg.Title,
		TitleTransliterated: msg.TitleTransliterated,
		TitleEnglish:        msg.TitleEnglish,
		Author:              msg.Author,
		Content:             msg.Content,
		Classification:      msg.Classification,
		Rights:              msg.Rights,
		Description:         msg.Description,
		UploadedBy:          msg.Submitter,
	}

	submitted, err := m.Keeper.SubmitWork(ctx, work)
	if err != nil {
		return nil, fmt.Errorf("failed to submit work: %w", err)
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeSubmitWork,
			sdk.NewAttribute(types.AttributeKeyWorkID, submitted.WorkID),
			sdk.NewAttribute(types.AttributeKeySubmitter, msg.Submitter),
			sdk.NewAttribute(types.AttributeKeyIPFSCid, submitted.Content.IPFSCid),
		),
	)

	m.Keeper.Logger().Info(
		"MsgSubmitWork handled",
		"work_id", submitted.WorkID,
		"submitter", msg.Submitter,
		"block_height", ctx.BlockHeight(),
	)

	return &types.MsgSubmitWorkResponse{WorkId: submitted.WorkID}, nil
}

// UpdateArweave handles a MsgUpdateArweave and sets the Arweave TX ID on a work.
func (m MsgServer) UpdateArweave(goCtx context.Context, msg *types.MsgUpdateArweave) (*types.MsgUpdateArweaveResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	if err := m.Keeper.UpdateArweaveTx(ctx, msg.WorkID, msg.Submitter, msg.ArweaveTxID); err != nil {
		return nil, fmt.Errorf("failed to update arweave TX: %w", err)
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeUpdateArweave,
			sdk.NewAttribute(types.AttributeKeyWorkID, msg.WorkID),
			sdk.NewAttribute(types.AttributeKeySubmitter, msg.Submitter),
			sdk.NewAttribute(types.AttributeKeyArweaveTxID, msg.ArweaveTxID),
		),
	)

	m.Keeper.Logger().Info(
		"MsgUpdateArweave handled",
		"work_id", msg.WorkID,
		"arweave_tx_id", msg.ArweaveTxID,
	)

	return &types.MsgUpdateArweaveResponse{}, nil
}

// VerifyWork handles a MsgVerifyWork and marks a work as curator-verified.
func (m MsgServer) VerifyWork(goCtx context.Context, msg *types.MsgVerifyWork) (*types.MsgVerifyWorkResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.ValidateBasic(); err != nil {
		return nil, err
	}

	if err := m.Keeper.VerifyWork(ctx, msg.WorkID, msg.Curator); err != nil {
		return nil, fmt.Errorf("failed to verify work: %w", err)
	}

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeVerifyWork,
			sdk.NewAttribute(types.AttributeKeyWorkID, msg.WorkID),
			sdk.NewAttribute(types.AttributeKeyCurator, msg.Curator),
		),
	)

	m.Keeper.Logger().Info(
		"MsgVerifyWork handled",
		"work_id", msg.WorkID,
		"curator", msg.Curator,
	)

	return &types.MsgVerifyWorkResponse{}, nil
}
