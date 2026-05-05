package app

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"cosmossdk.io/log"
	storetypes "cosmossdk.io/store/types"
	signing "cosmossdk.io/x/tx/signing"
	upgradekeeper "cosmossdk.io/x/upgrade/keeper"
	upgrademodule "cosmossdk.io/x/upgrade"
	upgradetypes "cosmossdk.io/x/upgrade/types"

	abci "github.com/cometbft/cometbft/abci/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	addresscodec "github.com/cosmos/cosmos-sdk/codec/address"
	gogoproto "github.com/cosmos/gogoproto/proto"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/server/api"
	serverconfig "github.com/cosmos/cosmos-sdk/server/config"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	cmtservice "github.com/cosmos/cosmos-sdk/client/grpc/cmtservice"
	nodeservice "github.com/cosmos/cosmos-sdk/client/grpc/node"
	"github.com/cosmos/cosmos-sdk/std"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/cosmos/cosmos-sdk/version"
	"github.com/cosmos/cosmos-sdk/x/auth"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authtx "github.com/cosmos/cosmos-sdk/x/auth/tx"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/cosmos/cosmos-sdk/x/auth/vesting"
	"github.com/cosmos/cosmos-sdk/x/bank"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	"github.com/cosmos/cosmos-sdk/x/consensus"
	consensusparamkeeper "github.com/cosmos/cosmos-sdk/x/consensus/keeper"
	consensusparamtypes "github.com/cosmos/cosmos-sdk/x/consensus/types"
	"github.com/cosmos/cosmos-sdk/x/crisis"
	crisiskeeper "github.com/cosmos/cosmos-sdk/x/crisis/keeper"
	crisistypes "github.com/cosmos/cosmos-sdk/x/crisis/types"
	distr "github.com/cosmos/cosmos-sdk/x/distribution"
	distrkeeper "github.com/cosmos/cosmos-sdk/x/distribution/keeper"
	distrtypes "github.com/cosmos/cosmos-sdk/x/distribution/types"
	"github.com/cosmos/cosmos-sdk/x/genutil"
	genutiltypes "github.com/cosmos/cosmos-sdk/x/genutil/types"
	"github.com/cosmos/cosmos-sdk/x/gov"
	govclient "github.com/cosmos/cosmos-sdk/x/gov/client"
	govkeeper "github.com/cosmos/cosmos-sdk/x/gov/keeper"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	"github.com/cosmos/cosmos-sdk/x/mint"
	mintkeeper "github.com/cosmos/cosmos-sdk/x/mint/keeper"
	minttypes "github.com/cosmos/cosmos-sdk/x/mint/types"
	"github.com/cosmos/cosmos-sdk/x/params"
	paramsclient "github.com/cosmos/cosmos-sdk/x/params/client"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"github.com/cosmos/cosmos-sdk/x/slashing"
	slashingkeeper "github.com/cosmos/cosmos-sdk/x/slashing/keeper"
	slashingtypes "github.com/cosmos/cosmos-sdk/x/slashing/types"
	"github.com/cosmos/cosmos-sdk/x/staking"
	stakingkeeper "github.com/cosmos/cosmos-sdk/x/staking/keeper"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	"github.com/spf13/cast"

	// IBC
	capabilitymodule "github.com/cosmos/ibc-go/modules/capability"
	capabilitykeeper "github.com/cosmos/ibc-go/modules/capability/keeper"
	capabilitytypes "github.com/cosmos/ibc-go/modules/capability/types"
	ibctransfer "github.com/cosmos/ibc-go/v8/modules/apps/transfer"
	ibctransferkeeper "github.com/cosmos/ibc-go/v8/modules/apps/transfer/keeper"
	ibctransfertypes "github.com/cosmos/ibc-go/v8/modules/apps/transfer/types"
	ibccore "github.com/cosmos/ibc-go/v8/modules/core"
	ibckeeper "github.com/cosmos/ibc-go/v8/modules/core/keeper"
	porttypes "github.com/cosmos/ibc-go/v8/modules/core/05-port/types"
	ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"

	// CosmWasm
	wasm "github.com/CosmWasm/wasmd/x/wasm"
	wasmkeeper "github.com/CosmWasm/wasmd/x/wasm/keeper"
	wasmtypes "github.com/CosmWasm/wasmd/x/wasm/types"

	literaturekeeper "github.com/tamizhi/chain/x/literature/keeper"
	literaturemodule "github.com/tamizhi/chain/x/literature"
	literaturetypes "github.com/tamizhi/chain/x/literature/types"
	nftkeeper "github.com/tamizhi/chain/x/nft/keeper"
	nftmodule "github.com/tamizhi/chain/x/nft"
	nfttypes "github.com/tamizhi/chain/x/nft/types"

	// Tamizhi custom modules
	accesslogmodule "github.com/tamizhi/chain/x/accesslog"
	accesslogkeeper "github.com/tamizhi/chain/x/accesslog/keeper"
	accesslogtypes "github.com/tamizhi/chain/x/accesslog/types"
	ibcmiddleware "github.com/tamizhi/chain/x/ibcmiddleware"
	identitymodule "github.com/tamizhi/chain/x/identity"
	identitykeeper "github.com/tamizhi/chain/x/identity/keeper"
	identitytypes "github.com/tamizhi/chain/x/identity/types"
	messagingmodule "github.com/tamizhi/chain/x/messaging"
	messagingkeeper "github.com/tamizhi/chain/x/messaging/keeper"
	messagingtypes "github.com/tamizhi/chain/x/messaging/types"
	nodesmodule "github.com/tamizhi/chain/x/nodes"
	nodeskeeper "github.com/tamizhi/chain/x/nodes/keeper"
	nodestypes "github.com/tamizhi/chain/x/nodes/types"
	rewardsmodule "github.com/tamizhi/chain/x/rewards"
	rewardskeeper "github.com/tamizhi/chain/x/rewards/keeper"
	rewardstypes "github.com/tamizhi/chain/x/rewards/types"
	securitymodule "github.com/tamizhi/chain/x/security"
	securitykeeper "github.com/tamizhi/chain/x/security/keeper"
	securitytypes "github.com/tamizhi/chain/x/security/types"
	feeburnmodule "github.com/tamizhi/chain/x/feeburn"
	feeburnkeeper "github.com/tamizhi/chain/x/feeburn/keeper"
	feeburntypes "github.com/tamizhi/chain/x/feeburn/types"

	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"
	"cosmossdk.io/client/v2/autocli"
	"cosmossdk.io/core/appmodule"
	runtimeservices "github.com/cosmos/cosmos-sdk/runtime/services"

	v1_1_0 "github.com/tamizhi/chain/app/upgrades/v1_1_0"
)

const (
	AccountAddressPrefix = "tamizhi"
	ChainID              = "tamizhi-1"
	EnvPrefix            = "TAMIZHI"
	Name                 = "tamizhi"
)

var DefaultNodeHome string

func init() {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}
	DefaultNodeHome = filepath.Join(userHomeDir, ".tamizhi")

	cfg := sdk.GetConfig()
	cfg.SetBech32PrefixForAccount(AccountAddressPrefix, AccountAddressPrefix+"pub")
	cfg.SetBech32PrefixForValidator(AccountAddressPrefix+"valoper", AccountAddressPrefix+"valoperpub")
	cfg.SetBech32PrefixForConsensusNode(AccountAddressPrefix+"valcons", AccountAddressPrefix+"valconspub")
	cfg.Seal()
}

var ModuleBasics = module.NewBasicManager(
	auth.AppModuleBasic{},
	genutil.NewAppModuleBasic(genutiltypes.DefaultMessageValidator),
	bank.AppModuleBasic{},
	staking.AppModuleBasic{},
	mint.AppModuleBasic{},
	distr.AppModuleBasic{},
	gov.NewAppModuleBasic([]govclient.ProposalHandler{
		paramsclient.ProposalHandler,
	}),
	params.AppModuleBasic{},
	crisis.AppModuleBasic{},
	slashing.AppModuleBasic{},
	consensus.AppModuleBasic{},
	vesting.AppModuleBasic{},
	// IBC
	capabilitymodule.AppModuleBasic{},
	ibccore.AppModuleBasic{},
	ibctransfer.AppModuleBasic{},
	upgrademodule.AppModuleBasic{},
	// CosmWasm
	wasm.AppModuleBasic{},
	// Tamizhi custom modules
	nodesmodule.AppModuleBasic{},
	securitymodule.AppModuleBasic{},
	identitymodule.AppModuleBasic{},
	accesslogmodule.AppModuleBasic{},
	rewardsmodule.AppModuleBasic{},
	messagingmodule.AppModuleBasic{},
	literaturemodule.AppModuleBasic{},
	nftmodule.AppModuleBasic{},
	feeburnmodule.AppModuleBasic{},
)

var maccPerms = map[string][]string{
	authtypes.FeeCollectorName:     nil,
	distrtypes.ModuleName:          nil,
	minttypes.ModuleName:           {authtypes.Minter},
	stakingtypes.BondedPoolName:    {authtypes.Burner, authtypes.Staking},
	stakingtypes.NotBondedPoolName: {authtypes.Burner, authtypes.Staking},
	govtypes.ModuleName:            {authtypes.Burner},
	ibctransfertypes.ModuleName:    {authtypes.Minter, authtypes.Burner},
	wasmtypes.ModuleName:           {authtypes.Burner},
	// Tamizhi custom module accounts
	nodestypes.ModuleName:    {authtypes.Burner, authtypes.Staking},
	rewardstypes.ModuleName:  {authtypes.Minter},
	feeburntypes.ModuleName:  {authtypes.Burner},
}

func BlockedAddresses() map[string]bool {
	modAccAddrs := make(map[string]bool)
	for acc := range maccPerms {
		modAccAddrs[authtypes.NewModuleAddress(acc).String()] = true
	}
	return modAccAddrs
}

// TamizhiApp is the Tamizhi Layer 1 application.
type TamizhiApp struct {
	*baseapp.BaseApp

	cdc               *codec.LegacyAmino
	appCodec          codec.Codec
	interfaceRegistry codectypes.InterfaceRegistry
	txConfig          client.TxConfig

	keys    map[string]*storetypes.KVStoreKey
	tkeys   map[string]*storetypes.TransientStoreKey
	memKeys map[string]*storetypes.MemoryStoreKey

	AccountKeeper         authkeeper.AccountKeeper
	BankKeeper            bankkeeper.BaseKeeper
	StakingKeeper         *stakingkeeper.Keeper
	SlashingKeeper        slashingkeeper.Keeper
	MintKeeper            mintkeeper.Keeper
	DistrKeeper           distrkeeper.Keeper
	GovKeeper             govkeeper.Keeper
	CrisisKeeper          *crisiskeeper.Keeper
	ParamsKeeper          paramskeeper.Keeper
	ConsensusParamsKeeper consensusparamkeeper.Keeper
	UpgradeKeeper         *upgradekeeper.Keeper
	LiteratureKeeper      literaturekeeper.Keeper
	NFTKeeper             nftkeeper.Keeper

	// Tamizhi custom keepers
	IdentityKeeper  identitykeeper.Keeper
	NodesKeeper     nodeskeeper.Keeper
	SecurityKeeper  securitykeeper.Keeper
	AccesslogKeeper accesslogkeeper.Keeper
	RewardsKeeper   rewardskeeper.Keeper
	MessagingKeeper messagingkeeper.Keeper
	FeeBurnKeeper   feeburnkeeper.Keeper

	// IBC
	CapabilityKeeper     *capabilitykeeper.Keeper
	IBCKeeper            *ibckeeper.Keeper
	TransferKeeper       ibctransferkeeper.Keeper
	ScopedIBCKeeper      capabilitykeeper.ScopedKeeper
	ScopedTransferKeeper capabilitykeeper.ScopedKeeper

	// CosmWasm
	WasmKeeper       wasmkeeper.Keeper
	ScopedWasmKeeper capabilitykeeper.ScopedKeeper

	ModuleManager      *module.Manager
	BasicModuleManager module.BasicManager

	configurator module.Configurator
}

func newKVStoreKeys(names ...string) map[string]*storetypes.KVStoreKey {
	keys := make(map[string]*storetypes.KVStoreKey, len(names))
	for _, name := range names {
		keys[name] = storetypes.NewKVStoreKey(name)
	}
	return keys
}

func newTransientStoreKeys(names ...string) map[string]*storetypes.TransientStoreKey {
	keys := make(map[string]*storetypes.TransientStoreKey, len(names))
	for _, name := range names {
		keys[name] = storetypes.NewTransientStoreKey(name)
	}
	return keys
}

func newMemoryStoreKeys(names ...string) map[string]*storetypes.MemoryStoreKey {
	keys := make(map[string]*storetypes.MemoryStoreKey, len(names))
	for _, name := range names {
		keys[name] = storetypes.NewMemoryStoreKey(name)
	}
	return keys
}

func NewTamizhiApp(
	logger log.Logger,
	db dbm.DB,
	traceStore io.Writer,
	loadLatest bool,
	appOpts servertypes.AppOptions,
	baseAppOptions ...func(*baseapp.BaseApp),
) *TamizhiApp {
	interfaceRegistry, err := codectypes.NewInterfaceRegistryWithOptions(codectypes.InterfaceRegistryOptions{
		ProtoFiles: gogoproto.HybridResolver,
		SigningOptions: signing.Options{
			AddressCodec:          addresscodec.NewBech32Codec(AccountAddressPrefix),
			ValidatorAddressCodec: addresscodec.NewBech32Codec(AccountAddressPrefix + "valoper"),
			CustomGetSigners:      customGetSigners(),
		},
	})
	if err != nil {
		panic(err)
	}

	appCodec := codec.NewProtoCodec(interfaceRegistry)
	legacyAmino := codec.NewLegacyAmino()
	txConfig := authtx.NewTxConfig(appCodec, authtx.DefaultSignModes)

	std.RegisterLegacyAminoCodec(legacyAmino)
	std.RegisterInterfaces(interfaceRegistry)
	ModuleBasics.RegisterLegacyAminoCodec(legacyAmino)
	ModuleBasics.RegisterInterfaces(interfaceRegistry)

	bApp := baseapp.NewBaseApp(
		Name,
		logger,
		db,
		txConfig.TxDecoder(),
		baseAppOptions...,
	)
	bApp.SetCommitMultiStoreTracer(traceStore)
	bApp.SetVersion(version.Version)
	bApp.SetInterfaceRegistry(interfaceRegistry)
	bApp.SetTxEncoder(txConfig.TxEncoder())

	keys := newKVStoreKeys(
		authtypes.StoreKey,
		banktypes.StoreKey,
		stakingtypes.StoreKey,
		crisistypes.StoreKey,
		minttypes.StoreKey,
		distrtypes.StoreKey,
		slashingtypes.StoreKey,
		govtypes.StoreKey,
		paramstypes.StoreKey,
		consensusparamtypes.StoreKey,
		upgradetypes.StoreKey,
		literaturetypes.StoreKey,
		nfttypes.StoreKey,
		// Tamizhi custom modules
		identitytypes.StoreKey,
		nodestypes.StoreKey,
		securitytypes.StoreKey,
		accesslogtypes.StoreKey,
		rewardstypes.StoreKey,
		messagingtypes.StoreKey,
		feeburntypes.StoreKey,
		// IBC
		capabilitytypes.StoreKey,
		ibcexported.StoreKey,
		ibctransfertypes.StoreKey,
		// CosmWasm
		wasmtypes.StoreKey,
	)
	tkeys := newTransientStoreKeys(paramstypes.TStoreKey)
	memKeys := newMemoryStoreKeys(capabilitytypes.MemStoreKey)

	app := &TamizhiApp{
		BaseApp:           bApp,
		cdc:               legacyAmino,
		appCodec:          appCodec,
		interfaceRegistry: interfaceRegistry,
		txConfig:          txConfig,
		keys:              keys,
		tkeys:             tkeys,
		memKeys:           memKeys,
	}

	// ----- Params -----
	app.ParamsKeeper = initParamsKeeper(appCodec, legacyAmino, keys[paramstypes.StoreKey], tkeys[paramstypes.TStoreKey])

	// ----- Consensus params -----
	app.ConsensusParamsKeeper = consensusparamkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[consensusparamtypes.StoreKey]),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		runtime.EventService{},
	)
	bApp.SetParamStore(app.ConsensusParamsKeeper.ParamsStore)

	// ----- Capability keeper (must be first — IBC depends on it) -----
	app.CapabilityKeeper = capabilitykeeper.NewKeeper(
		appCodec,
		keys[capabilitytypes.StoreKey],
		memKeys[capabilitytypes.MemStoreKey],
	)
	// Scope IBC modules before sealing
	app.ScopedIBCKeeper = app.CapabilityKeeper.ScopeToModule(ibcexported.ModuleName)
	app.ScopedTransferKeeper = app.CapabilityKeeper.ScopeToModule(ibctransfertypes.ModuleName)
	app.ScopedWasmKeeper = app.CapabilityKeeper.ScopeToModule(wasmtypes.ModuleName)
	app.CapabilityKeeper.Seal()

	// ----- Account keeper -----
	app.AccountKeeper = authkeeper.NewAccountKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[authtypes.StoreKey]),
		authtypes.ProtoBaseAccount,
		maccPerms,
		addresscodec.NewBech32Codec(AccountAddressPrefix),
		AccountAddressPrefix,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- Bank keeper -----
	app.BankKeeper = bankkeeper.NewBaseKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[banktypes.StoreKey]),
		app.AccountKeeper,
		BlockedAddresses(),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		logger,
	)

	// ----- Staking keeper -----
	stakingKeeper := stakingkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[stakingtypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		addresscodec.NewBech32Codec(AccountAddressPrefix+"valoper"),
		addresscodec.NewBech32Codec(AccountAddressPrefix+"valcons"),
	)
	app.StakingKeeper = stakingKeeper

	// ----- Mint keeper -----
	app.MintKeeper = mintkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[minttypes.StoreKey]),
		app.StakingKeeper,
		app.AccountKeeper,
		app.BankKeeper,
		authtypes.FeeCollectorName,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- Distribution keeper -----
	app.DistrKeeper = distrkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[distrtypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		app.StakingKeeper,
		authtypes.FeeCollectorName,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- Slashing keeper -----
	app.SlashingKeeper = slashingkeeper.NewKeeper(
		appCodec,
		legacyAmino,
		runtime.NewKVStoreService(keys[slashingtypes.StoreKey]),
		app.StakingKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- Crisis keeper -----
	app.CrisisKeeper = crisiskeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[crisistypes.StoreKey]),
		cast.ToUint(appOpts.Get(crisis.FlagSkipGenesisInvariants)),
		app.BankKeeper,
		authtypes.FeeCollectorName,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		app.AccountKeeper.AddressCodec(),
	)

	// ----- Upgrade keeper -----
	homePath := cast.ToString(appOpts.Get("home"))
	if homePath == "" {
		homePath = DefaultNodeHome
	}
	app.UpgradeKeeper = upgradekeeper.NewKeeper(
		nil,
		runtime.NewKVStoreService(keys[upgradetypes.StoreKey]),
		appCodec,
		homePath,
		bApp,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- IBC core keeper -----
	app.IBCKeeper = ibckeeper.NewKeeper(
		appCodec,
		keys[ibcexported.StoreKey],
		app.GetSubspace(ibcexported.ModuleName),
		app.StakingKeeper,
		app.UpgradeKeeper,
		app.ScopedIBCKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- Transfer keeper -----
	app.TransferKeeper = ibctransferkeeper.NewKeeper(
		appCodec,
		keys[ibctransfertypes.StoreKey],
		app.GetSubspace(ibctransfertypes.ModuleName),
		app.IBCKeeper.ChannelKeeper,
		app.IBCKeeper.ChannelKeeper,
		app.IBCKeeper.PortKeeper,
		app.AccountKeeper,
		app.BankKeeper,
		app.ScopedTransferKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- CosmWasm keeper -----
	// Restrict wasm code upload to governance proposals only.
	// DefaultWasmConfig allows Everybody to upload — that is unsafe for production.
	wasmConfig := wasmtypes.DefaultWasmConfig()
	wasmConfig.SmartQueryGasLimit = 3_000_000
	app.WasmKeeper = wasmkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[wasmtypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		app.StakingKeeper,
		distrkeeper.NewQuerier(app.DistrKeeper),
		app.IBCKeeper.ChannelKeeper, // ICS4Wrapper
		app.IBCKeeper.ChannelKeeper,
		app.IBCKeeper.PortKeeper,
		app.ScopedWasmKeeper,
		app.TransferKeeper,
		app.MsgServiceRouter(),
		app.GRPCQueryRouter(),
		homePath,
		wasmConfig,
		wasmkeeper.BuiltInCapabilities(),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- IBC Router (transfer + wasm) -----
	transferIBCModule := ibctransfer.NewIBCModule(app.TransferKeeper)
	// Wrap the ICS-20 module with the AccessLog middleware so that every
	// incoming transfer is logged to the accesslog module.
	transferStack := ibcmiddleware.NewAccessLogMiddleware(transferIBCModule, app.AccesslogKeeper)
	wasmIBCHandler := wasm.NewIBCHandler(app.WasmKeeper, app.IBCKeeper.ChannelKeeper, app.IBCKeeper.ChannelKeeper)
	ibcRouter := porttypes.NewRouter()
	ibcRouter.AddRoute(ibctransfertypes.ModuleName, transferStack)
	ibcRouter.AddRoute(wasmtypes.ModuleName, wasmIBCHandler)
	app.IBCKeeper.SetRouter(ibcRouter)

	// ----- Gov keeper -----
	govConfig := govtypes.DefaultConfig()
	govKeeper := govkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[govtypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		app.StakingKeeper,
		app.DistrKeeper,
		app.MsgServiceRouter(),
		govConfig,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)
	app.GovKeeper = *govKeeper

	// ----- Literature keeper -----
	app.LiteratureKeeper = literaturekeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[literaturetypes.StoreKey]),
		app.AccountKeeper,
		app.BankKeeper,
		logger,
	)

	literaturetypes.RegisterInterfaces(interfaceRegistry)
	literaturetypes.RegisterLegacyAminoCodec(legacyAmino)

	// ----- NFT keeper -----
	app.NFTKeeper = nftkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[nfttypes.StoreKey]),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	nfttypes.RegisterInterfaces(interfaceRegistry)

	// ----- Identity keeper -----
	app.IdentityKeeper = identitykeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[identitytypes.StoreKey]),
	)

	// ----- Nodes keeper -----
	app.NodesKeeper = nodeskeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[nodestypes.StoreKey]),
		app.BankKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		authtypes.NewModuleAddress(authtypes.FeeCollectorName),
	)

	// ----- Security keeper -----
	app.SecurityKeeper = securitykeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[securitytypes.StoreKey]),
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- Accesslog keeper -----
	app.AccesslogKeeper = accesslogkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[accesslogtypes.StoreKey]),
		app.IdentityKeeper,
	)

	// ----- Rewards keeper -----
	app.RewardsKeeper = rewardskeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[rewardstypes.StoreKey]),
		app.BankKeeper,
		app.IdentityKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- Messaging keeper -----
	app.MessagingKeeper = messagingkeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[messagingtypes.StoreKey]),
		app.NodesKeeper,
		authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	// ----- FeeBurn keeper -----
	app.FeeBurnKeeper = feeburnkeeper.NewKeeper(
		runtime.NewKVStoreService(keys[feeburntypes.StoreKey]),
		app.BankKeeper,
	)

	// Set staking hooks — slashing and distribution get notified of validator events
	app.StakingKeeper.SetHooks(
		stakingtypes.NewMultiStakingHooks(
			app.DistrKeeper.Hooks(),
			app.SlashingKeeper.Hooks(),
		),
	)

	// ----- AnteHandler -----
	anteHandler, err := NewAnteHandler(AnteHandlerOptions{
		AccountKeeper:   app.AccountKeeper,
		BankKeeper:      app.BankKeeper,
		SignModeHandler: txConfig.SignModeHandler(),
		SigGasConsumer:  ante.DefaultSigVerificationGasConsumer,
		SecurityKeeper:  app.SecurityKeeper,
		FeeBurnKeeper:   app.FeeBurnKeeper,
	})
	if err != nil {
		panic(fmt.Sprintf("failed to create ante handler: %s", err))
	}
	bApp.SetAnteHandler(anteHandler)
	bApp.SetInitChainer(app.InitChainer)
	bApp.SetPreBlocker(app.PreBlocker)
	bApp.SetBeginBlocker(app.BeginBlocker)
	bApp.SetEndBlocker(app.EndBlocker)

	// ----- Module manager -----
	app.ModuleManager = module.NewManager(
		genutil.NewAppModule(
			app.AccountKeeper,
			app.StakingKeeper,
			app,
			txConfig,
		),
		auth.NewAppModule(appCodec, app.AccountKeeper, nil, app.GetSubspace(authtypes.ModuleName)),
		vesting.NewAppModule(app.AccountKeeper, app.BankKeeper),
		bank.NewAppModule(appCodec, app.BankKeeper, app.AccountKeeper, app.GetSubspace(banktypes.ModuleName)),
		crisis.NewAppModule(app.CrisisKeeper, cast.ToBool(appOpts.Get(crisis.FlagSkipGenesisInvariants)), app.GetSubspace(crisistypes.ModuleName)),
		gov.NewAppModule(appCodec, &app.GovKeeper, app.AccountKeeper, app.BankKeeper, app.GetSubspace(govtypes.ModuleName)),
		mint.NewAppModule(appCodec, app.MintKeeper, app.AccountKeeper, nil, app.GetSubspace(minttypes.ModuleName)),
		slashing.NewAppModule(appCodec, app.SlashingKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper, app.GetSubspace(slashingtypes.ModuleName), app.interfaceRegistry),
		distr.NewAppModule(appCodec, app.DistrKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper, app.GetSubspace(distrtypes.ModuleName)),
		staking.NewAppModule(appCodec, app.StakingKeeper, app.AccountKeeper, app.BankKeeper, app.GetSubspace(stakingtypes.ModuleName)),
		params.NewAppModule(app.ParamsKeeper),
		consensus.NewAppModule(appCodec, app.ConsensusParamsKeeper),
		upgrademodule.NewAppModule(app.UpgradeKeeper, addresscodec.NewBech32Codec(AccountAddressPrefix)),
		// IBC
		capabilitymodule.NewAppModule(appCodec, *app.CapabilityKeeper, false),
		ibccore.NewAppModule(app.IBCKeeper),
		ibctransfer.NewAppModule(app.TransferKeeper),
		// CosmWasm
		wasm.NewAppModule(appCodec, &app.WasmKeeper, app.StakingKeeper, app.AccountKeeper, app.BankKeeper, app.MsgServiceRouter(), app.GetSubspace(wasmtypes.ModuleName)),
		// Tamizhi custom modules
		identitymodule.NewAppModule(app.IdentityKeeper),
		nodesmodule.NewAppModule(appCodec, app.NodesKeeper),
		securitymodule.NewAppModule(appCodec, app.SecurityKeeper),
		accesslogmodule.NewAppModule(appCodec, app.AccesslogKeeper),
		rewardsmodule.NewAppModule(appCodec, app.RewardsKeeper, app.BankKeeper),
		messagingmodule.NewAppModule(appCodec, app.MessagingKeeper),
		literaturemodule.NewAppModule(app.LiteratureKeeper),
		nftmodule.NewAppModule(app.NFTKeeper),
		feeburnmodule.NewAppModule(app.FeeBurnKeeper),
	)

	app.BasicModuleManager = ModuleBasics

	app.ModuleManager.SetOrderPreBlockers(
		upgradetypes.ModuleName,
	)

	app.ModuleManager.SetOrderBeginBlockers(
		capabilitytypes.ModuleName,
		minttypes.ModuleName,
		distrtypes.ModuleName,
		slashingtypes.ModuleName,
		stakingtypes.ModuleName,
		authtypes.ModuleName,
		banktypes.ModuleName,
		govtypes.ModuleName,
		crisistypes.ModuleName,
		genutiltypes.ModuleName,
		paramstypes.ModuleName,
		consensusparamtypes.ModuleName,
		upgradetypes.ModuleName,
		ibcexported.ModuleName,
		ibctransfertypes.ModuleName,
		wasmtypes.ModuleName,
		// Tamizhi custom modules
		identitytypes.ModuleName,
		nodestypes.ModuleName,
		securitytypes.ModuleName,
		accesslogtypes.ModuleName,
		rewardstypes.ModuleName,
		messagingtypes.ModuleName,
		literaturetypes.ModuleName,
		nfttypes.ModuleName,
		feeburntypes.ModuleName,
	)

	app.ModuleManager.SetOrderEndBlockers(
		crisistypes.ModuleName,
		govtypes.ModuleName,
		stakingtypes.ModuleName,
		authtypes.ModuleName,
		banktypes.ModuleName,
		distrtypes.ModuleName,
		slashingtypes.ModuleName,
		minttypes.ModuleName,
		genutiltypes.ModuleName,
		paramstypes.ModuleName,
		consensusparamtypes.ModuleName,
		upgradetypes.ModuleName,
		capabilitytypes.ModuleName,
		ibcexported.ModuleName,
		ibctransfertypes.ModuleName,
		wasmtypes.ModuleName,
		// Tamizhi custom modules
		identitytypes.ModuleName,
		nodestypes.ModuleName,
		securitytypes.ModuleName,
		accesslogtypes.ModuleName,
		rewardstypes.ModuleName,
		messagingtypes.ModuleName,
		literaturetypes.ModuleName,
		nfttypes.ModuleName,
		feeburntypes.ModuleName,
	)

	genesisModuleOrder := []string{
		capabilitytypes.ModuleName,
		authtypes.ModuleName,
		banktypes.ModuleName,
		distrtypes.ModuleName,
		stakingtypes.ModuleName,
		slashingtypes.ModuleName,
		govtypes.ModuleName,
		minttypes.ModuleName,
		crisistypes.ModuleName,
		ibcexported.ModuleName,
		genutiltypes.ModuleName,
		"vesting",
		consensusparamtypes.ModuleName,
		paramstypes.ModuleName,
		upgradetypes.ModuleName,
		ibctransfertypes.ModuleName,
		wasmtypes.ModuleName,
		// Tamizhi custom modules
		identitytypes.ModuleName,
		nodestypes.ModuleName,
		securitytypes.ModuleName,
		accesslogtypes.ModuleName,
		rewardstypes.ModuleName,
		messagingtypes.ModuleName,
		literaturetypes.ModuleName,
		nfttypes.ModuleName,
		feeburntypes.ModuleName,
	}
	app.ModuleManager.SetOrderInitGenesis(genesisModuleOrder...)
	app.ModuleManager.SetOrderExportGenesis(genesisModuleOrder...)

	app.ModuleManager.RegisterInvariants(app.CrisisKeeper)
	app.configurator = module.NewConfigurator(app.appCodec, app.MsgServiceRouter(), app.GRPCQueryRouter())
	if err := app.ModuleManager.RegisterServices(app.configurator); err != nil {
		panic(err)
	}

	// Register the autocli gRPC service so CLI can reflect on query methods.
	autocliv1.RegisterQueryServer(app.GRPCQueryRouter(),
		runtimeservices.NewAutoCLIQueryService(app.ModuleManager.Modules))

	// gRPC reflection: the cosmos.reflection.v1 service (registered above via autocli)
	// is the standard for Cosmos SDK chains in v0.50+. Tools like grpcurl and BloomRPC
	// can introspect services via that endpoint. The legacy grpc.reflection.v1alpha
	// service is no longer wired here because newer grpc-go requires a richer
	// GRPCServer interface than baseapp's GRPCQueryRouter exposes.

	// Mount stores
	app.MountKVStores(keys)
	app.MountTransientStores(tkeys)
	app.MountMemoryStores(memKeys)

	app.RegisterUpgradeHandlers()

	if loadLatest {
		if err := app.LoadLatestVersion(); err != nil {
			panic(fmt.Errorf("error loading latest version: %w", err))
		}
	}

	return app
}

// RegisterUpgradeHandlers registers all chain upgrade handlers and, if an upgrade
// is pending on disk, configures the store loader for any required store migrations.
func (app *TamizhiApp) RegisterUpgradeHandlers() {
	app.UpgradeKeeper.SetUpgradeHandler(
		v1_1_0.UpgradeName,
		v1_1_0.CreateUpgradeHandler(app.ModuleManager, app.configurator),
	)

	upgradeInfo, err := app.UpgradeKeeper.ReadUpgradeInfoFromDisk()
	if err != nil {
		panic(fmt.Sprintf("failed to read upgrade info from disk: %v", err))
	}

	if upgradeInfo.Name == v1_1_0.UpgradeName && !app.UpgradeKeeper.IsSkipHeight(upgradeInfo.Height) {
		// Add any store upgrades here if needed
		// storeUpgrades := storetypes.StoreUpgrades{...}
		// app.SetStoreLoader(upgradetypes.UpgradeStoreLoader(upgradeInfo.Height, &storeUpgrades))
	}
}

func (app *TamizhiApp) InitChainer(ctx sdk.Context, req *abci.RequestInitChain) (*abci.ResponseInitChain, error) {
	var genesisState GenesisState
	if err := json.Unmarshal(req.AppStateBytes, &genesisState); err != nil {
		panic(err)
	}
	res, err := app.ModuleManager.InitGenesis(ctx, app.appCodec, genesisState)
	if err != nil {
		return nil, err
	}

	// Ensure every registered KV store has at least one committed key.
	//
	// Some legacy/minimal modules (x/params, x/upgrade, etc.) write nothing to
	// their IAVL stores during InitGenesis. An IAVL tree that has never been
	// written to has latestVersion=0, so VersionExists(height) returns false for
	// every block height. That causes CacheMultiStoreWithVersion to return
	// "version does not exist" for ALL queries, even for stores that ARE valid.
	//
	// Fix: after all module genesis runs, iterate every KV store key registered
	// with this app and write a sentinel entry to any store that is still empty.
	sentinelKey := []byte("_init_")
	sentinelVal := []byte{1}
	for _, kvKey := range app.keys {
		kvStore := ctx.KVStore(kvKey)
		// Only write if the store has no data yet (avoids polluting stores that
		// already contain real module genesis data).
		if bz := kvStore.Get(sentinelKey); bz == nil {
			kvStore.Set(sentinelKey, sentinelVal)
		}
	}

	return res, nil
}

func (app *TamizhiApp) PreBlocker(ctx sdk.Context, _ *abci.RequestFinalizeBlock) (*sdk.ResponsePreBlock, error) {
	return app.ModuleManager.PreBlock(ctx)
}

func (app *TamizhiApp) BeginBlocker(ctx sdk.Context) (sdk.BeginBlock, error) {
	return app.ModuleManager.BeginBlock(ctx)
}

func (app *TamizhiApp) EndBlocker(ctx sdk.Context) (sdk.EndBlock, error) {
	return app.ModuleManager.EndBlock(ctx)
}

func (app *TamizhiApp) LoadHeight(height int64) error {
	return app.LoadVersion(height)
}

func (app *TamizhiApp) LegacyAmino() *codec.LegacyAmino {
	return app.cdc
}

func (app *TamizhiApp) AppCodec() codec.Codec {
	return app.appCodec
}

func (app *TamizhiApp) InterfaceRegistry() codectypes.InterfaceRegistry {
	return app.interfaceRegistry
}

func (app *TamizhiApp) TxConfig() client.TxConfig {
	return app.txConfig
}

func (app *TamizhiApp) GetSubspace(moduleName string) paramstypes.Subspace {
	subspace, _ := app.ParamsKeeper.GetSubspace(moduleName)
	return subspace
}

func (app *TamizhiApp) GetKey(storeKey string) *storetypes.KVStoreKey {
	return app.keys[storeKey]
}

func (app *TamizhiApp) RegisterAPIRoutes(apiSvr *api.Server, apiConfig serverconfig.APIConfig) {
	clientCtx := apiSvr.ClientCtx
	authtx.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)
	app.BasicModuleManager.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)
}

func (app *TamizhiApp) RegisterTxService(clientCtx client.Context) {
	authtx.RegisterTxService(app.BaseApp.GRPCQueryRouter(), clientCtx, app.BaseApp.Simulate, app.interfaceRegistry)
}

func (app *TamizhiApp) RegisterTendermintService(clientCtx client.Context) {
	cmtservice.RegisterTendermintService(
		clientCtx,
		app.BaseApp.GRPCQueryRouter(),
		app.interfaceRegistry,
		app.Query,
	)
}

func (app *TamizhiApp) RegisterNodeService(clientCtx client.Context, cfg serverconfig.Config) {
	nodeservice.RegisterNodeService(clientCtx, app.GRPCQueryRouter(), cfg)
}

// AutoCliOpts returns the autocli options for the app, enabling auto-generated
// query and tx CLI commands for all modules that implement AutoCLIOptions().
func (app *TamizhiApp) AutoCliOpts() autocli.AppOptions {
	modules := make(map[string]appmodule.AppModule, len(app.ModuleManager.Modules))
	for name, m := range app.ModuleManager.Modules {
		if am, ok := m.(appmodule.AppModule); ok {
			modules[name] = am
		}
	}
	return autocli.AppOptions{
		Modules:               modules,
		ModuleOptions:         runtimeservices.ExtractAutoCLIOptions(app.ModuleManager.Modules),
		AddressCodec:          addresscodec.NewBech32Codec(AccountAddressPrefix),
		ValidatorAddressCodec: addresscodec.NewBech32Codec(AccountAddressPrefix + "valoper"),
		ConsensusAddressCodec: addresscodec.NewBech32Codec(AccountAddressPrefix + "valcons"),
	}
}

// RegisterAutoCLIService wires up the autocli gRPC service so that the CLI
// can reflect on available query methods at runtime.
func (app *TamizhiApp) RegisterAutoCLIService() {
	autocliv1.RegisterQueryServer(app.GRPCQueryRouter(),
		runtimeservices.NewAutoCLIQueryService(app.ModuleManager.Modules))
}

func (app *TamizhiApp) DefaultGenesis() GenesisState {
	return app.BasicModuleManager.DefaultGenesis(app.appCodec)
}

type GenesisState map[string]json.RawMessage

func NewDefaultGenesisState(cdc codec.JSONCodec) GenesisState {
	return ModuleBasics.DefaultGenesis(cdc)
}

func GetMaccPerms() map[string][]string {
	dup := make(map[string][]string)
	for k, v := range maccPerms {
		dup[k] = v
	}
	return dup
}

func initParamsKeeper(
	appCodec codec.BinaryCodec,
	legacyAmino *codec.LegacyAmino,
	key *storetypes.KVStoreKey,
	tkey *storetypes.TransientStoreKey,
) paramskeeper.Keeper {
	pk := paramskeeper.NewKeeper(appCodec, legacyAmino, key, tkey)

	pk.Subspace(authtypes.ModuleName)
	pk.Subspace(banktypes.ModuleName)
	pk.Subspace(stakingtypes.ModuleName)
	pk.Subspace(minttypes.ModuleName)
	pk.Subspace(distrtypes.ModuleName)
	pk.Subspace(slashingtypes.ModuleName)
	pk.Subspace(govtypes.ModuleName)
	pk.Subspace(crisistypes.ModuleName)
	// IBC subspaces
	pk.Subspace(ibcexported.ModuleName)
	pk.Subspace(ibctransfertypes.ModuleName)
	// CosmWasm subspace
	pk.Subspace(wasmtypes.ModuleName)

	return pk
}

var _ = cast.ToString
