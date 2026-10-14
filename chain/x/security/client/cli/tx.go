package cli

import (
	"fmt"
	"strconv"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/security/types"
)

// GetTxCmd returns the transaction commands for the security module.
func GetTxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Security module transaction commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdRaiseThreatFlag(),
		CmdResolveThreatFlag(),
		CmdLogSecurityEvent(),
		CmdBlockAddress(),
		CmdUnblockAddress(),
	)

	return cmd
}

// CmdRaiseThreatFlag returns the CLI command for raising a threat flag.
//
// Usage:
//
//	tamizhi tx security raise-flag [employee-id] [address] [threat-type] [level] [action] [source] [description] --from <key>
func CmdRaiseThreatFlag() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "raise-flag [employee-id] [address] [threat-type] [level] [action] [source] [description]",
		Short: "Raise a threat flag for a suspicious entity",
		Args:  cobra.ExactArgs(7),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			msg := &types.MsgRaiseThreatFlag{
				Authority:   fromAddr.String(),
				EmployeeID:  args[0],
				Address:     args[1],
				ThreatType:  args[2],
				Level:       args[3],
				Action:      args[4],
				Source:      args[5],
				Description: args[6],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdResolveThreatFlag returns the CLI command for resolving a threat flag.
//
// Usage:
//
//	tamizhi tx security resolve-flag [flag-id] [resolution] --from <key>
func CmdResolveThreatFlag() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "resolve-flag [flag-id] [resolution]",
		Short: "Resolve an existing threat flag",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			flagID, err := strconv.ParseUint(args[0], 10, 64)
			if err != nil {
				return fmt.Errorf("invalid flag ID %q: must be a non-negative integer", args[0])
			}

			msg := &types.MsgResolveThreatFlag{
				Authority:  fromAddr.String(),
				FlagID:     flagID,
				Resolution: args[1],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdLogSecurityEvent returns the CLI command for logging a security event.
//
// Usage:
//
//	tamizhi tx security log-event [employee-id] [address] [event-type] [data-hash] [device-id] --from <key>
func CmdLogSecurityEvent() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "log-event [employee-id] [address] [event-type] [data-hash] [device-id]",
		Short: "Log a security event on chain",
		Args:  cobra.ExactArgs(5),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			msg := &types.MsgLogSecurityEvent{
				Authority:  fromAddr.String(),
				EmployeeID: args[0],
				Address:    args[1],
				EventType:  args[2],
				DataHash:   args[3],
				DeviceID:   args[4],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdBlockAddress returns the CLI command for blocking an address.
//
// Usage:
//
//	tamizhi tx security block-address [address] [reason] --from <key>
func CmdBlockAddress() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "block-address [address] [reason]",
		Short: "Block an address on the Tamizhi chain",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			msg := &types.MsgBlockAddress{
				Authority: fromAddr.String(),
				Address:   args[0],
				Reason:    args[1],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdUnblockAddress returns the CLI command for unblocking an address.
//
// Usage:
//
//	tamizhi tx security unblock-address [address] --from <key>
func CmdUnblockAddress() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "unblock-address [address]",
		Short: "Unblock a previously blocked address",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			msg := &types.MsgUnblockAddress{
				Authority: fromAddr.String(),
				Address:   args[0],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}
