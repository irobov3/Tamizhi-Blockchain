package literature

import (
	"context"
	"encoding/json"

	gwruntime "github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/literature/client/cli"
	literaturekeeper "github.com/tamizhi/chain/x/literature/keeper"
	"github.com/tamizhi/chain/x/literature/types"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}
)

// AppModuleBasic implements module.AppModuleBasic.
type AppModuleBasic struct{}

func (AppModuleBasic) Name() string                                                       { return types.ModuleName }
func (AppModuleBasic) RegisterLegacyAminoCodec(_ *codec.LegacyAmino)                     {}
func (AppModuleBasic) RegisterInterfaces(_ codectypes.InterfaceRegistry)                  {}
func (AppModuleBasic) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *gwruntime.ServeMux) {
	if err := types.RegisterQueryHandlerClient(context.Background(), mux, types.NewQueryClient(clientCtx)); err != nil {
		panic(err)
	}
}

func (AppModuleBasic) DefaultGenesis(_ codec.JSONCodec) json.RawMessage {
	return []byte("{}")
}

func (AppModuleBasic) ValidateGenesis(_ codec.JSONCodec, _ client.TxEncodingConfig, _ json.RawMessage) error {
	return nil
}

func (AppModuleBasic) GetTxCmd() *cobra.Command    { return cli.GetTxCmd() }
func (AppModuleBasic) GetQueryCmd() *cobra.Command { return cli.GetQueryCmd() }

// AppModule implements module.AppModule.
type AppModule struct {
	AppModuleBasic
	keeper literaturekeeper.Keeper
}

func NewAppModule(k literaturekeeper.Keeper) AppModule {
	return AppModule{keeper: k}
}

func (am AppModule) Name() string { return types.ModuleName }

func (am AppModule) RegisterServices(cfg module.Configurator) {
	// gRPC msg/query service registration is deferred until proto-gen produces
	// real method descriptors. Keeper logic remains functional and accessible
	// via CLI commands. Tx broadcasting via gRPC will be re-enabled after
	// running `buf generate` against the literature .proto files.
	_ = cfg
	_ = literaturekeeper.NewMsgServer(am.keeper)
	_ = literaturekeeper.NewQueryServer(am.keeper)
}

// InitGenesis initialises the literature module store. It always writes a
// sentinel key so the IAVL store has at least one committed entry — without
// this, an empty store returns latestVersion=0, causing all height-specific
// queries to fail with "version does not exist".
func (am AppModule) InitGenesis(ctx sdk.Context, _ codec.JSONCodec, _ json.RawMessage) {
	s := am.keeper.StoreService().OpenKVStore(ctx)
	if err := s.Set([]byte("init"), []byte{1}); err != nil {
		panic(err)
	}
}

func (am AppModule) ExportGenesis(_ sdk.Context, _ codec.JSONCodec) json.RawMessage {
	return []byte("{}")
}

func (am AppModule) IsOnePerModuleType()                              {}
func (am AppModule) IsAppModule()                                     {}
func (am AppModule) ConsensusVersion() uint64                         { return 1 }
func (am AppModule) BeginBlock(_ sdk.Context) error                   { return nil }
func (am AppModule) EndBlock(_ sdk.Context) ([]interface{}, error)    { return nil, nil }
