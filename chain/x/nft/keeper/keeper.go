package keeper

import (
	"encoding/json"

	"cosmossdk.io/core/store"
	storetypes "cosmossdk.io/store/types"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/nft/types"
)

// Keeper manages the NFT module state.
type Keeper struct {
	cdc          codec.BinaryCodec
	storeService store.KVStoreService
	authority    string
}

// NewKeeper creates a new NFT Keeper.
func NewKeeper(cdc codec.BinaryCodec, storeService store.KVStoreService, authority string) Keeper {
	return Keeper{cdc: cdc, storeService: storeService, authority: authority}
}

// StoreService returns the keeper's KV store service.
func (k Keeper) StoreService() store.KVStoreService { return k.storeService }

// MintNFT creates and stores a new NFT.
func (k Keeper) MintNFT(ctx sdk.Context, nft types.LiteraryNFT) error {
	if _, err := k.GetNFT(ctx, nft.TokenID); err == nil {
		return types.ErrNFTAlreadyExists
	}
	nft.MintedAt = ctx.BlockTime().Unix()
	nft.BlockHeight = ctx.BlockHeight()
	s := k.storeService.OpenKVStore(ctx)
	bz, _ := json.Marshal(nft)
	if err := s.Set([]byte(types.KeyPrefixNFT+nft.TokenID), bz); err != nil {
		return err
	}
	// Owner index
	return s.Set([]byte(types.KeyPrefixOwner+nft.Owner+":"+nft.TokenID), []byte(nft.TokenID))
}

// GetNFT retrieves an NFT by token ID.
func (k Keeper) GetNFT(ctx sdk.Context, tokenID string) (*types.LiteraryNFT, error) {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := s.Get([]byte(types.KeyPrefixNFT + tokenID))
	if err != nil {
		return nil, err
	}
	if bz == nil {
		return nil, types.ErrNFTNotFound
	}
	var nft types.LiteraryNFT
	if err := json.Unmarshal(bz, &nft); err != nil {
		return nil, err
	}
	return &nft, nil
}

// TransferNFT changes the owner of an NFT.
func (k Keeper) TransferNFT(ctx sdk.Context, tokenID, from, to string) error {
	nft, err := k.GetNFT(ctx, tokenID)
	if err != nil {
		return err
	}
	if nft.Owner != from {
		return types.ErrNotNFTOwner
	}
	if !nft.Transferable {
		return types.ErrNonTransferable
	}
	s := k.storeService.OpenKVStore(ctx)
	// Remove old owner index
	_ = s.Delete([]byte(types.KeyPrefixOwner + from + ":" + tokenID))
	nft.Owner = to
	bz, _ := json.Marshal(nft)
	if err := s.Set([]byte(types.KeyPrefixNFT+tokenID), bz); err != nil {
		return err
	}
	return s.Set([]byte(types.KeyPrefixOwner+to+":"+tokenID), []byte(tokenID))
}

// BurnNFT destroys an NFT.
func (k Keeper) BurnNFT(ctx sdk.Context, tokenID, owner string) error {
	nft, err := k.GetNFT(ctx, tokenID)
	if err != nil {
		return err
	}
	if nft.Owner != owner {
		return types.ErrNotNFTOwner
	}
	s := k.storeService.OpenKVStore(ctx)
	_ = s.Delete([]byte(types.KeyPrefixOwner + owner + ":" + tokenID))
	return s.Delete([]byte(types.KeyPrefixNFT + tokenID))
}

// GetNFTsByOwner returns all NFTs owned by a given address.
func (k Keeper) GetNFTsByOwner(ctx sdk.Context, owner string) []types.LiteraryNFT {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixOwner + owner + ":")
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var nfts []types.LiteraryNFT
	for ; iter.Valid(); iter.Next() {
		tokenID := string(iter.Value())
		nft, err := k.GetNFT(ctx, tokenID)
		if err == nil {
			nfts = append(nfts, *nft)
		}
	}
	return nfts
}

// GetNFTsByWork returns all NFTs for a given literary work.
func (k Keeper) GetNFTsByWork(ctx sdk.Context, workID string) []types.LiteraryNFT {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixNFT)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var nfts []types.LiteraryNFT
	for ; iter.Valid(); iter.Next() {
		var nft types.LiteraryNFT
		if json.Unmarshal(iter.Value(), &nft) == nil && nft.WorkID == workID {
			nfts = append(nfts, nft)
		}
	}
	return nfts
}

// GetAllNFTs returns all NFTs for genesis export.
func (k Keeper) GetAllNFTs(ctx sdk.Context) []types.LiteraryNFT {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixNFT)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var nfts []types.LiteraryNFT
	for ; iter.Valid(); iter.Next() {
		var nft types.LiteraryNFT
		if json.Unmarshal(iter.Value(), &nft) == nil {
			nfts = append(nfts, nft)
		}
	}
	return nfts
}
