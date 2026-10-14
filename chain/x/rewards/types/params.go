package types

import "fmt"

const (
	DefaultMaxDailyRewardPerEmployee = uint64(10)
	DefaultMinRewardAmount           = uint64(1_000_000)
	DefaultRewardDenom               = "utmz"
)

type Params struct {
	MaxDailyRewardPerEmployee uint64 `json:"max_daily_reward_per_employee"`
	MinRewardAmount           uint64 `json:"min_reward_amount"`
	RewardDenom               string `json:"reward_denom"`
}

func DefaultParams() Params {
	return Params{
		MaxDailyRewardPerEmployee: DefaultMaxDailyRewardPerEmployee,
		MinRewardAmount:           DefaultMinRewardAmount,
		RewardDenom:               DefaultRewardDenom,
	}
}

func (p Params) Validate() error {
	if p.MinRewardAmount == 0 {
		return fmt.Errorf("min_reward_amount must be > 0")
	}
	if p.RewardDenom == "" {
		return fmt.Errorf("reward_denom cannot be empty")
	}
	return nil
}
