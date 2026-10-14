package keeper

import (
	"github.com/cosmos/cosmos-sdk/telemetry"
	metrics "github.com/hashicorp/go-metrics"
)

const (
	metricRewardsIssued = "rewards_issued"
	metricRulesCreated  = "rules_created"
	metricDailyLimitHit = "daily_limit_hit"
)

// emitRewardIssued increments the reward issued counter.
func emitRewardIssued(ruleID string) {
	telemetry.IncrCounterWithLabels(
		[]string{"tamizhi", metricRewardsIssued},
		1,
		[]metrics.Label{
			{Name: "rule_id", Value: ruleID},
		},
	)
}

// emitDailyLimitHit increments the daily limit rejection counter.
func emitDailyLimitHit(employeeID, ruleID string) {
	_ = employeeID // available for future label extension
	telemetry.IncrCounterWithLabels(
		[]string{"tamizhi", metricDailyLimitHit},
		1,
		[]metrics.Label{
			{Name: "rule_id", Value: ruleID},
		},
	)
}

// emitRuleCreated increments the rule created counter.
func emitRuleCreated() {
	telemetry.IncrCounter(1, "tamizhi", metricRulesCreated)
}
