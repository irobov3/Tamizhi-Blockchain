package app

import (
	"fmt"

	signing "cosmossdk.io/x/tx/signing"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
)

// signersFromField returns a signing.GetSignersFunc that extracts a single
// bech32-encoded signer address from the named string field of the given
// proto message via protoreflect. The msg passed in is the v2 proto.Message
// produced by anyutil.Unpack (typically a *dynamicpb.Message backed by the
// gogoproto-registered FileDescriptor).
func signersFromField(fieldName string) signing.GetSignersFunc {
	return func(msg proto.Message) ([][]byte, error) {
		desc := msg.ProtoReflect().Descriptor()
		field := desc.Fields().ByName(protoreflect.Name(fieldName))
		if field == nil {
			return nil, fmt.Errorf("custom-signer: field %q not found in %s", fieldName, desc.FullName())
		}
		addrStr := msg.ProtoReflect().Get(field).String()
		if addrStr == "" {
			return nil, fmt.Errorf("custom-signer: empty %q in %s", fieldName, desc.FullName())
		}
		addr, err := sdk.AccAddressFromBech32(addrStr)
		if err != nil {
			return nil, fmt.Errorf("custom-signer: invalid bech32 in %s.%s: %w", desc.FullName(), fieldName, err)
		}
		return [][]byte{addr.Bytes()}, nil
	}
}

// customGetSigners returns the map of custom signer functions for every
// hand-rolled (non-protoc-gen-go) Msg type in the Tamizhi modules. Cosmos SDK
// v0.50 requires either the `cosmos.msg.v1.signer` proto annotation or a
// custom getter registered here for every Msg routed through the tx pipeline.
func customGetSigners() map[protoreflect.FullName]signing.GetSignersFunc {
	m := map[protoreflect.FullName]signing.GetSignersFunc{}

	// rewards
	m["tamizhi.rewards.v1.MsgIssueReward"] = signersFromField("authority")
	m["tamizhi.rewards.v1.MsgCreateRewardRule"] = signersFromField("authority")
	m["tamizhi.rewards.v1.MsgUpdateRewardRule"] = signersFromField("authority")
	m["tamizhi.rewards.v1.MsgUpdateRewardParams"] = signersFromField("authority")
	m["tamizhi.rewards.v1.MsgUpdateParams"] = signersFromField("authority")

	// nodes (signer field is "creator" except UpdateParams which uses "authority")
	m["tamizhi.nodes.v1.MsgRegisterNode"] = signersFromField("creator")
	m["tamizhi.nodes.v1.MsgDeregisterNode"] = signersFromField("creator")
	m["tamizhi.nodes.v1.MsgUpdateNodeEndpoint"] = signersFromField("creator")
	m["tamizhi.nodes.v1.MsgClaimNodeReward"] = signersFromField("creator")
	m["tamizhi.nodes.v1.MsgUpdateNodeParams"] = signersFromField("authority")
	m["tamizhi.nodes.v1.MsgUpdateParams"] = signersFromField("authority")

	// accesslog
	m["tamizhi.accesslog.v1.MsgLogAccess"] = signersFromField("creator")
	m["tamizhi.accesslog.v1.MsgUpdateAccessLogParams"] = signersFromField("authority")
	m["tamizhi.accesslog.v1.MsgUpdateParams"] = signersFromField("authority")

	// security
	m["tamizhi.security.v1.MsgRaiseThreatFlag"] = signersFromField("authority")
	m["tamizhi.security.v1.MsgResolveThreatFlag"] = signersFromField("authority")
	m["tamizhi.security.v1.MsgLogSecurityEvent"] = signersFromField("authority")
	m["tamizhi.security.v1.MsgBlockAddress"] = signersFromField("authority")
	m["tamizhi.security.v1.MsgUnblockAddress"] = signersFromField("authority")
	m["tamizhi.security.v1.MsgUpdateSecurityParams"] = signersFromField("authority")
	m["tamizhi.security.v1.MsgUpdateParams"] = signersFromField("authority")

	// messaging
	m["tamizhi.messaging.v1.MsgRegisterSessionID"] = signersFromField("wallet_address")
	m["tamizhi.messaging.v1.MsgUpdateSessionID"] = signersFromField("creator")
	m["tamizhi.messaging.v1.MsgCreateGroup"] = signersFromField("creator")
	m["tamizhi.messaging.v1.MsgAddGroupMember"] = signersFromField("creator")
	m["tamizhi.messaging.v1.MsgRemoveGroupMember"] = signersFromField("creator")

	// literature (no FileDescriptor — registered via proto.RegisterType only;
	// the GetSigners path won't be exercised through anyutil for these unless a
	// FileDescriptor is present. Register defensively in case downstream code
	// does call SigningContext.GetSigners on the concrete v1 type.)
	m["tamizhi.literature.MsgSubmitWork"] = signersFromField("submitter")
	m["tamizhi.literature.MsgUpdateArweave"] = signersFromField("submitter")
	m["tamizhi.literature.MsgVerifyWork"] = signersFromField("curator")

	return m
}
