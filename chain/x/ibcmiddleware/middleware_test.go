package ibcmiddleware_test

import (
	"encoding/json"
	"testing"
	"time"

	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	"cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"

	capabilitytypes "github.com/cosmos/ibc-go/modules/capability/types"
	channeltypes "github.com/cosmos/ibc-go/v8/modules/core/04-channel/types"
	ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"
	transfertypes "github.com/cosmos/ibc-go/v8/modules/apps/transfer/types"

	accesslogkeeper "github.com/tamizhi/chain/x/accesslog/keeper"
	accesslogtypes "github.com/tamizhi/chain/x/accesslog/types"
	identitykeeper "github.com/tamizhi/chain/x/identity/keeper"

	"github.com/tamizhi/chain/x/ibcmiddleware"
)

// ── helpers ──────────────────────────────────────────────────────────────────

func newTestContext(storeKey *storetypes.KVStoreKey) sdk.Context {
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		panic(err)
	}
	return sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
}

func newTestAccesslogKeeper(t *testing.T) (accesslogkeeper.Keeper, sdk.Context) {
	t.Helper()
	storeKey := storetypes.NewKVStoreKey(accesslogtypes.StoreKey)
	ctx := newTestContext(storeKey)
	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	k := accesslogkeeper.NewKeeper(cdc, runtime.NewKVStoreService(storeKey), identitykeeper.Keeper{})
	return k, ctx
}

// mockIBCModule is a minimal IBCModule that records OnRecvPacket calls.
type mockIBCModule struct {
	recvPacketCalled int
	ackToReturn      ibcexported.Acknowledgement
}

func (m *mockIBCModule) OnChanOpenInit(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID string,
	channelID string,
	channelCap *capabilitytypes.Capability,
	counterparty channeltypes.Counterparty,
	version string,
) (string, error) {
	return version, nil
}

func (m *mockIBCModule) OnChanOpenTry(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID, channelID string,
	channelCap *capabilitytypes.Capability,
	counterparty channeltypes.Counterparty,
	counterpartyVersion string,
) (string, error) {
	return counterpartyVersion, nil
}

func (m *mockIBCModule) OnChanOpenAck(ctx sdk.Context, portID, channelID, counterpartyChannelID, counterpartyVersion string) error {
	return nil
}

func (m *mockIBCModule) OnChanOpenConfirm(ctx sdk.Context, portID, channelID string) error {
	return nil
}

func (m *mockIBCModule) OnChanCloseInit(ctx sdk.Context, portID, channelID string) error {
	return nil
}

func (m *mockIBCModule) OnChanCloseConfirm(ctx sdk.Context, portID, channelID string) error {
	return nil
}

func (m *mockIBCModule) OnRecvPacket(ctx sdk.Context, packet channeltypes.Packet, relayer sdk.AccAddress) ibcexported.Acknowledgement {
	m.recvPacketCalled++
	return m.ackToReturn
}

func (m *mockIBCModule) OnAcknowledgementPacket(ctx sdk.Context, packet channeltypes.Packet, acknowledgement []byte, relayer sdk.AccAddress) error {
	return nil
}

func (m *mockIBCModule) OnTimeoutPacket(ctx sdk.Context, packet channeltypes.Packet, relayer sdk.AccAddress) error {
	return nil
}

// stubAck is a minimal Acknowledgement implementation for tests.
type stubAck struct{}

func (s stubAck) Acknowledgement() []byte { return []byte("ok") }
func (s stubAck) Success() bool           { return true }

// ── tests ─────────────────────────────────────────────────────────────────────

// TestOnRecvPacket_LogsTransfer verifies that a valid ICS-20 packet causes
// LogAccess to be called (evidenced by a log entry in the store) and that the
// underlying IBCModule's OnRecvPacket is also called exactly once.
func TestOnRecvPacket_LogsTransfer(t *testing.T) {
	ak, ctx := newTestAccesslogKeeper(t)

	mockApp := &mockIBCModule{ackToReturn: stubAck{}}
	mw := ibcmiddleware.NewAccessLogMiddleware(mockApp, ak)

	// Build a valid FungibleTokenPacketData payload.
	packetData := transfertypes.FungibleTokenPacketData{
		Denom:    "utmz",
		Amount:   "1000",
		Sender:   "cosmos1sender",
		Receiver: "tamizhi1receiver",
	}
	rawData, err := transfertypes.ModuleCdc.MarshalJSON(&packetData)
	if err != nil {
		t.Fatalf("MarshalJSON: %v", err)
	}

	packet := channeltypes.Packet{
		Sequence:           1,
		SourcePort:         "transfer",
		SourceChannel:      "channel-0",
		DestinationPort:    "transfer",
		DestinationChannel: "channel-1",
		Data:               rawData,
	}

	ack := mw.OnRecvPacket(ctx, packet, sdk.AccAddress{})
	if ack == nil {
		t.Fatal("expected non-nil acknowledgement")
	}

	// The underlying module must have been called.
	if mockApp.recvPacketCalled != 1 {
		t.Errorf("expected OnRecvPacket called once, got %d", mockApp.recvPacketCalled)
	}

	// A log entry should exist in the accesslog store for the receiver.
	logs := ak.GetLogsByEmployee(ctx, "tamizhi1receiver")
	if len(logs) == 0 {
		t.Fatal("expected at least one log entry for the receiver, got none")
	}
	if logs[0].Action != "ibc_receive" {
		t.Errorf("expected action 'ibc_receive', got %q", logs[0].Action)
	}
}

// TestOnRecvPacket_InvalidPacket verifies that a non-ICS-20 packet (garbage
// bytes) does not crash and still delegates to the underlying IBCModule.
func TestOnRecvPacket_InvalidPacket(t *testing.T) {
	ak, ctx := newTestAccesslogKeeper(t)

	mockApp := &mockIBCModule{ackToReturn: stubAck{}}
	mw := ibcmiddleware.NewAccessLogMiddleware(mockApp, ak)

	// Use JSON that is valid JSON but not a FungibleTokenPacketData.
	rawData, _ := json.Marshal(map[string]string{"garbage": "data"})

	packet := channeltypes.Packet{
		Sequence:           2,
		SourcePort:         "unknown",
		SourceChannel:      "channel-0",
		DestinationPort:    "unknown",
		DestinationChannel: "channel-1",
		Data:               rawData,
	}

	// Must not panic.
	ack := mw.OnRecvPacket(ctx, packet, sdk.AccAddress{})
	if ack == nil {
		t.Fatal("expected non-nil acknowledgement")
	}

	// Delegation must still have happened.
	if mockApp.recvPacketCalled != 1 {
		t.Errorf("expected OnRecvPacket called once, got %d", mockApp.recvPacketCalled)
	}

	// No log entries should have been written (unmarshal should have failed).
	allLogs := ak.GetAllLogs(ctx)
	if len(allLogs) != 0 {
		t.Errorf("expected no log entries for invalid packet, got %d", len(allLogs))
	}
}
