package types

import errorsmod "cosmossdk.io/errors"

const (
	ModuleName = "identity"
	StoreKey   = ModuleName
	RouterKey  = ModuleName
)

// IdentityRecord represents an on-chain employee / user identity record.
type IdentityRecord struct {
	// EmployeeID is the unique corporate / off-chain identifier.
	EmployeeID string `json:"employee_id"`
	// Address is the bech32 wallet address linked to this identity.
	Address string `json:"address"`
	// Active indicates whether the identity is currently active.
	Active bool `json:"active"`
}

// DefaultGenesisState returns the default genesis state.
func DefaultGenesisState() map[string]interface{} {
	return map[string]interface{}{}
}

var (
	ErrIdentityNotFound = errorsmod.Register(ModuleName, 1, "identity record not found")
	ErrNotActive        = errorsmod.Register(ModuleName, 2, "identity is not active")
	ErrAlreadyExists    = errorsmod.Register(ModuleName, 3, "identity record already exists")
)
