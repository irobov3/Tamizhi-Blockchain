package keeper

import (
	"encoding/json"
	"fmt"
	"strings"

	"cosmossdk.io/core/store"
	"cosmossdk.io/log"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/identity/types"
)

// Keeper manages on-chain identity records.
type Keeper struct {
	cdc          codec.BinaryCodec
	storeService store.KVStoreService
}

// NewKeeper creates a new identity Keeper.
func NewKeeper(cdc codec.BinaryCodec, storeService store.KVStoreService) Keeper {
	return Keeper{
		cdc:          cdc,
		storeService: storeService,
	}
}

func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

func (k Keeper) StoreService() store.KVStoreService { return k.storeService }

// ─── Keys ────────────────────────────────────────────────────────────────────

var prefixIdentity = []byte{0x01}

func identityKey(employeeID string) []byte {
	return append(prefixIdentity, []byte(employeeID)...)
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// RegisterIdentity creates a new identity record, rejecting duplicates.
// It validates that EmployeeID is non-empty and Address is a valid bech32 address.
func (k Keeper) RegisterIdentity(ctx sdk.Context, rec types.IdentityRecord) error {
	if strings.TrimSpace(rec.EmployeeID) == "" {
		return fmt.Errorf("employee ID must not be empty")
	}
	if strings.TrimSpace(rec.Address) == "" {
		return fmt.Errorf("address must not be empty")
	}
	if _, err := sdk.AccAddressFromBech32(rec.Address); err != nil {
		return fmt.Errorf("invalid bech32 address %q: %w", rec.Address, err)
	}
	if _, exists := k.GetIdentityByEmployeeID(ctx, rec.EmployeeID); exists {
		return types.ErrAlreadyExists
	}
	return k.SetIdentity(ctx, rec)
}

// DeactivateIdentity marks the identity with the given employeeID as inactive.
func (k Keeper) DeactivateIdentity(ctx sdk.Context, employeeID string) error {
	if strings.TrimSpace(employeeID) == "" {
		return fmt.Errorf("employee ID must not be empty")
	}
	rec, found := k.GetIdentityByEmployeeID(ctx, employeeID)
	if !found {
		return types.ErrIdentityNotFound
	}
	rec.Active = false
	return k.SetIdentity(ctx, rec)
}

// SetIdentity stores an identity record keyed by EmployeeID.
func (k Keeper) SetIdentity(ctx sdk.Context, rec types.IdentityRecord) error {
	if strings.TrimSpace(rec.EmployeeID) == "" {
		return fmt.Errorf("employee ID must not be empty")
	}
	bz, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	store := k.storeService.OpenKVStore(ctx)
	return store.Set(identityKey(rec.EmployeeID), bz)
}

// GetIdentityByEmployeeID retrieves a record by its employee ID.
func (k Keeper) GetIdentityByEmployeeID(ctx sdk.Context, employeeID string) (types.IdentityRecord, bool) {
	if strings.TrimSpace(employeeID) == "" {
		return types.IdentityRecord{}, false
	}
	store := k.storeService.OpenKVStore(ctx)
	bz, err := store.Get(identityKey(employeeID))
	if err != nil || bz == nil {
		return types.IdentityRecord{}, false
	}
	var rec types.IdentityRecord
	if err := json.Unmarshal(bz, &rec); err != nil {
		return types.IdentityRecord{}, false
	}
	return rec, true
}

// GetIdentityByAddress returns the identity record whose Address matches the
// given bech32 address, if any exists.
func (k Keeper) GetIdentityByAddress(ctx sdk.Context, address string) (types.IdentityRecord, bool) {
	if strings.TrimSpace(address) == "" {
		return types.IdentityRecord{}, false
	}
	store := k.storeService.OpenKVStore(ctx)
	iter, err := store.Iterator(prefixIdentity, append(prefixIdentity, 0xFF))
	if err != nil {
		return types.IdentityRecord{}, false
	}
	defer iter.Close()
	for ; iter.Valid(); iter.Next() {
		var rec types.IdentityRecord
		if err := json.Unmarshal(iter.Value(), &rec); err != nil {
			continue
		}
		if rec.Address == address {
			return rec, true
		}
	}
	return types.IdentityRecord{}, false
}

// IsActiveEmployee returns true if the given bech32 address belongs to an
// active identity record.
func (k Keeper) IsActiveEmployee(ctx sdk.Context, address string) bool {
	if strings.TrimSpace(address) == "" {
		return false
	}
	// Validate the address is well-formed before iterating.
	if _, err := sdk.AccAddressFromBech32(address); err != nil {
		return false
	}

	// Iterate all records and check for a matching active address.
	// For testnet scale this is fine; production should maintain an address→ID index.
	store := k.storeService.OpenKVStore(ctx)
	iter, err := store.Iterator(prefixIdentity, append(prefixIdentity, 0xFF))
	if err != nil {
		return false
	}
	defer iter.Close()

	for ; iter.Valid(); iter.Next() {
		var rec types.IdentityRecord
		if err := json.Unmarshal(iter.Value(), &rec); err != nil {
			continue
		}
		if rec.Address == address && rec.Active {
			return true
		}
	}
	return false
}
