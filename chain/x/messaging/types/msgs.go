package types

import (
	"encoding/hex"
	"strings"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var (
	_ sdk.Msg = &MsgRegisterSessionID{}
	_ sdk.Msg = &MsgUpdateSessionID{}
	_ sdk.Msg = &MsgCreateGroup{}
	_ sdk.Msg = &MsgAddGroupMember{}
	_ sdk.Msg = &MsgRemoveGroupMember{}
)

func (msg *MsgRegisterSessionID) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.WalletAddress); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid wallet address: %s", err)
	}
	if err := validateSessionPubKey(msg.SessionPubKey); err != nil {
		return err
	}
	if strings.TrimSpace(msg.DisplayName) == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "display name cannot be empty")
	}
	return nil
}

func (msg *MsgUpdateSessionID) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}
	if err := validateSessionPubKey(msg.SessionPubKey); err != nil {
		return err
	}
	if strings.TrimSpace(msg.DisplayName) == "" && strings.TrimSpace(msg.AvatarIPFS) == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "at least one of display_name or avatar_ipfs must be provided")
	}
	return nil
}

func (msg *MsgCreateGroup) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}
	name := strings.TrimSpace(msg.Name)
	if name == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "group name cannot be empty")
	}
	if len(name) > MaxGroupNameLength {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "group name exceeds maximum length of %d", MaxGroupNameLength)
	}
	if len(msg.Description) > MaxGroupDescLength {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "group description exceeds maximum length of %d", MaxGroupDescLength)
	}
	return nil
}

func (msg *MsgAddGroupMember) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}
	if strings.TrimSpace(msg.GroupID) == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "group ID cannot be empty")
	}
	return validateSessionPubKey(msg.MemberSessionPubKey)
}

func (msg *MsgRemoveGroupMember) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}
	if strings.TrimSpace(msg.GroupID) == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "group ID cannot be empty")
	}
	return validateSessionPubKey(msg.MemberSessionPubKey)
}

// validateSessionPubKey checks that the given string is a non-empty, even-length hex string
// representing a 32-byte Ed25519 public key.
func validateSessionPubKey(pk string) error {
	pk = strings.TrimSpace(pk)
	if pk == "" {
		return errorsmod.Wrap(ErrInvalidSessionPubKey, "session public key cannot be empty")
	}
	bz, err := hex.DecodeString(pk)
	if err != nil {
		return errorsmod.Wrapf(ErrInvalidSessionPubKey, "must be hex-encoded: %s", err)
	}
	if len(bz) != 32 {
		return errorsmod.Wrapf(ErrInvalidSessionPubKey, "expected 32 bytes (Ed25519), got %d", len(bz))
	}
	return nil
}
