package types_test

import (
	"strings"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tamizhi/chain/x/rewards/types"
)

// FuzzMsgIssueReward_ValidateBasic fuzzes all string fields of MsgIssueReward to
// ensure ValidateBasic never panics regardless of adversarial input.
func FuzzMsgIssueReward_ValidateBasic(f *testing.F) {
	// Seed corpus: valid input
	f.Add(sdk.AccAddress([]byte("authority12345678901")).String(), "emp001", "rule-1", "memo")
	// Seed corpus: empty all fields
	f.Add("", "", "", "")
	// Seed corpus: invalid bech32 with null byte in other fields
	f.Add("not-bech32", "emp\x00id", "rule", strings.Repeat("x", 1000))
	// Seed corpus: valid authority, empty required fields
	f.Add(sdk.AccAddress([]byte("authority_test_addr")).String(), "", "", "")
	// Seed corpus: unicode Tamil characters
	f.Add("cosmos1qnk2n4nlkpw9xfqntladh74er2xa62wvn12345", "emp-தமிழ்", "rule-\xFF", "")
	// Seed corpus: very long memo
	f.Add(sdk.AccAddress([]byte("authority12345678901")).String(), "e", "r", strings.Repeat("m", 10000))
	// Seed corpus: all null bytes
	f.Add("\x00", "\x00", "\x00", "\x00")
	// Seed corpus: high-value unicode
	f.Add("\xFF\xFE", "emp", "rule", "")

	f.Fuzz(func(t *testing.T, authority, employeeID, ruleID, memo string) {
		msg := &types.MsgIssueReward{
			Authority:  authority,
			EmployeeID: employeeID,
			RuleID:     ruleID,
			Memo:       memo,
		}
		// Must not panic regardless of input — errors are fine, panics are not.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgCreateRewardRule_ValidateBasic fuzzes MsgCreateRewardRule to ensure
// ValidateBasic never panics with adversarial input including invalid amounts
// and malformed denoms.
func FuzzMsgCreateRewardRule_ValidateBasic(f *testing.F) {
	// Seed corpus: valid input
	f.Add(sdk.AccAddress([]byte("auth1234567890abcde")).String(), "rule-id", "activity", "1000000", "utmz", uint64(10))
	// Seed corpus: empty all fields
	f.Add("", "", "", "", "", uint64(0))
	// Seed corpus: bad authority, minimal other fields
	f.Add("bad", "r", "a", "-1", "", uint64(99999999))
	// Seed corpus: valid authority with invalid amount strings
	f.Add(sdk.AccAddress([]byte("authority_test_addr")).String(), "my-rule", "FILE_UPLOAD", "not-a-number", "utmz", uint64(1))
	// Seed corpus: null bytes everywhere
	f.Add("\x00\xFF", "\x00", "\x00", "\x00", "\x00", uint64(0))
	// Seed corpus: overflow-style numeric string
	f.Add(sdk.AccAddress([]byte("authority12345678901")).String(), "r", "a", strings.Repeat("9", 100), "utmz", uint64(1<<63-1))
	// Seed corpus: negative amount string
	f.Add(sdk.AccAddress([]byte("authority_test_addr")).String(), "rule", "act", "-999999999", "utmz", uint64(5))
	// Seed corpus: very long denom
	f.Add(sdk.AccAddress([]byte("authority_test_addr")).String(), "rule", "act", "100", strings.Repeat("x", 1000), uint64(1))

	f.Fuzz(func(t *testing.T, authority, ruleID, activity, amount, denom string, maxPerDay uint64) {
		msg := &types.MsgCreateRewardRule{
			Authority: authority,
			Rule: types.RewardRule{
				ID:        ruleID,
				Activity:  activity,
				Amount:    types.Coin{Denom: denom, Amount: amount},
				Active:    true,
				MaxPerDay: maxPerDay,
			},
		}
		// Must not panic — errors are acceptable, panics are findings.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgUpdateRewardRule_ValidateBasic fuzzes MsgUpdateRewardRule to ensure
// ValidateBasic never panics with adversarial input.
func FuzzMsgUpdateRewardRule_ValidateBasic(f *testing.F) {
	// Seed corpus: valid input
	f.Add(sdk.AccAddress([]byte("authority_test_addr")).String(), "existing-rule")
	// Seed corpus: empty fields
	f.Add("", "")
	// Seed corpus: invalid authority
	f.Add("not-bech32", "some-rule")
	// Seed corpus: null bytes
	f.Add("\x00\xFF\x80", "\x00rule\xFF")
	// Seed corpus: very long rule ID
	f.Add(sdk.AccAddress([]byte("authority_test_addr")).String(), strings.Repeat("r", 10000))

	f.Fuzz(func(t *testing.T, authority, ruleID string) {
		msg := &types.MsgUpdateRewardRule{
			Authority: authority,
			Rule: types.RewardRule{
				ID:     ruleID,
				Active: true,
			},
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}
