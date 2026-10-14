package types_test

import (
	"strings"
	"testing"

	"github.com/tamizhi/chain/x/literature/types"
)

// ── Bug 6: WorkContent.Validate() must reject non-hex SHA-256 values ──────────

func TestWorkContent_ValidateHexHash(t *testing.T) {
	validHash := strings.Repeat("a1", 32) // 64 valid hex chars

	t.Run("valid_sha256_hex_accepted", func(t *testing.T) {
		c := types.WorkContent{
			IPFSCid:    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			SHA256Hash: validHash,
			SizeBytes:  1024,
		}
		if err := c.Validate(); err != nil {
			t.Errorf("expected no error, got: %v", err)
		}
	})

	t.Run("invalid_hex_chars_rejected", func(t *testing.T) {
		// Bug 6 fix: previously any 64-char string passed; now hex chars are validated.
		c := types.WorkContent{
			IPFSCid:    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			SHA256Hash: strings.Repeat("zz", 32), // 64 chars but NOT valid hex
			SizeBytes:  1024,
		}
		if err := c.Validate(); err == nil {
			t.Error("expected error for non-hex SHA-256, got nil")
		}
	})

	t.Run("mixed_invalid_chars_rejected", func(t *testing.T) {
		c := types.WorkContent{
			IPFSCid:    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			SHA256Hash: strings.Repeat("g1", 32), // 'g' is not valid hex
			SizeBytes:  1024,
		}
		if err := c.Validate(); err == nil {
			t.Error("expected error for SHA-256 containing 'g', got nil")
		}
	})

	t.Run("wrong_length_rejected", func(t *testing.T) {
		c := types.WorkContent{
			IPFSCid:    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			SHA256Hash: strings.Repeat("a1", 16), // only 32 chars
			SizeBytes:  1024,
		}
		if err := c.Validate(); err == nil {
			t.Error("expected error for short SHA-256, got nil")
		}
	})

	t.Run("empty_hash_rejected", func(t *testing.T) {
		c := types.WorkContent{
			IPFSCid:   "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			SizeBytes: 1024,
		}
		if err := c.Validate(); err == nil {
			t.Error("expected error for empty SHA-256, got nil")
		}
	})

	t.Run("uppercase_hex_accepted", func(t *testing.T) {
		// Both upper and lower hex are valid.
		c := types.WorkContent{
			IPFSCid:    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			SHA256Hash: strings.Repeat("A1", 32),
			SizeBytes:  1024,
		}
		if err := c.Validate(); err != nil {
			t.Errorf("expected no error for uppercase hex, got: %v", err)
		}
	})
}

// ── Bug 7: Error messages must not begin with a capital letter ─────────────────

func TestWorkContent_ErrorStringCapitalization(t *testing.T) {
	// Bug 7 fix: previously "Arweave TX ID exceeds..." (capital A).
	// Cosmos SDK convention: error messages must start with lowercase.
	oversizedTxID := strings.Repeat("x", types.MaxArweaveTxIDLength+1)
	c := types.WorkContent{
		IPFSCid:     "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
		SHA256Hash:  strings.Repeat("a1", 32),
		SizeBytes:   512,
		ArweaveTxID: oversizedTxID,
	}
	err := c.Validate()
	if err == nil {
		t.Fatal("expected error for oversized ArweaveTxID, got nil")
	}
	msg := err.Error()
	if msg[0] >= 'A' && msg[0] <= 'Z' {
		t.Errorf("error string starts with capital letter %q — violates Cosmos SDK convention: %s", string(msg[0]), msg)
	}
}

func TestWorkContent_SizeBytes(t *testing.T) {
	validHash := strings.Repeat("a1", 32)
	validCID := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"

	t.Run("zero_size_rejected", func(t *testing.T) {
		c := types.WorkContent{IPFSCid: validCID, SHA256Hash: validHash, SizeBytes: 0}
		if err := c.Validate(); err == nil {
			t.Error("expected error for SizeBytes=0")
		}
	})

	t.Run("negative_size_rejected", func(t *testing.T) {
		c := types.WorkContent{IPFSCid: validCID, SHA256Hash: validHash, SizeBytes: -1}
		if err := c.Validate(); err == nil {
			t.Error("expected error for SizeBytes=-1")
		}
	})

	t.Run("max_size_accepted", func(t *testing.T) {
		c := types.WorkContent{IPFSCid: validCID, SHA256Hash: validHash, SizeBytes: types.MaxSizeBytes}
		if err := c.Validate(); err != nil {
			t.Errorf("expected max size to be accepted, got: %v", err)
		}
	})

	t.Run("over_max_size_rejected", func(t *testing.T) {
		c := types.WorkContent{IPFSCid: validCID, SHA256Hash: validHash, SizeBytes: types.MaxSizeBytes + 1}
		if err := c.Validate(); err == nil {
			t.Error("expected error for SizeBytes > MaxSizeBytes")
		}
	})
}

func TestWorkAuthor_Validate(t *testing.T) {
	t.Run("valid_author", func(t *testing.T) {
		a := types.WorkAuthor{Name: "திருவள்ளுவர்", NameTransliterated: "Thiruvalluvar"}
		if err := a.Validate(); err != nil {
			t.Errorf("expected valid author, got: %v", err)
		}
	})

	t.Run("empty_name_rejected", func(t *testing.T) {
		a := types.WorkAuthor{Name: "   ", NameTransliterated: "Thiruvalluvar"}
		if err := a.Validate(); err == nil {
			t.Error("expected error for empty author name")
		}
	})
}

func TestGenerateWorkID_Deterministic(t *testing.T) {
	id1 := types.GenerateWorkID("cosmos1abc", 100, "abc123")
	id2 := types.GenerateWorkID("cosmos1abc", 100, "abc123")
	if id1 != id2 {
		t.Errorf("GenerateWorkID is not deterministic: %q != %q", id1, id2)
	}
}

func TestGenerateWorkID_Unique(t *testing.T) {
	// Two works in the same block with different txHashes must get different IDs.
	// (Prevents the block-collision bug described in the GenerateWorkID comments.)
	id1 := types.GenerateWorkID("cosmos1abc", 100, "tx001")
	id2 := types.GenerateWorkID("cosmos1abc", 100, "tx002")
	if id1 == id2 {
		t.Error("two different txs in the same block produced the same work ID — collision bug!")
	}
}
