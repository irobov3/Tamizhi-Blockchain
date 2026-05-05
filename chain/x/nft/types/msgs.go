package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

var (
	_ sdk.Msg = &MsgMintNFT{}
	_ sdk.Msg = &MsgTransferNFT{}
	_ sdk.Msg = &MsgBurnNFT{}
)

// MsgMintNFT mints a new literary NFT.
type MsgMintNFT struct {
	Creator      string      `json:"creator"`
	WorkID       string      `json:"work_id"`
	CollectionID string      `json:"collection_id"`
	Royalty      uint32      `json:"royalty"`      // basis points
	Transferable bool        `json:"transferable"`
	Metadata     NFTMetadata `json:"metadata"`
}

func (m *MsgMintNFT) Reset()        {}
func (m *MsgMintNFT) String() string { return "MsgMintNFT{" + m.WorkID + "}" }
func (m *MsgMintNFT) ProtoMessage()  {}
func (m *MsgMintNFT) ValidateBasic() error {
	if m.Creator == "" {
		return ErrInvalidWorkID.Wrap("creator is required")
	}
	if m.WorkID == "" {
		return ErrInvalidWorkID
	}
	if m.Royalty > 10000 {
		return ErrInvalidRoyalty
	}
	if _, err := sdk.AccAddressFromBech32(m.Creator); err != nil {
		return err
	}
	return nil
}
func (m *MsgMintNFT) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(m.Creator)
	return []sdk.AccAddress{addr}
}

// MsgTransferNFT transfers ownership of an NFT.
type MsgTransferNFT struct {
	TokenID  string `json:"token_id"`
	Owner    string `json:"owner"`
	Receiver string `json:"receiver"`
}

func (m *MsgTransferNFT) Reset()        {}
func (m *MsgTransferNFT) String() string { return "MsgTransferNFT{" + m.TokenID + "}" }
func (m *MsgTransferNFT) ProtoMessage()  {}
func (m *MsgTransferNFT) ValidateBasic() error {
	if m.TokenID == "" {
		return ErrNFTNotFound.Wrap("token_id required")
	}
	if _, err := sdk.AccAddressFromBech32(m.Owner); err != nil {
		return err
	}
	if _, err := sdk.AccAddressFromBech32(m.Receiver); err != nil {
		return err
	}
	return nil
}
func (m *MsgTransferNFT) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(m.Owner)
	return []sdk.AccAddress{addr}
}

// MsgBurnNFT destroys an NFT permanently.
type MsgBurnNFT struct {
	TokenID string `json:"token_id"`
	Owner   string `json:"owner"`
}

func (m *MsgBurnNFT) Reset()        {}
func (m *MsgBurnNFT) String() string { return "MsgBurnNFT{" + m.TokenID + "}" }
func (m *MsgBurnNFT) ProtoMessage()  {}
func (m *MsgBurnNFT) ValidateBasic() error {
	if m.TokenID == "" {
		return ErrNFTNotFound.Wrap("token_id required")
	}
	if _, err := sdk.AccAddressFromBech32(m.Owner); err != nil {
		return err
	}
	return nil
}
func (m *MsgBurnNFT) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(m.Owner)
	return []sdk.AccAddress{addr}
}

// Response types
type MsgMintNFTResponse struct {
	TokenID string `json:"token_id"`
}
type MsgTransferNFTResponse struct{}
type MsgBurnNFTResponse struct{}
