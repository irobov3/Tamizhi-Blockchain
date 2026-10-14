package types

import errorsmod "cosmossdk.io/errors"

const (
	ModuleName = "messaging"
	StoreKey   = ModuleName
	RouterKey  = ModuleName

	KeyPrefixSessionID   = "sid:"     // sessionID -> wallet mapping
	KeyPrefixSIDByPubKey = "sidpk:"   // pubkey -> wallet index
	KeyPrefixGroupChat   = "group:"   // group conversations
	KeyPrefixMembership  = "member:"  // group membership index: "member:<pubkey>:<groupID>" -> ""
	KeyPrefixBlockedPeer = "blocked:" // blocked peer index

	GroupStatusActive   = "ACTIVE"
	GroupStatusArchived = "ARCHIVED"

	MaxGroupNameLength  = 64
	MaxGroupDescLength  = 256
	MaxGroupMemberCount = 100
)

// GenesisState holds the exported state of the messaging module.
type GenesisState struct {
	SessionIDs []SessionID         `json:"session_ids"`
	Groups     []GroupConversation `json:"groups"`
}

// DefaultGenesisState returns the default (empty) genesis state.
func DefaultGenesisState() *GenesisState {
	return &GenesisState{
		SessionIDs: []SessionID{},
		Groups:     []GroupConversation{},
	}
}

// Events
const (
	EventTypeRegisterSessionID = "register_session_id"
	EventTypeUpdateSessionID   = "update_session_id"
	EventTypeCreateGroup       = "create_group"
	EventTypeAddGroupMember    = "add_group_member"
	EventTypeRemoveGroupMember = "remove_group_member"
	AttributeKeySessionPubKey  = "session_pub_key"
	AttributeKeyWalletAddress  = "wallet_address"
	AttributeKeyGroupID        = "group_id"
	AttributeKeyMember         = "member"
)

// Errors
var (
	ErrSessionIDNotFound    = errorsmod.Register(ModuleName, 1, "session ID not found")
	ErrSessionIDExists      = errorsmod.Register(ModuleName, 2, "session ID already registered for this wallet")
	ErrGroupNotFound        = errorsmod.Register(ModuleName, 3, "group not found")
	ErrGroupFull            = errorsmod.Register(ModuleName, 4, "group has reached maximum member count")
	ErrNotGroupAdmin        = errorsmod.Register(ModuleName, 5, "not the group admin")
	ErrAlreadyMember        = errorsmod.Register(ModuleName, 6, "already a group member")
	ErrNotMember            = errorsmod.Register(ModuleName, 7, "not a member of this group")
	ErrInvalidSessionPubKey = errorsmod.Register(ModuleName, 8, "invalid session public key format")
)
