package ibcmiddleware

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	capabilitytypes "github.com/cosmos/ibc-go/modules/capability/types"
	channeltypes "github.com/cosmos/ibc-go/v8/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v8/modules/core/05-port/types"
	ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"
	transfertypes "github.com/cosmos/ibc-go/v8/modules/apps/transfer/types"

	accesslogkeeper "github.com/tamizhi/chain/x/accesslog/keeper"
)

// AccessLogMiddleware wraps the ICS-20 IBCModule and logs incoming IBC transfers
// to the accesslog module.
type AccessLogMiddleware struct {
	app             porttypes.IBCModule
	accesslogKeeper accesslogkeeper.Keeper
}

// NewAccessLogMiddleware constructs a new AccessLogMiddleware.
func NewAccessLogMiddleware(app porttypes.IBCModule, ak accesslogkeeper.Keeper) AccessLogMiddleware {
	return AccessLogMiddleware{app: app, accesslogKeeper: ak}
}

// OnRecvPacket intercepts incoming IBC packets, logs the transfer, then delegates.
func (m AccessLogMiddleware) OnRecvPacket(ctx sdk.Context, packet channeltypes.Packet, relayer sdk.AccAddress) ibcexported.Acknowledgement {
	var data transfertypes.FungibleTokenPacketData
	if err := transfertypes.ModuleCdc.UnmarshalJSON(packet.GetData(), &data); err == nil {
		// Log as access event: receiver is "employeeID", denom+amount is "fileName",
		// raw packet bytes (hex) is "fileHash", action is "ibc_receive", ipfsCid is "".
		_, _ = m.accesslogKeeper.LogAccess(ctx,
			data.Receiver,
			fmt.Sprintf("%x", packet.GetData()),
			fmt.Sprintf("ibc-transfer-%s-%s", data.Denom, data.Amount),
			"ibc_receive",
			"",
		)
	}
	return m.app.OnRecvPacket(ctx, packet, relayer)
}

// OnChanOpenInit delegates to the wrapped IBCModule.
func (m AccessLogMiddleware) OnChanOpenInit(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID string,
	channelID string,
	channelCap *capabilitytypes.Capability,
	counterparty channeltypes.Counterparty,
	version string,
) (string, error) {
	return m.app.OnChanOpenInit(ctx, order, connectionHops, portID, channelID, channelCap, counterparty, version)
}

// OnChanOpenTry delegates to the wrapped IBCModule.
func (m AccessLogMiddleware) OnChanOpenTry(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID,
	channelID string,
	channelCap *capabilitytypes.Capability,
	counterparty channeltypes.Counterparty,
	counterpartyVersion string,
) (version string, err error) {
	return m.app.OnChanOpenTry(ctx, order, connectionHops, portID, channelID, channelCap, counterparty, counterpartyVersion)
}

// OnChanOpenAck delegates to the wrapped IBCModule.
func (m AccessLogMiddleware) OnChanOpenAck(
	ctx sdk.Context,
	portID,
	channelID string,
	counterpartyChannelID string,
	counterpartyVersion string,
) error {
	return m.app.OnChanOpenAck(ctx, portID, channelID, counterpartyChannelID, counterpartyVersion)
}

// OnChanOpenConfirm delegates to the wrapped IBCModule.
func (m AccessLogMiddleware) OnChanOpenConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	return m.app.OnChanOpenConfirm(ctx, portID, channelID)
}

// OnChanCloseInit delegates to the wrapped IBCModule.
func (m AccessLogMiddleware) OnChanCloseInit(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	return m.app.OnChanCloseInit(ctx, portID, channelID)
}

// OnChanCloseConfirm delegates to the wrapped IBCModule.
func (m AccessLogMiddleware) OnChanCloseConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	return m.app.OnChanCloseConfirm(ctx, portID, channelID)
}

// OnAcknowledgementPacket delegates to the wrapped IBCModule.
func (m AccessLogMiddleware) OnAcknowledgementPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	acknowledgement []byte,
	relayer sdk.AccAddress,
) error {
	return m.app.OnAcknowledgementPacket(ctx, packet, acknowledgement, relayer)
}

// OnTimeoutPacket delegates to the wrapped IBCModule.
func (m AccessLogMiddleware) OnTimeoutPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	return m.app.OnTimeoutPacket(ctx, packet, relayer)
}
