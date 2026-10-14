package nft

import (
	"encoding/json"

	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/client"
	gwruntime "github.com/grpc-ecosystem/grpc-gateway/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/spf13/cobra"

	"github.com/tamizhi/chain/x/nft/client/cli"
	nftkeeper "github.com/tamizhi/chain/x/nft/keeper"
	"github.com/tamizhi/chain/x/nft/types"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}
)

// AppModuleBasic implements module.AppModuleBasic.
type AppModuleBasic struct{}

func (AppModuleBasic) Name() string                                                      { return types.ModuleName }
func (AppModuleBasic) RegisterLegacyAminoCodec(_ *codec.LegacyAmino)                    {}
func (AppModuleBasic) RegisterInterfaces(_ codectypes.InterfaceRegistry)                 {}
func (AppModuleBasic) RegisterGRPCGatewayRoutes(_ client.Context, _ *gwruntime.ServeMux) {}

func (AppModuleBasic) DefaultGenesis(_ codec.JSONCodec) json.RawMessage {
	bz, _ := json.Marshal(types.DefaultGenesisState())
	return bz
}

func (AppModuleBasic) ValidateGenesis(_ codec.JSONCodec, _ client.TxEncodingConfig, bz json.RawMessage) error {
	var gs types.GenesisState
	return json.Unmarshal(bz, &gs)
}

func (AppModuleBasic) GetTxCmd() *cobra.Command    { return cli.GetTxCmd() }
func (AppModuleBasic) GetQueryCmd() *cobra.Command { return cli.GetQueryCmd() }

// AppModule implements module.AppModule.
type AppModule struct {
	AppModuleBasic
	keeper nftkeeper.Keeper
}

// NewAppModule creates a new AppModule.
func NewAppModule(k nftkeeper.Keeper) AppModule {
	return AppModule{keeper: k}
}

func (am AppModule) Name() string { return types.ModuleName }

func (am AppModule) RegisterServices(cfg module.Configurator) {
	// gRPC msg/query service registration is deferred until proto-gen produces
	// real method descriptors for NFT types.
	_ = cfg
	_ = nftkeeper.NewMsgServerImpl(am.keeper)
	_ = nftkeeper.NewQueryServerImpl(am.keeper)
}

// InitGenesis initialises the NFT module store.
func (am AppModule) InitGenesis(ctx sdk.Context, _ codec.JSONCodec, data json.RawMessage) {
	var gs types.GenesisState
	if err := json.Unmarshal(data, &gs); err != nil {
		panic(err)
	}

	// Write sentinel so the IAVL store has at least one committed entry.
	s := am.keeper.StoreService().OpenKVStore(ctx)
	if err := s.Set([]byte("init"), []byte{1}); err != nil {
		panic(err)
	}

	// Import any NFTs from genesis.
	for _, nft := range gs.NFTs {
		if err := am.keeper.MintNFT(ctx, nft); err != nil {
			panic(err)
		}
	}
}

func (am AppModule) ExportGenesis(ctx sdk.Context, _ codec.JSONCodec) json.RawMessage {
	gs := &types.GenesisState{
		NFTs: am.keeper.GetAllNFTs(ctx),
	}
	bz, _ := json.Marshal(gs)
	return bz
}

func (am AppModule) IsOnePerModuleType()                           {}
func (am AppModule) IsAppModule()                                  {}
func (am AppModule) ConsensusVersion() uint64                      { return 1 }
func (am AppModule) BeginBlock(_ sdk.Context) error                { return nil }
func (am AppModule) EndBlock(_ sdk.Context) ([]interface{}, error) { return nil, nil }
