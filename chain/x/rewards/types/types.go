package types

import (
	"fmt"

	sdkmath "cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	ModuleName = "rewards"
	StoreKey   = ModuleName
	RouterKey  = ModuleName

	KeyPrefixRewardRule   = "rule:"
	KeyPrefixRewardRecord = "reward:"
	KeyPrefixCounter      = "counter:"
	KeyPrefixDailyCount   = "daily:" // daily:<employeeID>:<ruleID>:<YYYYMMDD> → count
)

// RewardActivity defines what triggers a reward.
type RewardActivity string

const (
	ActivityFileUpload RewardActivity = "FILE_UPLOAD"
	ActivityFileShare  RewardActivity = "FILE_SHARE"
	ActivityLogin      RewardActivity = "LOGIN"
	ActivityCustom     RewardActivity = "CUSTOM"
)

// GenesisState for rewards module.
type GenesisState struct {
	Rules   []RewardRule   `json:"rules"`
	Records []RewardRecord `json:"records"`
}

func DefaultGenesisState() *GenesisState {
	return &GenesisState{
		Rules:   defaultRewardRules(),
		Records: []RewardRecord{},
	}
}

func defaultRewardRules() []RewardRule {
	return []RewardRule{
		{
			ID:          "file-upload",
			Activity:    string(ActivityFileUpload),
			Amount:      Coin{Denom: "utmz", Amount: "5000000"}, // 5 TMZ
			Description: "Reward for uploading a file to IPFS",
			Active:      true,
			MaxPerDay:   10,
		},
		{
			ID:          "file-share",
			Activity:    string(ActivityFileShare),
			Amount:      Coin{Denom: "utmz", Amount: "2000000"}, // 2 TMZ
			Description: "Reward for sharing a file",
			Active:      true,
			MaxPerDay:   20,
		},
		{
			ID:          "daily-login",
			Activity:    string(ActivityLogin),
			Amount:      Coin{Denom: "utmz", Amount: "1000000"}, // 1 TMZ
			Description: "Daily login reward",
			Active:      true,
			MaxPerDay:   1,
		},
	}
}

// Events
const (
	EventTypeIssueReward  = "issue_reward"
	EventTypeUpdateRule   = "update_reward_rule"
	AttributeKeyRuleID    = "rule_id"
	AttributeKeyRecipient = "recipient"
	AttributeKeyRewardAmt = "reward_amount"
)

// Errors
var (
	ErrRuleNotFound      = errorsmod.Register(ModuleName, 1, "reward rule not found")
	ErrRuleInactive      = errorsmod.Register(ModuleName, 2, "reward rule is inactive")
	ErrDailyLimitHit     = errorsmod.Register(ModuleName, 3, "daily reward limit reached for this activity")
	ErrNotAuthorized     = errorsmod.Register(ModuleName, 4, "not authorized to issue rewards")
	ErrRuleAlreadyExists = errorsmod.Register(ModuleName, 5, "reward rule already exists")
)

// ProtoToSDKCoin converts a proto Coin to sdk.Coin for bank keeper calls.
func ProtoToSDKCoin(c Coin) (sdk.Coin, error) {
	amt, ok := sdkmath.NewIntFromString(c.Amount)
	if !ok {
		return sdk.Coin{}, fmt.Errorf("invalid coin amount: %s", c.Amount)
	}
	return sdk.NewCoin(c.Denom, amt), nil
}
