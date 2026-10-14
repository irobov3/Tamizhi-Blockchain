package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Ensure sdk is used.
var _ = sdk.AccAddress{}

const (
	ModuleName = "nft"
	StoreKey   = ModuleName
	RouterKey  = ModuleName

	KeyPrefixNFT        = "nft:"
	KeyPrefixOwner      = "owner:"
	KeyPrefixCollection = "collection:"

	// DefaultCollection is the collection ID for all literature NFTs.
	DefaultCollection = "tamizhi-literature"
)

// LiteraryNFT represents an on-chain NFT tied to a literary work.
type LiteraryNFT struct {
	// TokenID is the unique identifier: "col:{collectionID}:work:{workID}"
	TokenID      string `json:"token_id"`
	CollectionID string `json:"collection_id"`
	WorkID       string `json:"work_id"`    // references x/literature WorkID
	Owner        string `json:"owner"`      // bech32 address
	Creator      string `json:"creator"`    // original minter
	Royalty      uint32 `json:"royalty"`    // basis points (0-10000), e.g. 500 = 5%
	Transferable bool   `json:"transferable"`
	MintedAt     int64  `json:"minted_at"`   // Unix timestamp
	BlockHeight  int64  `json:"block_height"`
	Metadata     NFTMetadata `json:"metadata"`
}

// NFTMetadata holds display metadata for the NFT.
type NFTMetadata struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	ImageURI    string `json:"image_uri,omitempty"`    // IPFS or Arweave URI
	ExternalURL string `json:"external_url,omitempty"`
}

// GenesisState is the initial state of the NFT module.
type GenesisState struct {
	NFTs []LiteraryNFT `json:"nfts"`
}

func DefaultGenesisState() *GenesisState {
	return &GenesisState{NFTs: []LiteraryNFT{}}
}

// Errors
var (
	ErrNFTNotFound      = errorsmod.Register(ModuleName, 1, "NFT not found")
	ErrNFTAlreadyExists = errorsmod.Register(ModuleName, 2, "NFT already exists")
	ErrNotNFTOwner      = errorsmod.Register(ModuleName, 3, "not the NFT owner")
	ErrNonTransferable  = errorsmod.Register(ModuleName, 4, "NFT is not transferable")
	ErrInvalidRoyalty   = errorsmod.Register(ModuleName, 5, "royalty must be between 0 and 10000 basis points")
	ErrInvalidWorkID    = errorsmod.Register(ModuleName, 6, "work_id is required")
)

// MakeTokenID creates the canonical token ID from collection and work IDs.
func MakeTokenID(collectionID, workID string) string {
	return "col:" + collectionID + ":work:" + workID
}

// RegisterInterfaces is a no-op for the NFT module (hand-written types).
func RegisterInterfaces(_ interface{}) {}
