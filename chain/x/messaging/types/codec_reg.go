package types

import (
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// RegisterInterfaces registers msg types with the interface registry.
func RegisterInterfaces(registry codectypes.InterfaceRegistry) {
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgRegisterSessionID{},
		&MsgUpdateSessionID{},
		&MsgCreateGroup{},
		&MsgAddGroupMember{},
		&MsgRemoveGroupMember{},
	)
}
