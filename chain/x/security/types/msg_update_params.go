package types

import (
	"fmt"

	"github.com/cosmos/gogoproto/proto"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func init() {
	proto.RegisterType((*MsgUpdateSecurityParams)(nil), "tamizhi.security.v1.MsgUpdateSecurityParams")
	proto.RegisterType((*MsgUpdateSecurityParamsResponse)(nil), "tamizhi.security.v1.MsgUpdateSecurityParamsResponse")
}

const TypeMsgUpdateSecurityParams = "update_security_params"

type MsgUpdateSecurityParams struct {
	Authority string `json:"authority"`
	Params    Params `json:"params"`
}

type MsgUpdateSecurityParamsResponse struct{}

func NewMsgUpdateSecurityParams(authority string, params Params) *MsgUpdateSecurityParams {
	return &MsgUpdateSecurityParams{Authority: authority, Params: params}
}

func (msg *MsgUpdateSecurityParams) ValidateBasic() error {
	if msg.Authority == "" {
		return fmt.Errorf("authority cannot be empty")
	}
	return msg.Params.Validate()
}

func (msg *MsgUpdateSecurityParams) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(msg.Authority)
	return []sdk.AccAddress{addr}
}

// proto.Message interface implementations.
func (m *MsgUpdateSecurityParams) Reset()         { *m = MsgUpdateSecurityParams{} }
func (m *MsgUpdateSecurityParams) String() string { return fmt.Sprintf("%+v", *m) }
func (m *MsgUpdateSecurityParams) ProtoMessage()  {}

func (m *MsgUpdateSecurityParamsResponse) Reset()         { *m = MsgUpdateSecurityParamsResponse{} }
func (m *MsgUpdateSecurityParamsResponse) String() string { return "MsgUpdateSecurityParamsResponse{}" }
func (m *MsgUpdateSecurityParamsResponse) ProtoMessage()  {}
