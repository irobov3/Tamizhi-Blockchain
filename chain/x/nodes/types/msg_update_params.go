package types

import (
	"fmt"

	"github.com/cosmos/gogoproto/proto"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func init() {
	proto.RegisterType((*MsgUpdateNodeParams)(nil), "tamizhi.nodes.v1.MsgUpdateNodeParams")
	proto.RegisterType((*MsgUpdateNodeParamsResponse)(nil), "tamizhi.nodes.v1.MsgUpdateNodeParamsResponse")
}

const TypeMsgUpdateNodeParams = "update_node_params"

type MsgUpdateNodeParams struct {
	Authority string `json:"authority"`
	Params    Params `json:"params"`
}

type MsgUpdateNodeParamsResponse struct{}

func NewMsgUpdateNodeParams(authority string, params Params) *MsgUpdateNodeParams {
	return &MsgUpdateNodeParams{Authority: authority, Params: params}
}

func (msg *MsgUpdateNodeParams) ValidateBasic() error {
	if msg.Authority == "" {
		return fmt.Errorf("authority cannot be empty")
	}
	return msg.Params.Validate()
}

func (msg *MsgUpdateNodeParams) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(msg.Authority)
	return []sdk.AccAddress{addr}
}

// proto.Message interface implementations.
func (m *MsgUpdateNodeParams) Reset()          { *m = MsgUpdateNodeParams{} }
func (m *MsgUpdateNodeParams) String() string  { return fmt.Sprintf("%+v", *m) }
func (m *MsgUpdateNodeParams) ProtoMessage()   {}

func (m *MsgUpdateNodeParamsResponse) Reset()         { *m = MsgUpdateNodeParamsResponse{} }
func (m *MsgUpdateNodeParamsResponse) String() string { return "MsgUpdateNodeParamsResponse{}" }
func (m *MsgUpdateNodeParamsResponse) ProtoMessage()  {}
