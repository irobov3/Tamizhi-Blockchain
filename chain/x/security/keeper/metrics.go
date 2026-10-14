package keeper

import (
	"github.com/cosmos/cosmos-sdk/telemetry"
	metrics "github.com/hashicorp/go-metrics"
)

func emitThreatFlagRaised(threatType, level string) {
	telemetry.IncrCounterWithLabels(
		[]string{"tamizhi", "threat_flags_raised"}, 1,
		[]metrics.Label{
			{Name: "type", Value: threatType},
			{Name: "level", Value: level},
		},
	)
}

func emitThreatFlagResolved() {
	telemetry.IncrCounter(1, "tamizhi", "threat_flags_resolved")
}

func emitBlockedTxAttempt(address string) {
	_ = address // available for future label extension
	telemetry.IncrCounter(1, "tamizhi", "ante_blocked_txs")
}
