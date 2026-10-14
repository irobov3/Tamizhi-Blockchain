package nodes

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/cosmos/cosmos-sdk/client"
	gwruntime "github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/nodes/client/cli"
	nodeskeeper "github.com/tamizhi/chain/x/nodes/keeper"
	"github.com/tamizhi/chain/x/nodes/types"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}
)

// AppModuleBasic implements module.AppModuleBasic.
type AppModuleBasic struct{}

func (AppModuleBasic) Name() string                                      { return types.ModuleName }
func (AppModuleBasic) RegisterLegacyAminoCodec(_ *codec.LegacyAmino)    {}
func (AppModuleBasic) RegisterInterfaces(registry codectypes.InterfaceRegistry) { types.RegisterInterfaces(registry) }
func (AppModuleBasic) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *gwruntime.ServeMux) {
	if err := types.RegisterQueryHandlerClient(context.Background(), mux, types.NewQueryClient(clientCtx)); err != nil {
		panic(err)
	}
}

func (AppModuleBasic) DefaultGenesis(_ codec.JSONCodec) json.RawMessage {
	bz, _ := json.Marshal(types.DefaultGenesisState())
	return bz
}

func (AppModuleBasic) ValidateGenesis(_ codec.JSONCodec, _ client.TxEncodingConfig, bz json.RawMessage) error {
	var gs types.GenesisState
	return json.Unmarshal(bz, &gs)
}

func (AppModuleBasic) GetTxCmd() *cobra.Command   { return cli.GetTxCmd() }
func (AppModuleBasic) GetQueryCmd() *cobra.Command { return cli.GetQueryCmd() }

// AppModule implements module.AppModule.
type AppModule struct {
	AppModuleBasic
	keeper nodeskeeper.Keeper
}

func NewAppModule(_ codec.Codec, k nodeskeeper.Keeper) AppModule {
	return AppModule{keeper: k}
}

func (am AppModule) Name() string { return types.ModuleName }

func (am AppModule) RegisterServices(cfg module.Configurator) {
	types.RegisterMsgServer(cfg.MsgServer(), nodeskeeper.NewMsgServerImpl(am.keeper))
	types.RegisterQueryServer(cfg.QueryServer(), nodeskeeper.NewQuerier(am.keeper))
}

func (am AppModule) InitGenesis(ctx sdk.Context, _ codec.JSONCodec, data json.RawMessage) {
	var gs types.GenesisState
	if err := json.Unmarshal(data, &gs); err != nil {
		panic(err)
	}
	InitGenesis(ctx, am.keeper, gs)
}

func (am AppModule) ExportGenesis(ctx sdk.Context, _ codec.JSONCodec) json.RawMessage {
	gs := ExportGenesis(ctx, am.keeper)
	bz, _ := json.Marshal(gs)
	return bz
}

func (am AppModule) IsOnePerModuleType() {}
func (am AppModule) IsAppModule()                                          {}
func (am AppModule) ConsensusVersion() uint64                              { return 1 }
func (am AppModule) BeginBlock(_ sdk.Context) error         { return nil }
func (am AppModule) EndBlock(ctx sdk.Context) ([]interface{}, error) {
	if err := am.keeper.EndBlockSlashing(ctx); err != nil {
		// Log but do not halt the chain.
		fmt.Printf("EndBlockSlashing error: %v\n", err)
	}
	return nil, nil
}
