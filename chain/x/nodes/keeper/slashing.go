package keeper

import (
	"fmt"

	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/nodes/types"
)

// JailNode sets a node's status to JAILED and emits an event.
func (k Keeper) JailNode(ctx sdk.Context, nodeID string) error {
	node, err := k.GetNode(ctx, nodeID)
	if err != nil {
		return err
	}
	if node.Status == types.NodeStatusJailed {
		return types.ErrNodeJailed
	}
	node.Status = types.NodeStatusJailed
	if err := k.setNode(ctx, *node); err != nil {
		return err
	}
	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeJailNode,
		sdk.NewAttribute(types.AttributeKeyNodeID, nodeID),
	))
	emitNodeJailed(nodeID)
	return nil
}

// UnjailNode restores a node from JAILED to ACTIVE.
func (k Keeper) UnjailNode(ctx sdk.Context, nodeID, ownerAddr string) error {
	node, err := k.GetNode(ctx, nodeID)
	if err != nil {
		return err
	}
	if node.OwnerAddress != ownerAddr {
		return types.ErrNotNodeOwner
	}
	if node.Status != types.NodeStatusJailed {
		return fmt.Errorf("node %s is not jailed (current status: %s)", nodeID, node.Status)
	}
	// Reset uptime score so the node starts fresh after unjailing.
	node.UptimeScore = 0
	node.Status = types.NodeStatusActive
	if err := k.setNode(ctx, *node); err != nil {
		return err
	}
	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeUnjailNode,
		sdk.NewAttribute(types.AttributeKeyNodeID, nodeID),
	))
	return nil
}

// SlashNode reduces the node's stake by slashFraction (e.g. sdkmath.LegacyNewDecWithPrec(5,2) for 5%).
// The slashed coins are sent from the module account to the fee collector.
// If remaining stake falls below MinNodeStake the node is also jailed.
func (k Keeper) SlashNode(ctx sdk.Context, nodeID string, slashFraction sdkmath.LegacyDec) error {
	node, err := k.GetNode(ctx, nodeID)
	if err != nil {
		return err
	}
	if node.StakedAmount == nil {
		return fmt.Errorf("node %s has no staked amount", nodeID)
	}

	stakedAmt, ok := sdkmath.NewIntFromString(node.StakedAmount.Amount)
	if !ok {
		return fmt.Errorf("invalid staked amount for node %s: %s", nodeID, node.StakedAmount.Amount)
	}

	// slash = stakedAmt * slashFraction (truncated)
	slashAmt := stakedAmt.ToLegacyDec().Mul(slashFraction).TruncateInt()
	if slashAmt.IsZero() {
		return nil
	}

	remaining := stakedAmt.Sub(slashAmt)

	// Send slashed coins to the fee collector.
	slashCoin := sdk.NewCoin(node.StakedAmount.Denom, slashAmt)
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(
		ctx,
		types.ModuleName,
		k.feeCollectorAddr,
		sdk.NewCoins(slashCoin),
	); err != nil {
		return fmt.Errorf("failed to send slashed coins to fee collector: %w", err)
	}

	// Update the node's staked amount.
	node.StakedAmount.Amount = remaining.String()
	if err := k.setNode(ctx, *node); err != nil {
		return err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeSlashNode,
		sdk.NewAttribute(types.AttributeKeyNodeID, nodeID),
		sdk.NewAttribute(types.AttributeKeySlashAmt, slashAmt.String()),
	))
	emitNodeSlashed(nodeID)

	// Jail if remaining stake is below the minimum.
	if remaining.Int64() < types.MinNodeStake {
		if jailErr := k.JailNode(ctx, nodeID); jailErr != nil {
			return fmt.Errorf("slashed below minimum stake and failed to jail node %s: %w", nodeID, jailErr)
		}
	}

	return nil
}

// ReportHeartbeat increments the uptime score (max 100) and updates LastRewardAt.
// The caller must be the node owner.
func (k Keeper) ReportHeartbeat(ctx sdk.Context, nodeID, ownerAddr string) error {
	node, err := k.GetNode(ctx, nodeID)
	if err != nil {
		return err
	}
	if node.OwnerAddress != ownerAddr {
		return types.ErrNotNodeOwner
	}
	if node.Status == types.NodeStatusJailed {
		return types.ErrNodeJailed
	}

	if node.UptimeScore < 100 {
		node.UptimeScore++
	}
	node.LastRewardAt = ctx.BlockTime().Unix()

	if err := k.setNode(ctx, *node); err != nil {
		return err
	}

	ctx.EventManager().EmitEvent(sdk.NewEvent(
		types.EventTypeHeartbeat,
		sdk.NewAttribute(types.AttributeKeyNodeID, nodeID),
	))
	return nil
}

// EndBlockSlashing checks all active nodes and jails those that are below the
// uptime threshold after the grace period has elapsed.
// Threshold: UptimeScore < 20 after at least 100 blocks since RegisteredAt.
func (k Keeper) EndBlockSlashing(ctx sdk.Context) error {
	slashFraction, err := sdkmath.LegacyNewDecFromStr(types.SlashFraction)
	if err != nil {
		return fmt.Errorf("invalid slash fraction constant %q: %w", types.SlashFraction, err)
	}

	currentBlock := ctx.BlockHeight()
	nodes := k.GetAllActiveNodes(ctx)

	for _, node := range nodes {
		// Enforce grace period: skip nodes registered fewer than MinBlocksBeforeSlash blocks ago.
		blocksActive := currentBlock - node.RegisteredAt
		if blocksActive < types.MinBlocksBeforeSlash {
			continue
		}

		if node.UptimeScore < types.UptimeJailThreshold {
			// Slash first, then jail (SlashNode will also jail if remaining < min,
			// but we always want to jail here regardless).
			if err := k.SlashNode(ctx, node.Id, slashFraction); err != nil {
				// Log and continue — don't halt the chain.
				ctx.Logger().Error("EndBlockSlashing: SlashNode failed",
					"node_id", node.Id, "error", err)
				continue
			}
			// Ensure the node is jailed even if the remaining stake is still above min.
			if jailErr := k.JailNode(ctx, node.Id); jailErr != nil {
				// May already be jailed by SlashNode; that is fine.
				ctx.Logger().Info("EndBlockSlashing: JailNode skipped (possibly already jailed)",
					"node_id", node.Id, "reason", jailErr)
			}
		}
	}
	return nil
}
