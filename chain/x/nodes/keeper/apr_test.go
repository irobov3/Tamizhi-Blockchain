package keeper_test

import (
	"context"
	"fmt"
	"strconv"
	"testing"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/nodes/keeper"
	"github.com/tamizhi/chain/x/nodes/types"
)

// wrapContext converts a sdk.Context into a context.Context for the Querier.
func wrapContext(ctx sdk.Context) context.Context {
	return ctx
}

// makeAPRNode is a helper that builds a ServiceNode ready to store via SetNodeGenesis.
func makeAPRNode(id string, stakeUtmz int64, uptimeScore, messagesStored uint64) types.ServiceNode {
	return types.ServiceNode{
		Id:             id,
		Endpoint:       fmt.Sprintf("https://%s.tamizhi.ai", id),
		Status:         types.NodeStatusActive,
		OwnerAddress:   testOwner,
		StakedAmount:   &types.Coin{Denom: "utmz", Amount: strconv.FormatInt(stakeUtmz, 10)},
		UptimeScore:    uptimeScore,
		MessagesStored: messagesStored,
	}
}

// computeExpectedAPR applies the formula: (msgs * RewardPerMessage * (uptime/100) * 365 / stake) * 100
func computeExpectedAPR(msgs uint64, uptime uint64, stakeUtmz int64) string {
	if stakeUtmz == 0 {
		return "0.00"
	}
	daily := float64(msgs) * float64(types.RewardPerMessage) * (float64(uptime) / 100.0)
	apr := (daily * 365.0 / float64(stakeUtmz)) * 100.0
	return fmt.Sprintf("%.2f", apr)
}

// TestEstimateAPR_NoNodes — empty state returns 0% network APR.
func TestEstimateAPR_NoNodes(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())
	q := keeper.NewQuerier(k)

	resp, err := q.EstimateAPR(wrapContext(ctx), &types.QueryEstimateAPRRequest{})
	if err != nil {
		t.Fatalf("EstimateAPR returned error: %v", err)
	}
	if resp.NetworkAPR != "0.00" {
		t.Errorf("expected NetworkAPR=0.00, got %q", resp.NetworkAPR)
	}
	if resp.EstimatedAPR != "0.00" {
		t.Errorf("expected EstimatedAPR=0.00, got %q", resp.EstimatedAPR)
	}
	if resp.TotalNetworkStaked != "0" {
		t.Errorf("expected TotalNetworkStaked=0, got %q", resp.TotalNetworkStaked)
	}
}

// TestEstimateAPR_SingleNode — register one node, verify APR matches formula.
func TestEstimateAPR_SingleNode(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	const (
		stakeUtmz      = int64(15_000_000_000) // 15 000 TMZ
		uptimeScore    = uint64(80)
		messagesStored = uint64(500)
	)

	node := makeAPRNode("node-single", stakeUtmz, uptimeScore, messagesStored)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	q := keeper.NewQuerier(k)

	// Network-wide query should equal single-node APR.
	resp, err := q.EstimateAPR(wrapContext(ctx), &types.QueryEstimateAPRRequest{})
	if err != nil {
		t.Fatalf("EstimateAPR (network): %v", err)
	}
	want := computeExpectedAPR(messagesStored, uptimeScore, stakeUtmz)
	if resp.NetworkAPR != want {
		t.Errorf("NetworkAPR: want %q, got %q", want, resp.NetworkAPR)
	}

	// Node-specific query.
	respNode, err := q.EstimateAPR(wrapContext(ctx), &types.QueryEstimateAPRRequest{NodeID: "node-single"})
	if err != nil {
		t.Fatalf("EstimateAPR (node): %v", err)
	}
	if respNode.EstimatedAPR != want {
		t.Errorf("EstimatedAPR (node): want %q, got %q", want, respNode.EstimatedAPR)
	}
	if respNode.NodeID != "node-single" {
		t.Errorf("NodeID: want %q, got %q", "node-single", respNode.NodeID)
	}
	if respNode.UptimeScore != uptimeScore {
		t.Errorf("UptimeScore: want %d, got %d", uptimeScore, respNode.UptimeScore)
	}
	if respNode.MessagesStored != messagesStored {
		t.Errorf("MessagesStored: want %d, got %d", messagesStored, respNode.MessagesStored)
	}
}

// TestEstimateAPR_NetworkWide — multiple nodes, network APR is correctly aggregated.
func TestEstimateAPR_NetworkWide(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	nodes := []struct {
		id       string
		stake    int64
		uptime   uint64
		messages uint64
	}{
		{"node-a", 15_000_000_000, 100, 200},
		{"node-b", 30_000_000_000, 50, 400},
		{"node-c", 20_000_000_000, 75, 300},
	}

	var totalStake int64
	var totalDailyReward float64
	for _, n := range nodes {
		node := makeAPRNode(n.id, n.stake, n.uptime, n.messages)
		if err := k.SetNodeGenesis(ctx, node); err != nil {
			t.Fatalf("SetNodeGenesis %s: %v", n.id, err)
		}
		totalStake += n.stake
		totalDailyReward += float64(n.messages) * float64(types.RewardPerMessage) * (float64(n.uptime) / 100.0)
	}

	wantNetworkAPR := fmt.Sprintf("%.2f", (totalDailyReward*365.0/float64(totalStake))*100.0)

	q := keeper.NewQuerier(k)
	resp, err := q.EstimateAPR(wrapContext(ctx), &types.QueryEstimateAPRRequest{})
	if err != nil {
		t.Fatalf("EstimateAPR: %v", err)
	}
	if resp.NetworkAPR != wantNetworkAPR {
		t.Errorf("NetworkAPR: want %q, got %q", wantNetworkAPR, resp.NetworkAPR)
	}
	wantStake := fmt.Sprintf("%d", totalStake)
	if resp.TotalNetworkStaked != wantStake {
		t.Errorf("TotalNetworkStaked: want %q, got %q", wantStake, resp.TotalNetworkStaked)
	}
}

// TestEstimateAPR_ZeroUptimeScore — a node with uptime=0 gets 0 daily reward, 0% APR.
func TestEstimateAPR_ZeroUptimeScore(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	node := makeAPRNode("node-zero-uptime", 15_000_000_000, 0, 1000)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	q := keeper.NewQuerier(k)
	resp, err := q.EstimateAPR(wrapContext(ctx), &types.QueryEstimateAPRRequest{NodeID: "node-zero-uptime"})
	if err != nil {
		t.Fatalf("EstimateAPR: %v", err)
	}
	if resp.EstimatedAPR != "0.00" {
		t.Errorf("EstimatedAPR: want 0.00, got %q", resp.EstimatedAPR)
	}
	if resp.DailyRewardEst != "0" {
		t.Errorf("DailyRewardEst: want 0, got %q", resp.DailyRewardEst)
	}
}

// TestEstimateAPR_HighMessagesStored — large message count yields high APR.
func TestEstimateAPR_HighMessagesStored(t *testing.T) {
	k, ctx := newTestKeeper(t)
	ctx = ctx.WithBlockTime(time.Now())

	const (
		stakeUtmz      = int64(15_000_000_000) // 15 000 TMZ
		uptimeScore    = uint64(100)
		messagesStored = uint64(1_000_000) // 1M messages
	)

	node := makeAPRNode("node-high-msgs", stakeUtmz, uptimeScore, messagesStored)
	if err := k.SetNodeGenesis(ctx, node); err != nil {
		t.Fatalf("SetNodeGenesis: %v", err)
	}

	q := keeper.NewQuerier(k)
	resp, err := q.EstimateAPR(wrapContext(ctx), &types.QueryEstimateAPRRequest{NodeID: "node-high-msgs"})
	if err != nil {
		t.Fatalf("EstimateAPR: %v", err)
	}

	wantAPR := computeExpectedAPR(messagesStored, uptimeScore, stakeUtmz)
	if resp.EstimatedAPR != wantAPR {
		t.Errorf("EstimatedAPR: want %q, got %q", wantAPR, resp.EstimatedAPR)
	}

	// Verify APR is indeed high (> 100% for large message count).
	aprVal, err := strconv.ParseFloat(resp.EstimatedAPR, 64)
	if err != nil {
		t.Fatalf("cannot parse APR %q: %v", resp.EstimatedAPR, err)
	}
	if aprVal <= 100.0 {
		t.Errorf("expected high APR > 100%%, got %.2f%%", aprVal)
	}
}
