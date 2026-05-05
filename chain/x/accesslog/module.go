package accesslog

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

	"github.com/tamizhi/chain/x/accesslog/client/cli"
	"github.com/tamizhi/chain/x/accesslog/keeper"
	"github.com/tamizhi/chain/x/accesslog/types"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}
)

type AppModuleBasic struct{}

func (AppModuleBasic) Name() string                                               { return types.ModuleName }
func (AppModuleBasic) RegisterLegacyAminoCodec(_ *codec.LegacyAmino)             {}
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

func (AppModuleBasic) ValidateGenesis(_ codec.JSONCodec, _ client.TxEncodingConfig, _ json.RawMessage) error {
	return nil
}

func (AppModuleBasic) GetTxCmd() *cobra.Command   { return cli.GetTxCmd() }
func (AppModuleBasic) GetQueryCmd() *cobra.Command { return cli.GetQueryCmd() }

type AppModule struct {
	AppModuleBasic
	keeper keeper.Keeper
}

func NewAppModule(_ codec.Codec, k keeper.Keeper) AppModule {
	return AppModule{keeper: k}
}

func (am AppModule) Name() string { return types.ModuleName }

func (am AppModule) RegisterServices(cfg module.Configurator) {
	types.RegisterMsgServer(cfg.MsgServer(), keeper.NewMsgServerImpl(am.keeper))
	types.RegisterQueryServer(cfg.QueryServer(), keeper.NewQuerier(am.keeper))
}

func (am AppModule) InitGenesis(ctx sdk.Context, _ codec.JSONCodec, data json.RawMessage) {
	var gs types.GenesisState
	if err := json.Unmarshal(data, &gs); err != nil {
		panic(err)
	}
	s := am.keeper.StoreService().OpenKVStore(ctx)
	// Always write a sentinel so the IAVL store has at least one committed key.
	// Without this, an empty store returns latestVersion=0, causing all
	// height-specific queries to fail with "version does not exist".
	if err := s.Set([]byte("init"), []byte{1}); err != nil {
		panic(err)
	}
	for _, entry := range gs.Logs {
		bz, _ := json.Marshal(entry)
		key := fmt.Sprintf("%s%010d", types.KeyPrefixLog, entry.Id)
		_ = s.Set([]byte(key), bz)
	}
}

func (am AppModule) ExportGenesis(ctx sdk.Context, _ codec.JSONCodec) json.RawMessage {
	gs := &types.GenesisState{Logs: am.keeper.GetAllLogs(ctx)}
	bz, _ := json.Marshal(gs)
	return bz
}

func (am AppModule) IsOnePerModuleType() {}
func (am AppModule) IsAppModule()                                          {}
func (am AppModule) ConsensusVersion() uint64                              { return 1 }
func (am AppModule) BeginBlock(_ sdk.Context) error                    { return nil }
func (am AppModule) EndBlock(_ sdk.Context) ([]interface{}, error)     { return nil, nil }
