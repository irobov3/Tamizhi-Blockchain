package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var _ sdk.Msg = &MsgLogAccess{}

func NewMsgLogAccess(creator, employeeID, fileHash, fileName, action, ipfsCid string) *MsgLogAccess {
	return &MsgLogAccess{
		Creator:    creator,
		EmployeeID: employeeID,
		FileHash:   fileHash,
		FileName:   fileName,
		Action:     action,
		IPFSCid:    ipfsCid,
	}
}

func (msg *MsgLogAccess) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Creator); err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator: %s", err)
	}
	if msg.EmployeeID == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "employee ID required")
	}
	if msg.FileHash == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "file hash required")
	}
	validActions := map[string]bool{"READ": true, "WRITE": true, "DELETE": true, "SHARE": true}
	if !validActions[msg.Action] {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "action must be READ|WRITE|DELETE|SHARE, got: %s", msg.Action)
	}
	return nil
}
