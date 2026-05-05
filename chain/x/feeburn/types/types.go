package types

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	ModuleName = "feeburn"
	StoreKey   = "feeburn"
	BurnRate   = "0.20" // 20% of fees burned
)

var ErrInvalidBurnRate = fmt.Errorf("burn rate must be between 0 and 1")

// BurnStats tracks the cumulative burned supply.
type BurnStats struct {
	TotalBurned sdk.Coins `json:"total_burned"`
	BurnCount   uint64    `json:"burn_count"`
}

// GenesisState for the feeburn module.
type GenesisState struct {
	Stats BurnStats `json:"stats"`
}

func DefaultGenesisState() *GenesisState {
	return &GenesisState{
		Stats: BurnStats{
			TotalBurned: sdk.Coins{},
			BurnCount:   0,
		},
	}
}
