package cli

import (
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/nodes/types"
)

// GetQueryCmd returns the query commands for the nodes module.
func GetQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Nodes module query commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdGetNode(),
		CmdListActiveNodes(),
		CmdListNodesBySwarm(),
		CmdGetSwarms(),
	)

	return cmd
}

// CmdGetNode returns the CLI command to query a single service node by ID.
//
// Usage:
//
//	tamizhi query nodes get [node-id]
func CmdGetNode() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get [node-id]",
		Short: "Query a service node by its ID",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetNode(cmd.Context(), &types.QueryGetNodeRequest{
				NodeID: args[0],
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

// CmdListActiveNodes returns the CLI command to list all active service nodes.
//
// Usage:
//
//	tamizhi query nodes list-active
func CmdListActiveNodes() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-active",
		Short: "List all active service nodes",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.ListActiveNodes(cmd.Context(), &types.QueryListActiveNodesRequest{})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdListNodesBySwarm returns the CLI command to list all nodes in a swarm.
//
// Usage:
//
//	tamizhi query nodes list-by-swarm [swarm-id]
func CmdListNodesBySwarm() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-by-swarm [swarm-id]",
		Short: "List all service nodes belonging to a swarm",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.ListNodesBySwarm(cmd.Context(), &types.QueryListNodesBySwarmRequest{
				SwarmID: args[0],
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

// CmdGetSwarms returns the CLI command to list all swarms.
//
// Usage:
//
//	tamizhi query nodes get-swarms
func CmdGetSwarms() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-swarms",
		Short: "List all swarms on chain",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetSwarms(cmd.Context(), &types.QueryGetSwarmsRequest{})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}
