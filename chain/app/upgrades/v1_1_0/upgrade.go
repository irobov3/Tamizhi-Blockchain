// Package v1_1_0 implements the v1.1.0 chain upgrade handler.
package v1_1_0

import (
	"context"
	"fmt"
	"strconv"

	upgradetypes "cosmossdk.io/x/upgrade/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	nodeskeeper "github.com/tamizhi/chain/x/nodes/keeper"
	nodestypes "github.com/tamizhi/chain/x/nodes/types"
)

// UpgradeName is the on-chain name submitted in a governance MsgSoftwareUpgrade proposal.
const UpgradeName = "v1.1.0"

// MinNodeStakeForV110 is the minimum stake (in utmz) required for all active nodes
// after the v1.1.0 upgrade. Mirrors nodestypes.MinNodeStake.
const MinNodeStakeForV110 = nodestypes.MinNodeStake

// CreateUpgradeHandler returns the upgrade handler for v1.1.0.
// It runs store migrations for any modules that bumped ConsensusVersion.
func CreateUpgradeHandler(
	mm *module.Manager,
	configurator module.Configurator,
) upgradetypes.UpgradeHandler {
	return func(ctx context.Context, plan upgradetypes.Plan, fromVM module.VersionMap) (module.VersionMap, error) {
		sdkCtx := sdk.UnwrapSDKContext(ctx)
		sdkCtx.Logger().Info("running v1.1.0 upgrade handler", "plan", plan.Name)

		// Log migration notes
		fmt.Printf("[upgrade] v1.1.0: adding node slashing parameters, identity hardening\n")

		// RunMigrations will call each module's MigrateStore / consensus version bump.
		return mm.RunMigrations(ctx, configurator, fromVM)
	}
}

// PreUpgradeHandler runs before the binary swap (on the old binary).
// For v1.1.0: validate node stakes are above minimum.
func PreUpgradeHandler(keeper nodeskeeper.Keeper) func(ctx sdk.Context) error {
	return func(ctx sdk.Context) error {
		// Validate all registered nodes have >= MinNodeStakeForV110
		nodes := keeper.GetAllActiveNodes(ctx)
		for _, node := range nodes {
			if node.StakedAmount == nil {
				return fmt.Errorf("node %s has nil staked amount", node.Id)
			}
			staked, err := strconv.ParseInt(node.StakedAmount.Amount, 10, 64)
			if err != nil {
				return fmt.Errorf("node %s has invalid staked amount %q: %w", node.Id, node.StakedAmount.Amount, err)
			}
			if staked < MinNodeStakeForV110 {
				return fmt.Errorf("node %s stake %s below minimum for v1.1.0 (required %d utmz)",
					node.Id, node.StakedAmount.Amount, MinNodeStakeForV110)
			}
		}
		return nil
	}
}

// PostUpgradeHandler runs after the binary swap (on the new binary).
// For v1.1.0: log a confirmation that the upgrade completed successfully.
func PostUpgradeHandler(keeper nodeskeeper.Keeper) func(ctx sdk.Context) error {
	return func(ctx sdk.Context) error {
		nodes := keeper.GetAllActiveNodes(ctx)
		ctx.Logger().Info("v1.1.0 post-upgrade: active node count", "count", len(nodes))
		fmt.Printf("[upgrade] v1.1.0 post-upgrade complete. Active nodes: %d\n", len(nodes))
		return nil
	}
}
