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

// setupAccesslogKeeper creates a minimal in-memory keeper for benchmarks.
func setupAccesslogKeeper(b testing.TB) (keeper.Keeper, sdk.Context) {
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
	k := keeper.NewKeeper(cdc, runtime.NewKVStoreService(storeKey), identitykeeper.Keeper{})
	return k, ctx
}

// fakeHash generates a 64-character hex-like string for use as a file hash.
func fakeHash(i int) string {
	return fmt.Sprintf("%064d", i)
}

// BenchmarkLogAccess measures writing a single log entry (counter + primary write + index write).
func BenchmarkLogAccess(b *testing.B) {
	b.ReportAllocs()
	b.SetBytes(256) // approximate bytes per log entry (two KV writes)

	k, ctx := setupAccesslogKeeper(b)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		if _, err := k.LogAccess(ctx, "emp-bench", fakeHash(i), "bench.txt", "READ", "QmBench"); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkGetLogsByEmployee_50 measures fetching 50 log entries for one employee
// using the employee index (prefix scan).
func BenchmarkGetLogsByEmployee_50(b *testing.B) {
	b.ReportAllocs()

	k, ctx := setupAccesslogKeeper(b)

	const count = 50
	const empID = "emp-bench-50"
	for i := 0; i < count; i++ {
		if _, err := k.LogAccess(ctx, empID, fakeHash(i), fmt.Sprintf("file%d.txt", i), "READ", "QmBench"); err != nil {
			b.Fatalf("LogAccess(%d): %v", i, err)
		}
	}

	b.SetBytes(int64(count) * 256)
	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			entries := k.GetLogsByEmployee(ctx, empID)
			if len(entries) != count {
				b.Fatalf("expected %d entries, got %d", count, len(entries))
			}
		}
	})
}

// BenchmarkGetLogsByEmployee_500 measures fetching 500 log entries for one employee.
func BenchmarkGetLogsByEmployee_500(b *testing.B) {
	b.ReportAllocs()

	k, ctx := setupAccesslogKeeper(b)

	const count = 500
	const empID = "emp-bench-500"
	for i := 0; i < count; i++ {
		if _, err := k.LogAccess(ctx, empID, fakeHash(i), fmt.Sprintf("file%d.txt", i), "READ", "QmBench"); err != nil {
			b.Fatalf("LogAccess(%d): %v", i, err)
		}
	}

	b.SetBytes(int64(count) * 256)
	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			entries := k.GetLogsByEmployee(ctx, empID)
			if len(entries) != count {
				b.Fatalf("expected %d entries, got %d", count, len(entries))
			}
		}
	})
}

// BenchmarkGetAllLogs_1000 measures a full table scan with 1000 log entries from
// multiple employees.
func BenchmarkGetAllLogs_1000(b *testing.B) {
	b.ReportAllocs()

	k, ctx := setupAccesslogKeeper(b)

	const count = 1000
	for i := 0; i < count; i++ {
		empID := fmt.Sprintf("emp-%03d", i%20) // 20 distinct employees
		if _, err := k.LogAccess(ctx, empID, fakeHash(i), fmt.Sprintf("file%d.txt", i), "READ", "QmBench"); err != nil {
			b.Fatalf("LogAccess(%d): %v", i, err)
		}
	}

	b.SetBytes(int64(count) * 256)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		entries := k.GetAllLogs(ctx)
		if len(entries) != count {
			b.Fatalf("expected %d entries, got %d", count, len(entries))
		}
	}
}

