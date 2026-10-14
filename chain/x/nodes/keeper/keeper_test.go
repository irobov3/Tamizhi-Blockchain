package keeper_test

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

	"github.com/tamizhi/chain/x/nodes/keeper"
	"github.com/tamizhi/chain/x/nodes/types"
)

// mockBankKeeper satisfies types.BankKeeper with no-op implementations.
type mockBankKeeper struct{}

func (mockBankKeeper) MintCoins(_ context.Context, _ string, _ sdk.Coins) error { return nil }
func (mockBankKeeper) SendCoinsFromModuleToAccount(_ context.Context, _ string, _ sdk.AccAddress, _ sdk.Coins) error {
	return nil
}
func (mockBankKeeper) SendCoinsFromAccountToModule(_ context.Context, _ sdk.AccAddress, _ string, _ sdk.Coins) error {
	return nil
}
func (mockBankKeeper) GetBalance(_ context.Context, _ sdk.AccAddress, _ string) sdk.Coin {
	return sdk.Coin{}
}
func (mockBankKeeper) SpendableCoins(_ context.Context, _ sdk.AccAddress) sdk.Coins { return nil }

// Compile-time assertion.
var _ types.BankKeeper = mockBankKeeper{}

// newTestContext returns a minimal sdk.Context backed by an in-memory store.
func newTestContext(storeKey *storetypes.KVStoreKey) sdk.Context {
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		panic(err)
	}
	return sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
}

// testOwner returns a valid cosmos bech32 address derived from raw bytes.
var testOwner = sdk.AccAddress([]byte("testowner1234567890a")).String()

// newTestKeeper returns a Keeper wired to an in-memory store.
func newTestKeeper(t *testing.T) (keeper.Keeper, sdk.Context) {
	t.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	ctx := newTestContext(storeKey)
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

// ── Bug 4: GetNode must return ErrNodeNotFound (not a generic error) ──────────

func TestGetNode_NotFound(t *testing.T) {
	k, ctx := newTestKeeper(t)

	_, err := k.GetNode(ctx, "nonexistent-node-id")
	if err == nil {
		t.Fatal("expected error for nonexistent node, got nil")
	}
	// Before the fix, GetNode returned a generic error or nil for missing nodes.
	// After fix, it returns the sentinel ErrNodeNotFound.
	if err != types.ErrNodeNotFound {
		t.Errorf("expected ErrNodeNotFound, got: %v (type %T)", err, err)
	}
}

func TestGetNode_FoundAfterRegister(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	node := types.ServiceNode{
		Id:           "node-001",
		Endpoint:     "https://node1.tamizhi.ai",
		Status:       types.NodeStatusActive,
		OwnerAddress: testOwner,
		StakedAmount: &types.Coin{Denom: "utmz", Amount: "15000000000"},
	}
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis failed: %v", err)
	}

	got, err := k.GetNode(ctx, "node-001")
	if err != nil {
		t.Fatalf("GetNode returned error: %v", err)
	}
	if got.Id != node.Id {
		t.Errorf("got node ID %q, want %q", got.Id, node.Id)
	}
}

// ── Bug 3: ClaimNodeReward must enforce 1-hour cooldown ──────────────────────
// We test this via the msg_server which contains the cooldown logic.

func TestClaimNodeReward_CooldownEnforced(t *testing.T) {
	k, ctx := newTestKeeper(t)
	s := keeper.NewMsgServerImpl(k)

	now := time.Date(2026, 5, 1, 12, 0, 0, 0, time.UTC)
	ctx = ctx.WithBlockTime(now)

	owner := testOwner

	// Store a node that just claimed a reward.
	node := types.ServiceNode{
		Id:           "node-001",
		Endpoint:     "https://node1.tamizhi.ai",
		Status:       types.NodeStatusActive,
		OwnerAddress: owner,
		LastRewardAt: now.Unix(), // claimed at this exact moment
		StakedAmount: &types.Coin{Denom: "utmz", Amount: "15000000000"},
	}
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis failed: %v", err)
	}

	// Immediately try to claim again — cooldown is 1 hour, so this must be blocked.
	_, err := s.ClaimNodeReward(ctx, &types.MsgClaimNodeReward{
		Creator: owner,
		NodeID:  "node-001",
	})
	if err == nil {
		t.Fatal("expected cooldown error for immediate re-claim, got nil")
	}
	if !isErrCode(err, types.ErrRewardCooldown) {
		t.Errorf("expected ErrRewardCooldown, got: %v", err)
	}
}

func TestClaimNodeReward_CooldownExpired_Allowed(t *testing.T) {
	k, ctx := newTestKeeper(t)
	s := keeper.NewMsgServerImpl(k)

	claimedAt := time.Date(2026, 5, 1, 10, 0, 0, 0, time.UTC)
	now := claimedAt.Add(2 * time.Hour) // 2 hours later — past the 1-hour cooldown
	ctx = ctx.WithBlockTime(now)

	owner := testOwner

	node := types.ServiceNode{
		Id:           "node-002",
		Endpoint:     "https://node2.tamizhi.ai",
		Status:       types.NodeStatusActive,
		OwnerAddress: owner,
		LastRewardAt: claimedAt.Unix(),
		UptimeScore:  100,
		StakedAmount: &types.Coin{Denom: "utmz", Amount: "15000000000"},
	}
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis failed: %v", err)
	}

	_, err := s.ClaimNodeReward(ctx, &types.MsgClaimNodeReward{
		Creator: owner,
		NodeID:  "node-002",
	})
	// The cooldown should not fire — if there's an error it must be something else.
	if err != nil && isErrCode(err, types.ErrRewardCooldown) {
		t.Errorf("cooldown should have expired, but got ErrRewardCooldown: %v", err)
	}
}

func TestClaimNodeReward_FirstClaim_NoCooldown(t *testing.T) {
	k, ctx := newTestKeeper(t)
	s := keeper.NewMsgServerImpl(k)
	ctx = ctx.WithBlockTime(time.Date(2026, 5, 1, 12, 0, 0, 0, time.UTC))

	owner := testOwner

	// LastRewardAt == 0 means this node has never claimed; must not be blocked.
	node := types.ServiceNode{
		Id:           "node-fresh",
		Endpoint:     "https://fresh.tamizhi.ai",
		Status:       types.NodeStatusActive,
		OwnerAddress: owner,
		LastRewardAt: 0,
		UptimeScore:  50,
		StakedAmount: &types.Coin{Denom: "utmz", Amount: "15000000000"},
	}
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis failed: %v", err)
	}

	_, err := s.ClaimNodeReward(ctx, &types.MsgClaimNodeReward{
		Creator: owner,
		NodeID:  "node-fresh",
	})
	if err != nil && isErrCode(err, types.ErrRewardCooldown) {
		t.Errorf("first-ever claim must not be blocked by cooldown; got: %v", err)
	}
}

// isErrCode checks whether err wraps the given sentinel error code.
func isErrCode(err, target error) bool {
	if err == nil {
		return false
	}
	type coder interface{ Is(error) bool }
	if c, ok := target.(coder); ok {
		return c.Is(err)
	}
	return err.Error() == target.Error()
}
