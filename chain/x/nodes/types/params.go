package types

import "fmt"

const (
	DefaultMinStakeAmount      = uint64(15_000_000_000)
	DefaultUptimeJailThreshold = uint64(20)
	DefaultSlashFraction       = "0.05"
	DefaultMaxNodesPerSwarm    = uint64(10)
)

type Params struct {
	MinStakeAmount      uint64 `json:"min_stake_amount"`
	UptimeJailThreshold uint64 `json:"uptime_jail_threshold"`
	SlashFraction       string `json:"slash_fraction"`
	MaxNodesPerSwarm    uint64 `json:"max_nodes_per_swarm"`
}

func DefaultParams() Params {
	return Params{
		MinStakeAmount:      DefaultMinStakeAmount,
		UptimeJailThreshold: DefaultUptimeJailThreshold,
		SlashFraction:       DefaultSlashFraction,
		MaxNodesPerSwarm:    DefaultMaxNodesPerSwarm,
	}
}

func (p Params) Validate() error {
	if p.MinStakeAmount == 0 {
		return fmt.Errorf("min_stake_amount must be > 0")
	}
	if p.SlashFraction == "" {
		return fmt.Errorf("slash_fraction cannot be empty")
	}
	if p.MaxNodesPerSwarm == 0 {
		return fmt.Errorf("max_nodes_per_swarm must be > 0")
	}
	return nil
}
