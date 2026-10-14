package types_test

import (
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tamizhi/chain/x/rewards/types"
)

var (
	validAuthority = sdk.AccAddress([]byte("authority_test_addr")).String()
)

const (
	validEmployee = "emp-001"
	validRuleID   = "file-upload"
)

// ── MsgIssueReward ValidateBasic ──────────────────────────────────────────────

func TestMsgIssueReward_ValidateBasic(t *testing.T) {
	t.Run("valid_message", func(t *testing.T) {
		msg := &types.MsgIssueReward{
			Authority:  validAuthority,
			EmployeeID: validEmployee,
			RuleID:     validRuleID,
		}
		if err := msg.ValidateBasic(); err != nil {
			t.Errorf("expected no error, got: %v", err)
		}
	})

	t.Run("invalid_authority_address", func(t *testing.T) {
		msg := &types.MsgIssueReward{
			Authority:  "not-a-bech32",
			EmployeeID: validEmployee,
			RuleID:     validRuleID,
		}
		if err := msg.ValidateBasic(); err == nil {
			t.Error("expected error for invalid authority address")
		}
	})

	t.Run("empty_employee_id", func(t *testing.T) {
		msg := &types.MsgIssueReward{
			Authority:  validAuthority,
			EmployeeID: "",
			RuleID:     validRuleID,
		}
		if err := msg.ValidateBasic(); err == nil {
			t.Error("expected error for empty employee ID")
		}
	})

	t.Run("empty_rule_id", func(t *testing.T) {
		msg := &types.MsgIssueReward{
			Authority:  validAuthority,
			EmployeeID: validEmployee,
			RuleID:     "",
		}
		if err := msg.ValidateBasic(); err == nil {
			t.Error("expected error for empty rule ID")
		}
	})
}

// ── MsgCreateRewardRule ValidateBasic ─────────────────────────────────────────
// Bug 2 (indirect): The error for duplicate rule creation was using ErrRuleNotFound
// instead of ErrRuleAlreadyExists. This test ensures the ValidateBasic path itself
// checks the rule's amount fields (which changed from sdk.Coin to proto Coin).

func TestMsgCreateRewardRule_ValidateBasic(t *testing.T) {
	t.Run("valid_rule", func(t *testing.T) {
		msg := &types.MsgCreateRewardRule{
			Authority: validAuthority,
			Rule: types.RewardRule{
				ID: "my-rule",
				Amount: types.Coin{
					Denom:  "utmz",
					Amount: "1000000",
				},
			},
		}
		if err := msg.ValidateBasic(); err != nil {
			t.Errorf("expected no error, got: %v", err)
		}
	})

	t.Run("invalid_authority", func(t *testing.T) {
		msg := &types.MsgCreateRewardRule{
			Authority: "bad",
			Rule: types.RewardRule{
				ID:     "my-rule",
				Amount: types.Coin{Denom: "utmz", Amount: "1000"},
			},
		}
		if err := msg.ValidateBasic(); err == nil {
			t.Error("expected error for bad authority address")
		}
	})

	t.Run("empty_rule_id", func(t *testing.T) {
		msg := &types.MsgCreateRewardRule{
			Authority: validAuthority,
			Rule: types.RewardRule{
				ID:     "",
				Amount: types.Coin{Denom: "utmz", Amount: "1000"},
			},
		}
		if err := msg.ValidateBasic(); err == nil {
			t.Error("expected error for empty rule ID")
		}
	})

	t.Run("missing_denom_rejected", func(t *testing.T) {
		msg := &types.MsgCreateRewardRule{
			Authority: validAuthority,
			Rule: types.RewardRule{
				ID:     "my-rule",
				Amount: types.Coin{Denom: "", Amount: "1000"},
			},
		}
		if err := msg.ValidateBasic(); err == nil {
			t.Error("expected error for empty denom")
		}
	})

	t.Run("missing_amount_rejected", func(t *testing.T) {
		msg := &types.MsgCreateRewardRule{
			Authority: validAuthority,
			Rule: types.RewardRule{
				ID:     "my-rule",
				Amount: types.Coin{Denom: "utmz", Amount: ""},
			},
		}
		if err := msg.ValidateBasic(); err == nil {
			t.Error("expected error for empty amount")
		}
	})
}

// ── Error variable correctness (Bug 2) ────────────────────────────────────────

func TestErrors_Distinct(t *testing.T) {
	// Before Bug 2 fix, CreateRewardRule returned ErrRuleNotFound on duplicates.
	// After fix, it returns ErrRuleAlreadyExists. Verify the two errors are distinct.
	if types.ErrRuleNotFound == types.ErrRuleAlreadyExists {
		t.Error("ErrRuleNotFound and ErrRuleAlreadyExists must be distinct errors")
	}
	if types.ErrRuleAlreadyExists == nil {
		t.Error("ErrRuleAlreadyExists must not be nil")
	}
}
