package cli

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/rewards/types"
)

// GetTxCmd returns the transaction commands for the rewards module.
func GetTxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Rewards module transaction commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdIssueReward(),
		CmdCreateRule(),
		CmdUpdateRule(),
	)

	return cmd
}

// CmdIssueReward returns the CLI command for issuing a reward to an employee.
//
// Usage:
//
//	tamizhi tx rewards issue-reward [employee-id] [rule-id] [memo] --from <key>
func CmdIssueReward() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "issue-reward [employee-id] [rule-id] [memo]",
		Short: "Issue a reward to an employee based on a reward rule",
		Args:  cobra.ExactArgs(3),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			msg := &types.MsgIssueReward{
				Authority:  fromAddr.String(),
				EmployeeID: args[0],
				RuleID:     args[1],
				Memo:       args[2],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdCreateRule returns the CLI command for creating a new reward rule.
//
// Usage:
//
//	tamizhi tx rewards create-rule [rule-json-file] --from <key>
func CmdCreateRule() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-rule [rule-json-file]",
		Short: "Create a new reward rule from a JSON file",
		Long: `Create a new on-chain reward rule.

The [rule-json-file] argument must be a path to a JSON file containing:
  {
    "id":          "rule-001",
    "activity":    "content-submission",
    "amount":      {"denom": "utmz", "amount": "1000"},
    "description": "Reward for submitting Tamil content",
    "active":      true,
    "max_per_day": 5
  }`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			fileBytes, err := os.ReadFile(args[0])
			if err != nil {
				return fmt.Errorf("failed to read rule JSON file %q: %w", args[0], err)
			}

			var rule types.RewardRule
			if err := json.Unmarshal(fileBytes, &rule); err != nil {
				return fmt.Errorf("failed to parse rule JSON: %w", err)
			}

			msg := &types.MsgCreateRewardRule{
				Authority: fromAddr.String(),
				Rule:      rule,
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdUpdateRule returns the CLI command for updating an existing reward rule.
//
// Usage:
//
//	tamizhi tx rewards update-rule [rule-json-file] --from <key>
func CmdUpdateRule() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-rule [rule-json-file]",
		Short: "Update an existing reward rule from a JSON file",
		Long: `Update an existing on-chain reward rule.

The [rule-json-file] argument must be a path to a JSON file containing
the full updated rule (same format as create-rule). The rule ID must
match an existing rule on-chain.`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			fileBytes, err := os.ReadFile(args[0])
			if err != nil {
				return fmt.Errorf("failed to read rule JSON file %q: %w", args[0], err)
			}

			var rule types.RewardRule
			if err := json.Unmarshal(fileBytes, &rule); err != nil {
				return fmt.Errorf("failed to parse rule JSON: %w", err)
			}

			msg := &types.MsgUpdateRewardRule{
				Authority: fromAddr.String(),
				Rule:      rule,
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}
