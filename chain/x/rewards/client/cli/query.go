package cli

import (
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/rewards/types"
)

// GetQueryCmd returns the query commands for the rewards module.
func GetQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Rewards module query commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdListRules(),
		CmdGetRule(),
		CmdGetRecords(),
	)

	return cmd
}

// CmdListRules returns the CLI command to list all reward rules.
//
// Usage:
//
//	tamizhi query rewards list-rules
func CmdListRules() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-rules",
		Short: "List all reward rules on chain",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.ListRewardRules(cmd.Context(), &types.QueryListRewardRulesRequest{})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdGetRule returns the CLI command to query a single reward rule by ID.
//
// Usage:
//
//	tamizhi query rewards get-rule [rule-id]
func CmdGetRule() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-rule [rule-id]",
		Short: "Query a reward rule by its ID",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetRewardRule(cmd.Context(), &types.QueryGetRewardRuleRequest{
				RuleId: args[0],
			})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdGetRecords returns the CLI command to query reward records for an employee.
//
// Usage:
//
//	tamizhi query rewards get-records [employee-id]
func CmdGetRecords() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-records [employee-id]",
		Short: "Query reward records for an employee",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetRewardRecords(cmd.Context(), &types.QueryGetRewardRecordsRequest{
				EmployeeId: args[0],
			})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}
