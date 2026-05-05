package rewards

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

	"github.com/tamizhi/chain/x/rewards/client/cli"
	"github.com/tamizhi/chain/x/rewards/keeper"
	"github.com/tamizhi/chain/x/rewards/types"
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
	keeper     keeper.Keeper
	bankKeeper types.BankKeeper
}

func NewAppModule(_ codec.Codec, k keeper.Keeper, bk types.BankKeeper) AppModule {
	return AppModule{keeper: k, bankKeeper: bk}
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
	// Always write a sentinel so the IAVL store has at least one committed key.
	// Without this, an empty store returns latestVersion=0, causing all
	// height-specific queries to fail with "version does not exist".
	s := am.keeper.StoreService().OpenKVStore(ctx)
	if err := s.Set([]byte("init"), []byte{1}); err != nil {
		panic(err)
	}
	for _, rule := range gs.Rules {
		if err := am.keeper.SetRewardRule(ctx, rule); err != nil {
			panic(err)
		}
	}
}

func (am AppModule) ExportGenesis(ctx sdk.Context, _ codec.JSONCodec) json.RawMessage {
	gs := &types.GenesisState{
		Rules:   am.keeper.GetAllRewardRules(ctx),
		Records: am.keeper.GetAllRecords(ctx),
	}
	bz, _ := json.Marshal(gs)
	return bz
}

func (am AppModule) IsOnePerModuleType() {}
func (am AppModule) IsAppModule()                                          {}
func (am AppModule) ConsensusVersion() uint64                              { return 1 }
func (am AppModule) BeginBlock(_ sdk.Context) error                    { return nil }
func (am AppModule) EndBlock(_ sdk.Context) ([]interface{}, error)     { return nil, nil }
