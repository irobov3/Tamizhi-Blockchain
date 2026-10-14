package keeper

import (
	"encoding/json"
	"fmt"

	"cosmossdk.io/core/store"
	storetypes "cosmossdk.io/store/types"
	sdkmath "cosmossdk.io/math"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/nodes/types"
)

// Keeper manages the nodes module state.
type Keeper struct {
	cdc              codec.BinaryCodec
	storeService     store.KVStoreService
	bankKeeper       types.BankKeeper
	authority        string
	feeCollectorAddr sdk.AccAddress
}

func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	bk types.BankKeeper,
	authority string,
	feeCollectorAddr sdk.AccAddress,
) Keeper {
	return Keeper{
		cdc:              cdc,
		storeService:     storeService,
		bankKeeper:       bk,
		authority:        authority,
		feeCollectorAddr: feeCollectorAddr,
	}
}

func (k Keeper) StoreService() store.KVStoreService { return k.storeService }
func (k Keeper) Authority() string                   { return k.authority }

// protoToSDKCoin converts the proto Coin to an sdk.Coin for bank operations.
func protoToSDKCoin(c *types.Coin) (sdk.Coin, error) {
	if c == nil {
		return sdk.Coin{}, fmt.Errorf("nil coin")
	}
	amt, ok := sdkmath.NewIntFromString(c.Amount)
	if !ok {
		return sdk.Coin{}, fmt.Errorf("invalid coin amount: %s", c.Amount)
	}
	return sdk.NewCoin(c.Denom, amt), nil
}

// RegisterNode stakes TMZ and registers a service node.
func (k Keeper) RegisterNode(ctx sdk.Context, node types.ServiceNode) error {
	// Check not already registered.
	existing, _ := k.GetNode(ctx, node.Id)
	if existing != nil {
		return types.ErrNodeAlreadyExists
	}
	// Verify stake meets minimum.
	if node.StakedAmount != nil {
		amt, ok := sdkmath.NewIntFromString(node.StakedAmount.Amount)
		if !ok || amt.Int64() < types.MinNodeStake {
			return types.ErrInsufficientStake.Wrapf("minimum stake is %d utmz", types.MinNodeStake)
		}
	} else {
		return types.ErrInsufficientStake.Wrapf("stake is required")
	}
	// Send stake to module account.
	ownerAddr, err := sdk.AccAddressFromBech32(node.OwnerAddress)
	if err != nil {
		return err
	}
	stakeSDK, err := protoToSDKCoin(node.StakedAmount)
	if err != nil {
		return err
	}
	if err := k.bankKeeper.SendCoinsFromAccountToModule(ctx, ownerAddr, types.ModuleName, sdk.NewCoins(stakeSDK)); err != nil {
		return err
	}
	// Assign to swarm (deterministic round-robin).
	node.SwarmID = k.assignSwarm(ctx, node.Id)
	node.Status = types.NodeStatusActive
	node.RegisteredAt = ctx.BlockTime().Unix()

	if err := k.setNode(ctx, node); err != nil {
		return err
	}
	emitNodeRegistered(node.SwarmID)
	return nil
}

// DeregisterNode returns stake to the owner and removes the node.
func (k Keeper) DeregisterNode(ctx sdk.Context, nodeID, ownerAddr string) error {
	node, err := k.GetNode(ctx, nodeID)
	if err != nil {
		return err
	}
	if node.OwnerAddress != ownerAddr {
		return types.ErrNotNodeOwner
	}
	// Return stake.
	owner, _ := sdk.AccAddressFromBech32(ownerAddr)
	stakeSDK, err := protoToSDKCoin(node.StakedAmount)
	if err != nil {
		return err
	}
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, owner, sdk.NewCoins(stakeSDK)); err != nil {
		return err
	}
	// Remove from store.
	s := k.storeService.OpenKVStore(ctx)
	return s.Delete([]byte(types.KeyPrefixNode + nodeID))
}

// GetNode retrieves a service node by its ID.
// Returns ErrNodeNotFound when the node does not exist; wraps the original error
// for real store I/O failures so callers can distinguish the two cases.
func (k Keeper) GetNode(ctx sdk.Context, nodeID string) (*types.ServiceNode, error) {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := s.Get([]byte(types.KeyPrefixNode + nodeID))
	if err != nil {
		return nil, fmt.Errorf("store error reading node %s: %w", nodeID, err)
	}
	if bz == nil {
		return nil, types.ErrNodeNotFound
	}
	var node types.ServiceNode
	if err := json.Unmarshal(bz, &node); err != nil {
		return nil, fmt.Errorf("corrupt node record %s: %w", nodeID, err)
	}
	return &node, nil
}

// GetAllActiveNodes returns every node in ACTIVE status.
func (k Keeper) GetAllActiveNodes(ctx sdk.Context) []types.ServiceNode {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixNode)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var nodes []types.ServiceNode
	for ; iter.Valid(); iter.Next() {
		var n types.ServiceNode
		if json.Unmarshal(iter.Value(), &n) == nil && n.Status == types.NodeStatusActive {
			nodes = append(nodes, n)
		}
	}
	return nodes
}

// GetAllNodes returns all nodes regardless of status.
func (k Keeper) GetAllNodes(ctx sdk.Context) []types.ServiceNode {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixNode)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()
	var nodes []types.ServiceNode
	for ; iter.Valid(); iter.Next() {
		var n types.ServiceNode
		if json.Unmarshal(iter.Value(), &n) == nil {
			nodes = append(nodes, n)
		}
	}
	return nodes
}

// GetNodesBySwarm returns active nodes belonging to a swarm.
func (k Keeper) GetNodesBySwarm(ctx sdk.Context, swarmID string) []types.ServiceNode {
	all := k.GetAllActiveNodes(ctx)
	var result []types.ServiceNode
	for _, n := range all {
		if n.SwarmID == swarmID {
			result = append(result, n)
		}
	}
	return result
}

// UpdateNodeEndpoint changes the public endpoint of a node.
func (k Keeper) UpdateNodeEndpoint(ctx sdk.Context, nodeID, owner, endpoint string) error {
	node, err := k.GetNode(ctx, nodeID)
	if err != nil {
		return err
	}
	if node.OwnerAddress != owner {
		return types.ErrNotNodeOwner
	}
	node.Endpoint = endpoint
	return k.setNode(ctx, *node)
}

// GetAllSwarms derives swarm groupings from the active node list.
func (k Keeper) GetAllSwarms(ctx sdk.Context) []types.Swarm {
	nodes := k.GetAllActiveNodes(ctx)
	swarmMap := make(map[string]*types.Swarm)
	for _, n := range nodes {
		if _, ok := swarmMap[n.SwarmID]; !ok {
			swarmMap[n.SwarmID] = &types.Swarm{Id: n.SwarmID}
		}
		swarmMap[n.SwarmID].NodeIDs = append(swarmMap[n.SwarmID].NodeIDs, n.Id)
	}
	var swarms []types.Swarm
	for _, s := range swarmMap {
		swarms = append(swarms, *s)
	}
	return swarms
}

// setNode serializes and stores a ServiceNode.
func (k Keeper) setNode(ctx sdk.Context, node types.ServiceNode) error {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(node)
	if err != nil {
		return err
	}
	return s.Set([]byte(types.KeyPrefixNode+node.Id), bz)
}

// assignSwarm deterministically places a node into a swarm using a simple hash.
func (k Keeper) assignSwarm(_ sdk.Context, nodeID string) string {
	h := 0
	for _, c := range nodeID {
		h = (h*31 + int(c)) % 10
	}
	return fmt.Sprintf("swarm-%d", h)
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

// SetNodeGenesis stores a node directly without performing the stake transfer.
// This is intended only for InitGenesis where the bank state is restored separately.
func (k Keeper) SetNodeGenesis(ctx sdk.Context, node types.ServiceNode) error {
	if node.SwarmID == "" {
		node.SwarmID = k.assignSwarm(ctx, node.Id)
	}
	if node.Status == "" {
		node.Status = types.NodeStatusActive
	}
	return k.setNode(ctx, node)
}
