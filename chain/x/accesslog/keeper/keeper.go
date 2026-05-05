package keeper

import (
	"encoding/binary"
	"encoding/json"
	"fmt"

	"cosmossdk.io/core/store"
	storetypes "cosmossdk.io/store/types"
	"cosmossdk.io/log"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	identitykeeper "github.com/tamizhi/chain/x/identity/keeper"
	"github.com/tamizhi/chain/x/accesslog/types"
)

// Keeper manages access log state.
type Keeper struct {
	cdc            codec.BinaryCodec
	storeService   store.KVStoreService
	identityKeeper identitykeeper.Keeper
}

// NewKeeper creates a new access log Keeper.
func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	identityKeeper identitykeeper.Keeper,
) Keeper {
	return Keeper{
		cdc:            cdc,
		storeService:   storeService,
		identityKeeper: identityKeeper,
	}
}

func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

func (k Keeper) StoreService() store.KVStoreService { return k.storeService }

func (k Keeper) getAndIncrementCounter(ctx sdk.Context) uint64 {
	s := k.storeService.OpenKVStore(ctx)
	bz, _ := s.Get([]byte(types.KeyPrefixCounter + "global"))
	var counter uint64
	if bz != nil {
		counter = binary.BigEndian.Uint64(bz)
	}
	counter++
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, counter)
	_ = s.Set([]byte(types.KeyPrefixCounter+"global"), buf)
	return counter
}

// LogAccess records a new file access event.
// It writes both the primary log entry and an employee index entry so that
// GetLogsByEmployee can perform an O(log n) prefix scan instead of a full table scan.
func (k Keeper) LogAccess(ctx sdk.Context, employeeID, fileHash, fileName, action, ipfsCid string) (uint64, error) {
	id := k.getAndIncrementCounter(ctx)

	entry := types.AccessLogEntry{
		Id:          id,
		EmployeeID:  employeeID,
		FileHash:    fileHash,
		FileName:    fileName,
		Action:      action,
		IPFSCid:     ipfsCid,
		Timestamp:   ctx.BlockTime().Unix(), // Must use block time, not wall clock
		BlockHeight: ctx.BlockHeight(),
	}

	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(entry)
	if err != nil {
		return 0, err
	}

	// Primary log entry: log:<id_padded> → JSON
	primaryKey := fmt.Sprintf("%s%010d", types.KeyPrefixLog, id)
	if err := s.Set([]byte(primaryKey), bz); err != nil {
		return 0, err
	}

	// Employee index: emplog:<employeeID>:<id_padded> → empty (key encodes all info needed)
	empKey := fmt.Sprintf("%s%s:%010d", types.KeyPrefixEmployeeLog, employeeID, id)
	if err := s.Set([]byte(empKey), []byte{1}); err != nil {
		return 0, err
	}

	k.Logger(ctx).Info("access logged", "id", id, "employee", employeeID, "action", action, "hash", fileHash)
	emitAccessLogged(action)
	return id, nil
}

// GetLogByID retrieves a log entry by ID.
func (k Keeper) GetLogByID(ctx sdk.Context, id uint64) (types.AccessLogEntry, bool) {
	s := k.storeService.OpenKVStore(ctx)
	key := fmt.Sprintf("%s%010d", types.KeyPrefixLog, id)
	bz, err := s.Get([]byte(key))
	if err != nil || bz == nil {
		return types.AccessLogEntry{}, false
	}
	var entry types.AccessLogEntry
	if err := json.Unmarshal(bz, &entry); err != nil {
		return types.AccessLogEntry{}, false
	}
	return entry, true
}

// GetLogsByEmployee returns all log entries for a given employee (most-recent first).
// Uses the emplog:<employeeID>: prefix index for O(log n) lookups instead of a
// full table scan that would OOM as the chain grows.
func (k Keeper) GetLogsByEmployee(ctx sdk.Context, employeeID string) []types.AccessLogEntry {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(fmt.Sprintf("%s%s:", types.KeyPrefixEmployeeLog, employeeID))
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()

	// Collect all log IDs from the index, then fetch the actual entries.
	// The keys are emplog:<employeeID>:<id_padded>, so we can parse the ID
	// from the key suffix. Entries are collected in ascending order and
	// then reversed so the caller gets most-recent first.
	var entries []types.AccessLogEntry
	for ; iter.Valid(); iter.Next() {
		// Extract the padded ID from the key tail (last 10 bytes).
		key := string(iter.Key())
		var id uint64
		if _, err := fmt.Sscanf(key[len(key)-10:], "%d", &id); err != nil {
			continue
		}
		if entry, found := k.GetLogByID(ctx, id); found {
			entries = append(entries, entry)
		}
	}

	// Reverse to return most-recent first.
	for i, j := 0, len(entries)-1; i < j; i, j = i+1, j-1 {
		entries[i], entries[j] = entries[j], entries[i]
	}
	return entries
}

func (k Keeper) GetParams(ctx sdk.Context) types.Params {
	store := k.storeService.OpenKVStore(ctx)
	bz, err := store.Get([]byte("params"))
	if err != nil || bz == nil {
		return types.DefaultParams()
	}
	var p types.Params
	if err := json.Unmarshal(bz, &p); err != nil {
		return types.DefaultParams()
	}
	return p
}

func (k Keeper) SetParams(ctx sdk.Context, params types.Params) error {
	bz, err := json.Marshal(params)
	if err != nil {
		return err
	}
	store := k.storeService.OpenKVStore(ctx)
	return store.Set([]byte("params"), bz)
}

// GetAllLogs returns all access log entries.
func (k Keeper) GetAllLogs(ctx sdk.Context) []types.AccessLogEntry {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixLog)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()

	var entries []types.AccessLogEntry
	for ; iter.Valid(); iter.Next() {
		var entry types.AccessLogEntry
		if err := json.Unmarshal(iter.Value(), &entry); err == nil {
			entries = append(entries, entry)
		}
	}
	return entries
}
