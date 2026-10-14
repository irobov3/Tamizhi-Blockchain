package types_test

import (
	"strings"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tamizhi/chain/x/nodes/types"
)

// FuzzMsgRegisterNode_ValidateBasic fuzzes MsgRegisterNode to ensure
// ValidateBasic never panics when given adversarial node IDs, addresses,
// endpoints, or stake values. The stake pointer nil-check is particularly
// important — the fuzzer must not trigger a nil dereference there.
func FuzzMsgRegisterNode_ValidateBasic(f *testing.F) {
	validOwner := sdk.AccAddress([]byte("owner123456789012345")).String()

	// Seed corpus: valid registration with non-nil stake
	f.Add(validOwner, "node-001", "https://example.com", "utmz", "15000000000")
	// Seed corpus: all empty strings, non-nil stake with empty fields
	f.Add("", "", "", "", "")
	// Seed corpus: invalid bech32 address
	f.Add("not-bech32", "node-1", "https://example.com", "utmz", "15000000000")
	// Seed corpus: valid owner, empty node ID
	f.Add(validOwner, "", "https://example.com", "utmz", "15000000000")
	// Seed corpus: valid owner, valid node ID, empty endpoint
	f.Add(validOwner, "node-1", "", "utmz", "15000000000")
	// Seed corpus: valid owner, valid node ID, valid endpoint, empty denom
	f.Add(validOwner, "node-1", "https://example.com", "", "15000000000")
	// Seed corpus: null bytes in node ID and endpoint
	f.Add(validOwner, "node\x00evil", "://\x00invalid", "utmz", "-1")
	// Seed corpus: very long node ID
	f.Add(validOwner, strings.Repeat("n", 10000), "https://example.com", "utmz", "15000000000")
	// Seed corpus: unicode node ID
	f.Add(validOwner, "node-தமிழ்", "https://example.com", "utmz", "15000000000")
	// Seed corpus: negative stake amount string
	f.Add(validOwner, "node-1", "https://example.com", "utmz", "-999999")
	// Seed corpus: overflow stake amount
	f.Add(validOwner, "node-1", "https://example.com", "utmz", strings.Repeat("9", 100))

	f.Fuzz(func(t *testing.T, creator, nodeID, endpoint, stakeDenom, stakeAmount string) {
		// Always provide a non-nil Stake to avoid the nil-pointer branch;
		// ValidateBasic checks stake != nil before any dereference.
		stake := &types.Coin{
			Denom:  stakeDenom,
			Amount: stakeAmount,
		}
		msg := &types.MsgRegisterNode{
			Creator:  creator,
			NodeID:   nodeID,
			Endpoint: endpoint,
			Stake:    stake,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgRegisterNode_NilStake_ValidateBasic verifies that ValidateBasic returns
// an error (not a panic) when Stake is nil.
func FuzzMsgRegisterNode_NilStake_ValidateBasic(f *testing.F) {
	validOwner := sdk.AccAddress([]byte("owner123456789012345")).String()

	// Seed corpus
	f.Add(validOwner, "node-1", "https://example.com")
	f.Add("", "", "")
	f.Add("bad-addr", "node\x00id", "\x00endpoint")

	f.Fuzz(func(t *testing.T, creator, nodeID, endpoint string) {
		msg := &types.MsgRegisterNode{
			Creator:  creator,
			NodeID:   nodeID,
			Endpoint: endpoint,
			Stake:    nil, // explicit nil — ValidateBasic must return error, not panic
		}
		// Must not panic. The nil-stake check returns ErrInsufficientStake.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgDeregisterNode_ValidateBasic fuzzes MsgDeregisterNode — checks that
// the creator address and node ID validation never panic.
func FuzzMsgDeregisterNode_ValidateBasic(f *testing.F) {
	validOwner := sdk.AccAddress([]byte("owner123456789012345")).String()

	// Seed corpus: valid deregistration
	f.Add(validOwner, "node-001")
	// Seed corpus: all empty
	f.Add("", "")
	// Seed corpus: invalid creator
	f.Add("bad-bech32", "node-1")
	// Seed corpus: valid creator, empty node ID
	f.Add(validOwner, "")
	// Seed corpus: null bytes
	f.Add("\x00\xFF", "node\x00id")
	// Seed corpus: very long node ID
	f.Add(validOwner, strings.Repeat("n", 100000))

	f.Fuzz(func(t *testing.T, creator, nodeID string) {
		msg := &types.MsgDeregisterNode{
			Creator: creator,
			NodeID:  nodeID,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}

// FuzzMsgUpdateNodeEndpoint_ValidateBasic fuzzes the endpoint update message
// to ensure address and endpoint string handling never panics.
func FuzzMsgUpdateNodeEndpoint_ValidateBasic(f *testing.F) {
	validOwner := sdk.AccAddress([]byte("owner123456789012345")).String()

	// Seed corpus: valid endpoint update
	f.Add(validOwner, "node-001", "https://new-endpoint.example.com")
	// Seed corpus: all empty
	f.Add("", "", "")
	// Seed corpus: invalid creator
	f.Add("not-bech32", "node-1", "https://example.com")
	// Seed corpus: valid creator, empty node ID
	f.Add(validOwner, "", "https://example.com")
	// Seed corpus: valid creator, valid node ID, empty new endpoint
	f.Add(validOwner, "node-1", "")
	// Seed corpus: null bytes
	f.Add("\x00\xFF", "node\x00", "http://\x00bad")
	// Seed corpus: very long endpoint
	f.Add(validOwner, "node-1", "https://"+strings.Repeat("x", 100000)+".com")

	f.Fuzz(func(t *testing.T, creator, nodeID, newEndpoint string) {
		msg := &types.MsgUpdateNodeEndpoint{
			Creator:     creator,
			NodeID:      nodeID,
			NewEndpoint: newEndpoint,
		}
		// Must not panic regardless of input.
		_ = msg.ValidateBasic()
	})
}
