package types

import "fmt"

const (
	DefaultAutoBlockOnCritical = true
	DefaultThreatRetentionDays = uint64(90)
)

type Params struct {
	AutoBlockOnCritical bool   `json:"auto_block_on_critical"`
	ThreatRetentionDays uint64 `json:"threat_retention_days"`
}

func DefaultParams() Params {
	return Params{
		AutoBlockOnCritical: DefaultAutoBlockOnCritical,
		ThreatRetentionDays: DefaultThreatRetentionDays,
	}
}

func (p Params) Validate() error {
	if p.ThreatRetentionDays == 0 {
		return fmt.Errorf("threat_retention_days must be > 0")
	}
	return nil
}
