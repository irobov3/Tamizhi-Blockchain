package types_test

import (
	"strings"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tamizhi/chain/x/accesslog/types"
)

// FuzzMsgLogAccess_ValidateBasic fuzzes all string fields of MsgLogAccess to
// ensure ValidateBasic never panics regardless of adversarial input.
//
// Security notes:
//   - The action field uses an allowlist (READ, WRITE, DELETE, SHARE).
//     Any value outside this set must return an error, not panic.
//   - The creator field is a bech32 address; malformed values must return error.
//   - FileHash and EmployeeID are checked for presence only (no format enforcement
//     at the message layer), so any non-empty string is currently accepted.
func FuzzMsgLogAccess_ValidateBasic(f *testing.F) {
	validAddr := sdk.AccAddress([]byte("creator123456789012")).String()
	validHash := strings.Repeat("a", 64) // typical hex hash length

	// Seed corpus: valid READ access log
	f.Add(validAddr, "emp001", validHash, "file.pdf", "READ", "QmCid123")
	// Seed corpus: valid WRITE action
	f.Add(validAddr, "emp002", validHash, "document.docx", "WRITE", "")
	// Seed corpus: valid DELETE action
	f.Add(validAddr, "emp003", validHash, "temp.txt", "DELETE", "QmCid456")
	// Seed corpus: valid SHARE action
	f.Add(validAddr, "emp004", validHash, "report.pdf", "SHARE", "QmCid789")
	// Seed corpus: all empty — must return errors, not panic
	f.Add("", "", "", "", "", "")
	// Seed corpus: invalid action (not in allowlist)
	f.Add(validAddr, "emp001", validHash, "file.pdf", "EXECUTE", "")
	// Seed corpus: invalid creator address
	f.Add("not-bech32", "emp001", validHash, "file.pdf", "READ", "")
	// Seed corpus: valid creator, empty employee ID
	f.Add(validAddr, "", validHash, "file.pdf", "READ", "")
	// Seed corpus: valid creator, valid employee, empty file hash
	f.Add(validAddr, "emp001", "", "file.pdf", "READ", "")
	// Seed corpus: null bytes in employee ID and file name
	f.Add(validAddr, "emp\x00id", validHash, "file\x00name.pdf", "READ", "")
	// Seed corpus: null bytes in action (should not be in allowlist)
	f.Add(validAddr, "emp001", validHash, "file.pdf", "READ\x00", "")
	// Seed corpus: very long employee ID
	f.Add(validAddr, strings.Repeat("e", 10000), validHash, "file.pdf", "READ", "")
	// Seed corpus: very long file name
	f.Add(validAddr, "emp001", validHash, strings.Repeat("f", 100000), "WRITE", "")
	// Seed corpus: unicode in free-text fields
	f.Add(validAddr, "emp-தமிழ்", validHash, "கோப்பு.pdf", "READ", "QmCid")
	// Seed corpus: high-byte values in action field (definitely not in allowlist)
	f.Add(validAddr, "emp001", validHash, "file", "\xFF\xFE", "")
	// Seed corpus: empty action
	f.Add(validAddr, "emp001", validHash, "file.pdf", "", "")

	f.Fuzz(func(t *testing.T, creator, empID, fileHash, fileName, action, ipfsCid string) {
		msg := &types.MsgLogAccess{
			Creator:    creator,
			EmployeeID: empID,
			FileHash:   fileHash,
			FileName:   fileName,
			Action:     action,
			IPFSCid:    ipfsCid,
		}
		// Must not panic regardless of input — returning an error is correct behaviour.
		_ = msg.ValidateBasic()
	})
}
