package keeper_test

import (
	"strconv"
	"testing"
	"time"

	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/nodes/types"
)

// makeNode is a helper that creates a minimal ServiceNode for tests.
func makeNode(id, owner string, stakedUtmz int64, uptimeScore uint64, registeredAt int64) types.ServiceNode {
	return types.ServiceNode{
		Id:           id,
		OwnerAddress: owner,
		Endpoint:     "https://node.tamizhi.ai",
		Status:       types.NodeStatusActive,
		StakedAmount: &types.Coin{Denom: "utmz", Amount: strconv.FormatInt(stakedUtmz, 10)},
		UptimeScore:  uptimeScore,
		RegisteredAt: registeredAt,
	}
}

// TestJailNode_SetsStatusJailed verifies that JailNode transitions an ACTIVE node to JAILED.
func TestJailNode_SetsStatusJailed(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	node := makeNode("jail-node-1", testOwner, 15_000_000_000, 50, 0)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	if err := k.JailNode(ctx, "jail-node-1"); err != nil {
		t.Fatalf("JailNode returned unexpected error: %v", err)
	}

	got, err := k.GetNode(ctx, "jail-node-1")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.Status != types.NodeStatusJailed {
		t.Errorf("expected status JAILED, got %q", got.Status)
	}
}

// TestJailNode_AlreadyJailed verifies that jailing an already-jailed node returns ErrNodeJailed.
func TestJailNode_AlreadyJailed(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	node := makeNode("jail-node-2", testOwner, 15_000_000_000, 5, 0)
	node.Status = types.NodeStatusJailed
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	err := k.JailNode(ctx, "jail-node-2")
	if err == nil {
		t.Fatal("expected ErrNodeJailed for already-jailed node, got nil")
	}
	if !isErrCode(err, types.ErrNodeJailed) {
		t.Errorf("expected ErrNodeJailed, got: %v", err)
	}
}

// TestUnjailNode_RestoresActive verifies that UnjailNode transitions a JAILED node back to ACTIVE.
func TestUnjailNode_RestoresActive(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	node := makeNode("unjail-node-1", testOwner, 15_000_000_000, 5, 0)
	node.Status = types.NodeStatusJailed
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	if err := k.UnjailNode(ctx, "unjail-node-1", testOwner); err != nil {
		t.Fatalf("UnjailNode returned unexpected error: %v", err)
	}

	got, err := k.GetNode(ctx, "unjail-node-1")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.Status != types.NodeStatusActive {
		t.Errorf("expected status ACTIVE after unjail, got %q", got.Status)
	}
	// UptimeScore should be reset to 0.
	if got.UptimeScore != 0 {
		t.Errorf("expected UptimeScore reset to 0, got %d", got.UptimeScore)
	}
}

// TestUnjailNode_WrongOwner verifies that a non-owner cannot unjail a node.
func TestUnjailNode_WrongOwner(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	node := makeNode("unjail-node-2", testOwner, 15_000_000_000, 5, 0)
	node.Status = types.NodeStatusJailed
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	otherOwner := sdk.AccAddress([]byte("otherowner1234567890")).String()
	err := k.UnjailNode(ctx, "unjail-node-2", otherOwner)
	if err == nil {
		t.Fatal("expected ErrNotNodeOwner, got nil")
	}
	if !isErrCode(err, types.ErrNotNodeOwner) {
		t.Errorf("expected ErrNotNodeOwner, got: %v", err)
	}
}

// TestSlashNode_ReducesStake verifies that SlashNode deducts 5% of the staked amount.
func TestSlashNode_ReducesStake(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	const initialStake = int64(20_000_000_000) // well above MinNodeStake after 5% slash
	node := makeNode("slash-node-1", testOwner, initialStake, 50, 0)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	fraction, err := sdkmath.LegacyNewDecFromStr("0.05")
	if err != nil {
		t.Fatalf("LegacyNewDecFromStr: %v", err)
	}

	if err := k.SlashNode(ctx, "slash-node-1", fraction); err != nil {
		t.Fatalf("SlashNode returned unexpected error: %v", err)
	}

	got, err := k.GetNode(ctx, "slash-node-1")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}

	// Expected: 20_000_000_000 * 0.95 = 19_000_000_000
	expectedRemaining := int64(19_000_000_000)
	gotAmt, _ := strconv.ParseInt(got.StakedAmount.Amount, 10, 64)
	if gotAmt != expectedRemaining {
		t.Errorf("expected remaining stake %d, got %d", expectedRemaining, gotAmt)
	}
	// Node should NOT be jailed (remaining is above MinNodeStake).
	if got.Status == types.NodeStatusJailed {
		t.Error("node should not be jailed after slash when remaining stake is above minimum")
	}
}

// TestSlashNode_JailsWhenBelowMinStake verifies that a node is jailed when its
// remaining stake falls below MinNodeStake after slashing.
func TestSlashNode_JailsWhenBelowMinStake(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	// Start just above min stake so a 5% slash drops it below.
	const initialStake = int64(15_500_000_000)
	node := makeNode("slash-node-2", testOwner, initialStake, 50, 0)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	fraction, _ := sdkmath.LegacyNewDecFromStr("0.05")
	if err := k.SlashNode(ctx, "slash-node-2", fraction); err != nil {
		t.Fatalf("SlashNode: %v", err)
	}

	got, err := k.GetNode(ctx, "slash-node-2")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.Status != types.NodeStatusJailed {
		t.Errorf("expected JAILED status when remaining stake is below minimum, got %q", got.Status)
	}
}

// TestEndBlockSlashing_JailsLowUptimeNodes verifies that nodes with low uptime
// are jailed after the grace period.
func TestEndBlockSlashing_JailsLowUptimeNodes(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	// registeredAt = 0, current block = 200 → 200 blocks active, past the 100-block grace period.
	ctx = ctx.WithBlockHeight(200)

	node := makeNode("slash-end-1", testOwner, 20_000_000_000, 10 /* below threshold 20 */, 0)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	if err := k.EndBlockSlashing(ctx); err != nil {
		t.Fatalf("EndBlockSlashing: %v", err)
	}

	got, err := k.GetNode(ctx, "slash-end-1")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.Status != types.NodeStatusJailed {
		t.Errorf("expected JAILED after EndBlockSlashing for low-uptime node, got %q", got.Status)
	}
}

// TestEndBlockSlashing_DoesNotJailHighUptimeNodes verifies that healthy nodes are untouched.
func TestEndBlockSlashing_DoesNotJailHighUptimeNodes(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())
	ctx = ctx.WithBlockHeight(200)

	node := makeNode("slash-end-2", testOwner, 20_000_000_000, 80 /* above threshold */, 0)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	if err := k.EndBlockSlashing(ctx); err != nil {
		t.Fatalf("EndBlockSlashing: %v", err)
	}

	got, err := k.GetNode(ctx, "slash-end-2")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.Status == types.NodeStatusJailed {
		t.Error("healthy node should not be jailed by EndBlockSlashing")
	}
}

// TestEndBlockSlashing_GracePeriodRespected verifies that nodes registered fewer
// than MinBlocksBeforeSlash blocks ago are not slashed.
func TestEndBlockSlashing_GracePeriodRespected(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	// Current block 50, registeredAt 0 → only 50 blocks active, within the 100-block grace period.
	ctx = ctx.WithBlockHeight(50)

	node := makeNode("slash-grace-1", testOwner, 20_000_000_000, 0 /* terrible uptime */, 0)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	if err := k.EndBlockSlashing(ctx); err != nil {
		t.Fatalf("EndBlockSlashing: %v", err)
	}

	got, err := k.GetNode(ctx, "slash-grace-1")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.Status == types.NodeStatusJailed {
		t.Error("node within grace period should not be jailed")
	}
	// Stake should be unchanged.
	if got.StakedAmount.Amount != "20000000000" {
		t.Errorf("stake should be unchanged during grace period, got %s", got.StakedAmount.Amount)
	}
}

// TestReportHeartbeat_IncrementsScore verifies that ReportHeartbeat increments uptime score.
func TestReportHeartbeat_IncrementsScore(t *testing.T) {
	k, ctx := newTestKeeper(t)
	now := time.Now()
	ctx = ctx.WithBlockTime(now)

	node := makeNode("hb-node-1", testOwner, 15_000_000_000, 40, 0)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	if err := k.ReportHeartbeat(ctx, "hb-node-1", testOwner); err != nil {
		t.Fatalf("ReportHeartbeat: %v", err)
	}

	got, err := k.GetNode(ctx, "hb-node-1")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.UptimeScore != 41 {
		t.Errorf("expected UptimeScore 41, got %d", got.UptimeScore)
	}
	if got.LastRewardAt != now.Unix() {
		t.Errorf("expected LastRewardAt %d, got %d", now.Unix(), got.LastRewardAt)
	}
}

// TestReportHeartbeat_CapsAt100 verifies that the uptime score doesn't exceed 100.
func TestReportHeartbeat_CapsAt100(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	node := makeNode("hb-node-2", testOwner, 15_000_000_000, 100, 0)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	if err := k.ReportHeartbeat(ctx, "hb-node-2", testOwner); err != nil {
		t.Fatalf("ReportHeartbeat: %v", err)
	}

	got, err := k.GetNode(ctx, "hb-node-2")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.UptimeScore != 100 {
		t.Errorf("expected UptimeScore capped at 100, got %d", got.UptimeScore)
	}
}

// TestReportHeartbeat_JailedNodeRejected verifies that a jailed node cannot report heartbeat.
func TestReportHeartbeat_JailedNodeRejected(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	node := makeNode("hb-node-3", testOwner, 15_000_000_000, 5, 0)
	node.Status = types.NodeStatusJailed
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	err := k.ReportHeartbeat(ctx, "hb-node-3", testOwner)
	if err == nil {
		t.Fatal("expected ErrNodeJailed for jailed node heartbeat, got nil")
	}
	if !isErrCode(err, types.ErrNodeJailed) {
		t.Errorf("expected ErrNodeJailed, got: %v", err)
	}
}
