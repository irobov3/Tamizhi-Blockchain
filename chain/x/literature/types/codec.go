package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	proto "github.com/cosmos/gogoproto/proto"
)

// ModuleCdc is the legacy amino codec for the literature module.
var ModuleCdc = codec.NewLegacyAmino()

func init() {
	RegisterLegacyAminoCodec(ModuleCdc)
	proto.RegisterType((*MsgSubmitWork)(nil), "tamizhi.literature.MsgSubmitWork")
	proto.RegisterType((*MsgUpdateArweave)(nil), "tamizhi.literature.MsgUpdateArweave")
	proto.RegisterType((*MsgVerifyWork)(nil), "tamizhi.literature.MsgVerifyWork")
}

// RegisterLegacyAminoCodec registers legacy amino message types.
func RegisterLegacyAminoCodec(cdc *codec.LegacyAmino) {
	cdc.RegisterConcrete(&MsgSubmitWork{}, "literature/SubmitWork", nil)
	cdc.RegisterConcrete(&MsgUpdateArweave{}, "literature/UpdateArweave", nil)
	cdc.RegisterConcrete(&MsgVerifyWork{}, "literature/VerifyWork", nil)
}

// RegisterInterfaces registers the sdk.Msg implementations with the interface registry.
func RegisterInterfaces(registry codectypes.InterfaceRegistry) {
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgSubmitWork{},
		&MsgUpdateArweave{},
		&MsgVerifyWork{},
	)
}
