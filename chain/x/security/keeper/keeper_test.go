package keeper_test

import (
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

	"github.com/tamizhi/chain/x/security/keeper"
	"github.com/tamizhi/chain/x/security/types"
)

var testAuthority = sdk.AccAddress([]byte("securityauthority1")).String()

func newTestContext(storeKey *storetypes.KVStoreKey) sdk.Context {
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		panic(err)
	}
	return sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
}

func newTestKeeper(t *testing.T) (keeper.Keeper, sdk.Context) {
	t.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	ctx := newTestContext(storeKey)
	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	k := keeper.NewKeeper(cdc, runtime.NewKVStoreService(storeKey), testAuthority)
	return k, ctx
}

// ── Bug 9: LogSecurityEvent must use ctx.BlockTime() not time.Now() ───────────

func TestLogSecurityEvent_UsesBlockTime(t *testing.T) {
	k, ctx := newTestKeeper(t)

	// Set block time to a specific, known value (far in the future to distinguish
	// from wall clock time that time.Now() would produce).
	blockTime := time.Date(2030, 1, 15, 8, 0, 0, 0, time.UTC)
	ctx = ctx.WithBlockTime(blockTime)

	event := types.SecurityEvent{
		EmployeeID: "emp-001",
		Address:    "cosmos1qyqszqgpqyqszqgpqyqszqgpqyqszqgp8apv67",
		EventType:  "LOGIN",
		DataHash:   "abc123",
		DeviceID:   "device-001",
		// Timestamp is intentionally zero here — keeper should set it from block time.
	}

	id, err := k.LogSecurityEvent(ctx, event)
	if err != nil {
		t.Fatalf("LogSecurityEvent failed: %v", err)
	}
	if id == 0 {
		t.Error("expected non-zero event ID")
	}

	// Retrieve and verify the timestamp was set to block time.
	events := k.GetSecurityEventsByEmployee(ctx, "emp-001")
	if len(events) == 0 {
		t.Fatal("expected at least one event after logging")
	}
	if events[0].Timestamp != blockTime.Unix() {
		t.Errorf("event timestamp = %d, want block time %d (got wall clock time?)",
			events[0].Timestamp, blockTime.Unix())
	}
}

// ── ThreatFlag: RaiseThreatFlag uses block time ────────────────────────────────

func TestRaiseThreatFlag_UsesBlockTime(t *testing.T) {
	k, ctx := newTestKeeper(t)

	blockTime := time.Date(2030, 2, 20, 10, 30, 0, 0, time.UTC)
	ctx = ctx.WithBlockTime(blockTime)

	flag := types.ThreatFlag{
		EmployeeID:  "emp-001",
		Address:     "cosmos1qyqszqgpqyqszqgpqyqszqgpqyqszqgp8apv67",
		ThreatType:  "UNAUTHORIZED_ACCESS",
		Level:       "HIGH",
		Description: "Multiple failed logins",
		Action:      "ALERT",
		Source:      "monitor",
	}

	id, err := k.RaiseThreatFlag(ctx, flag)
	if err != nil {
		t.Fatalf("RaiseThreatFlag failed: %v", err)
	}

	got, found := k.GetThreatFlag(ctx, id)
	if !found {
		t.Fatalf("expected ThreatFlag %d to be stored", id)
	}
	if got.CreatedAt != blockTime.Unix() {
		t.Errorf("CreatedAt = %d, want block time %d", got.CreatedAt, blockTime.Unix())
	}
}

// ── ThreatFlag: ResolveThreatFlag updates state correctly ────────────────────

func TestResolveThreatFlag(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	flag := types.ThreatFlag{
		EmployeeID:  "emp-002",
		Address:     "cosmos1qyqszqgpqyqszqgpqyqszqgpqyqszqgp8apv67",
		ThreatType:  "DATA_LEAK",
		Level:       "MEDIUM",
		Description: "Suspicious file export",
		Action:      "ALERT",
		Source:      "dlp",
	}
	id, err := k.RaiseThreatFlag(ctx, flag)
	if err != nil {
		t.Fatalf("RaiseThreatFlag: %v", err)
	}

	// Verify it starts unresolved.
	before, found := k.GetThreatFlag(ctx, id)
	if !found {
		t.Fatal("flag not found after raise")
	}
	if before.Resolved {
		t.Error("new flag should not be resolved")
	}

	// Resolve it.
	if err := k.ResolveThreatFlag(ctx, id, "investigated, false positive"); err != nil {
		t.Fatalf("ResolveThreatFlag: %v", err)
	}

	after, found := k.GetThreatFlag(ctx, id)
	if !found {
		t.Fatal("flag not found after resolve")
	}
	if !after.Resolved {
		t.Error("flag should be resolved after ResolveThreatFlag")
	}
	if after.Resolution == "" {
		t.Error("resolution string should be stored")
	}
}

// ── IsBlocked: block and unblock an address ──────────────────────────────────

func TestBlockAddress(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	addr := "cosmos1qyqszqgpqyqszqgpqyqszqgpqyqszqgp8apv67"

	// Initially not blocked.
	blocked, _ := k.IsBlocked(ctx, addr)
	if blocked {
		t.Fatal("address should not be blocked initially")
	}

	// Block it.
	if err := k.BlockAddress(ctx, addr, "suspicious activity"); err != nil {
		t.Fatalf("BlockAddress: %v", err)
	}

	blocked, reason := k.IsBlocked(ctx, addr)
	if !blocked {
		t.Error("address should be blocked after BlockAddress")
	}
	if reason == "" {
		t.Error("block reason should be stored")
	}

	// Unblock.
	if err := k.UnblockAddress(ctx, addr); err != nil {
		t.Fatalf("UnblockAddress: %v", err)
	}

	blocked, _ = k.IsBlocked(ctx, addr)
	if blocked {
		t.Error("address should not be blocked after UnblockAddress")
	}
}

// ── ListActiveThreatFlags: resolved flags must not appear ────────────────────

func TestListActiveThreatFlags(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	base := types.ThreatFlag{
		EmployeeID:  "emp-003",
		Address:     "cosmos1qyqszqgpqyqszqgpqyqszqgpqyqszqgp8apv67",
		ThreatType:  "POLICY_VIOLATION",
		Level:       "LOW",
		Description: "Minor policy breach",
		Action:      "ALERT",
		Source:      "audit",
	}

	id1, _ := k.RaiseThreatFlag(ctx, base)
	base.Description = "Another violation"
	id2, _ := k.RaiseThreatFlag(ctx, base)

	// Resolve flag 1.
	_ = k.ResolveThreatFlag(ctx, id1, "resolved")

	active := k.GetActiveThreatFlags(ctx)
	for _, f := range active {
		if f.Id == id1 {
			t.Errorf("resolved flag %d should not appear in active list", id1)
		}
	}
	found2 := false
	for _, f := range active {
		if f.Id == id2 {
			found2 = true
			break
		}
	}
	if !found2 {
		t.Errorf("unresolved flag %d should appear in active list", id2)
	}
}
