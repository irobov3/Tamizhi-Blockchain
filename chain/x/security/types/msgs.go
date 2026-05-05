package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var (
	_ sdk.Msg = &MsgRaiseThreatFlag{}
	_ sdk.Msg = &MsgResolveThreatFlag{}
	_ sdk.Msg = &MsgLogSecurityEvent{}
	_ sdk.Msg = &MsgBlockAddress{}
	_ sdk.Msg = &MsgUnblockAddress{}
)

func (msg *MsgRaiseThreatFlag) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority: %s", err)
	}
	if msg.EmployeeID == "" && msg.Address == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "employee ID or address required")
	}
	switch msg.Level {
	case ThreatLevelLow, ThreatLevelMedium, ThreatLevelHigh, ThreatLevelCritical:
	default:
		return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "invalid threat level: %s", msg.Level)
	}
	return nil
}

func (msg *MsgResolveThreatFlag) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority: %s", err)
	}
	return nil
}

func (msg *MsgLogSecurityEvent) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority: %s", err)
	}
	if msg.DataHash == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "data hash required")
	}
	return nil
}

func (msg *MsgBlockAddress) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority: %s", err)
	}
	if _, err := sdk.AccAddressFromBech32(msg.Address); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid target address: %s", err)
	}
	return nil
}

func (msg *MsgUnblockAddress) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority: %s", err)
	}
	if _, err := sdk.AccAddressFromBech32(msg.Address); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid target address: %s", err)
	}
	return nil
}
