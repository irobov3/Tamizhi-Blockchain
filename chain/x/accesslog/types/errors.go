package types

import errorsmod "cosmossdk.io/errors"

var (
	ErrNotActiveEmployee = errorsmod.Register(ModuleName, 1, "sender is not an active registered employee")
	ErrLogNotFound       = errorsmod.Register(ModuleName, 2, "access log entry not found")
)
