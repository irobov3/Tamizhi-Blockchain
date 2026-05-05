package feeburn

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

	"github.com/tamizhi/chain/x/feeburn/keeper"
	"github.com/tamizhi/chain/x/feeburn/types"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}
)

// AppModuleBasic implements module.AppModuleBasic.
type AppModuleBasic struct{}

func (AppModuleBasic) Name() string { return types.ModuleName }
func (AppModuleBasic) RegisterLegacyAminoCodec(_ *codec.LegacyAmino) {}
func (AppModuleBasic) RegisterInterfaces(_ codectypes.InterfaceRegistry) {}

func (AppModuleBasic) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *gwruntime.ServeMux) {
	if err := types.RegisterQueryHandlerClient(context.Background(), mux, types.NewQueryClient(clientCtx)); err != nil {
		panic(err)
	}
}

func (AppModuleBasic) DefaultGenesis(_ codec.JSONCodec) json.RawMessage {
	bz, _ := json.Marshal(types.DefaultGenesisState())
	return bz
}

func (AppModuleBasic) ValidateGenesis(_ codec.JSONCodec, _ client.TxEncodingConfig, _ json.RawMessage) error {
	return nil
}

func (AppModuleBasic) GetTxCmd() *cobra.Command   { return nil }
func (AppModuleBasic) GetQueryCmd() *cobra.Command { return nil }

// AppModule implements module.AppModule.
type AppModule struct {
	AppModuleBasic
	keeper keeper.Keeper
}

// NewAppModule creates a new AppModule.
func NewAppModule(k keeper.Keeper) AppModule {
	return AppModule{keeper: k}
}

func (am AppModule) Name() string { return types.ModuleName }

func (am AppModule) RegisterServices(cfg module.Configurator) {
	// gRPC query service registration is deferred until proto-gen produces
	// real method descriptors for feeburn types. Keeper still tracks burns.
	_ = cfg
	_ = keeper.NewQuerier(am.keeper)
}

func (am AppModule) InitGenesis(ctx sdk.Context, _ codec.JSONCodec, data json.RawMessage) {
	var gs types.GenesisState
	if err := json.Unmarshal(data, &gs); err != nil {
		panic(err)
	}
	// Write sentinel key so IAVL store has at least one committed key.
	s := am.keeper.StoreService().OpenKVStore(ctx)
	if err := s.Set([]byte("init"), []byte{1}); err != nil {
		panic(err)
	}
	// Restore stats from genesis (if non-empty).
	if gs.Stats.BurnCount > 0 || len(gs.Stats.TotalBurned) > 0 {
		if err := am.keeper.SetBurnStats(ctx, gs.Stats); err != nil {
			panic(err)
		}
	}
}

func (am AppModule) ExportGenesis(ctx sdk.Context, _ codec.JSONCodec) json.RawMessage {
	stats := am.keeper.GetBurnStats(ctx)
	gs := &types.GenesisState{Stats: stats}
	bz, _ := json.Marshal(gs)
	return bz
}

func (am AppModule) IsOnePerModuleType() {}
func (am AppModule) IsAppModule()        {}
func (am AppModule) ConsensusVersion() uint64                          { return 1 }
func (am AppModule) BeginBlock(_ sdk.Context) error                    { return nil }
func (am AppModule) EndBlock(_ sdk.Context) ([]interface{}, error)     { return nil, nil }
