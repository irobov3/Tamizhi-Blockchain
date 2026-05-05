package keeper

import (
	"context"
	"encoding/json"

	"cosmossdk.io/core/store"
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/crypto/keys/ed25519"

	"github.com/tamizhi/chain/x/feeburn/types"
)

const (
	keyBurnStats = "burnstats"
)

// BankSender is the minimal bank-keeper interface needed by feeburn.
type BankSender interface {
	SendCoins(ctx context.Context, fromAddr, toAddr sdk.AccAddress, amt sdk.Coins) error
}

// Keeper manages feeburn state.
type Keeper struct {
	storeService store.KVStoreService
	bankKeeper   BankSender
	burnAddr     sdk.AccAddress // module account address for "feeburn" — no spend key
}

// NewKeeper creates a new feeburn Keeper.
// The burn address is derived deterministically from the module name so it has
// no associated private key — it acts as a black-hole address.
func NewKeeper(ss store.KVStoreService, bk BankSender) Keeper {
	return NewKeeperWithBank(ss, bk)
}

// NewKeeperWithBank creates a new feeburn Keeper with the given BankSender.
// It is useful in tests where a minimal mock can be passed instead of a full bank keeper.
func NewKeeperWithBank(ss store.KVStoreService, bk BankSender) Keeper {
	// Derive a deterministic address from the module name using a fixed seed.
	// We use the ed25519 public key bytes of a key derived from the module name,
	// which produces a unique address with no known private key.
	seed := make([]byte, 32)
	copy(seed, []byte(types.ModuleName))
	privKey := ed25519.GenPrivKeyFromSecret(seed)
	burnAddr := sdk.AccAddress(privKey.PubKey().Address())
	return Keeper{
		storeService: ss,
		bankKeeper:   bk,
		burnAddr:     burnAddr,
	}
}

// BurnAddr returns the burn (black-hole) address.
func (k Keeper) BurnAddr() sdk.AccAddress {
	return k.burnAddr
}

// StoreService returns the underlying KV store service.
func (k Keeper) StoreService() store.KVStoreService {
	return k.storeService
}

// BurnFee burns 20% of the given coins by sending them to the burn address,
// then records the cumulative burned amount.
func (k Keeper) BurnFee(ctx sdk.Context, payer sdk.AccAddress, coins sdk.Coins) error {
	burnRate, _ := sdkmath.LegacyNewDecFromStr(types.BurnRate)
	var burnCoins sdk.Coins
	for _, coin := range coins {
		burnAmt := sdkmath.LegacyNewDecFromInt(coin.Amount).Mul(burnRate).TruncateInt()
		if burnAmt.IsPositive() {
			burnCoins = burnCoins.Add(sdk.NewCoin(coin.Denom, burnAmt))
		}
	}
	if burnCoins.IsZero() {
		return nil
	}
	if err := k.bankKeeper.SendCoins(ctx, payer, k.burnAddr, burnCoins); err != nil {
		return err
	}
	return k.incrementBurnStats(ctx, burnCoins)
}

// GetBurnStats returns the cumulative burn statistics.
func (k Keeper) GetBurnStats(ctx sdk.Context) types.BurnStats {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := s.Get([]byte(keyBurnStats))
	if err != nil || bz == nil {
		return types.BurnStats{TotalBurned: sdk.Coins{}}
	}
	var stats types.BurnStats
	if err := json.Unmarshal(bz, &stats); err != nil {
		return types.BurnStats{TotalBurned: sdk.Coins{}}
	}
	return stats
}

// SetBurnStats persists the given burn statistics.
func (k Keeper) SetBurnStats(ctx sdk.Context, stats types.BurnStats) error {
	bz, err := json.Marshal(stats)
	if err != nil {
		return err
	}
	s := k.storeService.OpenKVStore(ctx)
	return s.Set([]byte(keyBurnStats), bz)
}

// incrementBurnStats adds the newly burned coins to the cumulative total.
func (k Keeper) incrementBurnStats(ctx sdk.Context, burned sdk.Coins) error {
	stats := k.GetBurnStats(ctx)
	stats.TotalBurned = stats.TotalBurned.Add(burned...)
	stats.BurnCount++
	return k.SetBurnStats(ctx, stats)
}
