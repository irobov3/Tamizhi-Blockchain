package cli

import (
	"fmt"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/messaging/types"
)

// GetTxCmd returns the transaction commands for the messaging module.
func GetTxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Messaging module transaction commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdRegisterSession(),
		CmdUpdateSession(),
		CmdCreateGroup(),
		CmdAddMember(),
		CmdRemoveMember(),
	)

	return cmd
}

// CmdRegisterSession returns the CLI command for registering a messaging session ID.
//
// Usage:
//
//	tamizhi tx messaging register-session [session-pub-key] [display-name] --from <key>
func CmdRegisterSession() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "register-session [session-pub-key] [display-name]",
		Short: "Register a messaging session public key for a wallet",
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

			msg := &types.MsgRegisterSessionID{
				WalletAddress: fromAddr.String(),
				SessionPubKey: args[0],
				DisplayName:   args[1],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdUpdateSession returns the CLI command for updating a messaging session ID.
//
// Usage:
//
//	tamizhi tx messaging update-session [session-pub-key] [display-name] [avatar-ipfs] --from <key>
func CmdUpdateSession() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-session [session-pub-key] [display-name] [avatar-ipfs]",
		Short: "Update an existing messaging session ID",
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

			msg := &types.MsgUpdateSessionID{
				Creator:       fromAddr.String(),
				SessionPubKey: args[0],
				DisplayName:   args[1],
				AvatarIPFS:    args[2],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdCreateGroup returns the CLI command for creating a group conversation.
//
// Usage:
//
//	tamizhi tx messaging create-group [name] [description] [--encrypted] --from <key>
func CmdCreateGroup() *cobra.Command {
	const flagEncrypted = "encrypted"

	cmd := &cobra.Command{
		Use:   "create-group [name] [description]",
		Short: "Create a new group conversation",
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

			encrypted, _ := cmd.Flags().GetBool(flagEncrypted)

			msg := &types.MsgCreateGroup{
				Creator:     fromAddr.String(),
				Name:        args[0],
				Description: args[1],
				Encrypted:   encrypted,
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	cmd.Flags().Bool(flagEncrypted, false, "Create the group with end-to-end encryption enabled")
	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdAddMember returns the CLI command for adding a member to a group.
//
// Usage:
//
//	tamizhi tx messaging add-member [group-id] [member-session-pub-key] --from <key>
func CmdAddMember() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "add-member [group-id] [member-session-pub-key]",
		Short: "Add a member to a group conversation",
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

			msg := &types.MsgAddGroupMember{
				Creator:             fromAddr.String(),
				GroupID:             args[0],
				MemberSessionPubKey: args[1],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdRemoveMember returns the CLI command for removing a member from a group.
//
// Usage:
//
//	tamizhi tx messaging remove-member [group-id] [member-session-pub-key] --from <key>
func CmdRemoveMember() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "remove-member [group-id] [member-session-pub-key]",
		Short: "Remove a member from a group conversation",
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

			msg := &types.MsgRemoveGroupMember{
				Creator:             fromAddr.String(),
				GroupID:             args[0],
				MemberSessionPubKey: args[1],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

