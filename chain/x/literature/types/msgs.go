package types

import (
	"fmt"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// Ensure message types implement sdk.Msg.
var (
	_ sdk.Msg = &MsgSubmitWork{}
	_ sdk.Msg = &MsgUpdateArweave{}
	_ sdk.Msg = &MsgVerifyWork{}
)

const (
	TypeMsgSubmitWork    = "submit_work"
	TypeMsgUpdateArweave = "update_arweave"
	TypeMsgVerifyWork    = "verify_work"
)

// ============================================================
// MsgSubmitWork
// ============================================================

// MsgSubmitWork is the message to submit a new literary work to the chain.
type MsgSubmitWork struct {
	Submitter            string             `protobuf:"bytes,1,opt,name=submitter,proto3" json:"submitter"`
	Title                string             `protobuf:"bytes,2,opt,name=title,proto3" json:"title"`
	TitleTransliterated  string             `protobuf:"bytes,3,opt,name=title_transliterated,json=titleTransliterated,proto3" json:"title_transliterated"`
	TitleEnglish         string             `protobuf:"bytes,4,opt,name=title_english,json=titleEnglish,proto3" json:"title_english,omitempty"`
	Author               WorkAuthor         `protobuf:"bytes,5,opt,name=author,proto3" json:"author"`
	Content              WorkContent        `protobuf:"bytes,6,opt,name=content,proto3" json:"content"`
	Classification       WorkClassification `protobuf:"bytes,7,opt,name=classification,proto3" json:"classification"`
	Rights               WorkRights         `protobuf:"bytes,8,opt,name=rights,proto3" json:"rights"`
	Description          string             `protobuf:"bytes,9,opt,name=description,proto3" json:"description,omitempty"`
}

// Implement proto.Message interface (required by sdk.Msg in Cosmos SDK v0.50).
func (msg *MsgSubmitWork) Reset()         {}
func (msg *MsgSubmitWork) String() string  { return msg.Title }
func (msg *MsgSubmitWork) ProtoMessage()   {}
func (*MsgSubmitWork) Descriptor() ([]byte, []int) { return []byte{}, []int{0} }

// NewMsgSubmitWork creates a new MsgSubmitWork.
func NewMsgSubmitWork(
	submitter string,
	title string,
	titleTransliterated string,
	author WorkAuthor,
	content WorkContent,
	classification WorkClassification,
	rights WorkRights,
	description string,
) *MsgSubmitWork {
	return &MsgSubmitWork{
		Submitter:           submitter,
		Title:               title,
		TitleTransliterated: titleTransliterated,
		Author:              author,
		Content:             content,
		Classification:      classification,
		Rights:              rights,
		Description:         description,
	}
}

// Route returns the router key.
func (msg *MsgSubmitWork) Route() string { return RouterKey }

// Type returns the message type string.
func (msg *MsgSubmitWork) Type() string { return TypeMsgSubmitWork }

// ValidateBasic performs stateless validation.
func (msg *MsgSubmitWork) ValidateBasic() error {
	if strings.TrimSpace(msg.Submitter) == "" {
		return sdkerrors.ErrInvalidAddress.Wrap("submitter address cannot be empty")
	}
	if _, err := sdk.AccAddressFromBech32(msg.Submitter); err != nil {
		return sdkerrors.ErrInvalidAddress.Wrapf("invalid submitter address: %s", err)
	}
	if strings.TrimSpace(msg.Title) == "" {
		return ErrInvalidWork.Wrap("title cannot be empty")
	}
	if len(msg.Title) > MaxTitleLength {
		return ErrInvalidWork.Wrapf("title length %d exceeds maximum %d", len(msg.Title), MaxTitleLength)
	}
	if strings.TrimSpace(msg.TitleTransliterated) == "" {
		return ErrInvalidWork.Wrap("transliterated title cannot be empty")
	}
	if err := msg.Author.Validate(); err != nil {
		return ErrInvalidWork.Wrapf("invalid author: %s", err)
	}
	if err := msg.Content.Validate(); err != nil {
		return ErrInvalidWork.Wrapf("invalid content: %s", err)
	}
	if err := msg.Classification.Validate(); err != nil {
		return ErrInvalidWork.Wrapf("invalid classification: %s", err)
	}
	if err := msg.Rights.Validate(); err != nil {
		return ErrInvalidWork.Wrapf("invalid rights: %s", err)
	}
	return nil
}

// GetSigners returns the expected signers.
func (msg *MsgSubmitWork) GetSigners() []sdk.AccAddress {
	submitter, err := sdk.AccAddressFromBech32(msg.Submitter)
	if err != nil {
		panic(fmt.Sprintf("invalid submitter address: %s", err))
	}
	return []sdk.AccAddress{submitter}
}

// GetSignBytes returns the bytes to sign.
func (msg *MsgSubmitWork) GetSignBytes() []byte {
	bz, err := ModuleCdc.MarshalJSON(msg)
	if err != nil {
		panic(err)
	}
	return sdk.MustSortJSON(bz)
}

// ============================================================
// MsgUpdateArweave
// ============================================================

// MsgUpdateArweave updates the Arweave transaction ID for an existing work.
type MsgUpdateArweave struct {
	Submitter   string `protobuf:"bytes,1,opt,name=submitter,proto3" json:"submitter"`
	WorkID      string `protobuf:"bytes,2,opt,name=work_id,json=workId,proto3" json:"work_id"`
	ArweaveTxID string `protobuf:"bytes,3,opt,name=arweave_tx_id,json=arweaveTxId,proto3" json:"arweave_tx_id"`
}

// Implement proto.Message interface.
func (msg *MsgUpdateArweave) Reset()         {}
func (msg *MsgUpdateArweave) String() string  { return msg.WorkID }
func (msg *MsgUpdateArweave) ProtoMessage()   {}
func (*MsgUpdateArweave) Descriptor() ([]byte, []int) { return []byte{}, []int{0} }

// NewMsgUpdateArweave creates a new MsgUpdateArweave.
func NewMsgUpdateArweave(submitter, workID, arweaveTxID string) *MsgUpdateArweave {
	return &MsgUpdateArweave{
		Submitter:   submitter,
		WorkID:      workID,
		ArweaveTxID: arweaveTxID,
	}
}

// Route returns the router key.
func (msg *MsgUpdateArweave) Route() string { return RouterKey }

// Type returns the message type string.
func (msg *MsgUpdateArweave) Type() string { return TypeMsgUpdateArweave }

// ValidateBasic performs stateless validation.
func (msg *MsgUpdateArweave) ValidateBasic() error {
	if strings.TrimSpace(msg.Submitter) == "" {
		return sdkerrors.ErrInvalidAddress.Wrap("submitter address cannot be empty")
	}
	if _, err := sdk.AccAddressFromBech32(msg.Submitter); err != nil {
		return sdkerrors.ErrInvalidAddress.Wrapf("invalid submitter address: %s", err)
	}
	if strings.TrimSpace(msg.WorkID) == "" {
		return ErrInvalidWork.Wrap("work ID cannot be empty")
	}
	if strings.TrimSpace(msg.ArweaveTxID) == "" {
		return ErrInvalidWork.Wrap("arweave TX ID cannot be empty")
	}
	if len(msg.ArweaveTxID) > MaxArweaveTxIDLength {
		return ErrInvalidWork.Wrapf("arweave TX ID length %d exceeds maximum %d", len(msg.ArweaveTxID), MaxArweaveTxIDLength)
	}
	return nil
}

// GetSigners returns the expected signers.
func (msg *MsgUpdateArweave) GetSigners() []sdk.AccAddress {
	submitter, err := sdk.AccAddressFromBech32(msg.Submitter)
	if err != nil {
		panic(fmt.Sprintf("invalid submitter address: %s", err))
	}
	return []sdk.AccAddress{submitter}
}

// GetSignBytes returns the bytes to sign.
func (msg *MsgUpdateArweave) GetSignBytes() []byte {
	bz, err := ModuleCdc.MarshalJSON(msg)
	if err != nil {
		panic(err)
	}
	return sdk.MustSortJSON(bz)
}

// ============================================================
// MsgVerifyWork
// ============================================================

// MsgVerifyWork marks a work as verified by an authorized curator.
type MsgVerifyWork struct {
	Curator string `protobuf:"bytes,1,opt,name=curator,proto3" json:"curator"`
	WorkID  string `protobuf:"bytes,2,opt,name=work_id,json=workId,proto3" json:"work_id"`
	Notes   string `protobuf:"bytes,3,opt,name=notes,proto3" json:"notes,omitempty"`
}

// Implement proto.Message interface.
func (msg *MsgVerifyWork) Reset()         {}
func (msg *MsgVerifyWork) String() string  { return msg.WorkID }
func (msg *MsgVerifyWork) ProtoMessage()   {}
func (*MsgVerifyWork) Descriptor() ([]byte, []int) { return []byte{}, []int{0} }

// NewMsgVerifyWork creates a new MsgVerifyWork.
func NewMsgVerifyWork(curator, workID, notes string) *MsgVerifyWork {
	return &MsgVerifyWork{
		Curator: curator,
		WorkID:  workID,
		Notes:   notes,
	}
}

// Route returns the router key.
func (msg *MsgVerifyWork) Route() string { return RouterKey }

// Type returns the message type string.
func (msg *MsgVerifyWork) Type() string { return TypeMsgVerifyWork }

// ValidateBasic performs stateless validation.
func (msg *MsgVerifyWork) ValidateBasic() error {
	if strings.TrimSpace(msg.Curator) == "" {
		return sdkerrors.ErrInvalidAddress.Wrap("curator address cannot be empty")
	}
	if _, err := sdk.AccAddressFromBech32(msg.Curator); err != nil {
		return sdkerrors.ErrInvalidAddress.Wrapf("invalid curator address: %s", err)
	}
	if strings.TrimSpace(msg.WorkID) == "" {
		return ErrInvalidWork.Wrap("work ID cannot be empty")
	}
	return nil
}

// GetSigners returns the expected signers.
func (msg *MsgVerifyWork) GetSigners() []sdk.AccAddress {
	curator, err := sdk.AccAddressFromBech32(msg.Curator)
	if err != nil {
		panic(fmt.Sprintf("invalid curator address: %s", err))
	}
	return []sdk.AccAddress{curator}
}

// GetSignBytes returns the bytes to sign.
func (msg *MsgVerifyWork) GetSignBytes() []byte {
	bz, err := ModuleCdc.MarshalJSON(msg)
	if err != nil {
		panic(err)
	}
	return sdk.MustSortJSON(bz)
}
