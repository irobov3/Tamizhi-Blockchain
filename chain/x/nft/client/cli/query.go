package cli

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/nft/types"
)

// GetQueryCmd returns the query commands for the nft module.
func GetQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "NFT module query commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdGetNFT(),
		CmdListNFTsByOwner(),
		CmdListNFTsByWork(),
	)

	return cmd
}

// nftRestBase derives the REST base URL from the node RPC URI by replacing port 26657 → 1317.
func nftRestBase(nodeURI string) string {
	return strings.Replace(nodeURI, ":26657", ":1317", 1)
}

// CmdGetNFT returns the CLI command to query a single NFT by token ID.
//
// Usage:
//
//	tamizhi query nft get-nft [token-id]
func CmdGetNFT() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-nft [token-id]",
		Short: "Query a literary NFT by its token ID",
		Long: `Retrieve a literary NFT from the Tamizhi chain by its token ID.

Example:
  tamizhi query nft get-nft col:tamizhi-literature:work:tmz-work-100-AABBCCDD`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			tokenID := args[0]
			if tokenID == "" {
				return fmt.Errorf("token ID cannot be empty")
			}

			req := &types.QueryGetNFTRequest{TokenID: tokenID}
			reqBz, _ := json.MarshalIndent(req, "", "  ")

			base := nftRestBase(clientCtx.NodeURI)
			fmt.Fprintf(cmd.OutOrStdout(),
				"Querying NFT: %s\nRequest: %s\n\nREST endpoint: GET %s/tamizhi/nft/v1/tokens/%s\n",
				tokenID, string(reqBz), base, tokenID,
			)
			return nil
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdListNFTsByOwner returns the CLI command to list all NFTs owned by an address.
//
// Usage:
//
//	tamizhi query nft list-nfts-by-owner [owner-address]
func CmdListNFTsByOwner() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-nfts-by-owner [owner-address]",
		Short: "List all literary NFTs owned by a given address",
		Long: `Retrieve all NFTs currently owned by the given bech32 address.

Example:
  tamizhi query nft list-nfts-by-owner tamizhi1abc...xyz`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			owner := args[0]
			if owner == "" {
				return fmt.Errorf("owner address cannot be empty")
			}

			req := &types.QueryListNFTsByOwnerRequest{Owner: owner}
			reqBz, _ := json.MarshalIndent(req, "", "  ")

			base := nftRestBase(clientCtx.NodeURI)
			fmt.Fprintf(cmd.OutOrStdout(),
				"Querying NFTs by owner: %s\nRequest: %s\n\nREST endpoint: GET %s/tamizhi/nft/v1/tokens/owner/%s\n",
				owner, string(reqBz), base, owner,
			)
			return nil
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdListNFTsByWork returns the CLI command to list all NFTs for a given work.
//
// Usage:
//
//	tamizhi query nft list-nfts-by-work [work-id]
func CmdListNFTsByWork() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list-nfts-by-work [work-id]",
		Short: "List all NFTs associated with a given literary work",
		Long: `Retrieve all NFTs minted for the specified work ID.

Example:
  tamizhi query nft list-nfts-by-work tmz-work-100-AABBCCDD`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			workID := args[0]
			if workID == "" {
				return fmt.Errorf("work ID cannot be empty")
			}

			req := &types.QueryListNFTsByWorkRequest{WorkID: workID}
			reqBz, _ := json.MarshalIndent(req, "", "  ")

			base := nftRestBase(clientCtx.NodeURI)
			fmt.Fprintf(cmd.OutOrStdout(),
				"Querying NFTs by work: %s\nRequest: %s\n\nREST endpoint: GET %s/tamizhi/nft/v1/tokens/work/%s\n",
				workID, string(reqBz), base, workID,
			)
			return nil
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}
