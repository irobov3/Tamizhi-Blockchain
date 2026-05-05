// Package integration_test provides in-process integration tests for the rewards
// module.  Rather than spinning up the full TamizhiApp (which pulls in many
// external dependencies), we wire just the two keepers that rewards depends on
// — identity and rewards — sharing a single in-memory store.  This mirrors
// what the full app does at runtime without requiring network / genesis wiring.
package integration_test

import (
	"context"
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
	rewardskeeper "github.com/tamizhi/chain/x/rewards/keeper"
	rewardstypes "github.com/tamizhi/chain/x/rewards/types"
)

// ─── mock bank keeper ─────────────────────────────────────────────────────────

type mockBankKeeper struct{}

func (mockBankKeeper) MintCoins(_ context.Context, _ string, _ sdk.Coins) error { return nil }
func (mockBankKeeper) SendCoinsFromModuleToAccount(_ context.Context, _ string, _ sdk.AccAddress, _ sdk.Coins) error {
	return nil
}
func (mockBankKeeper) GetBalance(_ context.Context, _ sdk.AccAddress, _ string) sdk.Coin {
	return sdk.Coin{}
}
func (mockBankKeeper) SpendableCoins(_ context.Context, _ sdk.AccAddress) sdk.Coins { return nil }

var _ rewardstypes.BankKeeper = mockBankKeeper{}

// ─── test harness ────────────────────────────────────────────────────────────

type testEnv struct {
	ctx     sdk.Context
	iKeeper identitykeeper.Keeper
	rKeeper rewardskeeper.Keeper
}

func newTestEnv(t *testing.T) testEnv {
	t.Helper()

	// Two separate KV store keys, one per module.
	iStoreKey := storetypes.NewKVStoreKey(identitytypes.StoreKey)
	rStoreKey := storetypes.NewKVStoreKey(rewardstypes.StoreKey)

	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(iStoreKey, storetypes.StoreTypeIAVL, db)
	cms.MountStoreWithDB(rStoreKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		t.Fatalf("LoadLatestVersion: %v", err)
	}

	blockTime := time.Date(2026, 5, 3, 12, 0, 0, 0, time.UTC)
	ctx := sdk.NewContext(cms, cmtproto.Header{Time: blockTime}, false, log.NewNopLogger()).
		WithBlockTime(blockTime)

	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())

	iKeeper := identitykeeper.NewKeeper(cdc, runtime.NewKVStoreService(iStoreKey))
	authority := sdk.AccAddress([]byte("authority123456789ab")).String()
	rKeeper := rewardskeeper.NewKeeper(
		cdc,
		runtime.NewKVStoreService(rStoreKey),
		mockBankKeeper{},
		iKeeper,
		authority,
	)

	return testEnv{ctx: ctx, iKeeper: iKeeper, rKeeper: rKeeper}
}

// testAddr returns a deterministic valid bech32 address for tests.
var testAddr = sdk.AccAddress([]byte("testaddress123456")).String()

// ─── helpers ─────────────────────────────────────────────────────────────────

func registerEmployee(t *testing.T, env testEnv, employeeID string) {
	t.Helper()
	rec := identitytypes.IdentityRecord{
		EmployeeID: employeeID,
		Address:    testAddr,
		Active:     true,
	}
	if err := env.iKeeper.RegisterIdentity(env.ctx, rec); err != nil {
		t.Fatalf("RegisterIdentity(%s): %v", employeeID, err)
	}
}

func setRule(t *testing.T, env testEnv, ruleID string, maxPerDay uint64) {
	t.Helper()
	rule := rewardstypes.RewardRule{
		ID:          ruleID,
		Activity:    "FILE_UPLOAD",
		Amount:      rewardstypes.Coin{Denom: "utmz", Amount: "5000000"},
		Description: "Integration test rule",
		Active:      true,
		MaxPerDay:   maxPerDay,
	}
	if err := env.rKeeper.SetRewardRule(env.ctx, rule); err != nil {
		t.Fatalf("SetRewardRule(%s): %v", ruleID, err)
	}
}

// ─── Test: IssueReward happy path ────────────────────────────────────────────

func TestIssueReward_HappyPath(t *testing.T) {
	env := newTestEnv(t)

	registerEmployee(t, env, "emp-001")
	setRule(t, env, "upload-rule", 10)

	id, err := env.rKeeper.IssueReward(env.ctx, "emp-001", "upload-rule", "test memo")
	if err != nil {
		t.Fatalf("IssueReward: %v", err)
	}
	if id == 0 {
		t.Error("expected non-zero record ID")
	}

	// Verify the record was stored.
	records := env.rKeeper.GetAllRecords(env.ctx)
	if len(records) != 1 {
		t.Fatalf("expected 1 reward record, got %d", len(records))
	}
	rec := records[0]
	if rec.EmployeeId != "emp-001" {
		t.Errorf("EmployeeId = %q, want emp-001", rec.EmployeeId)
	}
	if rec.RuleId != "upload-rule" {
		t.Errorf("RuleId = %q, want upload-rule", rec.RuleId)
	}
	if rec.Memo != "test memo" {
		t.Errorf("Memo = %q, want test memo", rec.Memo)
	}
	if rec.Timestamp == 0 {
		t.Error("expected non-zero Timestamp")
	}
}

// ─── Test: daily limit enforcement ───────────────────────────────────────────

func TestIssueReward_DailyLimit(t *testing.T) {
	const maxPerDay = 3
	env := newTestEnv(t)

	registerEmployee(t, env, "emp-limit")
	setRule(t, env, "limited-rule", maxPerDay)

	// Issue rewards up to the daily limit — all should succeed.
	for i := 0; i < maxPerDay; i++ {
		_, err := env.rKeeper.IssueReward(env.ctx, "emp-limit", "limited-rule", "memo")
		if err != nil {
			t.Fatalf("IssueReward call %d/%d failed: %v", i+1, maxPerDay, err)
		}
	}

	// The (maxPerDay+1)th call must return ErrDailyLimitHit.
	_, err := env.rKeeper.IssueReward(env.ctx, "emp-limit", "limited-rule", "overflow")
	if err == nil {
		t.Fatal("expected ErrDailyLimitHit, got nil")
	}

	// Check that the error is the expected sentinel.
	if !rewardstypes.ErrDailyLimitHit.Is(err) {
		t.Errorf("expected ErrDailyLimitHit, got: %v", err)
	}
}

// ─── Test: rule not found ─────────────────────────────────────────────────────

func TestIssueReward_RuleNotFound(t *testing.T) {
	env := newTestEnv(t)
	registerEmployee(t, env, "emp-nrule")

	_, err := env.rKeeper.IssueReward(env.ctx, "emp-nrule", "no-such-rule", "memo")
	if err == nil {
		t.Fatal("expected error when rule does not exist")
	}
	if !rewardstypes.ErrRuleNotFound.Is(err) {
		t.Errorf("expected ErrRuleNotFound, got: %v", err)
	}
}

// ─── Test: inactive rule rejected ────────────────────────────────────────────

func TestIssueReward_InactiveRule(t *testing.T) {
	env := newTestEnv(t)
	registerEmployee(t, env, "emp-inactive")

	rule := rewardstypes.RewardRule{
		ID:        "inactive-rule",
		Activity:  "LOGIN",
		Amount:    rewardstypes.Coin{Denom: "utmz", Amount: "1000"},
		Active:    false,
		MaxPerDay: 5,
	}
	if err := env.rKeeper.SetRewardRule(env.ctx, rule); err != nil {
		t.Fatalf("SetRewardRule: %v", err)
	}

	_, err := env.rKeeper.IssueReward(env.ctx, "emp-inactive", "inactive-rule", "memo")
	if err == nil {
		t.Fatal("expected ErrRuleInactive, got nil")
	}
	if !rewardstypes.ErrRuleInactive.Is(err) {
		t.Errorf("expected ErrRuleInactive, got: %v", err)
	}
}

// ─── Test: employee not found ─────────────────────────────────────────────────

func TestIssueReward_EmployeeNotFound(t *testing.T) {
	env := newTestEnv(t)
	setRule(t, env, "upload-rule", 10)

	// Do NOT register any employee.
	_, err := env.rKeeper.IssueReward(env.ctx, "ghost-employee", "upload-rule", "memo")
	if err == nil {
		t.Fatal("expected error when employee not registered")
	}
}

// ─── Test: multiple employees get independent daily counters ──────────────────

func TestIssueReward_IndependentDailyCounters(t *testing.T) {
	env := newTestEnv(t)

	// Register two distinct employees with different addresses.
	addr1 := sdk.AccAddress([]byte("testaddress123456")).String()
	addr2 := sdk.AccAddress([]byte("testaddress234567")).String()

	if err := env.iKeeper.RegisterIdentity(env.ctx, identitytypes.IdentityRecord{
		EmployeeID: "emp-a", Address: addr1, Active: true,
	}); err != nil {
		t.Fatalf("RegisterIdentity emp-a: %v", err)
	}
	if err := env.iKeeper.RegisterIdentity(env.ctx, identitytypes.IdentityRecord{
		EmployeeID: "emp-b", Address: addr2, Active: true,
	}); err != nil {
		t.Fatalf("RegisterIdentity emp-b: %v", err)
	}

	setRule(t, env, "shared-rule", 1)

	// emp-a gets a reward.
	if _, err := env.rKeeper.IssueReward(env.ctx, "emp-a", "shared-rule", "a"); err != nil {
		t.Fatalf("IssueReward emp-a: %v", err)
	}

	// emp-b should still be able to get the same rule reward (independent counter).
	if _, err := env.rKeeper.IssueReward(env.ctx, "emp-b", "shared-rule", "b"); err != nil {
		t.Fatalf("IssueReward emp-b should succeed with independent counter: %v", err)
	}

	// emp-a's second attempt must hit the limit.
	_, err := env.rKeeper.IssueReward(env.ctx, "emp-a", "shared-rule", "a2")
	if err == nil {
		t.Fatal("expected ErrDailyLimitHit for emp-a second attempt")
	}
	if !rewardstypes.ErrDailyLimitHit.Is(err) {
		t.Errorf("expected ErrDailyLimitHit, got: %v", err)
	}
}
