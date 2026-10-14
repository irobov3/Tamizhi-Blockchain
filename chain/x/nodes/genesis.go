package nodes

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/nodes/keeper"
	"github.com/tamizhi/chain/x/nodes/types"
)

// InitGenesis restores nodes from the genesis state.
// Nodes are stored directly (bypassing stake transfer) since the chain is bootstrapping.
func InitGenesis(ctx sdk.Context, k keeper.Keeper, gs types.GenesisState) {
	// Always write a sentinel key so the IAVL store has at least one committed
	// entry. Without this, an empty store returns latestVersion=0, causing all
	// height-specific queries to fail with "version does not exist".
	s := k.StoreService().OpenKVStore(ctx)
	if err := s.Set([]byte("init"), []byte{1}); err != nil {
		panic(err)
	}
	for _, node := range gs.Nodes {
		// Directly set node without re-staking during genesis.
		if err := k.SetNodeGenesis(ctx, node); err != nil {
			panic(err)
		}
	}
}

// ExportGenesis serializes the current module state for genesis export.
func ExportGenesis(ctx sdk.Context, k keeper.Keeper) *types.GenesisState {
	return &types.GenesisState{
		Nodes:  k.GetAllNodes(ctx),
		Swarms: k.GetAllSwarms(ctx),
	}
}
