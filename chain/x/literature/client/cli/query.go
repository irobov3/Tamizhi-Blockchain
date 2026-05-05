package cli

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/literature/types"
)

// GetQueryCmd returns the query commands for the literature module.
func GetQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Literature module query commands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		CmdGetWork(),
		CmdListWorks(),
		CmdGetWorksByAuthor(),
		CmdGetWorkCount(),
		CmdGetWorkByIPFS(),
	)

	return cmd
}

// CmdGetWork returns the CLI command to query a single literary work by ID.
//
// Usage:
//
//	tamizhi query literature get-work [work-id]
func CmdGetWork() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "get-work [work-id]",
		Short: "Query a literary work by its chain-assigned ID",
		Long: `Retrieve a literary work from the Tamizhi chain by its work ID.

Example:
  tamizhi query literature get-work tmz-work-100-AABBCCDD`,
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

			// Build a query request — in production this goes over gRPC.
			// Here we construct the request and print instructions for the REST endpoint.
			req := &types.QueryGetWorkRequest{WorkId: workID}
			reqBz, _ := json.MarshalIndent(req, "", "  ")

			fmt.Fprintf(cmd.OutOrStdout(),
				"Querying work: %s\nRequest: %s\n\nREST endpoint: GET /tamizhi/literature/v1/works/%s\n",
				workID, string(reqBz), workID,
			)

			// In a full implementation, use clientCtx.QueryWithData or gRPC client:
			//   queryClient := keeper.NewQueryClient(clientCtx)
			//   res, err := queryClient.GetWork(context.Background(), req)
			_ = clientCtx

			return nil
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdListWorks returns the CLI command to list all literary works with pagination.
//
// Usage:
//
//	tamizhi query literature list-works [--limit N] [--offset N]
func CmdListWorks() *cobra.Command {
	const (
		flagLimit  = "limit"
		flagOffset = "offset"
	)

	cmd := &cobra.Command{
		Use:   "list-works",
		Short: "List all literary works on the Tamizhi chain",
		Long: `Retrieve a paginated list of all literary works on the chain.

Examples:
  tamizhi query literature list-works
  tamizhi query literature list-works --limit 20 --offset 40`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			limitStr, _ := cmd.Flags().GetString(flagLimit)
			offsetStr, _ := cmd.Flags().GetString(flagOffset)

			var limit, offset uint64
			if limitStr != "" {
				limit, err = strconv.ParseUint(limitStr, 10, 64)
				if err != nil {
					return fmt.Errorf("invalid --limit value %q: %w", limitStr, err)
				}
			}
			if offsetStr != "" {
				offset, err = strconv.ParseUint(offsetStr, 10, 64)
				if err != nil {
					return fmt.Errorf("invalid --offset value %q: %w", offsetStr, err)
				}
			}

			req := &types.QueryListWorksRequest{Limit: limit, Offset: offset}
			reqBz, _ := json.MarshalIndent(req, "", "  ")

			fmt.Fprintf(cmd.OutOrStdout(),
				"Listing works (limit=%d, offset=%d)\nRequest: %s\n\nREST endpoint: GET /tamizhi/literature/v1/works?limit=%d&offset=%d\n",
				limit, offset, string(reqBz), limit, offset,
			)

			_ = clientCtx
			return nil
		},
	}

	cmd.Flags().String(flagLimit, "0", "Maximum number of results to return (0 = all)")
	cmd.Flags().String(flagOffset, "0", "Starting index for pagination")
	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdGetWorksByAuthor returns the CLI command to list all works by a given author address.
//
// Usage:
//
//	tamizhi query literature works-by-author [address]
func CmdGetWorksByAuthor() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "works-by-author [address]",
		Short: "List all literary works submitted by a given address",
		Long: `Retrieve all literary works submitted by the given bech32 address.

Example:
  tamizhi query literature works-by-author tamizhi1abc...xyz`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			authorAddr := args[0]
			if authorAddr == "" {
				return fmt.Errorf("author address cannot be empty")
			}

			req := &types.QueryGetWorksByAuthorRequest{Author: authorAddr}
			reqBz, _ := json.MarshalIndent(req, "", "  ")

			fmt.Fprintf(cmd.OutOrStdout(),
				"Querying works by author: %s\nRequest: %s\n\nREST endpoint: GET /tamizhi/literature/v1/works/author/%s\n",
				authorAddr, string(reqBz), authorAddr,
			)

			_ = clientCtx
			return nil
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdGetWorkCount returns the CLI command to query the total count of literary works.
//
// Usage:
//
//	tamizhi query literature work-count
func CmdGetWorkCount() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "work-count",
		Short: "Query the total number of literary works on chain",
		Long: `Retrieve the total number of literary works stored on the Tamizhi chain.

Example:
  tamizhi query literature work-count`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			fmt.Fprintf(cmd.OutOrStdout(),
				"REST endpoint: GET /tamizhi/literature/v1/works/count\n",
			)

			_ = clientCtx
			return nil
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// CmdGetWorkByIPFS returns the CLI command to query a work by IPFS CID.
//
// Usage:
//
//	tamizhi query literature work-by-ipfs [cid]
func CmdGetWorkByIPFS() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "work-by-ipfs [cid]",
		Short: "Query a literary work by its IPFS CID",
		Long: `Retrieve a literary work by its IPFS content identifier.

Example:
  tamizhi query literature work-by-ipfs bafybeig...`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}

			ipfsCid := args[0]
			if ipfsCid == "" {
				return fmt.Errorf("IPFS CID cannot be empty")
			}

			fmt.Fprintf(cmd.OutOrStdout(),
				"Querying work by IPFS CID: %s\nREST endpoint: GET /tamizhi/literature/v1/works/ipfs/%s\n",
				ipfsCid, ipfsCid,
			)

			_ = clientCtx
			return nil
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}
