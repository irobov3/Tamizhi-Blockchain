package keeper

import (
	"github.com/cosmos/cosmos-sdk/telemetry"
	metrics "github.com/hashicorp/go-metrics"
)

func emitNodeRegistered(swarmID string) {
	telemetry.IncrCounterWithLabels([]string{"tamizhi", "nodes_registered"}, 1,
		[]metrics.Label{{Name: "swarm_id", Value: swarmID}})
}

func emitNodeJailed(nodeID string) {
	_ = nodeID // available for future label extension
	telemetry.IncrCounter(1, "tamizhi", "nodes_jailed")
}

func emitNodeSlashed(nodeID string) {
	_ = nodeID // available for future label extension
	telemetry.IncrCounter(1, "tamizhi", "nodes_slashed")
}

func emitNodeRewardClaimed(nodeID string) {
	_ = nodeID // available for future label extension
	telemetry.IncrCounter(1, "tamizhi", "node_rewards_claimed")
}
