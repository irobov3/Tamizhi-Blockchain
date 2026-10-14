package types

import "fmt"

const (
	DefaultMaxLogsPerEmployee = uint64(10_000)
	DefaultLogRetentionDays   = uint64(365)
)

type Params struct {
	MaxLogsPerEmployee uint64 `json:"max_logs_per_employee"`
	LogRetentionDays   uint64 `json:"log_retention_days"`
}

func DefaultParams() Params {
	return Params{
		MaxLogsPerEmployee: DefaultMaxLogsPerEmployee,
		LogRetentionDays:   DefaultLogRetentionDays,
	}
}

func (p Params) Validate() error {
	if p.MaxLogsPerEmployee == 0 {
		return fmt.Errorf("max_logs_per_employee must be > 0")
	}
	if p.LogRetentionDays == 0 {
		return fmt.Errorf("log_retention_days must be > 0")
	}
	return nil
}
