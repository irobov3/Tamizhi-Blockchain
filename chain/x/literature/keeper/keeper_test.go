package keeper_test

import (
	"strings"
	"testing"
	"time"

	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	"cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"

	"github.com/tamizhi/chain/x/literature/keeper"
	"github.com/tamizhi/chain/x/literature/types"
)

// ── Test addresses ────────────────────────────────────────────────────────────

// testSubmitter and testCurator are valid bech32 addresses derived from raw bytes.
var (
	testSubmitter = sdk.AccAddress([]byte("submitter_____________")).String()
	testCurator   = sdk.AccAddress([]byte("curator_______________")).String()
)

// ── Test helpers ──────────────────────────────────────────────────────────────

func newTestContext(storeKey *storetypes.KVStoreKey) sdk.Context {
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		panic(err)
	}
	return sdk.NewContext(cms, cmtproto.Header{Time: time.Now(), Height: 1}, false, log.NewNopLogger())
}

// newTestPair returns a keeper and an MsgServer wired to the same in-memory store.
func newTestPair(t *testing.T) (keeper.Keeper, keeper.MsgServer, sdk.Context) {
	t.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	ctx := newTestContext(storeKey)
	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	k := keeper.NewKeeper(
		cdc,
		runtime.NewKVStoreService(storeKey),
		authkeeper.AccountKeeper{}, // zero-value; auth/bank methods are never called in these tests
		bankkeeper.BaseKeeper{},
		log.NewNopLogger(),
	)
	ms := keeper.NewMsgServer(k)
	return k, ms, ctx
}

// validSubmitMsg returns a MsgSubmitWork with the given IPFS CID.
// All other fields are populated with valid Tamil-literature test data.
func validSubmitMsg(cid string) *types.MsgSubmitWork {
	return &types.MsgSubmitWork{
		Submitter:           testSubmitter,
		Title:               "திருக்குறள்",
		TitleTransliterated: "Thirukkural",
		TitleEnglish:        "Thirukkural",
		Author: types.WorkAuthor{
			Name:               "திருவள்ளுவர்",
			NameTransliterated: "Thiruvalluvar",
		},
		Content: types.WorkContent{
			IPFSCid:    cid,
			SHA256Hash: strings.Repeat("ab", 32), // 64 valid hex chars
			SizeBytes:  8192,
			MimeType:   "text/plain",
			Encoding:   "utf-8",
		},
		Classification: types.WorkClassification{
			Period:   types.PeriodClassical,
			Genre:    types.GenrePoetry,
			Language: "Tamil",
			Tags:     []string{"ethics", "philosophy"},
		},
		Rights: types.WorkRights{
			License:        types.LicensePublicDomain,
			IsPublicDomain: true,
		},
		Description: "Classical Tamil text of 1330 couplets.",
	}
}

// mustSubmit calls SubmitWork and fatals the test on error.
// ctx must be an sdk.Context (which implements context.Context) so that
// sdk.UnwrapSDKContext inside the MsgServer handler succeeds.
func mustSubmit(t *testing.T, ms keeper.MsgServer, ctx sdk.Context, cid string) *types.MsgSubmitWorkResponse {
	t.Helper()
	resp, err := ms.SubmitWork(ctx, validSubmitMsg(cid))
	if err != nil {
		t.Fatalf("SubmitWork(%s): unexpected error: %v", cid, err)
	}
	return resp
}

// ── SubmitWork tests ──────────────────────────────────────────────────────────

func TestSubmitWork_Success(t *testing.T) {
	k, ms, ctx := newTestPair(t)
	cid := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"

	resp := mustSubmit(t, ms, ctx, cid)

	if resp.WorkId == "" {
		t.Fatal("expected a non-empty WorkId in response")
	}
	if !strings.HasPrefix(resp.WorkId, "tmz-work-") {
		t.Errorf("expected WorkId to start with 'tmz-work-', got %q", resp.WorkId)
	}

	// Verify it is persisted in the store
	work, err := k.GetWork(ctx, resp.WorkId)
	if err != nil {
		t.Fatalf("GetWork after submit: %v", err)
	}
	if work.Content.IPFSCid != cid {
		t.Errorf("persisted IPFS CID = %q, want %q", work.Content.IPFSCid, cid)
	}

	// Work count should be 1
	count, err := k.GetWorkCount(ctx)
	if err != nil {
		t.Fatalf("GetWorkCount: %v", err)
	}
	if count != 1 {
		t.Errorf("work count = %d, want 1", count)
	}
}

func TestSubmitWork_DuplicateCID(t *testing.T) {
	_, ms, ctx := newTestPair(t)
	cid := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"

	// First submission must succeed
	mustSubmit(t, ms, ctx, cid)

	// Second submission with the same CID must fail
	_, err := ms.SubmitWork(ctx, validSubmitMsg(cid))
	if err == nil {
		t.Fatal("expected error for duplicate IPFS CID, got nil")
	}
	if !strings.Contains(err.Error(), "CID") && !strings.Contains(err.Error(), "already") {
		t.Errorf("error message should mention duplicate CID, got: %v", err)
	}
}

// ── GetWork tests ─────────────────────────────────────────────────────────────

func TestGetWork_NotFound(t *testing.T) {
	k, _, ctx := newTestPair(t)

	_, err := k.GetWork(ctx, "tmz-work-does-not-exist")
	if err == nil {
		t.Fatal("expected error for nonexistent work, got nil")
	}
}

func TestGetWork_Found(t *testing.T) {
	k, ms, ctx := newTestPair(t)
	cid := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"

	resp := mustSubmit(t, ms, ctx, cid)

	work, err := k.GetWork(ctx, resp.WorkId)
	if err != nil {
		t.Fatalf("GetWork: %v", err)
	}
	if work.WorkID != resp.WorkId {
		t.Errorf("WorkID mismatch: got %q, want %q", work.WorkID, resp.WorkId)
	}
	if work.Title != "திருக்குறள்" {
		t.Errorf("Title = %q, want %q", work.Title, "திருக்குறள்")
	}
}

// ── SearchWorks (by title) ────────────────────────────────────────────────────

// TestSearchWorks_ByTitle verifies that works can be retrieved and filtered
// by title substring using GetAllWorks + manual filter (the keeper does not
// have a dedicated search index; callers filter client-side).
func TestSearchWorks_ByTitle(t *testing.T) {
	k, ms, ctx := newTestPair(t)

	cid1 := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzd1"
	cid2 := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzd2"

	// Use different block heights so GenerateWorkID produces distinct IDs.
	mustSubmit(t, ms, ctx.WithBlockHeight(1), cid1)
	mustSubmit(t, ms, ctx.WithBlockHeight(2), cid2)

	all, err := k.GetAllWorks(ctx)
	if err != nil {
		t.Fatalf("GetAllWorks: %v", err)
	}
	if len(all) != 2 {
		t.Fatalf("expected 2 works, got %d", len(all))
	}

	// Filter by title substring — both works share the same title from validSubmitMsg
	query := "திருக்குறள்"
	var found []types.LiteraryWork
	for _, w := range all {
		if strings.Contains(w.Title, query) {
			found = append(found, w)
		}
	}
	if len(found) != 2 {
		t.Errorf("title search for %q: got %d results, want 2", query, len(found))
	}

	// Search for a non-existent title must yield zero results
	var none []types.LiteraryWork
	for _, w := range all {
		if strings.Contains(w.Title, "nonexistent-XYZ") {
			none = append(none, w)
		}
	}
	if len(none) != 0 {
		t.Errorf("expected 0 results for nonexistent title, got %d", len(none))
	}
}

// ── VerifyWork tests ──────────────────────────────────────────────────────────

func TestVerifyWork_SetsVerified(t *testing.T) {
	k, ms, ctx := newTestPair(t)
	cid := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"

	resp := mustSubmit(t, ms, ctx, cid)
	workID := resp.WorkId

	curator := testCurator

	// ctx is passed directly — it implements context.Context and contains the sdk.Context
	// needed by sdk.UnwrapSDKContext inside the handler.
	_, err := ms.VerifyWork(ctx, &types.MsgVerifyWork{
		Curator: curator,
		WorkID:  workID,
	})
	if err != nil {
		t.Fatalf("VerifyWork: %v", err)
	}

	// Retrieve and confirm verification flags were persisted
	work, err := k.GetWork(ctx, workID)
	if err != nil {
		t.Fatalf("GetWork after verify: %v", err)
	}
	if !work.IsVerified {
		t.Error("expected IsVerified=true after VerifyWork")
	}
	if work.VerifiedBy != curator {
		t.Errorf("VerifiedBy = %q, want %q", work.VerifiedBy, curator)
	}
	if work.VerifiedAt == nil {
		t.Error("expected VerifiedAt to be set, got nil")
	}
}

func TestVerifyWork_AlreadyVerified(t *testing.T) {
	_, ms, ctx := newTestPair(t)
	cid := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"

	resp := mustSubmit(t, ms, ctx, cid)
	workID := resp.WorkId

	curator := testCurator
	msg := &types.MsgVerifyWork{Curator: curator, WorkID: workID}

	// First verify must succeed
	if _, err := ms.VerifyWork(ctx, msg); err != nil {
		t.Fatalf("first VerifyWork: %v", err)
	}

	// Second verify on the same work must fail
	_, err := ms.VerifyWork(ctx, msg)
	if err == nil {
		t.Fatal("expected error for double-verification, got nil")
	}
}

// ── Bonus: GetWorksByAuthor ───────────────────────────────────────────────────

func TestGetWorksByAuthor_ReturnsOnlyOwnWorks(t *testing.T) {
	k, ms, ctx := newTestPair(t)

	cid1 := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzd1"
	cid2 := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzd2"

	// Use different block heights so GenerateWorkID produces distinct IDs.
	mustSubmit(t, ms, ctx.WithBlockHeight(1), cid1)
	mustSubmit(t, ms, ctx.WithBlockHeight(2), cid2)

	// Both works are uploaded by the same address from validSubmitMsg.
	uploader := testSubmitter
	works, err := k.GetWorksByAuthor(ctx, uploader)
	if err != nil {
		t.Fatalf("GetWorksByAuthor: %v", err)
	}
	if len(works) != 2 {
		t.Errorf("expected 2 works for author %s, got %d", uploader, len(works))
	}

	// An unknown address must return an empty slice, not an error
	unknownAddr := sdk.AccAddress([]byte("unknown_______________")).String()
	works2, err := k.GetWorksByAuthor(ctx, unknownAddr)
	if err != nil {
		t.Fatalf("GetWorksByAuthor (unknown): %v", err)
	}
	if len(works2) != 0 {
		t.Errorf("expected 0 works for unknown author, got %d", len(works2))
	}
}
