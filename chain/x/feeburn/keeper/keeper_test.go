package keeper_test

import (
	"context"
	"testing"
	"time"

	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"cosmossdk.io/log"
	sdkmath "cosmossdk.io/math"
	"cosmossdk.io/store"
	"cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"

	"github.com/tamizhi/chain/x/feeburn/keeper"
	"github.com/tamizhi/chain/x/feeburn/types"
)

// ── mock bank sender ──────────────────────────────────────────────────────────

// mockBankSender satisfies keeper.BankSender with recording behaviour.
type mockBankSender struct {
	transfers []transfer
}

type transfer struct {
	from   sdk.AccAddress
	to     sdk.AccAddress
	amount sdk.Coins
}

func (m *mockBankSender) SendCoins(_ context.Context, from sdk.AccAddress, to sdk.AccAddress, coins sdk.Coins) error {
	m.transfers = append(m.transfers, transfer{from: from, to: to, amount: coins})
	return nil
}

var _ keeper.BankSender = (*mockBankSender)(nil)

// ── helpers ───────────────────────────────────────────────────────────────────

func newTestContext(storeKey *storetypes.KVStoreKey) sdk.Context {
	db := dbm.NewMemDB()
	cms := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	if err := cms.LoadLatestVersion(); err != nil {
		panic(err)
	}
	return sdk.NewContext(cms, cmtproto.Header{Time: time.Now()}, false, log.NewNopLogger())
}

func newTestKeeper(t *testing.T) (*keeper.Keeper, *mockBankSender, sdk.Context) {
	t.Helper()
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	ctx := newTestContext(storeKey)
	mock := &mockBankSender{}
	k := keeper.NewKeeperWithBank(runtime.NewKVStoreService(storeKey), mock)
	return &k, mock, ctx
}

// testCoins builds a simple sdk.Coins with the given utmz amount.
func testCoins(amount int64) sdk.Coins {
	return sdk.Coins{sdk.NewCoin("utmz", sdkmath.NewInt(amount))}
}

var payer = sdk.AccAddress([]byte("payer___________________"))

// ── tests ─────────────────────────────────────────────────────────────────────

// TestBurnFee_Burns20Percent verifies that exactly 20% of fees are burned.
func TestBurnFee_Burns20Percent(t *testing.T) {
	k, mock, ctx := newTestKeeper(t)

	fees := testCoins(1000) // 1000 utmz → 200 should be burned
	if err := k.BurnFee(ctx, payer, fees); err != nil {
		t.Fatalf("BurnFee returned unexpected error: %v", err)
	}

	if len(mock.transfers) != 1 {
		t.Fatalf("expected 1 transfer, got %d", len(mock.transfers))
	}
	got := mock.transfers[0].amount
	want := sdkmath.NewInt(200)
	if !got.AmountOf("utmz").Equal(want) {
		t.Errorf("burned amount: want %s utmz, got %s", want, got.AmountOf("utmz"))
	}

	// Stats should reflect the burn.
	stats := k.GetBurnStats(ctx)
	if stats.BurnCount != 1 {
		t.Errorf("BurnCount: want 1, got %d", stats.BurnCount)
	}
	if !stats.TotalBurned.AmountOf("utmz").Equal(want) {
		t.Errorf("TotalBurned utmz: want %s, got %s", want, stats.TotalBurned.AmountOf("utmz"))
	}
}

// TestBurnFee_ZeroAmount verifies that zero-value fees produce no burn.
func TestBurnFee_ZeroAmount(t *testing.T) {
	k, mock, ctx := newTestKeeper(t)

	zeroFees := sdk.Coins{}
	if err := k.BurnFee(ctx, payer, zeroFees); err != nil {
		t.Fatalf("BurnFee on zero fees returned error: %v", err)
	}

	if len(mock.transfers) != 0 {
		t.Errorf("expected no transfers for zero fees, got %d", len(mock.transfers))
	}

	// Stats should remain zeroed.
	stats := k.GetBurnStats(ctx)
	if stats.BurnCount != 0 {
		t.Errorf("BurnCount: want 0, got %d", stats.BurnCount)
	}
}

// TestGetBurnStats_Accumulates verifies that multiple burns accumulate correctly.
func TestGetBurnStats_Accumulates(t *testing.T) {
	k, _, ctx := newTestKeeper(t)

	// Three burns of 1000 utmz each → 200 * 3 = 600 utmz total.
	for i := 0; i < 3; i++ {
		if err := k.BurnFee(ctx, payer, testCoins(1000)); err != nil {
			t.Fatalf("BurnFee #%d: %v", i, err)
		}
	}

	stats := k.GetBurnStats(ctx)
	if stats.BurnCount != 3 {
		t.Errorf("BurnCount: want 3, got %d", stats.BurnCount)
	}
	wantTotal := sdkmath.NewInt(600)
	if !stats.TotalBurned.AmountOf("utmz").Equal(wantTotal) {
		t.Errorf("TotalBurned utmz: want %s, got %s", wantTotal, stats.TotalBurned.AmountOf("utmz"))
	}
}

// TestBurnFee_TruncatesDecimal verifies truncation for amounts where 20% is not an integer.
func TestBurnFee_TruncatesDecimal(t *testing.T) {
	k, mock, ctx := newTestKeeper(t)

	// 7 utmz * 0.20 = 1.4 → truncated to 1.
	fees := testCoins(7)
	if err := k.BurnFee(ctx, payer, fees); err != nil {
		t.Fatalf("BurnFee: %v", err)
	}

	if len(mock.transfers) != 1 {
		t.Fatalf("expected 1 transfer, got %d", len(mock.transfers))
	}
	got := mock.transfers[0].amount.AmountOf("utmz")
	want := sdkmath.NewInt(1)
	if !got.Equal(want) {
		t.Errorf("burned amount: want %s utmz (truncated), got %s", want, got)
	}
}
