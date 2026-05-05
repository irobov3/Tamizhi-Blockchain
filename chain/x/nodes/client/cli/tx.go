package cli

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/nodes/types"
)

// GetTxCmd returns the transaction commands for the nodes module.
func GetTxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Nodes module transaction commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdRegisterNode(),
		CmdDeregisterNode(),
		CmdUpdateNodeEndpoint(),
		CmdClaimNodeReward(),
	)

	return cmd
}

// CmdRegisterNode returns the CLI command for registering a new service node.
//
// Usage:
//
//	tamizhi tx nodes register [node-json-file] --from <key>
func CmdRegisterNode() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "register [node-json-file]",
		Short: "Register a new service node on chain",
		Long: `Register a new Tamizhi service node.

The [node-json-file] argument must be a path to a JSON file containing:
  {
    "node_id":  "node-001",
    "endpoint": "https://node1.tamizhi.ai:8080",
    "stake":    {"denom": "utmz", "amount": "10000"}
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
				return fmt.Errorf("failed to read node JSON file %q: %w", args[0], err)
			}

			var msg types.MsgRegisterNode
			if err := json.Unmarshal(fileBytes, &msg); err != nil {
				return fmt.Errorf("failed to parse node JSON: %w", err)
			}

			msg.Creator = fromAddr.String()

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), &msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdDeregisterNode returns the CLI command for deregistering a service node.
//
// Usage:
//
//	tamizhi tx nodes deregister [node-id] --from <key>
func CmdDeregisterNode() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "deregister [node-id]",
		Short: "Deregister a service node from the chain",
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

			msg := &types.MsgDeregisterNode{
				Creator: fromAddr.String(),
				NodeID:  args[0],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdUpdateNodeEndpoint returns the CLI command for updating a node's endpoint.
//
// Usage:
//
//	tamizhi tx nodes update-endpoint [node-id] [endpoint] --from <key>
func CmdUpdateNodeEndpoint() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-endpoint [node-id] [endpoint]",
		Short: "Update the network endpoint of a registered service node",
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

			msg := &types.MsgUpdateNodeEndpoint{
				Creator:     fromAddr.String(),
				NodeID:      args[0],
				NewEndpoint: args[1],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdClaimNodeReward returns the CLI command for claiming a node's accrued reward.
//
// Usage:
//
//	tamizhi tx nodes claim-reward [node-id] --from <key>
func CmdClaimNodeReward() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "claim-reward [node-id]",
		Short: "Claim accrued rewards for a service node",
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

			msg := &types.MsgClaimNodeReward{
				Creator: fromAddr.String(),
				NodeID:  args[0],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}
