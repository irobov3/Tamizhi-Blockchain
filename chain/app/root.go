package app

import (
	"io"
	"os"
	"time"

	cmtcfg "github.com/cometbft/cometbft/config"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/config"
	"github.com/cosmos/cosmos-sdk/client/debug"
	addresscodec "github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/keys"
	"github.com/cosmos/cosmos-sdk/client/pruning"
	"github.com/cosmos/cosmos-sdk/client/rpc"
	"github.com/cosmos/cosmos-sdk/client/snapshot"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/crypto/keyring"
	"github.com/cosmos/cosmos-sdk/server"
	serverconfig "github.com/cosmos/cosmos-sdk/server/config"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	simtestutil "github.com/cosmos/cosmos-sdk/testutil/sims"
	"github.com/cosmos/cosmos-sdk/std"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/cosmos/cosmos-sdk/version"
	authcmd "github.com/cosmos/cosmos-sdk/x/auth/client/cli"
	authtx "github.com/cosmos/cosmos-sdk/x/auth/tx"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	bankcli "github.com/cosmos/cosmos-sdk/x/bank/client/cli"
	"github.com/cosmos/cosmos-sdk/x/crisis"
	distrcli "github.com/cosmos/cosmos-sdk/x/distribution/client/cli"
	genutilcli "github.com/cosmos/cosmos-sdk/x/genutil/client/cli"
	govcli "github.com/cosmos/cosmos-sdk/x/gov/client/cli"
	stakingcli "github.com/cosmos/cosmos-sdk/x/staking/client/cli"
	gogoproto "github.com/cosmos/gogoproto/proto"
	"github.com/spf13/cobra"

	"cosmossdk.io/core/address"
	"cosmossdk.io/log"
	signing "cosmossdk.io/x/tx/signing"

	accesslogcli "github.com/tamizhi/chain/x/accesslog/client/cli"
	messagingcli "github.com/tamizhi/chain/x/messaging/client/cli"
	nodescli "github.com/tamizhi/chain/x/nodes/client/cli"
	rewardscli "github.com/tamizhi/chain/x/rewards/client/cli"
	securitycli "github.com/tamizhi/chain/x/security/client/cli"
)

// NewRootCmd creates the root command for the tamizhi daemon.
func NewRootCmd() *cobra.Command {
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

	// Extract address codecs for module CLIs
	addrCodec := interfaceRegistry.SigningContext().AddressCodec()
	valAddrCodec := interfaceRegistry.SigningContext().ValidatorAddressCodec()

	initClientCtx := client.Context{}.
		WithCodec(appCodec).
		WithInterfaceRegistry(interfaceRegistry).
		WithLegacyAmino(legacyAmino).
		WithTxConfig(txConfig).
		WithInput(os.Stdin).
		WithAccountRetriever(authtypes.AccountRetriever{}).
		WithHomeDir(DefaultNodeHome).
		WithViper(EnvPrefix)

	rootCmd := &cobra.Command{
		Use:   Name + "d",
		Short: "Tamizhi blockchain daemon — Tamil literary preservation on-chain",
		PersistentPreRunE: func(cmd *cobra.Command, _ []string) error {
			cmd.SetOut(cmd.OutOrStdout())
			cmd.SetErr(cmd.ErrOrStderr())

			initClientCtx, err := client.ReadPersistentCommandFlags(initClientCtx, cmd.Flags())
			if err != nil {
				return err
			}
			initClientCtx, err = config.ReadFromClientConfig(initClientCtx)
			if err != nil {
				return err
			}
			if err := client.SetCmdClientContextHandler(initClientCtx, cmd); err != nil {
				return err
			}

			customAppTemplate, customAppConfig := initAppConfig()
			customCMTConfig := initCometConfig()

			return server.InterceptConfigsPreRunHandler(
				cmd,
				customAppTemplate,
				customAppConfig,
				customCMTConfig,
			)
		},
	}

	initRootCmd(rootCmd, appCodec, txConfig, ModuleBasics, addrCodec, valAddrCodec)

	// Build autocli options from a temporary in-memory app so that
	// EnhanceRootCommand can auto-generate query/tx commands for every module
	// (bank, staking, gov, slashing, mint, distribution, etc.) from their
	// gRPC service definitions — no query.go files needed in cosmos-sdk v0.50.
	//
	// Use os.MkdirTemp so WasmVM's exclusive.lock doesn't collide with a
	// concurrently-running node that owns DefaultNodeHome.
	tmpHome, err := os.MkdirTemp("", "tamizhi-autocli-*")
	if err != nil {
		panic(err)
	}
	defer os.RemoveAll(tmpHome)
	tempApp := NewTamizhiApp(
		log.NewNopLogger(),
		dbm.NewMemDB(),
		nil,
		false,
		simtestutil.NewAppOptionsWithFlagHome(tmpHome),
	)
	autoCliOpts := tempApp.AutoCliOpts()
	initClientCtx, _ = config.ReadFromClientConfig(initClientCtx)
	autoCliOpts.Keyring, _ = keyring.NewAutoCLIKeyring(initClientCtx.Keyring)
	autoCliOpts.ClientCtx = initClientCtx
	if err := autoCliOpts.EnhanceRootCommand(rootCmd); err != nil {
		panic(err)
	}

	return rootCmd
}

func initRootCmd(
	rootCmd *cobra.Command,
	appCodec codec.Codec,
	txConfig client.TxConfig,
	basicManager module.BasicManager,
	addrCodec address.Codec,
	valAddrCodec address.Codec,
) {
	rootCmd.AddCommand(
		genutilcli.InitCmd(basicManager, DefaultNodeHome),
		genutilcli.Commands(txConfig, basicManager, DefaultNodeHome),
		debug.Cmd(),
		pruning.Cmd(newApp, DefaultNodeHome),
		snapshot.Cmd(newApp),
		version.NewVersionCommand(),
		server.StatusCommand(),
	)

	server.AddCommands(
		rootCmd,
		DefaultNodeHome,
		newApp,
		appExport,
		addModuleInitFlags,
	)

	rootCmd.AddCommand(
		keys.Commands(),
		authcmd.GetBroadcastCommand(),
		authcmd.GetEncodeCommand(),
		authcmd.GetDecodeCommand(),
		queryCommand(basicManager),
		txCommand(addrCodec, valAddrCodec),
	)

	_ = appCodec
	_ = basicManager
}

// queryCommand returns the query subcommand with all module query commands registered.
func queryCommand(basicManager module.BasicManager) *cobra.Command {
	cmd := &cobra.Command{
		Use:                        "query",
		Aliases:                    []string{"q"},
		Short:                      "Querying subcommands",
		DisableFlagParsing:         false,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		rpc.QueryEventForTxCmd(),
		rpc.ValidatorCommand(),
		server.QueryBlockCmd(),
		server.QueryBlocksCmd(),
		server.QueryBlockResultsCmd(),
		authcmd.QueryTxsByEventsCmd(),
		authcmd.QueryTxCmd(),
	)

	// Register every module's query commands (bank, staking, gov, slashing, etc.)
	basicManager.AddQueryCommands(cmd)

	cmd.PersistentFlags().String(flags.FlagChainID, "", "The network chain ID")

	return cmd
}

// txCommand returns the tx subcommand with module tx commands registered directly
// using the address codecs (bypassing AppModuleBasic to avoid nil codec panics).
func txCommand(addrCodec address.Codec, valAddrCodec address.Codec) *cobra.Command {
	cmd := &cobra.Command{
		Use:                        "tx",
		Short:                      "Transactions subcommands",
		DisableFlagParsing:         false,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	cmd.AddCommand(
		// auth utility commands
		authcmd.GetSignCommand(),
		authcmd.GetSignBatchCommand(),
		authcmd.GetMultiSignCommand(),
		authcmd.GetMultiSignBatchCmd(),
		authcmd.GetBroadcastCommand(),
		authcmd.GetEncodeCommand(),
		authcmd.GetDecodeCommand(),
		authcmd.GetSimulateCmd(),
		// module tx commands (codec passed explicitly)
		bankcli.NewTxCmd(addrCodec),
		stakingcli.NewTxCmd(valAddrCodec, addrCodec),
		distrcli.NewTxCmd(valAddrCodec, addrCodec),
		govcli.NewTxCmd(nil),
		// custom Tamizhi module tx commands
		rewardscli.GetTxCmd(),
		nodescli.GetTxCmd(),
		accesslogcli.GetTxCmd(),
		messagingcli.GetTxCmd(),
		securitycli.GetTxCmd(),
	)

	cmd.PersistentFlags().String(flags.FlagChainID, "", "The network chain ID")

	return cmd
}

// addModuleInitFlags adds module-specific flags to the start command.
func addModuleInitFlags(startCmd *cobra.Command) {
	crisis.AddModuleInitFlags(startCmd)
}

// newApp is the function used to create the application at startup.
func newApp(
	logger log.Logger,
	db dbm.DB,
	traceStore io.Writer,
	appOpts servertypes.AppOptions,
) servertypes.Application {
	baseAppOptions := server.DefaultBaseappOptions(appOpts)

	return NewTamizhiApp(
		logger,
		db,
		traceStore,
		true,
		appOpts,
		baseAppOptions...,
	)
}

// appExport exports the application state and validators for genesis.
func appExport(
	logger log.Logger,
	db dbm.DB,
	traceStore io.Writer,
	height int64,
	forZeroHeight bool,
	jailAllowedAddrs []string,
	appOpts servertypes.AppOptions,
	modulesToExport []string,
) (servertypes.ExportedApp, error) {
	homePath, ok := appOpts.Get(flags.FlagHome).(string)
	if !ok || homePath == "" {
		homePath = DefaultNodeHome
	}
	_ = homePath

	app := NewTamizhiApp(
		logger,
		db,
		traceStore,
		height == -1,
		appOpts,
	)

	if height != -1 {
		if err := app.LoadHeight(height); err != nil {
			return servertypes.ExportedApp{}, err
		}
	}

	return app.ExportAppStateAndValidators(forZeroHeight, jailAllowedAddrs, modulesToExport)
}

// initAppConfig defines the application configuration defaults.
func initAppConfig() (string, interface{}) {
	type CustomAppConfig struct {
		serverconfig.Config `mapstructure:",squash"`
	}

	cfg := serverconfig.DefaultConfig()
	cfg.MinGasPrices = "0.001utmz"
	cfg.API.Enable = true
	cfg.API.Swagger = true
	cfg.API.Address = "tcp://0.0.0.0:1317"
	cfg.GRPC.Enable = true
	cfg.GRPC.Address = "0.0.0.0:9090"

	customAppConfig := CustomAppConfig{Config: *cfg}
	return serverconfig.DefaultConfigTemplate, customAppConfig
}

// initCometConfig defines the CometBFT configuration defaults.
func initCometConfig() *cmtcfg.Config {
	cfg := cmtcfg.DefaultConfig()
	cfg.P2P.ListenAddress = "tcp://0.0.0.0:26656"
	cfg.RPC.ListenAddress = "tcp://0.0.0.0:26657"
	cfg.Consensus.TimeoutCommit = 3 * time.Second
	return cfg
}
