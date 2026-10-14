package types

import (
	errorsmod "cosmossdk.io/errors"
)

const (
	ModuleName = "nodes"
	StoreKey   = ModuleName
	RouterKey  = ModuleName

	KeyPrefixNode        = "node:"
	KeyPrefixNodeByOwner = "node_owner:"
	KeyPrefixSwarm       = "swarm:"
	KeyPrefixNodeReward  = "nodereward:"

	// MinNodeStake is the minimum stake to run a node: 15,000 TMZ (in utmz).
	MinNodeStake = 15_000_000_000 // 15000 TMZ in utmz

	// SwarmSize is the target number of nodes per swarm.
	SwarmSize = 10

	NodeStatusActive   = "ACTIVE"
	NodeStatusInactive = "INACTIVE"
	NodeStatusJailed   = "JAILED"

	UptimeJailThreshold  = uint64(20) // Jail if UptimeScore < 20
	SlashFraction        = "0.05"     // 5% slash on jailing
	MinBlocksBeforeSlash = int64(100) // Grace period before slashing is applied
)

// GenesisState is the initial module state at chain genesis.
type GenesisState struct {
	Nodes  []ServiceNode `json:"nodes"`
	Swarms []Swarm       `json:"swarms"`
}

// DefaultGenesisState returns an empty genesis state.
func DefaultGenesisState() *GenesisState {
	return &GenesisState{
		Nodes:  []ServiceNode{},
		Swarms: []Swarm{},
	}
}

// Events
const (
	EventTypeRegisterNode       = "register_node"
	EventTypeDeregisterNode     = "deregister_node"
	EventTypeUpdateNodeEndpoint = "update_node_endpoint"
	EventTypeNodeReward         = "node_reward"
	EventTypeJailNode           = "jail_node"
	EventTypeUnjailNode         = "unjail_node"
	EventTypeSlashNode          = "slash_node"
	EventTypeHeartbeat          = "heartbeat"
	AttributeKeyNodeID          = "node_id"
	AttributeKeyEndpoint        = "endpoint"
	AttributeKeySwarmID         = "swarm_id"
	AttributeKeyRewardAmt       = "reward_amount"
	AttributeKeySlashAmt        = "slash_amount"
)

// Errors
var (
	ErrNodeNotFound      = errorsmod.Register(ModuleName, 1, "service node not found")
	ErrNodeAlreadyExists = errorsmod.Register(ModuleName, 2, "service node already registered")
	ErrInsufficientStake = errorsmod.Register(ModuleName, 3, "insufficient stake amount")
	ErrNotNodeOwner      = errorsmod.Register(ModuleName, 4, "not the node owner")
	ErrNodeJailed        = errorsmod.Register(ModuleName, 5, "node is jailed")
	ErrRewardCooldown    = errorsmod.Register(ModuleName, 6, "reward claim too soon; minimum 1 hour between claims")
)
