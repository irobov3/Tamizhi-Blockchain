package identity

import (
	"encoding/json"

	gwruntime "github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"

	"github.com/tamizhi/chain/x/identity/keeper"
	"github.com/tamizhi/chain/x/identity/types"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}
)

// AppModuleBasic implements module.AppModuleBasic.
type AppModuleBasic struct{}

func (AppModuleBasic) Name() string                                                        { return types.ModuleName }
func (AppModuleBasic) RegisterLegacyAminoCodec(_ *codec.LegacyAmino)                      {}
func (AppModuleBasic) RegisterInterfaces(_ codectypes.InterfaceRegistry)                   {}
func (AppModuleBasic) RegisterGRPCGatewayRoutes(_ client.Context, _ *gwruntime.ServeMux)  {}

func (AppModuleBasic) DefaultGenesis(_ codec.JSONCodec) json.RawMessage {
	bz, _ := json.Marshal(types.DefaultGenesisState())
	return bz
}

func (AppModuleBasic) ValidateGenesis(_ codec.JSONCodec, _ client.TxEncodingConfig, _ json.RawMessage) error {
	return nil
}

// AppModule implements module.AppModule.
type AppModule struct {
	AppModuleBasic
	keeper keeper.Keeper
}

func NewAppModule(k keeper.Keeper) AppModule {
	return AppModule{keeper: k}
}

func (am AppModule) Name() string { return types.ModuleName }

func (am AppModule) RegisterServices(_ module.Configurator) {}

func (am AppModule) InitGenesis(ctx sdk.Context, _ codec.JSONCodec, _ json.RawMessage) {
	// Write a sentinel so the IAVL store has at least one committed key.
	// Without this, an empty store returns latestVersion=0, causing all
	// height-specific queries to fail with "version does not exist".
	s := am.keeper.StoreService().OpenKVStore(ctx)
	if err := s.Set([]byte("init"), []byte{1}); err != nil {
		panic(err)
	}
}

func (am AppModule) ExportGenesis(_ sdk.Context, cdc codec.JSONCodec) json.RawMessage {
	return am.AppModuleBasic.DefaultGenesis(cdc)
}

func (am AppModule) IsOnePerModuleType()                                         {}
func (am AppModule) IsAppModule()                                                {}
func (am AppModule) ConsensusVersion() uint64                                    { return 1 }
func (am AppModule) BeginBlock(_ sdk.Context) error                              { return nil }
func (am AppModule) EndBlock(_ sdk.Context) ([]interface{}, error)               { return nil, nil }
