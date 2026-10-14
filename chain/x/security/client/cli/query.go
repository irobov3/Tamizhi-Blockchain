package cli

import (
	"fmt"
	"strconv"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/security/types"
)

// GetQueryCmd returns the query commands for the security module.
func GetQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Security module query commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdGetThreatFlag(),
		CmdListActiveThreatFlags(),
		CmdListThreatFlagsByEmployee(),
		CmdListSecurityEvents(),
		CmdIsBlocked(),
	)

	return cmd
}

// CmdGetThreatFlag returns the CLI command to query a threat flag by ID.
//
// Usage:
//
//	tamizhi query security get-flag [flag-id]
func CmdGetThreatFlag() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-flag [flag-id]",
		Short: "Query a threat flag by its numeric ID",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			flagID, err := strconv.ParseUint(args[0], 10, 64)
			if err != nil {
				return fmt.Errorf("invalid flag ID %q: must be a non-negative integer", args[0])
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetThreatFlag(cmd.Context(), &types.QueryGetThreatFlagRequest{
				FlagID: flagID,
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

// CmdListActiveThreatFlags returns the CLI command to list all active threat flags.
//
// Usage:
//
//	tamizhi query security list-active-flags
func CmdListActiveThreatFlags() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-active-flags",
		Short: "List all active (unresolved) threat flags",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.ListActiveThreatFlags(cmd.Context(), &types.QueryListActiveThreatFlagsRequest{})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdListThreatFlagsByEmployee returns the CLI command to list threat flags for an employee.
//
// Usage:
//
//	tamizhi query security list-flags [employee-id]
func CmdListThreatFlagsByEmployee() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-flags [employee-id]",
		Short: "List all threat flags associated with an employee",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.ListThreatFlagsByEmployee(cmd.Context(), &types.QueryListThreatFlagsByEmployeeRequest{
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

// CmdListSecurityEvents returns the CLI command to list all security events.
//
// Usage:
//
//	tamizhi query security list-events
func CmdListSecurityEvents() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-events",
		Short: "List all security events on chain",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.ListSecurityEvents(cmd.Context(), &types.QueryListSecurityEventsRequest{})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdIsBlocked returns the CLI command to check if an address is blocked.
//
// Usage:
//
//	tamizhi query security is-blocked [address]
func CmdIsBlocked() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "is-blocked [address]",
		Short: "Check whether an address is blocked",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.IsBlocked(cmd.Context(), &types.QueryIsBlockedRequest{
				Address: args[0],
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
