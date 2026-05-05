package types

import (
	"fmt"

	"github.com/cosmos/gogoproto/proto"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func init() {
	proto.RegisterType((*MsgUpdateAccessLogParams)(nil), "tamizhi.accesslog.v1.MsgUpdateAccessLogParams")
	proto.RegisterType((*MsgUpdateAccessLogParamsResponse)(nil), "tamizhi.accesslog.v1.MsgUpdateAccessLogParamsResponse")
}

const TypeMsgUpdateAccessLogParams = "update_accesslog_params"

type MsgUpdateAccessLogParams struct {
	Authority string `json:"authority"`
	Params    Params `json:"params"`
}

type MsgUpdateAccessLogParamsResponse struct{}

func NewMsgUpdateAccessLogParams(authority string, params Params) *MsgUpdateAccessLogParams {
	return &MsgUpdateAccessLogParams{Authority: authority, Params: params}
}

func (msg *MsgUpdateAccessLogParams) ValidateBasic() error {
	if msg.Authority == "" {
		return fmt.Errorf("authority cannot be empty")
	}
	return msg.Params.Validate()
}

func (msg *MsgUpdateAccessLogParams) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(msg.Authority)
	return []sdk.AccAddress{addr}
}

// proto.Message interface implementations.
func (m *MsgUpdateAccessLogParams) Reset()         { *m = MsgUpdateAccessLogParams{} }
func (m *MsgUpdateAccessLogParams) String() string { return fmt.Sprintf("%+v", *m) }
func (m *MsgUpdateAccessLogParams) ProtoMessage()  {}

func (m *MsgUpdateAccessLogParamsResponse) Reset()         { *m = MsgUpdateAccessLogParamsResponse{} }
func (m *MsgUpdateAccessLogParamsResponse) String() string { return "MsgUpdateAccessLogParamsResponse{}" }
func (m *MsgUpdateAccessLogParamsResponse) ProtoMessage()  {}
