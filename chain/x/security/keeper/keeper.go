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

	"github.com/tamizhi/chain/x/security/types"
)

// Keeper manages security module state: threat flags, security events, blocked addresses.
type Keeper struct {
	cdc          codec.BinaryCodec
	storeService store.KVStoreService
	authority    string
}

func NewKeeper(cdc codec.BinaryCodec, storeService store.KVStoreService, authority string) Keeper {
	return Keeper{cdc: cdc, storeService: storeService, authority: authority}
}

func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

func (k Keeper) Authority() string                   { return k.authority }
func (k Keeper) StoreService() store.KVStoreService { return k.storeService }

// ── counters ───────────────────────────────────────────────────────────────

func (k Keeper) nextID(ctx sdk.Context, key string) uint64 {
	s := k.storeService.OpenKVStore(ctx)
	bz, _ := s.Get([]byte(types.KeyPrefixCounter + key))
	var id uint64
	if bz != nil {
		id = binary.BigEndian.Uint64(bz)
	}
	id++
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, id)
	_ = s.Set([]byte(types.KeyPrefixCounter+key), buf)
	return id
}

// ── ThreatFlag ─────────────────────────────────────────────────────────────

// RaiseThreatFlag creates a new ThreatFlag and returns its ID.
func (k Keeper) RaiseThreatFlag(ctx sdk.Context, flag types.ThreatFlag) (uint64, error) {
	id := k.nextID(ctx, "flags")
	flag.Id = id
	flag.Resolved = false
	flag.CreatedAt = ctx.BlockTime().Unix() // Must use block time, not wall clock
	flag.BlockHeight = ctx.BlockHeight()

	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(flag)
	if err != nil {
		return 0, err
	}
	key := fmt.Sprintf("%s%010d", types.KeyPrefixThreatFlag, id)
	if err := s.Set([]byte(key), bz); err != nil {
		return 0, err
	}

	// If action is BLOCK_ACCESS or LOCK_ACCOUNT, set block entry immediately.
	if flag.Action == types.ActionBlockAccess || flag.Action == types.ActionLockAccount {
		_ = k.setBlocked(ctx, flag.Address, fmt.Sprintf("threat flag #%d: %s", id, flag.Description))
	}

	k.Logger(ctx).Warn("threat flag raised",
		"id", id, "employee", flag.EmployeeID,
		"type", flag.ThreatType, "level", flag.Level, "action", flag.Action)
	emitThreatFlagRaised(flag.ThreatType, flag.Level)
	return id, nil
}

// GetThreatFlag retrieves a threat flag by ID.
func (k Keeper) GetThreatFlag(ctx sdk.Context, id uint64) (types.ThreatFlag, bool) {
	s := k.storeService.OpenKVStore(ctx)
	key := fmt.Sprintf("%s%010d", types.KeyPrefixThreatFlag, id)
	bz, err := s.Get([]byte(key))
	if err != nil || bz == nil {
		return types.ThreatFlag{}, false
	}
	var flag types.ThreatFlag
	if err := json.Unmarshal(bz, &flag); err != nil {
		return types.ThreatFlag{}, false
	}
	return flag, true
}

// ResolveThreatFlag marks a flag as resolved.
func (k Keeper) ResolveThreatFlag(ctx sdk.Context, id uint64, resolution string) error {
	flag, found := k.GetThreatFlag(ctx, id)
	if !found {
		return fmt.Errorf("threat flag %d not found", id)
	}
	flag.Resolved = true
	flag.Resolution = resolution
	flag.ResolvedAt = ctx.BlockTime().Unix() // Must use block time, not wall clock

	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(flag)
	if err != nil {
		return err
	}
	key := fmt.Sprintf("%s%010d", types.KeyPrefixThreatFlag, id)
	if err := s.Set([]byte(key), bz); err != nil {
		return err
	}
	emitThreatFlagResolved()
	return nil
}

// GetAllThreatFlags returns all threat flags.
func (k Keeper) GetAllThreatFlags(ctx sdk.Context) []types.ThreatFlag {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixThreatFlag)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var flags []types.ThreatFlag
	for ; iter.Valid(); iter.Next() {
		var f types.ThreatFlag
		if err := json.Unmarshal(iter.Value(), &f); err == nil {
			flags = append(flags, f)
		}
	}
	return flags
}

// GetActiveThreatFlags returns only unresolved threat flags.
func (k Keeper) GetActiveThreatFlags(ctx sdk.Context) []types.ThreatFlag {
	all := k.GetAllThreatFlags(ctx)
	var active []types.ThreatFlag
	for _, f := range all {
		if !f.Resolved {
			active = append(active, f)
		}
	}
	return active
}

// GetThreatFlagsByEmployee returns all flags for a given employee ID.
func (k Keeper) GetThreatFlagsByEmployee(ctx sdk.Context, employeeID string) []types.ThreatFlag {
	all := k.GetAllThreatFlags(ctx)
	var result []types.ThreatFlag
	for _, f := range all {
		if f.EmployeeID == employeeID {
			result = append(result, f)
		}
	}
	return result
}

// ── SecurityEvent ──────────────────────────────────────────────────────────

// LogSecurityEvent appends an immutable security event.
func (k Keeper) LogSecurityEvent(ctx sdk.Context, event types.SecurityEvent) (uint64, error) {
	id := k.nextID(ctx, "events")
	event.Id = id
	event.Timestamp = ctx.BlockTime().Unix() // Must use block time, not wall clock
	event.BlockHeight = ctx.BlockHeight()

	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(event)
	if err != nil {
		return 0, err
	}
	key := fmt.Sprintf("%s%010d", types.KeyPrefixSecurityEvent, id)
	if err := s.Set([]byte(key), bz); err != nil {
		return 0, err
	}
	return id, nil
}

// GetSecurityEventsByEmployee returns all security events for an employee.
func (k Keeper) GetSecurityEventsByEmployee(ctx sdk.Context, employeeID string) []types.SecurityEvent {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixSecurityEvent)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var events []types.SecurityEvent
	for ; iter.Valid(); iter.Next() {
		var e types.SecurityEvent
		if err := json.Unmarshal(iter.Value(), &e); err == nil {
			if employeeID == "" || e.EmployeeID == employeeID {
				events = append(events, e)
			}
		}
	}
	return events
}

// ── Blocked Addresses ──────────────────────────────────────────────────────

func (k Keeper) setBlocked(ctx sdk.Context, address, reason string) error {
	s := k.storeService.OpenKVStore(ctx)
	return s.Set([]byte(types.KeyPrefixBlockedAddr+address), []byte(reason))
}

// BlockAddress places a manual security block on an address.
func (k Keeper) BlockAddress(ctx sdk.Context, address, reason string) error {
	return k.setBlocked(ctx, address, reason)
}

// UnblockAddress removes a security block.
func (k Keeper) UnblockAddress(ctx sdk.Context, address string) error {
	s := k.storeService.OpenKVStore(ctx)
	return s.Delete([]byte(types.KeyPrefixBlockedAddr + address))
}

// IsBlocked returns true and the reason if an address is blocked.
func (k Keeper) IsBlocked(ctx sdk.Context, address string) (bool, string) {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := s.Get([]byte(types.KeyPrefixBlockedAddr + address))
	if err != nil || bz == nil {
		return false, ""
	}
	return true, string(bz)
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
