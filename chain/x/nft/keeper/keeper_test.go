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

	"github.com/tamizhi/chain/x/nft/keeper"
	"github.com/tamizhi/chain/x/nft/types"
)

// newTestContext returns a minimal sdk.Context backed by an in-memory store.
func newTestContext(storeKey *storetypes.KVStoreKey) sdk.Context {
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		panic(err)
	}
	return sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
}

// newTestKeeper returns a Keeper wired to an in-memory store.
func newTestKeeper(t *testing.T) (keeper.Keeper, sdk.Context) {
	t.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	ctx := newTestContext(storeKey)
	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	k := keeper.NewKeeper(
		cdc,
		runtime.NewKVStoreService(storeKey),
		sdk.AccAddress([]byte("authority123456789ab")).String(),
	)
	return k, ctx
}

// testOwner is a valid bech32 address used in tests.
var testOwner = sdk.AccAddress([]byte("testowner1234567890a")).String()
var testReceiver = sdk.AccAddress([]byte("testreceiver12345678")).String()

// makeNFT constructs a minimal LiteraryNFT for testing.
func makeNFT(tokenID, workID, owner string, transferable bool) types.LiteraryNFT {
	return types.LiteraryNFT{
		TokenID:      tokenID,
		CollectionID: types.DefaultCollection,
		WorkID:       workID,
		Owner:        owner,
		Creator:      owner,
		Royalty:      500,
		Transferable: transferable,
		Metadata: types.NFTMetadata{
			Name:        "Test NFT",
			Description: "A test Tamil literary NFT",
		},
	}
}

// ─── TestMintNFT_Success ──────────────────────────────────────────────────────

func TestMintNFT_Success(t *testing.T) {
	k, ctx := newTestKeeper(t)

	nft := makeNFT("token-001", "work-001", testOwner, true)
	if err := k.MintNFT(ctx, nft); err != nil {
		t.Fatalf("MintNFT failed: %v", err)
	}

	got, err := k.GetNFT(ctx, "token-001")
	if err != nil {
		t.Fatalf("GetNFT returned error: %v", err)
	}
	if got.TokenID != "token-001" {
		t.Errorf("expected token ID %q, got %q", "token-001", got.TokenID)
	}
	if got.Owner != testOwner {
		t.Errorf("expected owner %q, got %q", testOwner, got.Owner)
	}
	if got.MintedAt == 0 {
		t.Error("expected MintedAt to be set, got 0")
	}
}

// ─── TestMintNFT_DuplicateTokenID ────────────────────────────────────────────

func TestMintNFT_DuplicateTokenID(t *testing.T) {
	k, ctx := newTestKeeper(t)

	nft := makeNFT("token-dup", "work-dup", testOwner, true)
	if err := k.MintNFT(ctx, nft); err != nil {
		t.Fatalf("first MintNFT failed: %v", err)
	}

	// Minting again with the same token ID must fail.
	if err := k.MintNFT(ctx, nft); err == nil {
		t.Fatal("expected error for duplicate token ID, got nil")
	}
}

// ─── TestGetNFT_NotFound ──────────────────────────────────────────────────────

func TestGetNFT_NotFound(t *testing.T) {
	k, ctx := newTestKeeper(t)

	_, err := k.GetNFT(ctx, "nonexistent-token")
	if err == nil {
		t.Fatal("expected error for nonexistent NFT, got nil")
	}
}

// ─── TestTransferNFT_Success ──────────────────────────────────────────────────

func TestTransferNFT_Success(t *testing.T) {
	k, ctx := newTestKeeper(t)

	nft := makeNFT("token-tx", "work-tx", testOwner, true)
	if err := k.MintNFT(ctx, nft); err != nil {
		t.Fatalf("MintNFT failed: %v", err)
	}

	if err := k.TransferNFT(ctx, "token-tx", testOwner, testReceiver); err != nil {
		t.Fatalf("TransferNFT failed: %v", err)
	}

	got, err := k.GetNFT(ctx, "token-tx")
	if err != nil {
		t.Fatalf("GetNFT after transfer failed: %v", err)
	}
	if got.Owner != testReceiver {
		t.Errorf("expected new owner %q, got %q", testReceiver, got.Owner)
	}

	// Old owner index should be gone; new owner index should exist.
	ownerNFTs := k.GetNFTsByOwner(ctx, testReceiver)
	if len(ownerNFTs) != 1 {
		t.Errorf("expected 1 NFT for receiver, got %d", len(ownerNFTs))
	}
	oldOwnerNFTs := k.GetNFTsByOwner(ctx, testOwner)
	if len(oldOwnerNFTs) != 0 {
		t.Errorf("expected 0 NFTs for old owner after transfer, got %d", len(oldOwnerNFTs))
	}
}

// ─── TestTransferNFT_NotOwner ─────────────────────────────────────────────────

func TestTransferNFT_NotOwner(t *testing.T) {
	k, ctx := newTestKeeper(t)

	nft := makeNFT("token-notowner", "work-notowner", testOwner, true)
	if err := k.MintNFT(ctx, nft); err != nil {
		t.Fatalf("MintNFT failed: %v", err)
	}

	// testReceiver is NOT the owner — transfer must be rejected.
	err := k.TransferNFT(ctx, "token-notowner", testReceiver, testOwner)
	if err == nil {
		t.Fatal("expected ErrNotNFTOwner, got nil")
	}
}

// ─── TestTransferNFT_NonTransferable ─────────────────────────────────────────

func TestTransferNFT_NonTransferable(t *testing.T) {
	k, ctx := newTestKeeper(t)

	nft := makeNFT("token-locked", "work-locked", testOwner, false /* not transferable */)
	if err := k.MintNFT(ctx, nft); err != nil {
		t.Fatalf("MintNFT failed: %v", err)
	}

	err := k.TransferNFT(ctx, "token-locked", testOwner, testReceiver)
	if err == nil {
		t.Fatal("expected ErrNonTransferable, got nil")
	}
}

// ─── TestBurnNFT_Success ──────────────────────────────────────────────────────

func TestBurnNFT_Success(t *testing.T) {
	k, ctx := newTestKeeper(t)

	nft := makeNFT("token-burn", "work-burn", testOwner, true)
	if err := k.MintNFT(ctx, nft); err != nil {
		t.Fatalf("MintNFT failed: %v", err)
	}

	if err := k.BurnNFT(ctx, "token-burn", testOwner); err != nil {
		t.Fatalf("BurnNFT failed: %v", err)
	}

	_, err := k.GetNFT(ctx, "token-burn")
	if err == nil {
		t.Fatal("expected error after burn, got nil (NFT still exists)")
	}
}

// ─── TestGetNFTsByOwner ───────────────────────────────────────────────────────

func TestGetNFTsByOwner(t *testing.T) {
	k, ctx := newTestKeeper(t)

	// Mint 3 NFTs for testOwner and 1 for testReceiver.
	for i, id := range []string{"token-a", "token-b", "token-c"} {
		nft := makeNFT(id, "work-"+id, testOwner, true)
		_ = i
		if err := k.MintNFT(ctx, nft); err != nil {
			t.Fatalf("MintNFT %s failed: %v", id, err)
		}
	}
	other := makeNFT("token-other", "work-other", testReceiver, true)
	if err := k.MintNFT(ctx, other); err != nil {
		t.Fatalf("MintNFT other failed: %v", err)
	}

	nfts := k.GetNFTsByOwner(ctx, testOwner)
	if len(nfts) != 3 {
		t.Errorf("expected 3 NFTs for testOwner, got %d", len(nfts))
	}

	nftsOther := k.GetNFTsByOwner(ctx, testReceiver)
	if len(nftsOther) != 1 {
		t.Errorf("expected 1 NFT for testReceiver, got %d", len(nftsOther))
	}
}
