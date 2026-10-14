package keeper

import (
	"context"
	"fmt"
	"strconv"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/nodes/types"
)

// Querier wraps Keeper to implement types.QueryServer without name conflicts.
type Querier struct{ Keeper }

var _ types.QueryServer = Querier{}

// NewQuerier creates a new Querier.
func NewQuerier(k Keeper) Querier { return Querier{k} }

// GetNode returns the service node with the given ID.
func (q Querier) GetNode(goCtx context.Context, req *types.QueryGetNodeRequest) (*types.QueryGetNodeResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	node, err := q.Keeper.GetNode(ctx, req.NodeID)
	if err != nil {
		return nil, fmt.Errorf("node not found: %s", req.NodeID)
	}
	return &types.QueryGetNodeResponse{Node: node}, nil
}

// ListActiveNodes returns all nodes in ACTIVE status.
func (q Querier) ListActiveNodes(goCtx context.Context, _ *types.QueryListActiveNodesRequest) (*types.QueryListActiveNodesResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	nodes := q.Keeper.GetAllActiveNodes(ctx)
	ptrs := make([]*types.ServiceNode, len(nodes))
	for i := range nodes {
		n := nodes[i]
		ptrs[i] = &n
	}
	return &types.QueryListActiveNodesResponse{Nodes: ptrs}, nil
}

// ListNodesBySwarm returns all active nodes assigned to the given swarm.
func (q Querier) ListNodesBySwarm(goCtx context.Context, req *types.QueryListNodesBySwarmRequest) (*types.QueryListNodesBySwarmResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	nodes := q.Keeper.GetNodesBySwarm(ctx, req.SwarmID)
	ptrs := make([]*types.ServiceNode, len(nodes))
	for i := range nodes {
		n := nodes[i]
		ptrs[i] = &n
	}
	return &types.QueryListNodesBySwarmResponse{Nodes: ptrs}, nil
}

// GetSwarms returns all derived swarm groupings.
func (q Querier) GetSwarms(goCtx context.Context, _ *types.QueryGetSwarmsRequest) (*types.QueryGetSwarmsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	swarms := q.Keeper.GetAllSwarms(ctx)
	ptrs := make([]*types.Swarm, len(swarms))
	for i := range swarms {
		s := swarms[i]
		ptrs[i] = &s
	}
	return &types.QueryGetSwarmsResponse{Swarms: ptrs}, nil
}

// EstimateAPR calculates the estimated annual percentage return for staking as
// a service node. If req.NodeID is empty, a network-wide estimate is returned.
func (q Querier) EstimateAPR(goCtx context.Context, req *types.QueryEstimateAPRRequest) (*types.QueryEstimateAPRResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	allNodes := q.Keeper.GetAllActiveNodes(ctx)

	// Calculate network-wide totals.
	var totalStaked int64
	var totalDailyReward float64
	for _, node := range allNodes {
		stake := parseStake(node.StakedAmount)
		totalStaked += stake
		uptimeMult := float64(node.UptimeScore) / 100.0
		daily := float64(node.MessagesStored) * float64(types.RewardPerMessage) * uptimeMult
		totalDailyReward += daily
	}

	networkAPR := "0.00"
	if totalStaked > 0 {
		apr := (totalDailyReward * 365.0 / float64(totalStaked)) * 100.0
		networkAPR = fmt.Sprintf("%.2f", apr)
	}

	totalDailyInt := int64(totalDailyReward)

	// Network-wide estimate (no specific node requested).
	if req.NodeID == "" {
		return &types.QueryEstimateAPRResponse{
			NetworkAPR:         networkAPR,
			TotalNetworkStaked: fmt.Sprintf("%d", totalStaked),
			DailyRewardEst:     fmt.Sprintf("%d", totalDailyInt),
			AnnualRewardEst:    fmt.Sprintf("%d", totalDailyInt*365),
			EstimatedAPR:       networkAPR,
		}, nil
	}

	// Node-specific estimate.
	node, err := q.Keeper.GetNode(ctx, req.NodeID)
	if err != nil {
		return nil, err
	}

	stake := parseStake(node.StakedAmount)
	uptimeMult := float64(node.UptimeScore) / 100.0
	daily := float64(node.MessagesStored) * float64(types.RewardPerMessage) * uptimeMult

	nodeAPR := "0.00"
	if stake > 0 {
		apr := (daily * 365.0 / float64(stake)) * 100.0
		nodeAPR = fmt.Sprintf("%.2f", apr)
	}

	stakedAmountStr := ""
	if node.StakedAmount != nil {
		stakedAmountStr = node.StakedAmount.Amount
	}

	return &types.QueryEstimateAPRResponse{
		NodeID:             node.Id,
		StakedAmount:       stakedAmountStr,
		UptimeScore:        node.UptimeScore,
		MessagesStored:     node.MessagesStored,
		DailyRewardEst:     fmt.Sprintf("%d", int64(daily)),
		AnnualRewardEst:    fmt.Sprintf("%d", int64(daily*365)),
		EstimatedAPR:       nodeAPR,
		NetworkAPR:         networkAPR,
		TotalNetworkStaked: fmt.Sprintf("%d", totalStaked),
	}, nil
}

// parseStake extracts the int64 amount from a *types.Coin. Returns 0 on nil or parse error.
func parseStake(coin *types.Coin) int64 {
	if coin == nil {
		return 0
	}
	v, err := strconv.ParseInt(coin.Amount, 10, 64)
	if err != nil {
		return 0
	}
	return v
}
