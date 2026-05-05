package types

const (
	ModuleName = "security"
	StoreKey   = ModuleName
	RouterKey  = ModuleName

	KeyPrefixThreatFlag    = "threat:"
	KeyPrefixSecurityEvent = "event:"
	KeyPrefixCounter       = "counter:"
	KeyPrefixBlockedAddr   = "blocked:"

	// ThreatLevel values
	ThreatLevelLow      = "LOW"
	ThreatLevelMedium   = "MEDIUM"
	ThreatLevelHigh     = "HIGH"
	ThreatLevelCritical = "CRITICAL"

	// ThreatType values
	ThreatTypeFailedLogin     = "FAILED_LOGIN"
	ThreatTypeUnknownDevice   = "UNKNOWN_DEVICE"
	ThreatTypeUnusualActivity = "UNUSUAL_ACTIVITY"
	ThreatTypeOffHoursAccess  = "OFF_HOURS_ACCESS"
	ThreatTypePolicyViolation = "POLICY_VIOLATION"
	ThreatTypeAdminEscalation = "ADMIN_ESCALATION"

	// Action values (what the chain does in response)
	ActionAlert         = "ALERT"
	ActionRequireReAuth = "REQUIRE_REAUTH"
	ActionBlockAccess   = "BLOCK_ACCESS"
	ActionLockAccount   = "LOCK_ACCOUNT"
)

// GenesisState holds the initial security module state.
type GenesisState struct {
	ThreatFlags    []ThreatFlag    `json:"threat_flags"`
	SecurityEvents []SecurityEvent `json:"security_events"`
}

func DefaultGenesisState() *GenesisState {
	return &GenesisState{
		ThreatFlags:    []ThreatFlag{},
		SecurityEvents: []SecurityEvent{},
	}
}
