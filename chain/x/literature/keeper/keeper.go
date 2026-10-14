package keeper

import (
	"encoding/json"
	"fmt"
	"time"

	"cosmossdk.io/core/store"
	"cosmossdk.io/log"
	storetypes "cosmossdk.io/store/types"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"

	"github.com/tamizhi/chain/x/literature/types"
)

// Keeper manages the literature module state.
type Keeper struct {
	cdc           codec.BinaryCodec
	storeService  store.KVStoreService
	accountKeeper authkeeper.AccountKeeper
	bankKeeper    bankkeeper.Keeper
	logger        log.Logger
}

// NewKeeper creates a new literature Keeper.
func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	accountKeeper authkeeper.AccountKeeper,
	bankKeeper bankkeeper.Keeper,
	logger log.Logger,
) Keeper {
	return Keeper{
		cdc:           cdc,
		storeService:  storeService,
		accountKeeper: accountKeeper,
		bankKeeper:    bankKeeper,
		logger:        logger.With("module", types.ModuleName),
	}
}

// Logger returns the keeper logger.
func (k Keeper) Logger() log.Logger { return k.logger }

// StoreService returns the keeper's KV store service.
func (k Keeper) StoreService() store.KVStoreService { return k.storeService }

// SubmitWork stores a new literary work. It validates the work, checks for
// duplicate IPFS CIDs, assigns a chain work ID, and writes all indexes.
func (k Keeper) SubmitWork(ctx sdk.Context, work types.LiteraryWork) (types.LiteraryWork, error) {
	kvStore := k.storeService.OpenKVStore(ctx)

	// Check for duplicate IPFS CID
	ipfsKey := types.WorkByIPFSKey(work.Content.IPFSCid)
	existingIDBytes, err := kvStore.Get(ipfsKey)
	if err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to check IPFS CID index: %w", err)
	}
	if existingIDBytes != nil {
		return types.LiteraryWork{}, types.ErrDuplicateIPFSCid.Wrapf(
			"CID %s already registered as work %s",
			work.Content.IPFSCid,
			string(existingIDBytes),
		)
	}

	// Assign chain metadata
	work.BlockHeight = ctx.BlockHeight()
	headerHash := ctx.HeaderHash()
	txHashStr := fmt.Sprintf("%X", headerHash)
	work.TxHash = txHashStr
	work.Timestamp = ctx.BlockTime()
	work.WorkID = types.GenerateWorkID(work.UploadedBy, ctx.BlockHeight(), txHashStr)

	// Get and increment work count
	count, err := k.GetWorkCount(ctx)
	if err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to get work count: %w", err)
	}
	count++
	if err := k.SetWorkCount(ctx, count); err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to set work count: %w", err)
	}

	// Validate before persisting
	if err := work.Validate(); err != nil {
		return types.LiteraryWork{}, types.ErrInvalidWork.Wrap(err.Error())
	}

	// Persist the work
	if err := k.setWork(ctx, work); err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to store work: %w", err)
	}

	// Index by IPFS CID
	if err := kvStore.Set(ipfsKey, []byte(work.WorkID)); err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to index by IPFS CID: %w", err)
	}

	// Index by author (uploader address)
	authorKey := types.WorkByAuthorKey(work.UploadedBy, work.WorkID)
	if err := kvStore.Set(authorKey, []byte(work.WorkID)); err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to index by author: %w", err)
	}

	k.logger.Info("literary work submitted", "work_id", work.WorkID, "submitter", work.UploadedBy)

	return work, nil
}

// setWork marshals and stores a LiteraryWork in the KV store.
func (k Keeper) setWork(ctx sdk.Context, work types.LiteraryWork) error {
	kvStore := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(work)
	if err != nil {
		return fmt.Errorf("failed to marshal work: %w", err)
	}
	return kvStore.Set(types.WorkKey(work.WorkID), bz)
}

// GetWork retrieves a literary work by its ID.
func (k Keeper) GetWork(ctx sdk.Context, workID string) (types.LiteraryWork, error) {
	kvStore := k.storeService.OpenKVStore(ctx)
	bz, err := kvStore.Get(types.WorkKey(workID))
	if err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to get work: %w", err)
	}
	if bz == nil {
		return types.LiteraryWork{}, types.ErrWorkNotFound.Wrapf("work ID: %s", workID)
	}
	var work types.LiteraryWork
	if err := json.Unmarshal(bz, &work); err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to unmarshal work: %w", err)
	}
	return work, nil
}

// HasWork returns true if a work with the given ID exists.
func (k Keeper) HasWork(ctx sdk.Context, workID string) (bool, error) {
	kvStore := k.storeService.OpenKVStore(ctx)
	bz, err := kvStore.Get(types.WorkKey(workID))
	if err != nil {
		return false, err
	}
	return bz != nil, nil
}

// GetAllWorks returns all literary works stored on chain.
func (k Keeper) GetAllWorks(ctx sdk.Context) ([]types.LiteraryWork, error) {
	kvStore := k.storeService.OpenKVStore(ctx)

	endKey := prefixEndBytes(types.KeyPrefixWork)
	iterator, err := kvStore.Iterator(types.KeyPrefixWork, endKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create iterator: %w", err)
	}
	defer iterator.Close()

	var works []types.LiteraryWork
	for ; iterator.Valid(); iterator.Next() {
		var work types.LiteraryWork
		if err := json.Unmarshal(iterator.Value(), &work); err != nil {
			return nil, fmt.Errorf("failed to unmarshal work: %w", err)
		}
		works = append(works, work)
	}
	if err := iterator.Error(); err != nil {
		return nil, fmt.Errorf("iterator error: %w", err)
	}
	return works, nil
}

// GetWorksByAuthor returns all works submitted by a given address.
func (k Keeper) GetWorksByAuthor(ctx sdk.Context, authorAddr string) ([]types.LiteraryWork, error) {
	kvStore := k.storeService.OpenKVStore(ctx)

	prefix := types.WorkByAuthorPrefixKey(authorAddr)
	iterator, err := kvStore.Iterator(prefix, prefixEndBytes(prefix))
	if err != nil {
		return nil, fmt.Errorf("failed to create author iterator: %w", err)
	}
	defer iterator.Close()

	var works []types.LiteraryWork
	for ; iterator.Valid(); iterator.Next() {
		workID := string(iterator.Value())
		work, err := k.GetWork(ctx, workID)
		if err != nil {
			return nil, fmt.Errorf("failed to get work %s: %w", workID, err)
		}
		works = append(works, work)
	}
	if err := iterator.Error(); err != nil {
		return nil, fmt.Errorf("iterator error: %w", err)
	}
	return works, nil
}

// UpdateArweaveTx updates the Arweave transaction ID for an existing work.
// Only the original submitter may call this.
func (k Keeper) UpdateArweaveTx(ctx sdk.Context, workID string, submitter string, arweaveTxID string) error {
	work, err := k.GetWork(ctx, workID)
	if err != nil {
		return err
	}
	if work.UploadedBy != submitter {
		return types.ErrUnauthorized.Wrapf("caller %s is not the submitter %s", submitter, work.UploadedBy)
	}
	work.Content.ArweaveTxID = arweaveTxID
	if err := k.setWork(ctx, work); err != nil {
		return fmt.Errorf("failed to update work: %w", err)
	}
	k.logger.Info("arweave TX updated", "work_id", workID, "arweave_tx_id", arweaveTxID)
	return nil
}

// VerifyWork marks a work as verified by a curator.
func (k Keeper) VerifyWork(ctx sdk.Context, workID string, curator string) error {
	work, err := k.GetWork(ctx, workID)
	if err != nil {
		return err
	}
	if work.IsVerified {
		return types.ErrWorkAlreadyVerified.Wrapf(
			"work %s is already verified by %s",
			workID,
			work.VerifiedBy,
		)
	}

	now := ctx.BlockTime()
	work.IsVerified = true
	work.VerifiedBy = curator
	work.VerifiedAt = &now

	if err := k.setWork(ctx, work); err != nil {
		return fmt.Errorf("failed to update work: %w", err)
	}

	// Index as verified
	kvStore := k.storeService.OpenKVStore(ctx)
	if err := kvStore.Set(types.VerifiedWorkKey(workID), []byte(workID)); err != nil {
		return fmt.Errorf("failed to index verified work: %w", err)
	}

	k.logger.Info("work verified", "work_id", workID, "curator", curator, "time", now)
	return nil
}

// GetWorkCount returns the total number of works stored.
func (k Keeper) GetWorkCount(ctx sdk.Context) (uint64, error) {
	kvStore := k.storeService.OpenKVStore(ctx)
	bz, err := kvStore.Get(types.WorkCountKey())
	if err != nil {
		return 0, fmt.Errorf("failed to get work count: %w", err)
	}
	if bz == nil {
		return 0, nil
	}
	return types.BigEndianToUint64(bz), nil
}

// SetWorkCount sets the global work count.
func (k Keeper) SetWorkCount(ctx sdk.Context, count uint64) error {
	kvStore := k.storeService.OpenKVStore(ctx)
	return kvStore.Set(types.WorkCountKey(), types.Uint64ToBigEndian(count))
}

// GetWorkByIPFS returns the work associated with a given IPFS CID.
func (k Keeper) GetWorkByIPFS(ctx sdk.Context, ipfsCid string) (types.LiteraryWork, error) {
	kvStore := k.storeService.OpenKVStore(ctx)
	workIDBz, err := kvStore.Get(types.WorkByIPFSKey(ipfsCid))
	if err != nil {
		return types.LiteraryWork{}, fmt.Errorf("failed to look up IPFS CID: %w", err)
	}
	if workIDBz == nil {
		return types.LiteraryWork{}, types.ErrWorkNotFound.Wrapf(
			"no work found for IPFS CID: %s",
			ipfsCid,
		)
	}
	return k.GetWork(ctx, string(workIDBz))
}

// ExportGenesis returns all works for genesis export.
func (k Keeper) ExportGenesis(ctx sdk.Context) ([]types.LiteraryWork, error) {
	return k.GetAllWorks(ctx)
}

// ImportGenesis imports works from genesis state.
func (k Keeper) ImportGenesis(ctx sdk.Context, works []types.LiteraryWork) error {
	for _, work := range works {
		if err := k.setWork(ctx, work); err != nil {
			return fmt.Errorf("failed to import work %s: %w", work.WorkID, err)
		}
		// Rebuild indexes
		kvStore := k.storeService.OpenKVStore(ctx)
		if err := kvStore.Set(types.WorkByIPFSKey(work.Content.IPFSCid), []byte(work.WorkID)); err != nil {
			return fmt.Errorf("failed to rebuild IPFS index for work %s: %w", work.WorkID, err)
		}
		if err := kvStore.Set(types.WorkByAuthorKey(work.UploadedBy, work.WorkID), []byte(work.WorkID)); err != nil {
			return fmt.Errorf("failed to rebuild author index for work %s: %w", work.WorkID, err)
		}
		if work.IsVerified {
			if err := kvStore.Set(types.VerifiedWorkKey(work.WorkID), []byte(work.WorkID)); err != nil {
				return fmt.Errorf("failed to rebuild verified index for work %s: %w", work.WorkID, err)
			}
		}
	}
	return k.SetWorkCount(ctx, uint64(len(works)))
}

// prefixEndBytes returns the end bytes for a prefix range iterator.
func prefixEndBytes(prefix []byte) []byte {
	if len(prefix) == 0 {
		return nil
	}
	end := make([]byte, len(prefix))
	copy(end, prefix)
	for i := len(end) - 1; i >= 0; i-- {
		end[i]++
		if end[i] != 0 {
			return end[:i+1]
		}
	}
	return nil
}

// Ensure storetypes is used to suppress import errors in some tooling.
var _ storetypes.Iterator = nil
var _ = time.Now
