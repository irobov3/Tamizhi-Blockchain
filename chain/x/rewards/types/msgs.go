package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var (
	_ sdk.Msg = &MsgIssueReward{}
	_ sdk.Msg = &MsgCreateRewardRule{}
	_ sdk.Msg = &MsgUpdateRewardRule{}
)

func (msg *MsgIssueReward) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority: %s", err)
	}
	if msg.EmployeeID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "employee ID required")
	}
	if msg.RuleID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "rule ID required")
	}
	return nil
}

func (msg *MsgCreateRewardRule) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority: %s", err)
	}
	if msg.Rule.ID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "rule ID required")
	}
	if msg.Rule.Amount.Denom == "" || msg.Rule.Amount.Amount == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "reward amount must have denom and amount")
	}
	return nil
}

func (msg *MsgUpdateRewardRule) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority: %s", err)
	}
	if msg.Rule.ID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "rule ID required")
	}
	return nil
}
