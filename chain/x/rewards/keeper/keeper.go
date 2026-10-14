package keeper

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"time"

	"cosmossdk.io/core/store"
	storetypes "cosmossdk.io/store/types"
	"cosmossdk.io/log"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	identitykeeper "github.com/tamizhi/chain/x/identity/keeper"
	"github.com/tamizhi/chain/x/rewards/types"
)

// Keeper manages rewards state.
type Keeper struct {
	cdc            codec.BinaryCodec
	storeService   store.KVStoreService
	bankKeeper     types.BankKeeper
	identityKeeper identitykeeper.Keeper
	authority      string
}

func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	bankKeeper types.BankKeeper,
	identityKeeper identitykeeper.Keeper,
	authority string,
) Keeper {
	return Keeper{
		cdc:            cdc,
		storeService:   storeService,
		bankKeeper:     bankKeeper,
		identityKeeper: identityKeeper,
		authority:      authority,
	}
}

func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

func (k Keeper) Authority() string                   { return k.authority }
func (k Keeper) StoreService() store.KVStoreService { return k.storeService }

// SetRewardRule stores a reward rule.
func (k Keeper) SetRewardRule(ctx sdk.Context, rule types.RewardRule) error {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(rule)
	if err != nil {
		return err
	}
	return s.Set([]byte(types.KeyPrefixRewardRule+rule.ID), bz)
}

// GetRewardRule retrieves a reward rule by ID.
func (k Keeper) GetRewardRule(ctx sdk.Context, ruleID string) (types.RewardRule, bool) {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := s.Get([]byte(types.KeyPrefixRewardRule + ruleID))
	if err != nil || bz == nil {
		return types.RewardRule{}, false
	}
	var rule types.RewardRule
	if err := json.Unmarshal(bz, &rule); err != nil {
		return types.RewardRule{}, false
	}
	return rule, true
}

// GetAllRewardRules returns every stored reward rule.
func (k Keeper) GetAllRewardRules(ctx sdk.Context) []types.RewardRule {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixRewardRule)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var rules []types.RewardRule
	for ; iter.Valid(); iter.Next() {
		var r types.RewardRule
		if err := json.Unmarshal(iter.Value(), &r); err == nil {
			rules = append(rules, r)
		}
	}
	return rules
}

func (k Keeper) nextRecordID(ctx sdk.Context) uint64 {
	s := k.storeService.OpenKVStore(ctx)
	bz, _ := s.Get([]byte(types.KeyPrefixCounter + "records"))
	var id uint64
	if bz != nil {
		id = binary.BigEndian.Uint64(bz)
	}
	id++
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, id)
	_ = s.Set([]byte(types.KeyPrefixCounter+"records"), buf)
	return id
}

// dailyCountKey returns the store key that tracks how many times employeeID has
// been issued ruleID rewards on the given UTC calendar day.
func dailyCountKey(employeeID, ruleID string, blockTime time.Time) []byte {
	dateStr := blockTime.UTC().Format("20060102") // e.g. "20260503"
	return []byte(fmt.Sprintf("%s%s:%s:%s", types.KeyPrefixDailyCount, employeeID, ruleID, dateStr))
}

// IssueReward mints TMZ tokens to an employee based on a reward rule.
func (k Keeper) IssueReward(ctx sdk.Context, employeeID, ruleID, memo string) (uint64, error) {
	rule, found := k.GetRewardRule(ctx, ruleID)
	if !found {
		return 0, types.ErrRuleNotFound
	}
	if !rule.Active {
		return 0, types.ErrRuleInactive
	}

	// Enforce per-day reward cap if MaxPerDay > 0.
	if rule.MaxPerDay > 0 {
		s := k.storeService.OpenKVStore(ctx)
		dKey := dailyCountKey(employeeID, ruleID, ctx.BlockTime())
		bz, err := s.Get(dKey)
		if err != nil {
			return 0, fmt.Errorf("failed to read daily counter: %w", err)
		}
		var dailyCount uint64
		if bz != nil {
			dailyCount = binary.BigEndian.Uint64(bz)
		}
		if dailyCount >= rule.MaxPerDay {
			emitDailyLimitHit(employeeID, ruleID)
			return 0, types.ErrDailyLimitHit.Wrapf(
				"employee %s has already received rule %s reward %d/%d times today",
				employeeID, ruleID, dailyCount, rule.MaxPerDay,
			)
		}
	}

	identity, found := k.identityKeeper.GetIdentityByEmployeeID(ctx, employeeID)
	if !found {
		return 0, fmt.Errorf("employee %s not found", employeeID)
	}

	recipientAddr, err := sdk.AccAddressFromBech32(identity.Address)
	if err != nil {
		return 0, err
	}

	sdkCoin, err := types.ProtoToSDKCoin(rule.Amount)
	if err != nil {
		return 0, fmt.Errorf("invalid rule amount: %w", err)
	}
	coins := sdk.NewCoins(sdkCoin)
	if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, coins); err != nil {
		return 0, fmt.Errorf("failed to mint reward: %w", err)
	}
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, recipientAddr, coins); err != nil {
		return 0, fmt.Errorf("failed to send reward: %w", err)
	}

	// Increment the daily counter (after minting so a mint failure doesn't waste quota).
	if rule.MaxPerDay > 0 {
		s := k.storeService.OpenKVStore(ctx)
		dKey := dailyCountKey(employeeID, ruleID, ctx.BlockTime())
		bz, _ := s.Get(dKey)
		var dailyCount uint64
		if bz != nil {
			dailyCount = binary.BigEndian.Uint64(bz)
		}
		dailyCount++
		buf := make([]byte, 8)
		binary.BigEndian.PutUint64(buf, dailyCount)
		if err := s.Set(dKey, buf); err != nil {
			return 0, fmt.Errorf("failed to update daily counter: %w", err)
		}
	}

	id := k.nextRecordID(ctx)
	record := types.RewardRecord{
		Id:         id,
		EmployeeId: employeeID,
		Address:    identity.Address,
		RuleId:     ruleID,
		Activity:   rule.Activity,
		Amount:     &rule.Amount,
		Memo:       memo,
		Timestamp:  ctx.BlockTime().Unix(), // Must use block time, not wall clock
		BlockHeight: ctx.BlockHeight(),
	}

	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(record)
	if err != nil {
		return 0, err
	}
	key := fmt.Sprintf("%s%010d", types.KeyPrefixRewardRecord, id)
	_ = s.Set([]byte(key), bz)

	k.Logger(ctx).Info("reward issued",
		"employee", employeeID,
		"rule", ruleID,
		"amount", rule.Amount.Denom+rule.Amount.Amount,
		"recipient", identity.Address,
	)
	emitRewardIssued(ruleID)
	return id, nil
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

// GetAllRecords returns all reward records.
func (k Keeper) GetAllRecords(ctx sdk.Context) []types.RewardRecord {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixRewardRecord)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var records []types.RewardRecord
	for ; iter.Valid(); iter.Next() {
		var r types.RewardRecord
		if err := json.Unmarshal(iter.Value(), &r); err == nil {
			records = append(records, r)
		}
	}
	return records
}
