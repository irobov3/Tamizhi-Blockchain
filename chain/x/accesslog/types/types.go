package types

const (
	ModuleName = "accesslog"
	// StoreKey must NOT start with "acc" to avoid colliding with
	// the auth module's "acc" store key prefix check.
	StoreKey  = "xalog"
	RouterKey = ModuleName

	KeyPrefixLog         = "log:"
	KeyPrefixCounter     = "counter:"
	KeyPrefixEmployeeLog = "emplog:" // emplog:<employeeID>:<id_10digits> → log ID bytes
)

// GenesisState for accesslog module.
type GenesisState struct {
	Logs    []AccessLogEntry `json:"logs"`
	Counter uint64           `json:"counter"`
}

func DefaultGenesisState() *GenesisState {
	return &GenesisState{Logs: []AccessLogEntry{}, Counter: 0}
}

// Events
const (
	EventTypeLogAccess   = "log_access"
	AttributeKeyFileHash = "file_hash"
	AttributeKeyAction   = "action"
	AttributeKeyEmployee = "employee_id"
)
