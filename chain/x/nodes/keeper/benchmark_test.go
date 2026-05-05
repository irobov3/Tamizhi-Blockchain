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

	"github.com/tamizhi/chain/x/nodes/keeper"
	"github.com/tamizhi/chain/x/nodes/types"
)

// setupBenchKeeper creates a fresh in-memory keeper for benchmarks.
func setupBenchKeeper(b testing.TB) (keeper.Keeper, sdk.Context) {
	b.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		b.Fatal(err)
	}
	ctx := sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
	ctx = ctx.WithBlockTime(time.Now()).WithBlockHeight(200)

	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	k := keeper.NewKeeper(
		cdc,
		runtime.NewKVStoreService(storeKey),
		mockBankKeeper{},
		sdk.AccAddress([]byte("authority123456789ab")).String(),
		sdk.AccAddress([]byte("feecollector1234567")),
	)
	return k, ctx
}

// benchNode returns a ServiceNode with enough stake to pass validation.
func benchNode(id string, ownerAddr string, uptimeScore uint64) types.ServiceNode {
	return types.ServiceNode{
		Id:           id,
		Endpoint:     fmt.Sprintf("https://%s.tamizhi.ai", id),
		Status:       types.NodeStatusActive,
		OwnerAddress: ownerAddr,
		StakedAmount: &types.Coin{Denom: "utmz", Amount: "15000000000"},
		UptimeScore:  uptimeScore,
		RegisteredAt: 0, // registered far in the past so slashing grace period has elapsed
	}
}

// BenchmarkRegisterNode measures the RegisterNode hot path (bank send is a no-op via mock).
func BenchmarkRegisterNode(b *testing.B) {
	b.ReportAllocs()
	b.SetBytes(256) // approximate bytes per node record

	owner := sdk.AccAddress([]byte("testowner1234567890a")).String()

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		b.StopTimer()
		k, ctx := setupBenchKeeper(b)
		node := types.ServiceNode{
			Id:           fmt.Sprintf("node-%d", i),
			Endpoint:     fmt.Sprintf("https://node%d.tamizhi.ai", i),
			OwnerAddress: owner,
			StakedAmount: &types.Coin{Denom: "utmz", Amount: "15000000000"},
		}
		b.StartTimer()

		if err := k.RegisterNode(ctx, node); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkGetNode measures a single node lookup by ID.
func BenchmarkGetNode(b *testing.B) {
	b.ReportAllocs()
	b.SetBytes(256)

	k, ctx := setupBenchKeeper(b)
	owner := sdk.AccAddress([]byte("testowner1234567890a")).String()

	node := benchNode("bench-node-0", owner, 50)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			n, err := k.GetNode(ctx, "bench-node-0")
			if err != nil {
				b.Fatal(err)
			}
			_ = n
		}
	})
}

// BenchmarkGetAllActiveNodes_100 measures a full active-node scan with 100 nodes.
func BenchmarkGetAllActiveNodes_100(b *testing.B) {
	b.ReportAllocs()

	k, ctx := setupBenchKeeper(b)
	owner := sdk.AccAddress([]byte("testowner1234567890a")).String()

	const count = 100
	for i := 0; i < count; i++ {
		node := benchNode(fmt.Sprintf("node-%03d", i), owner, 50)
		if err := k.SetNodeGenesis(ctx, node); err != nil {
			b.Fatalf("SetNodeGenesis(%d): %v", i, err)
		}
	}

	b.SetBytes(int64(count) * 256)
	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			nodes := k.GetAllActiveNodes(ctx)
			if len(nodes) != count {
				b.Fatalf("expected %d nodes, got %d", count, len(nodes))
			}
		}
	})
}

// BenchmarkEndBlockSlashing_100Nodes measures a full EndBlockSlashing scan with
// 100 active nodes none of which fall below the uptime threshold.
func BenchmarkEndBlockSlashing_100Nodes(b *testing.B) {
	b.ReportAllocs()

	k, ctx := setupBenchKeeper(b)
	owner := sdk.AccAddress([]byte("testowner1234567890a")).String()

	const count = 100
	// All nodes have uptime above threshold — tests the full scan overhead.
	for i := 0; i < count; i++ {
		node := benchNode(fmt.Sprintf("node-%03d", i), owner, 80)
		if err := k.SetNodeGenesis(ctx, node); err != nil {
			b.Fatalf("SetNodeGenesis(%d): %v", i, err)
		}
	}

	b.SetBytes(int64(count) * 256)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		if err := k.EndBlockSlashing(ctx); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkEndBlockSlashing_10PctJail measures EndBlockSlashing when 10% of
// nodes have uptime below the jail threshold (UptimeScore < 20).
func BenchmarkEndBlockSlashing_10PctJail(b *testing.B) {
	b.ReportAllocs()

	owner := sdk.AccAddress([]byte("testowner1234567890a")).String()

	const count = 100
	const jailPct = 10 // 10% will be below threshold

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		b.StopTimer()
		k, ctx := setupBenchKeeper(b)
		for j := 0; j < count; j++ {
			uptime := uint64(80)
			if j < jailPct {
				uptime = 5 // below UptimeJailThreshold (20)
			}
			node := benchNode(fmt.Sprintf("node-%03d", j), owner, uptime)
			if err := k.SetNodeGenesis(ctx, node); err != nil {
				b.Fatalf("SetNodeGenesis(%d): %v", j, err)
			}
		}
		b.StartTimer()

		if err := k.EndBlockSlashing(ctx); err != nil {
			b.Fatal(err)
		}
	}
}
