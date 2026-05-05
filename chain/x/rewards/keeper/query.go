package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/rewards/types"
)

// Querier wraps Keeper to implement types.QueryServer without name conflicts.
type Querier struct{ Keeper }

var _ types.QueryServer = Querier{}

func NewQuerier(k Keeper) Querier { return Querier{k} }

func (q Querier) ListRewardRules(goCtx context.Context, _ *types.QueryListRewardRulesRequest) (*types.QueryListRewardRulesResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	rules := q.Keeper.GetAllRewardRules(ctx)
	ptrs := make([]*types.RewardRule, len(rules))
	for i := range rules {
		r := rules[i]
		ptrs[i] = &r
	}
	return &types.QueryListRewardRulesResponse{Rules: ptrs}, nil
}

func (q Querier) GetRewardRule(goCtx context.Context, req *types.QueryGetRewardRuleRequest) (*types.QueryGetRewardRuleResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	rule, found := q.Keeper.GetRewardRule(ctx, req.RuleId)
	if !found {
		return nil, types.ErrRuleNotFound.Wrapf("rule ID: %s", req.RuleId)
	}
	return &types.QueryGetRewardRuleResponse{Rule: &rule}, nil
}

func (q Querier) GetRewardRecords(goCtx context.Context, req *types.QueryGetRewardRecordsRequest) (*types.QueryGetRewardRecordsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	all := q.Keeper.GetAllRecords(ctx)
	var filtered []*types.RewardRecord
	for i := range all {
		if all[i].EmployeeId == req.EmployeeId {
			r := all[i]
			filtered = append(filtered, &r)
		}
	}
	return &types.QueryGetRewardRecordsResponse{Records: filtered}, nil
}
