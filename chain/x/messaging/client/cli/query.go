package cli

import (
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/messaging/types"
)

// GetQueryCmd returns the query commands for the messaging module.
func GetQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Messaging module query commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdGetSession(),
		CmdGetSessionByPubKey(),
		CmdGetGroup(),
		CmdListGroups(),
		CmdListNodes(),
	)

	return cmd
}

// CmdGetSession returns the CLI command to query a session ID by wallet address.
//
// Usage:
//
//	tamizhi query messaging get-session [wallet-address]
func CmdGetSession() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-session [wallet-address]",
		Short: "Query a session ID by wallet address",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetSessionID(cmd.Context(), &types.QueryGetSessionIDRequest{
				WalletAddress: args[0],
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

// CmdGetSessionByPubKey returns the CLI command to query a session ID by public key.
//
// Usage:
//
//	tamizhi query messaging get-session-by-pubkey [pub-key]
func CmdGetSessionByPubKey() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-session-by-pubkey [pub-key]",
		Short: "Query a session ID by its session public key",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetSessionIDByPubKey(cmd.Context(), &types.QueryGetSessionIDByPubKeyRequest{
				PubKey: args[0],
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

// CmdGetGroup returns the CLI command to query a group conversation by ID.
//
// Usage:
//
//	tamizhi query messaging get-group [group-id]
func CmdGetGroup() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-group [group-id]",
		Short: "Query a group conversation by its ID",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.GetGroup(cmd.Context(), &types.QueryGetGroupRequest{
				GroupID: args[0],
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

// CmdListGroups returns the CLI command to list all groups for a session pub key.
//
// Usage:
//
//	tamizhi query messaging list-groups [session-pub-key]
func CmdListGroups() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-groups [session-pub-key]",
		Short: "List all group conversations that a session pub key is a member of",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			queryClient := types.NewQueryClient(clientCtx)
			res, err := queryClient.ListGroupsByMember(cmd.Context(), &types.QueryListGroupsByMemberRequest{
				SessionPubKey: args[0],
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

// CmdListNodes returns the CLI command to list all active messaging service nodes.
//
// Usage:
//
//	tamizhi query messaging list-nodes
func CmdListNodes() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-nodes",
		Short: "List all active messaging service nodes",
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
