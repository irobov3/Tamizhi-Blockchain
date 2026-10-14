package cli

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/nft/types"
)

// GetTxCmd returns the transaction commands for the nft module.
func GetTxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "NFT module transaction commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdMintNFT(),
		CmdTransferNFT(),
		CmdBurnNFT(),
	)

	return cmd
}

// CmdMintNFT returns the CLI command for minting a literary NFT.
//
// Usage:
//
//	tamizhi tx nft mint-nft [work-id] [collection-id] [royalty-bps] [transferable] [metadata-json-file] --from <key>
func CmdMintNFT() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "mint-nft [work-id] [collection-id] [royalty-bps] [transferable] [metadata-json-file]",
		Short: "Mint a new literary NFT on the Tamizhi chain",
		Long: `Mint a new NFT tied to an existing literary work.

Arguments:
  work-id           Chain-assigned ID of the literary work (e.g. tmz-work-100-AABBCCDD)
  collection-id     Collection ID (e.g. tamizhi-literature)
  royalty-bps       Royalty in basis points (0-10000, where 500 = 5%)
  transferable      Whether the NFT may be transferred (true|false)
  metadata-json-file  Path to a JSON file with NFT metadata:
                      {
                        "name":         "கம்பராமாயணம் #1",
                        "description":  "First edition NFT",
                        "image_uri":    "ipfs://bafybeig...",
                        "external_url": "https://tamizhi.ai/works/tmz-work-100-AABBCCDD"
                      }

Example:
  tamizhi tx nft mint-nft tmz-work-100-AABBCCDD tamizhi-literature 500 true metadata.json --from mykey`,
		Args: cobra.ExactArgs(5),
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
			collectionID := args[1]

			royaltyBPS, err := strconv.ParseUint(args[2], 10, 32)
			if err != nil {
				return fmt.Errorf("invalid royalty-bps %q: must be a non-negative integer", args[2])
			}
			if royaltyBPS > 10000 {
				return fmt.Errorf("royalty-bps must be between 0 and 10000, got %d", royaltyBPS)
			}

			transferable, err := strconv.ParseBool(args[3])
			if err != nil {
				return fmt.Errorf("invalid transferable value %q: must be true or false", args[3])
			}

			metadataBytes, err := os.ReadFile(args[4])
			if err != nil {
				return fmt.Errorf("failed to read metadata JSON file %q: %w", args[4], err)
			}
			var metadata types.NFTMetadata
			if err := json.Unmarshal(metadataBytes, &metadata); err != nil {
				return fmt.Errorf("failed to parse metadata JSON: %w", err)
			}

			msg := &types.MsgMintNFT{
				Creator:      fromAddr.String(),
				WorkID:       workID,
				CollectionID: collectionID,
				Royalty:      uint32(royaltyBPS),
				Transferable: transferable,
				Metadata:     metadata,
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdTransferNFT returns the CLI command for transferring an NFT.
//
// Usage:
//
//	tamizhi tx nft transfer-nft [token-id] [receiver-address] --from <owner-key>
func CmdTransferNFT() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "transfer-nft [token-id] [receiver-address]",
		Short: "Transfer ownership of a literary NFT",
		Long: `Transfer a literary NFT to a new owner.

The caller must be the current owner of the NFT and the NFT must be transferable.

Example:
  tamizhi tx nft transfer-nft col:tamizhi-literature:work:tmz-work-100-AABBCCDD tamizhi1xyz... --from ownerkey`,
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

			msg := &types.MsgTransferNFT{
				TokenID:  args[0],
				Owner:    fromAddr.String(),
				Receiver: args[1],
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// CmdBurnNFT returns the CLI command for permanently destroying an NFT.
//
// Usage:
//
//	tamizhi tx nft burn-nft [token-id] --from <owner-key>
func CmdBurnNFT() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "burn-nft [token-id]",
		Short: "Permanently destroy a literary NFT",
		Long: `Burn (permanently destroy) a literary NFT.

The caller must be the current owner of the NFT.

Example:
  tamizhi tx nft burn-nft col:tamizhi-literature:work:tmz-work-100-AABBCCDD --from ownerkey`,
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

			msg := &types.MsgBurnNFT{
				TokenID: args[0],
				Owner:   fromAddr.String(),
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}
