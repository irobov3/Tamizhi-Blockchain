package app

import (
	"encoding/json"
	"time"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	distrtypes "github.com/cosmos/cosmos-sdk/x/distribution/types"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	govv1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1"
	minttypes "github.com/cosmos/cosmos-sdk/x/mint/types"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
)

const (
	// BondDenom is the staking bond denomination.
	BondDenom = "utmz"

	// DisplayDenom is the human-readable display denomination.
	DisplayDenom = "tmz"

	// InitialSupply is the initial token supply: 1,000,000,000 TMZ in utmz (1e6 micro).
	InitialSupply = int64(1_000_000_000_000_000) // 1B TMZ * 1e6 utmz/TMZ

	// GenesisTime is the chain genesis timestamp.
	GenesisTimeStr = "2025-01-01T00:00:00Z"
)

// AppGenesis returns a default genesis state for the Tamizhi chain.
// It sets:
//   - staking denom = utmz
//   - initial supply = 1,000,000,000 TMZ  (1_000_000_000_000_000 utmz)
//   - inflation = 5% (mint module)
//   - bank module denom metadata
func AppGenesis() GenesisState {
	genState := make(GenesisState)

	// ---- auth genesis ----
	authGen := authtypes.DefaultGenesisState()
	authGenBz, _ := json.Marshal(authGen)
	genState[authtypes.ModuleName] = authGenBz

	// ---- bank genesis ----
	bankGen := banktypes.DefaultGenesisState()
	bankGen.Params.DefaultSendEnabled = true
	bankGen.DenomMetadata = []banktypes.Metadata{
		{
			Description: "The native staking token of the Tamizhi blockchain.",
			DenomUnits: []*banktypes.DenomUnit{
				{
					Denom:    "utmz",
					Exponent: 0,
					Aliases:  []string{"microtamizhi"},
				},
				{
					Denom:    "mtmz",
					Exponent: 3,
					Aliases:  []string{"millitamizhi"},
				},
				{
					Denom:    "tmz",
					Exponent: 6,
					Aliases:  []string{"tamizhi"},
				},
			},
			Base:    "utmz",
			Display: "tmz",
			Name:    "Tamizhi",
			Symbol:  "TMZ",
		},
	}
	bankGenBz, _ := json.Marshal(bankGen)
	genState[banktypes.ModuleName] = bankGenBz

	// ---- staking genesis ----
	stakingGen := stakingtypes.DefaultGenesisState()
	stakingGen.Params.BondDenom = BondDenom
	stakingGen.Params.MaxValidators = 100
	stakingGen.Params.UnbondingTime = 21 * 24 * time.Hour // 21 days
	stakingGenBz, _ := json.Marshal(stakingGen)
	genState[stakingtypes.ModuleName] = stakingGenBz

	// ---- mint genesis (5% inflation) ----
	mintGen := minttypes.DefaultGenesisState()
	mintGen.Params.MintDenom = BondDenom
	mintGen.Params.InflationRateChange = math.LegacyNewDecWithPrec(13, 2)   // 13%
	mintGen.Params.InflationMax = math.LegacyNewDecWithPrec(20, 2)          // 20%
	mintGen.Params.InflationMin = math.LegacyNewDecWithPrec(5, 2)           // 5%
	mintGen.Params.GoalBonded = math.LegacyNewDecWithPrec(67, 2)            // 67%
	mintGen.Minter.Inflation = math.LegacyNewDecWithPrec(5, 2)              // start at 5%
	mintGen.Minter.AnnualProvisions = math.LegacyNewDec(0)
	mintGenBz, _ := json.Marshal(mintGen)
	genState[minttypes.ModuleName] = mintGenBz

	// ---- distribution genesis ----
	distrGen := distrtypes.DefaultGenesisState()
	distrGen.Params.CommunityTax = math.LegacyNewDecWithPrec(2, 2) // 2%
	distrGenBz, _ := json.Marshal(distrGen)
	genState[distrtypes.ModuleName] = distrGenBz

	// ---- gov genesis ----
	govGen := govv1.DefaultGenesisState()
	minDeposit := sdk.NewCoins(sdk.NewCoin(BondDenom, math.NewInt(10_000_000))) // 10 TMZ
	govGen.Params.MinDeposit = minDeposit
	govGenBz, _ := json.Marshal(govGen)
	genState[govtypes.ModuleName] = govGenBz

	return genState
}

// makeCodec creates a basic codec for genesis serialization.
func makeCodec() interface{} {
	return nil // placeholder — actual codec comes from app
}

// TotalInitialSupply returns the initial supply as sdk.Coins.
func TotalInitialSupply() sdk.Coins {
	return sdk.NewCoins(sdk.NewCoin(BondDenom, math.NewInt(InitialSupply)))
}

// DefaultGenesisAccounts returns the default set of genesis accounts.
// In production, replace with actual validator/foundation addresses.
func DefaultGenesisAccounts() []banktypes.Balance {
	return []banktypes.Balance{}
}
