package messaging

import (
	"context"
	"encoding/json"

	"github.com/cosmos/cosmos-sdk/client"
	gwruntime "github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/messaging/client/cli"
	messagingkeeper "github.com/tamizhi/chain/x/messaging/keeper"
	"github.com/tamizhi/chain/x/messaging/types"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}
)

// ---------------------------------------------------------------------------
// AppModuleBasic
// ---------------------------------------------------------------------------

// AppModuleBasic implements the module.AppModuleBasic interface for the messaging module.
type AppModuleBasic struct{}

func (AppModuleBasic) Name() string                                      { return types.ModuleName }
func (AppModuleBasic) RegisterLegacyAminoCodec(_ *codec.LegacyAmino)    {}
func (AppModuleBasic) RegisterInterfaces(registry codectypes.InterfaceRegistry) { types.RegisterInterfaces(registry) }
func (AppModuleBasic) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *gwruntime.ServeMux) {
	if err := types.RegisterQueryHandlerClient(context.Background(), mux, types.NewQueryClient(clientCtx)); err != nil {
		panic(err)
	}
}

// DefaultGenesis returns the default (empty) genesis state encoded as JSON.
func (AppModuleBasic) DefaultGenesis(_ codec.JSONCodec) json.RawMessage {
	bz, _ := json.Marshal(types.DefaultGenesisState())
	return bz
}

// ValidateGenesis performs basic validation of the provided genesis JSON.
func (AppModuleBasic) ValidateGenesis(_ codec.JSONCodec, _ client.TxEncodingConfig, bz json.RawMessage) error {
	var gs types.GenesisState
	if err := json.Unmarshal(bz, &gs); err != nil {
		return err
	}
	// Additional semantic validation can be added here when protos are finalized.
	return nil
}

func (AppModuleBasic) GetTxCmd() *cobra.Command   { return cli.GetTxCmd() }
func (AppModuleBasic) GetQueryCmd() *cobra.Command { return cli.GetQueryCmd() }

// ---------------------------------------------------------------------------
// AppModule
// ---------------------------------------------------------------------------

// AppModule implements the module.AppModule interface for the messaging module.
type AppModule struct {
	AppModuleBasic
	keeper messagingkeeper.Keeper
}

// NewAppModule creates a new AppModule for the messaging module.
func NewAppModule(_ codec.Codec, keeper messagingkeeper.Keeper) AppModule {
	return AppModule{keeper: keeper}
}

func (am AppModule) Name() string { return types.ModuleName }

// RegisterServices registers the module's MsgServer and QueryServer with the
// provided module.Configurator. This is how the module plugs into the Cosmos SDK
// ABCI message routing and gRPC query routing.
func (am AppModule) RegisterServices(cfg module.Configurator) {
	types.RegisterMsgServer(cfg.MsgServer(), messagingkeeper.NewMsgServerImpl(am.keeper))
	types.RegisterQueryServer(cfg.QueryServer(), messagingkeeper.NewQuerier(am.keeper))
}

// InitGenesis deserialises and applies the genesis state to the store.
func (am AppModule) InitGenesis(ctx sdk.Context, _ codec.JSONCodec, data json.RawMessage) {
	var gs types.GenesisState
	if err := json.Unmarshal(data, &gs); err != nil {
		panic(err)
	}
	InitGenesis(ctx, am.keeper, gs)
}

// ExportGenesis serialises the current module state for genesis export.
func (am AppModule) ExportGenesis(ctx sdk.Context, _ codec.JSONCodec) json.RawMessage {
	gs := ExportGenesis(ctx, am.keeper)
	bz, _ := json.Marshal(gs)
	return bz
}

// ConsensusVersion implements module.AppModule.
func (am AppModule) IsOnePerModuleType() {}
func (am AppModule) IsAppModule()                                          {}
func (am AppModule) ConsensusVersion() uint64                              { return 1 }

// BeginBlock is a no-op for this module.
func (am AppModule) BeginBlock(_ sdk.Context) error { return nil }

// EndBlock is a no-op for this module.
func (am AppModule) EndBlock(_ sdk.Context) ([]interface{}, error) { return nil, nil }

// ---------------------------------------------------------------------------
// Genesis helpers (package-level, usable by tests and CLI)
// ---------------------------------------------------------------------------

// InitGenesis sets the initial state of the messaging module from a GenesisState.
func InitGenesis(ctx sdk.Context, k messagingkeeper.Keeper, gs types.GenesisState) {
	// Always write a sentinel so the IAVL store has at least one committed key.
	// Without this, an empty store returns latestVersion=0, causing all
	// height-specific queries to fail with "version does not exist".
	s := k.StoreService().OpenKVStore(ctx)
	if err := s.Set([]byte("init"), []byte{1}); err != nil {
		panic(err)
	}
	for _, sid := range gs.SessionIDs {
		if err := k.RegisterSessionID(ctx, sid); err != nil {
			panic(err)
		}
	}
	for _, group := range gs.Groups {
		if _, err := k.CreateGroup(ctx, group); err != nil {
			panic(err)
		}
	}
}

// ExportGenesis snapshots the current messaging module state into a GenesisState.
func ExportGenesis(ctx sdk.Context, k messagingkeeper.Keeper) *types.GenesisState {
	return &types.GenesisState{
		SessionIDs: k.GetAllSessionIDs(ctx),
		Groups:     k.GetAllGroups(ctx),
	}
}
