package types_test

import (
	"strings"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tamizhi/chain/x/security/types"
)

// FuzzMsgRaiseThreatFlag_ValidateBasic fuzzes the threat-flag message to verify
// ValidateBasic never panics with adversarial authority, employeeID, address,
// or threat-level strings. The level field uses an allowlist — invalid values
// must return errors, not panics.
func FuzzMsgRaiseThreatFlag_ValidateBasic(f *testing.F) {
	validAuthority := sdk.AccAddress([]byte("authority_test_addr")).String()

	// Seed corpus: valid message with employeeID (no address needed)
	f.Add(validAuthority, "emp001", "", types.ThreatLevelLow, "FAILED_LOGIN", "desc")
	// Seed corpus: valid message with address (no employeeID needed)
	f.Add(validAuthority, "", validAuthority, types.ThreatLevelHigh, "UNUSUAL_ACTIVITY", "")
	// Seed corpus: all empty — must return error, not panic
	f.Add("", "", "", "", "", "")
	// Seed corpus: invalid authority
	f.Add("not-bech32", "emp-001", "", types.ThreatLevelMedium, "", "")
	// Seed corpus: valid authority but invalid level
	f.Add(validAuthority, "emp", "", "INVALID_LEVEL", "type", "desc")
	// Seed corpus: null bytes in all fields
	f.Add("\x00\xFF", "\x00emp", "\x00addr", "\x00level", "\x00type", "\x00desc")
	// Seed corpus: very long description
	f.Add(validAuthority, "emp", "", types.ThreatLevelCritical, "type", strings.Repeat("d", 100000))
	// Seed corpus: unicode in free-text fields
	f.Add(validAuthority, "தமிழ்-emp", "", types.ThreatLevelLow, "type", "விளக்கம்")

	f.Fuzz(func(t *testing.T, authority, employeeID, address, level, threatType, description string) {
		msg := &types.MsgRaiseThreatFlag{
			Authority:   authority,
			EmployeeID:  employeeID,
			Address:     address,
			Level:       level,
			ThreatType:  threatType,
			Description: description,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgBlockAddress_ValidateBasic fuzzes MsgBlockAddress to verify that
// both the authority and target address validation paths never panic.
// This is the primary path for blocking adversarial or compromised addresses.
func FuzzMsgBlockAddress_ValidateBasic(f *testing.F) {
	validAddr := sdk.AccAddress([]byte("authority_test_addr")).String()
	validTarget := sdk.AccAddress([]byte("target_addr_12345678")).String()

	// Seed corpus: valid block action
	f.Add(validAddr, validTarget)
	// Seed corpus: all empty
	f.Add("", "")
	// Seed corpus: invalid authority, valid target
	f.Add("not-bech32", validTarget)
	// Seed corpus: valid authority, invalid target
	f.Add(validAddr, "bad-address")
	// Seed corpus: both invalid
	f.Add("invalid1", "invalid2")
	// Seed corpus: null bytes
	f.Add("\x00\xFF\x80", "\x00target")
	// Seed corpus: very long strings
	f.Add(strings.Repeat("a", 1000), strings.Repeat("b", 1000))
	// Seed corpus: cosmos address format but wrong checksum
	f.Add("cosmos1qnk2n4nlkpw9xfqntladh74er2xa62wvn00000", validTarget)

	f.Fuzz(func(t *testing.T, authority, address string) {
		msg := &types.MsgBlockAddress{
			Authority: authority,
			Address:   address,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgUnblockAddress_ValidateBasic fuzzes MsgUnblockAddress — same
// two-address validation path as MsgBlockAddress but for the unblock path.
func FuzzMsgUnblockAddress_ValidateBasic(f *testing.F) {
	validAddr := sdk.AccAddress([]byte("authority_test_addr")).String()
	validTarget := sdk.AccAddress([]byte("target_addr_12345678")).String()

	// Seed corpus: valid unblock action
	f.Add(validAddr, validTarget)
	// Seed corpus: all empty
	f.Add("", "")
	// Seed corpus: invalid authority
	f.Add("not-bech32", validTarget)
	// Seed corpus: invalid target
	f.Add(validAddr, "bad-target")
	// Seed corpus: null bytes
	f.Add("\x00\xFF", "\x00\xFF")
	// Seed corpus: very long inputs
	f.Add(strings.Repeat("x", 5000), strings.Repeat("y", 5000))

	f.Fuzz(func(t *testing.T, authority, address string) {
		msg := &types.MsgUnblockAddress{
			Authority: authority,
			Address:   address,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgLogSecurityEvent_ValidateBasic fuzzes MsgLogSecurityEvent to ensure
// the data hash presence check and authority validation never panic.
func FuzzMsgLogSecurityEvent_ValidateBasic(f *testing.F) {
	validAddr := sdk.AccAddress([]byte("authority_test_addr")).String()

	// Seed corpus: valid event
	f.Add(validAddr, "emp001", "hash-abc123", "FAILED_LOGIN")
	// Seed corpus: all empty
	f.Add("", "", "", "")
	// Seed corpus: invalid authority, valid hash
	f.Add("bad", "emp", "some-hash", "type")
	// Seed corpus: valid authority, empty hash (required field)
	f.Add(validAddr, "emp", "", "FAILED_LOGIN")
	// Seed corpus: null bytes
	f.Add("\x00\xFF", "\x00emp", "\x00hash", "\x00type")
	// Seed corpus: very long hash
	f.Add(validAddr, "emp", strings.Repeat("h", 100000), "type")

	f.Fuzz(func(t *testing.T, authority, employeeID, dataHash, eventType string) {
		msg := &types.MsgLogSecurityEvent{
			Authority:  authority,
			EmployeeID: employeeID,
			DataHash:   dataHash,
			EventType:  eventType,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}
