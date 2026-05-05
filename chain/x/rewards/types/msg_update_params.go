package types

import (
	"fmt"

	"github.com/cosmos/gogoproto/proto"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func init() {
	proto.RegisterType((*MsgUpdateRewardParams)(nil), "tamizhi.rewards.v1.MsgUpdateRewardParams")
	proto.RegisterType((*MsgUpdateRewardParamsResponse)(nil), "tamizhi.rewards.v1.MsgUpdateRewardParamsResponse")
}

const TypeMsgUpdateRewardParams = "update_reward_params"

type MsgUpdateRewardParams struct {
	Authority string `json:"authority"`
	Params    Params `json:"params"`
}

type MsgUpdateRewardParamsResponse struct{}

func NewMsgUpdateRewardParams(authority string, params Params) *MsgUpdateRewardParams {
	return &MsgUpdateRewardParams{Authority: authority, Params: params}
}

func (m *MsgUpdateRewardParams) String() string { return fmt.Sprintf("%+v", *m) }

func (msg *MsgUpdateRewardParams) ValidateBasic() error {
	if msg.Authority == "" {
		return fmt.Errorf("authority cannot be empty")
	}
	return msg.Params.Validate()
}

func (msg *MsgUpdateRewardParams) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(msg.Authority)
	return []sdk.AccAddress{addr}
}

// proto.Message interface implementations.
func (m *MsgUpdateRewardParams) Reset()         { *m = MsgUpdateRewardParams{} }
func (m *MsgUpdateRewardParams) ProtoMessage()  {}

func (m *MsgUpdateRewardParamsResponse) Reset()         { *m = MsgUpdateRewardParamsResponse{} }
func (m *MsgUpdateRewardParamsResponse) String() string { return "MsgUpdateRewardParamsResponse{}" }
func (m *MsgUpdateRewardParamsResponse) ProtoMessage()  {}
