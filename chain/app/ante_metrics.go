package app

import "github.com/cosmos/cosmos-sdk/telemetry"

// emitBlockedTx increments the counter of transactions blocked by the blocklist.
func emitBlockedTx(address string) {
	_ = address // available for future label extension
	telemetry.IncrCounter(1, "tamizhi", "ante_blocked_txs")
}

// emitRateLimited increments the counter of transactions rejected by rate limiting.
func emitRateLimited(address string) {
	_ = address // available for future label extension
	telemetry.IncrCounter(1, "tamizhi", "ante_rate_limited")
}

// emitInsufficientFee increments the counter of transactions rejected for insufficient fee.
func emitInsufficientFee() {
	telemetry.IncrCounter(1, "tamizhi", "ante_insufficient_fee")
}
