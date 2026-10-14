package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var (
	_ sdk.Msg = &MsgRegisterNode{}
	_ sdk.Msg = &MsgDeregisterNode{}
	_ sdk.Msg = &MsgUpdateNodeEndpoint{}
	_ sdk.Msg = &MsgClaimNodeReward{}
)

func (m *MsgRegisterNode) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(m.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}
	if m.NodeID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "node ID cannot be empty")
	}
	if m.Endpoint == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "endpoint cannot be empty")
	}
	if m.Stake == nil {
		return ErrInsufficientStake.Wrapf("stake is required")
	}
	return nil
}

func (m *MsgDeregisterNode) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(m.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}
	if m.NodeID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "node ID cannot be empty")
	}
	return nil
}

func (m *MsgUpdateNodeEndpoint) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(m.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}
	if m.NodeID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "node ID cannot be empty")
	}
	if m.NewEndpoint == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "new endpoint cannot be empty")
	}
	return nil
}

func (m *MsgClaimNodeReward) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(m.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}
	if m.NodeID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "node ID cannot be empty")
	}
	return nil
}
