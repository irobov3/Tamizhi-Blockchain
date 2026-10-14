package cli

import (
	"fmt"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/accesslog/types"
)

// GetTxCmd returns the transaction commands for the accesslog module.
func GetTxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Accesslog module transaction commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdLogAccess(),
	)

	return cmd
}

// CmdLogAccess returns the CLI command for logging a file access event.
//
// Usage:
//
//	tamizhi tx accesslog log [file-hash] [file-name] [action] [ipfs-cid] --from <key>
func CmdLogAccess() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "log [file-hash] [file-name] [action] [ipfs-cid]",
		Short: "Log a file access event on chain",
		Long: `Record a file access event on the Tamizhi chain.

Arguments:
  file-hash  SHA-256 hash of the accessed file
  file-name  Human-readable name of the file
  action     Access action (e.g. "read", "write", "delete")
  ipfs-cid   IPFS content identifier of the file

Example:
  tamizhi tx accesslog log \
    abcdef0123456789... \
    "document.pdf" \
    read \
    bafybeig... \
    --from mykey`,
		Args: cobra.ExactArgs(4),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			msg := &types.MsgLogAccess{
				Creator:    fromAddr.String(),
				EmployeeID: fromAddr.String(), // employee is derived from the signer
				FileHash:   args[0],
				FileName:   args[1],
				Action:     args[2],
				IPFSCid:    args[3],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}
