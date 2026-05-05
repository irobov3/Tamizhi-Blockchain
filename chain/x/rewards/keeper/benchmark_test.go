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
	identitytypes "github.com/tamizhi/chain/x/identity/types"
	"github.com/tamizhi/chain/x/rewards/keeper"
	"github.com/tamizhi/chain/x/rewards/types"
)

var benchAuthority = sdk.AccAddress([]byte("authority123456789ab")).String()

// setupRewardsKeeper creates an in-memory keeper with a properly wired identity
// keeper so that IssueReward can look up employee addresses.
func setupRewardsKeeper(b testing.TB) (keeper.Keeper, identitykeeper.Keeper, sdk.Context) {
	b.Helper()

	rewardStoreKey := storetypes.NewKVStoreKey(types.StoreKey)
	identityStoreKey := storetypes.NewKVStoreKey(identitytypes.StoreKey)

	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(rewardStoreKey, storetypes.StoreTypeIAVL, db)
	cms.MountStoreWithDB(identityStoreKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		b.Fatal(err)
	}

	ctx := sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
	ctx = ctx.WithBlockTime(time.Now())

	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	idKeeper := identitykeeper.NewKeeper(cdc, runtime.NewKVStoreService(identityStoreKey))
	k := keeper.NewKeeper(
		cdc,
		runtime.NewKVStoreService(rewardStoreKey),
		mockBankKeeper{},
		idKeeper,
		benchAuthority,
	)
	return k, idKeeper, ctx
}

// registerBenchIdentity stores an identity record so IssueReward can look it up.
func registerBenchIdentity(b testing.TB, idKeeper identitykeeper.Keeper, ctx sdk.Context, empID string, addr sdk.AccAddress) {
	b.Helper()
	rec := identitytypes.IdentityRecord{
		EmployeeID: empID,
		Address:    addr.String(),
		Active:     true,
	}
	if err := idKeeper.SetIdentity(ctx, rec); err != nil {
		b.Fatalf("SetIdentity(%s): %v", empID, err)
	}
}

// BenchmarkIssueReward measures the hot path: daily-limit counter read+write + record storage.
func BenchmarkIssueReward(b *testing.B) {
	b.ReportAllocs()
	k, idKeeper, ctx := setupRewardsKeeper(b)

	rule := types.RewardRule{
		ID:        "bench-rule",
		Activity:  "bench",
		Amount:    types.Coin{Denom: "utmz", Amount: "1000"},
		Active:    true,
		MaxPerDay: 1_000_000, // high cap so we don't hit the limit during the benchmark
	}
	if err := k.SetRewardRule(ctx, rule); err != nil {
		b.Fatal(err)
	}

	// Pre-register all employee identities (using a fixed pool to avoid OOM for large b.N).
	const poolSize = 1000
	addrBase := sdk.AccAddress([]byte("benchaddr1234567890a"))
	for i := 0; i < poolSize; i++ {
		empID := fmt.Sprintf("emp-%d", i)
		// Derive a unique address per employee.
		addrBytes := make([]byte, 20)
		copy(addrBytes, addrBase)
		addrBytes[19] = byte(i % 256)
		addrBytes[18] = byte(i / 256)
		registerBenchIdentity(b, idKeeper, ctx, empID, addrBytes)
	}

	b.SetBytes(256) // approximate bytes per IssueReward (rule read + counter read/write + record write)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		empID := fmt.Sprintf("emp-%d", i%poolSize)
		if _, err := k.IssueReward(ctx, empID, "bench-rule", "bench-memo"); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkGetRewardRecords_10 fetches 10 records for one employee (via GetAllRecords filter).
func BenchmarkGetRewardRecords_10(b *testing.B) {
	b.ReportAllocs()
	k, idKeeper, ctx := setupRewardsKeeper(b)

	rule := types.RewardRule{
		ID:        "rec-rule",
		Activity:  "bench",
		Amount:    types.Coin{Denom: "utmz", Amount: "1000"},
		Active:    true,
		MaxPerDay: 10_000,
	}
	if err := k.SetRewardRule(ctx, rule); err != nil {
		b.Fatal(err)
	}

	addrBase := sdk.AccAddress([]byte("recbenchaddr12345678"))
	registerBenchIdentity(b, idKeeper, ctx, "emp-rec", addrBase)

	const count = 10
	for i := 0; i < count; i++ {
		if _, err := k.IssueReward(ctx, "emp-rec", "rec-rule", "memo"); err != nil {
			b.Fatalf("IssueReward setup %d: %v", i, err)
		}
	}

	b.SetBytes(int64(count) * 256)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_ = k.GetAllRecords(ctx)
	}
}

// BenchmarkGetRewardRecords_100 fetches 100 records (full scan baseline).
func BenchmarkGetRewardRecords_100(b *testing.B) {
	b.ReportAllocs()
	k, idKeeper, ctx := setupRewardsKeeper(b)

	rule := types.RewardRule{
		ID:        "rec100-rule",
		Activity:  "bench",
		Amount:    types.Coin{Denom: "utmz", Amount: "1000"},
		Active:    true,
		MaxPerDay: 10_000,
	}
	if err := k.SetRewardRule(ctx, rule); err != nil {
		b.Fatal(err)
	}

	addrBase := sdk.AccAddress([]byte("rec100benchaddr12345"))
	registerBenchIdentity(b, idKeeper, ctx, "emp-rec100", addrBase)

	const count = 100
	for i := 0; i < count; i++ {
		if _, err := k.IssueReward(ctx, "emp-rec100", "rec100-rule", "memo"); err != nil {
			b.Fatalf("IssueReward setup %d: %v", i, err)
		}
	}

	b.SetBytes(int64(count) * 256)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_ = k.GetAllRecords(ctx)
	}
}

// BenchmarkCreateRewardRule measures rule creation (duplicate-check + marshal + set).
func BenchmarkCreateRewardRule(b *testing.B) {
	b.ReportAllocs()
	b.SetBytes(128)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		b.StopTimer()
		k, _, ctx := setupRewardsKeeper(b)
		rule := types.RewardRule{
			ID:        fmt.Sprintf("bench-rule-%d", i),
			Activity:  "bench",
			Amount:    types.Coin{Denom: "utmz", Amount: "5000"},
			Active:    true,
			MaxPerDay: 10,
		}
		b.StartTimer()

		if err := k.SetRewardRule(ctx, rule); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkListAllRewardRules measures listing all rules when 50 rules exist.
func BenchmarkListAllRewardRules(b *testing.B) {
	b.ReportAllocs()

	k, _, ctx := setupRewardsKeeper(b)

	const ruleCount = 50
	for i := 0; i < ruleCount; i++ {
		rule := types.RewardRule{
			ID:        fmt.Sprintf("rule-%03d", i),
			Activity:  "bench",
			Amount:    types.Coin{Denom: "utmz", Amount: "1000"},
			Active:    true,
			MaxPerDay: 100,
		}
		if err := k.SetRewardRule(ctx, rule); err != nil {
			b.Fatalf("SetRewardRule(%d): %v", i, err)
		}
	}

	b.SetBytes(int64(ruleCount) * 128)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		rules := k.GetAllRewardRules(ctx)
		if len(rules) != ruleCount {
			b.Fatalf("expected %d rules, got %d", ruleCount, len(rules))
		}
	}
}
