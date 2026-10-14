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

	"github.com/tamizhi/chain/x/security/keeper"
	"github.com/tamizhi/chain/x/security/types"
)

// setupSecurityKeeper creates a minimal in-memory security keeper for benchmarks.
func setupSecurityKeeper(b testing.TB) (keeper.Keeper, sdk.Context) {
	b.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		b.Fatal(err)
	}
	ctx := sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
	ctx = ctx.WithBlockTime(time.Now()).WithBlockHeight(1)

	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	k := keeper.NewKeeper(cdc, runtime.NewKVStoreService(storeKey), testAuthority)
	return k, ctx
}

// benchFlag returns a ThreatFlag with ALERT action (no automatic blocking).
func benchFlag(empID, addr string) types.ThreatFlag {
	return types.ThreatFlag{
		EmployeeID:  empID,
		Address:     addr,
		ThreatType:  "UNAUTHORIZED_ACCESS",
		Level:       "HIGH",
		Description: "Benchmark threat flag",
		Action:      "ALERT", // ALERT does not trigger BlockAddress
		Source:      "bench",
	}
}

// BenchmarkRaiseThreatFlag measures counter increment + JSON marshal + KV set.
func BenchmarkRaiseThreatFlag(b *testing.B) {
	b.ReportAllocs()
	b.SetBytes(256) // approximate bytes per threat flag record

	k, ctx := setupSecurityKeeper(b)
	addr := sdk.AccAddress([]byte("benchaddr1234567890a")).String()

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		empID := fmt.Sprintf("emp-%d", i)
		if _, err := k.RaiseThreatFlag(ctx, benchFlag(empID, addr)); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkIsBlocked_Blocked measures IsBlocked for an address that has an active block.
func BenchmarkIsBlocked_Blocked(b *testing.B) {
	b.ReportAllocs()
	b.SetBytes(64) // small: just a KV get on the blocked-address key

	k, ctx := setupSecurityKeeper(b)
	addr := sdk.AccAddress([]byte("blockedaddr12345678a")).String()

	if err := k.BlockAddress(ctx, addr, "benchmark block reason"); err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			blocked, _ := k.IsBlocked(ctx, addr)
			if !blocked {
				b.Fatal("address should be blocked")
			}
		}
	})
}

// BenchmarkIsBlocked_Clean measures IsBlocked for an address with no flags (negative path).
func BenchmarkIsBlocked_Clean(b *testing.B) {
	b.ReportAllocs()
	b.SetBytes(64)

	k, ctx := setupSecurityKeeper(b)
	addr := sdk.AccAddress([]byte("cleanaddr123456789a")).String()

	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			blocked, _ := k.IsBlocked(ctx, addr)
			if blocked {
				b.Fatal("clean address should not be blocked")
			}
		}
	})
}

// BenchmarkGetAllThreatFlags_100 measures a full threat-flag scan with 100 entries.
func BenchmarkGetAllThreatFlags_100(b *testing.B) {
	b.ReportAllocs()

	k, ctx := setupSecurityKeeper(b)
	addr := sdk.AccAddress([]byte("benchaddr1234567890a")).String()

	const count = 100
	for i := 0; i < count; i++ {
		empID := fmt.Sprintf("emp-%03d", i)
		if _, err := k.RaiseThreatFlag(ctx, benchFlag(empID, addr)); err != nil {
			b.Fatalf("RaiseThreatFlag(%d): %v", i, err)
		}
	}

	b.SetBytes(int64(count) * 256)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		flags := k.GetAllThreatFlags(ctx)
		if len(flags) != count {
			b.Fatalf("expected %d flags, got %d", count, len(flags))
		}
	}
}
