package keeper_test

import (
	"fmt"
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

	identitykeeper "github.com/tamizhi/chain/x/identity/keeper"
	"github.com/tamizhi/chain/x/accesslog/keeper"
	"github.com/tamizhi/chain/x/accesslog/types"
)

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
	// identityKeeper zero value is fine for tests that only exercise LogAccess/GetLogsByEmployee.
	k := keeper.NewKeeper(cdc, runtime.NewKVStoreService(storeKey), identitykeeper.Keeper{})
	return k, ctx
}

// ── Bug 5: GetLogsByEmployee must use the employee index, not a full scan ─────
// We verify correctness: logs for employeeA must not appear for employeeB.

func TestGetLogsByEmployee_IsolatedPerEmployee(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	// Log 5 entries for emp-A and 3 for emp-B.
	const (
		empA = "emp-alpha"
		empB = "emp-beta"
	)
	for i := 0; i < 5; i++ {
		_, err := k.LogAccess(ctx, empA,
			fmt.Sprintf("sha256hash%02d%52s", i, ""),
			fmt.Sprintf("file-%d.txt", i),
			"READ", fmt.Sprintf("Qm%d", i))
		if err != nil {
			t.Fatalf("LogAccess(empA, %d): %v", i, err)
		}
	}
	for i := 0; i < 3; i++ {
		_, err := k.LogAccess(ctx, empB,
			fmt.Sprintf("sha256hash%02d%52s", i+10, ""),
			fmt.Sprintf("doc-%d.pdf", i),
			"WRITE", fmt.Sprintf("Qm%d", i+10))
		if err != nil {
			t.Fatalf("LogAccess(empB, %d): %v", i, err)
		}
	}

	aLogs := k.GetLogsByEmployee(ctx, empA)
	if len(aLogs) != 5 {
		t.Errorf("emp-alpha: expected 5 logs, got %d", len(aLogs))
	}
	for _, l := range aLogs {
		if l.EmployeeID != empA {
			t.Errorf("emp-alpha query returned a log for %q", l.EmployeeID)
		}
	}

	bLogs := k.GetLogsByEmployee(ctx, empB)
	if len(bLogs) != 3 {
		t.Errorf("emp-beta: expected 3 logs, got %d", len(bLogs))
	}
	for _, l := range bLogs {
		if l.EmployeeID != empB {
			t.Errorf("emp-beta query returned a log for %q", l.EmployeeID)
		}
	}
}

func TestGetLogsByEmployee_UnknownEmployee_Empty(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	logs := k.GetLogsByEmployee(ctx, "nobody")
	if len(logs) != 0 {
		t.Errorf("expected 0 logs for unknown employee, got %d", len(logs))
	}
}

func TestLogAccess_IncrementingIDs(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	const emp = "emp-id-test"
	var ids []uint64
	for i := 0; i < 3; i++ {
		id, err := k.LogAccess(ctx, emp,
			fmt.Sprintf("abc%061d", i), // 64 chars total
			"test.txt", "READ", "QmTest")
		if err != nil {
			t.Fatalf("LogAccess %d: %v", i, err)
		}
		ids = append(ids, id)
	}

	// IDs must be strictly increasing.
	for i := 1; i < len(ids); i++ {
		if ids[i] <= ids[i-1] {
			t.Errorf("ID[%d]=%d is not greater than ID[%d]=%d", i, ids[i], i-1, ids[i-1])
		}
	}
}

func TestGetLogByID_NotFound(t *testing.T) {
	k, ctx := newTestKeeper(t)
	_, found := k.GetLogByID(ctx, 9999)
	if found {
		t.Error("expected not found for nonexistent ID")
	}
}

// ── BlockHeight is stored from context ─────────────────────────────────────────

func TestLogAccess_BlockHeightFromContext(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now()).WithBlockHeight(42)

	id, err := k.LogAccess(ctx, "emp-bh", "aaaa"+fmt.Sprintf("%060d", 1), "test.txt", "READ", "QmTest")
	if err != nil {
		t.Fatalf("LogAccess: %v", err)
	}

	entry, found := k.GetLogByID(ctx, id)
	if !found {
		t.Fatal("entry not found")
	}
	if entry.BlockHeight != 42 {
		t.Errorf("BlockHeight = %d, want 42", entry.BlockHeight)
	}
}
