package types_test

import (
	"strings"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tamizhi/chain/x/literature/types"
)

// FuzzWorkContent_ValidateHexHash fuzzes the hex hash validation path in
// WorkContent.Validate() — the most security-sensitive check (Bug #6 in the
// original audit). Any panic here is a finding; returning an error is correct.
func FuzzWorkContent_ValidateHexHash(f *testing.F) {
	// Seed corpus: valid 64-char lowercase hex (passes all checks)
	f.Add("a3f1b2c4d5e6789012345678901234567890abcdef1234567890abcdef123456", "QmTest", int64(100))
	// Seed corpus: empty hash
	f.Add("", "QmTest", int64(100))
	// Seed corpus: uppercase hex — also valid per hex.DecodeString
	f.Add("ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789", "QmTest", int64(100))
	// Seed corpus: 64 chars but all invalid hex chars ('g'–'z' beyond 'f')
	f.Add(strings.Repeat("g", 64), "QmTest", int64(100))
	// Seed corpus: 63 chars (one short)
	f.Add(strings.Repeat("0", 63), "QmTest", int64(100))
	// Seed corpus: 65 chars (one over)
	f.Add(strings.Repeat("0", 65), "QmTest", int64(100))
	// Seed corpus: null bytes and high bytes
	f.Add("\x00\xFF\x80", "QmTest", int64(100))
	// Seed corpus: very long string
	f.Add(strings.Repeat("a", 10000), "QmTest", int64(100))
	// Seed corpus: mixed valid/invalid hex chars at exactly 64 chars
	f.Add(strings.Repeat("0", 32)+strings.Repeat("z", 32), "QmTest", int64(100))
	// Seed corpus: valid hash but empty IPFS CID (validates CID first)
	f.Add(strings.Repeat("a1", 32), "", int64(100))
	// Seed corpus: valid hash but zero size
	f.Add(strings.Repeat("a1", 32), "QmValidCid", int64(0))
	// Seed corpus: valid hash but negative size
	f.Add(strings.Repeat("a1", 32), "QmValidCid", int64(-1))
	// Seed corpus: valid hash, valid CID, max size
	f.Add(strings.Repeat("a1", 32), "QmValidCid", types.MaxSizeBytes)

	f.Fuzz(func(t *testing.T, hash, ipfsCid string, sizeBytes int64) {
		wc := types.WorkContent{
			SHA256Hash: hash,
			IPFSCid:    ipfsCid,
			SizeBytes:  sizeBytes,
		}
		// Must not panic regardless of input.
		_ = wc.Validate()
	})
}

// FuzzMsgSubmitWork_ValidateBasic fuzzes MsgSubmitWork.ValidateBasic() across
// all security-sensitive string fields including Tamil unicode, adversarial
// hash values, and boundary-length inputs.
func FuzzMsgSubmitWork_ValidateBasic(f *testing.F) {
	validAddr := sdk.AccAddress([]byte("submitter1234567890a")).String()
	validHash := strings.Repeat("a1", 32) // 64-char valid hex
	validCID := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"

	// Seed corpus: fully valid Tamil-script submission
	f.Add(validAddr, "தமிழ் இலக்கியம்", "Tamil Ilakkiyam", "திருவள்ளுவர்", validHash, validCID, int64(1000))
	// Seed corpus: all empty
	f.Add("", "", "", "", "", "", int64(0))
	// Seed corpus: invalid address, very long title, bad hash
	f.Add("not-addr", strings.Repeat("x", 10000), "trans", "author", strings.Repeat("z", 64), "", int64(-1))
	// Seed corpus: valid addr, valid title+trans, invalid hex (64 chars but 'g')
	f.Add(validAddr, "title", "trans", "author", strings.Repeat("g", 64), validCID, int64(1))
	// Seed corpus: null bytes in fields
	f.Add(validAddr, "ti\x00tle", "tr\x00ans", "au\x00thor", validHash, validCID, int64(512))
	// Seed corpus: title at exact max length
	f.Add(validAddr, strings.Repeat("t", types.MaxTitleLength), "trans", "author", validHash, validCID, int64(100))
	// Seed corpus: title one over max length
	f.Add(validAddr, strings.Repeat("t", types.MaxTitleLength+1), "trans", "author", validHash, validCID, int64(100))
	// Seed corpus: empty IPFS CID with valid hash
	f.Add(validAddr, "title", "trans", "author", validHash, "", int64(100))
	// Seed corpus: very long IPFS CID
	f.Add(validAddr, "title", "trans", "author", validHash, strings.Repeat("Q", types.MaxIPFSCidLength+1), int64(100))

	f.Fuzz(func(t *testing.T, submitter, title, titleTranslit, authorName, sha256hash, ipfsCid string, fileSize int64) {
		msg := &types.MsgSubmitWork{
			Submitter:           submitter,
			Title:               title,
			TitleTransliterated: titleTranslit,
			Author: types.WorkAuthor{
				Name:               authorName,
				NameTransliterated: "test-transliterated",
			},
			Content: types.WorkContent{
				SHA256Hash: sha256hash,
				IPFSCid:    ipfsCid,
				SizeBytes:  fileSize,
			},
			Classification: types.WorkClassification{
				Period:   types.PeriodClassical,
				Genre:    types.GenrePoetry,
				Language: "Tamil",
			},
			Rights: types.WorkRights{
				License:        types.LicensePublicDomain,
				IsPublicDomain: true,
			},
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgUpdateArweave_ValidateBasic fuzzes MsgUpdateArweave.ValidateBasic()
// to verify it handles arbitrary submitter, work ID, and Arweave TX ID strings.
func FuzzMsgUpdateArweave_ValidateBasic(f *testing.F) {
	validAddr := sdk.AccAddress([]byte("submitter1234567890a")).String()

	// Seed corpus: valid input
	f.Add(validAddr, "tmz-work-abcdef123456789012345678", "arweave-tx-id-12345678901234567890123456")
	// Seed corpus: all empty
	f.Add("", "", "")
	// Seed corpus: invalid address
	f.Add("not-bech32", "work-123", strings.Repeat("x", types.MaxArweaveTxIDLength))
	// Seed corpus: valid address, empty work ID
	f.Add(validAddr, "", "arweave-tx-id")
	// Seed corpus: valid address, valid work ID, over-length Arweave TX ID
	f.Add(validAddr, "work-1", strings.Repeat("a", types.MaxArweaveTxIDLength+1))
	// Seed corpus: null bytes
	f.Add("\x00\xFF", "work\x00id", "arweave\x00txid")

	f.Fuzz(func(t *testing.T, submitter, workID, arweaveTxID string) {
		msg := &types.MsgUpdateArweave{
			Submitter:   submitter,
			WorkID:      workID,
			ArweaveTxID: arweaveTxID,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgVerifyWork_ValidateBasic fuzzes MsgVerifyWork.ValidateBasic()
// to ensure curator address and work ID validation never panics.
func FuzzMsgVerifyWork_ValidateBasic(f *testing.F) {
	validAddr := sdk.AccAddress([]byte("curator1234567890abc")).String()

	// Seed corpus: valid input
	f.Add(validAddr, "tmz-work-abcdef", "looks good")
	// Seed corpus: all empty
	f.Add("", "", "")
	// Seed corpus: invalid curator address
	f.Add("not-bech32", "work-1", "notes")
	// Seed corpus: valid curator, empty work ID
	f.Add(validAddr, "", "notes")
	// Seed corpus: null bytes
	f.Add("\x00", "work\x00", "notes\x00")
	// Seed corpus: very long notes
	f.Add(validAddr, "work-1", strings.Repeat("n", 100000))

	f.Fuzz(func(t *testing.T, curator, workID, notes string) {
		msg := &types.MsgVerifyWork{
			Curator: curator,
			WorkID:  workID,
			Notes:   notes,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}
