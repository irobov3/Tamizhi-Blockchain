package cli

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/literature/types"
)

// GetTxCmd returns the transaction commands for the literature module.
func GetTxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Literature module transaction commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdSubmitWork(),
		CmdUpdateArweave(),
		CmdVerifyWork(),
	)

	return cmd
}

// CmdSubmitWork returns the CLI command for submitting a new literary work.
//
// Usage:
//
//	tamizhi tx literature submit-work [work-json-file] --from <key>
//
// The work-json-file should be a JSON file matching MsgSubmitWork fields.
func CmdSubmitWork() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "submit-work [work-json-file]",
		Short: "Submit a new literary work to the Tamizhi chain",
		Long: `Submit a new Tamil literary work.

The [work-json-file] argument must be a path to a JSON file containing:
  {
    "title":                "கம்பராமாயணம்",
    "title_transliterated": "Kambaramayanam",
    "title_english":        "Kamban's Ramayana",
    "author": {
      "name":                "கம்பர்",
      "name_transliterated": "Kambar",
      "era":                 "12th century CE",
      "region":              "Tamil Nadu"
    },
    "content": {
      "ipfs_cid":   "bafybeig...",
      "sha256_hash":"abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      "size_bytes": 1048576,
      "mime_type":  "text/plain",
      "encoding":   "utf-8"
    },
    "classification": {
      "period":   "medieval",
      "genre":    "epic",
      "tags":     ["ramayana","devotional","kavya"],
      "language": "Tamil",
      "script":   "Tamil"
    },
    "rights": {
      "license":        "public_domain",
      "is_public_domain": true
    },
    "description": "Tamil epic poem retelling the Ramayana."
  }`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			// Read and parse the JSON file
			filePath := args[0]
			fileBytes, err := os.ReadFile(filePath)
			if err != nil {
				return fmt.Errorf("failed to read work JSON file %q: %w", filePath, err)
			}

			var msg types.MsgSubmitWork
			if err := json.Unmarshal(fileBytes, &msg); err != nil {
				return fmt.Errorf("failed to parse work JSON: %w", err)
			}

			// Set the submitter to the key address
			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}
			msg.Submitter = fromAddr.String()

			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), &msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdUpdateArweave returns the CLI command for updating the Arweave TX ID of a work.
//
// Usage:
//
//	tamizhi tx literature update-arweave [work-id] [arweave-tx-id] --from <key>
func CmdUpdateArweave() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "update-arweave [work-id] [arweave-tx-id]",
		Short: "Update the Arweave transaction ID for a literary work",
		Long: `Update the Arweave transaction ID associated with an existing literary work.
Only the original submitter of the work may call this command.

Example:
  tamizhi tx literature update-arweave tmz-work-100-AABBCCDD abc123XYZ...arweave-txid --from mykey`,
		Args: cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			fromAddr := clientCtx.GetFromAddress()
			if fromAddr == nil {
				return fmt.Errorf("--from flag is required")
			}

			workID := args[0]
			arweaveTxID := args[1]

			msg := types.NewMsgUpdateArweave(fromAddr.String(), workID, arweaveTxID)
			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdVerifyWork returns the CLI command for verifying a literary work.
//
// Usage:
//
//	tamizhi tx literature verify-work [work-id] --from <curator-key> [--notes "..."]
func CmdVerifyWork() *cobra.Command {
	const flagNotes = "notes"

	cmd := &cobra.Command{
		Use:   "verify-work [work-id]",
		Short: "Mark a literary work as verified by a curator",
		Long: `Mark an existing literary work as curator-verified.

The caller must be an authorized curator on the Tamizhi chain.

Example:
  tamizhi tx literature verify-work tmz-work-100-AABBCCDD \
    --notes "Verified against original Kamban manuscript." \
    --from curatorkey`,
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

			workID := args[0]
			notes, _ := cmd.Flags().GetString(flagNotes)

			msg := types.NewMsgVerifyWork(fromAddr.String(), workID, notes)
			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	cmd.Flags().String(flagNotes, "", "Optional curator notes about the verification")
	flags.AddTxFlagsToCmd(cmd)
	return cmd
}
