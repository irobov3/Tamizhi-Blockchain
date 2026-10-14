package keeper

import (
	"github.com/cosmos/cosmos-sdk/telemetry"
	metrics "github.com/hashicorp/go-metrics"
)

func emitAccessLogged(action string) {
	telemetry.IncrCounterWithLabels(
		[]string{"tamizhi", "access_logs_written"}, 1,
		[]metrics.Label{{Name: "action", Value: action}},
	)
}
