package keeper_test

import (
	"testing"
	"time"

	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	"cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"

	"github.com/tamizhi/chain/x/identity/keeper"
	"github.com/tamizhi/chain/x/identity/types"
)

// validAddr returns a deterministic valid bech32 address for tests.
var validAddr = sdk.AccAddress([]byte("testaddress123456")).String()

func newTestContext(storeKey *storetypes.KVStoreKey) sdk.Context {
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		panic(err)
	}
	return sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
}

func newTestKeeper(t *testing.T) (keeper.Keeper, sdk.Context) {
	t.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	ctx := newTestContext(storeKey)
	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	k := keeper.NewKeeper(cdc, runtime.NewKVStoreService(storeKey))
	return k, ctx
}

// ── RegisterIdentity happy path ────────────────────────────────────────────────

func TestRegisterIdentity_HappyPath(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{
		EmployeeID: "emp-001",
		Address:    validAddr,
		Active:     true,
	}

	if err := k.RegisterIdentity(ctx, rec); err != nil {
		t.Fatalf("RegisterIdentity: %v", err)
	}

	got, found := k.GetIdentityByEmployeeID(ctx, "emp-001")
	if !found {
		t.Fatal("expected identity to be found after registration")
	}
	if got.EmployeeID != "emp-001" {
		t.Errorf("got EmployeeID %q, want emp-001", got.EmployeeID)
	}
	if got.Address != validAddr {
		t.Errorf("got Address %q, want %q", got.Address, validAddr)
	}
	if !got.Active {
		t.Error("newly registered identity should be active")
	}
}

// ── Duplicate registration rejected ──────────────────────────────────────────

func TestRegisterIdentity_DuplicateRejected(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{
		EmployeeID: "emp-002",
		Address:    validAddr,
		Active:     true,
	}

	if err := k.RegisterIdentity(ctx, rec); err != nil {
		t.Fatalf("first RegisterIdentity: %v", err)
	}

	// Attempt to register the same employee ID again.
	err := k.RegisterIdentity(ctx, rec)
	if err == nil {
		t.Fatal("expected error on duplicate registration, got nil")
	}
}

// ── Input validation: empty employee ID ───────────────────────────────────────

func TestRegisterIdentity_EmptyEmployeeID(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{
		EmployeeID: "",
		Address:    validAddr,
		Active:     true,
	}
	if err := k.RegisterIdentity(ctx, rec); err == nil {
		t.Error("expected error for empty EmployeeID, got nil")
	}
}

// ── Input validation: malformed address ──────────────────────────────────────

func TestRegisterIdentity_MalformedAddress(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{
		EmployeeID: "emp-bad",
		Address:    "not-a-valid-bech32",
		Active:     true,
	}
	if err := k.RegisterIdentity(ctx, rec); err == nil {
		t.Error("expected error for malformed address, got nil")
	}
}

// ── GetIdentityByEmployeeID found/not-found ───────────────────────────────────

func TestGetIdentityByEmployeeID_Found(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{EmployeeID: "emp-003", Address: validAddr, Active: true}
	if err := k.RegisterIdentity(ctx, rec); err != nil {
		t.Fatalf("RegisterIdentity: %v", err)
	}

	got, found := k.GetIdentityByEmployeeID(ctx, "emp-003")
	if !found {
		t.Fatal("expected found=true")
	}
	if got.EmployeeID != "emp-003" {
		t.Errorf("got %q, want emp-003", got.EmployeeID)
	}
}

func TestGetIdentityByEmployeeID_NotFound(t *testing.T) {
	k, ctx := newTestKeeper(t)

	_, found := k.GetIdentityByEmployeeID(ctx, "nonexistent")
	if found {
		t.Error("expected found=false for nonexistent employee ID")
	}
}

func TestGetIdentityByEmployeeID_EmptyID(t *testing.T) {
	k, ctx := newTestKeeper(t)

	_, found := k.GetIdentityByEmployeeID(ctx, "")
	if found {
		t.Error("expected found=false for empty employee ID")
	}
}

// ── GetIdentityByAddress found/not-found ─────────────────────────────────────

func TestGetIdentityByAddress_Found(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{EmployeeID: "emp-004", Address: validAddr, Active: true}
	if err := k.RegisterIdentity(ctx, rec); err != nil {
		t.Fatalf("RegisterIdentity: %v", err)
	}

	got, found := k.GetIdentityByAddress(ctx, validAddr)
	if !found {
		t.Fatal("expected found=true for registered address")
	}
	if got.EmployeeID != "emp-004" {
		t.Errorf("got EmployeeID %q, want emp-004", got.EmployeeID)
	}
}

func TestGetIdentityByAddress_NotFound(t *testing.T) {
	k, ctx := newTestKeeper(t)

	otherAddr := sdk.AccAddress([]byte("otheradrress12345")).String()
	_, found := k.GetIdentityByAddress(ctx, otherAddr)
	if found {
		t.Error("expected found=false for unregistered address")
	}
}

func TestGetIdentityByAddress_EmptyAddress(t *testing.T) {
	k, ctx := newTestKeeper(t)

	_, found := k.GetIdentityByAddress(ctx, "")
	if found {
		t.Error("expected found=false for empty address")
	}
}

// ── IsActiveEmployee true/false cases ────────────────────────────────────────

func TestIsActiveEmployee_True(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{EmployeeID: "emp-005", Address: validAddr, Active: true}
	if err := k.RegisterIdentity(ctx, rec); err != nil {
		t.Fatalf("RegisterIdentity: %v", err)
	}

	if !k.IsActiveEmployee(ctx, validAddr) {
		t.Error("expected IsActiveEmployee=true for active registered address")
	}
}

func TestIsActiveEmployee_False_Inactive(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{EmployeeID: "emp-006", Address: validAddr, Active: false}
	if err := k.SetIdentity(ctx, rec); err != nil {
		t.Fatalf("SetIdentity: %v", err)
	}

	if k.IsActiveEmployee(ctx, validAddr) {
		t.Error("expected IsActiveEmployee=false for inactive identity")
	}
}

func TestIsActiveEmployee_False_NotRegistered(t *testing.T) {
	k, ctx := newTestKeeper(t)

	otherAddr := sdk.AccAddress([]byte("otheradrress12345")).String()
	if k.IsActiveEmployee(ctx, otherAddr) {
		t.Error("expected IsActiveEmployee=false for unregistered address")
	}
}

func TestIsActiveEmployee_EmptyAddress(t *testing.T) {
	k, ctx := newTestKeeper(t)

	if k.IsActiveEmployee(ctx, "") {
		t.Error("expected IsActiveEmployee=false for empty address")
	}
}

func TestIsActiveEmployee_MalformedAddress(t *testing.T) {
	k, ctx := newTestKeeper(t)

	if k.IsActiveEmployee(ctx, "not-bech32") {
		t.Error("expected IsActiveEmployee=false for malformed address")
	}
}

// ── DeactivateIdentity ────────────────────────────────────────────────────────

func TestDeactivateIdentity(t *testing.T) {
	k, ctx := newTestKeeper(t)

	rec := types.IdentityRecord{EmployeeID: "emp-007", Address: validAddr, Active: true}
	if err := k.RegisterIdentity(ctx, rec); err != nil {
		t.Fatalf("RegisterIdentity: %v", err)
	}

	// Confirm active before deactivation.
	if !k.IsActiveEmployee(ctx, validAddr) {
		t.Fatal("identity should be active before deactivation")
	}

	if err := k.DeactivateIdentity(ctx, "emp-007"); err != nil {
		t.Fatalf("DeactivateIdentity: %v", err)
	}

	// Should now be inactive.
	if k.IsActiveEmployee(ctx, validAddr) {
		t.Error("identity should be inactive after DeactivateIdentity")
	}

	got, found := k.GetIdentityByEmployeeID(ctx, "emp-007")
	if !found {
		t.Fatal("identity should still exist after deactivation")
	}
	if got.Active {
		t.Error("Active flag should be false after deactivation")
	}
}

func TestDeactivateIdentity_NotFound(t *testing.T) {
	k, ctx := newTestKeeper(t)

	err := k.DeactivateIdentity(ctx, "does-not-exist")
	if err == nil {
		t.Error("expected error when deactivating nonexistent identity")
	}
}

func TestDeactivateIdentity_EmptyEmployeeID(t *testing.T) {
	k, ctx := newTestKeeper(t)

	err := k.DeactivateIdentity(ctx, "")
	if err == nil {
		t.Error("expected error for empty employee ID")
	}
}
