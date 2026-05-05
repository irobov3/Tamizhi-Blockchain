package cli

import (
	"fmt"
	"strconv"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/accesslog/types"
)

// GetQueryCmd returns the query commands for the accesslog module.
func GetQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Accesslog module query commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdGetLog(),
		CmdListLogsByEmployee(),
		CmdListLogs(),
	)

	return cmd
}

// CmdGetLog returns the CLI command to query a single access log entry by ID.
//
// Usage:
//
//	tamizhi query accesslog get [id]
func CmdGetLog() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get [id]",
		Short: "Query an access log entry by its numeric ID",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			id, err := strconv.ParseUint(args[0], 10, 64)
			if err != nil {
				return fmt.Errorf("invalid log ID %q: must be a non-negative integer", args[0])
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetLog(cmd.Context(), &types.QueryGetLogRequest{
				Id: id,
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

// CmdListLogsByEmployee returns the CLI command to list access logs for an employee.
//
// Usage:
//
//	tamizhi query accesslog list-by-employee [employee-id]
func CmdListLogsByEmployee() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-by-employee [employee-id]",
		Short: "List all access log entries for an employee",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetLogsByEmployee(cmd.Context(), &types.QueryGetLogsByEmployeeRequest{
				EmployeeID: args[0],
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

// CmdListLogs returns the CLI command to list all access log entries.
//
// Usage:
//
//	tamizhi query accesslog list
func CmdListLogs() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List all access log entries on chain",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.ListLogs(cmd.Context(), &types.QueryListLogsRequest{})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}
