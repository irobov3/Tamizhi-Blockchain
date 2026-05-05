package keeper

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"

	"cosmossdk.io/core/store"
	"cosmossdk.io/log"
	storetypes "cosmossdk.io/store/types"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/tamizhi/chain/x/messaging/types"
	nodestypes "github.com/tamizhi/chain/x/nodes/types"
)

// NodesKeeper is the subset of the nodes keeper that the messaging keeper requires.
type NodesKeeper interface {
	GetAllNodes(ctx sdk.Context) []nodestypes.ServiceNode
	GetAllActiveNodes(ctx sdk.Context) []nodestypes.ServiceNode
}

// Keeper manages on-chain state for the messaging module.
type Keeper struct {
	cdc          codec.BinaryCodec
	storeService store.KVStoreService
	nodesKeeper  NodesKeeper
	authority    string
}

// NewKeeper creates a new messaging Keeper.
func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	nodesKeeper NodesKeeper,
	authority string,
) Keeper {
	return Keeper{
		cdc:          cdc,
		storeService: storeService,
		nodesKeeper:  nodesKeeper,
		authority:    authority,
	}
}

func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

func (k Keeper) Authority() string                   { return k.authority }
func (k Keeper) StoreService() store.KVStoreService { return k.storeService }

// ---------------------------------------------------------------------------
// Session ID operations
// ---------------------------------------------------------------------------

// RegisterSessionID stores a new SessionID record. Returns an error if the
// wallet already has an active Session ID registered.
func (k Keeper) RegisterSessionID(ctx sdk.Context, sid types.SessionID) error {
	s := k.storeService.OpenKVStore(ctx)

	// Check wallet uniqueness (one active session per wallet).
	walletKey := []byte(types.KeyPrefixSessionID + sid.WalletAddress)
	existing, err := s.Get(walletKey)
	if err != nil {
		return err
	}
	if existing != nil {
		return types.ErrSessionIDExists
	}

	// Check pubkey uniqueness across all wallets.
	pubkeyKey := []byte(types.KeyPrefixSIDByPubKey + sid.SessionPubKey)
	existingPK, err := s.Get(pubkeyKey)
	if err != nil {
		return err
	}
	if existingPK != nil {
		return types.ErrSessionIDExists.Wrapf("session pubkey %s already registered", sid.SessionPubKey)
	}

	now := ctx.BlockTime().Unix() // Must use block time, not wall clock
	if sid.CreatedAt == 0 {
		sid.CreatedAt = now
	}
	if sid.LastSeen == 0 {
		sid.LastSeen = now
	}
	sid.Active = true

	bz, err := json.Marshal(sid)
	if err != nil {
		return err
	}
	if err := s.Set(walletKey, bz); err != nil {
		return err
	}
	// Pubkey → wallet address index (for reverse lookup).
	if err := s.Set(pubkeyKey, []byte(sid.WalletAddress)); err != nil {
		return err
	}

	k.Logger(ctx).Info("session ID registered", "wallet", sid.WalletAddress, "pubkey", sid.SessionPubKey)
	return nil
}

// GetSessionIDByWallet retrieves the SessionID record for a given wallet address.
// Returns nil if not found.
func (k Keeper) GetSessionIDByWallet(ctx sdk.Context, walletAddr string) *types.SessionID {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := s.Get([]byte(types.KeyPrefixSessionID + walletAddr))
	if err != nil || bz == nil {
		return nil
	}
	var sid types.SessionID
	if err := json.Unmarshal(bz, &sid); err != nil {
		return nil
	}
	return &sid
}

// GetSessionIDByPubKey retrieves the SessionID record for a given Ed25519 pubkey (hex).
// Returns nil if not found.
func (k Keeper) GetSessionIDByPubKey(ctx sdk.Context, pubKey string) *types.SessionID {
	s := k.storeService.OpenKVStore(ctx)
	walletBz, err := s.Get([]byte(types.KeyPrefixSIDByPubKey + pubKey))
	if err != nil || walletBz == nil {
		return nil
	}
	return k.GetSessionIDByWallet(ctx, string(walletBz))
}

// UpdateSessionID updates the mutable fields (displayName, avatarIPFS) of an existing SessionID.
// The caller must be the wallet that owns the Session ID identified by pubKey.
func (k Keeper) UpdateSessionID(ctx sdk.Context, pubKey, displayName, avatarIPFS string) error {
	sid := k.GetSessionIDByPubKey(ctx, pubKey)
	if sid == nil {
		return types.ErrSessionIDNotFound
	}
	if displayName != "" {
		sid.DisplayName = displayName
	}
	if avatarIPFS != "" {
		sid.AvatarIPFS = avatarIPFS
	}
	sid.LastSeen = ctx.BlockTime().Unix() // Must use block time, not wall clock

	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(sid)
	if err != nil {
		return err
	}
	return s.Set([]byte(types.KeyPrefixSessionID+sid.WalletAddress), bz)
}

// GetAllSessionIDs returns every registered SessionID (used during genesis export).
func (k Keeper) GetAllSessionIDs(ctx sdk.Context) []types.SessionID {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixSessionID)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()

	var results []types.SessionID
	for ; iter.Valid(); iter.Next() {
		var sid types.SessionID
		if err := json.Unmarshal(iter.Value(), &sid); err == nil {
			results = append(results, sid)
		}
	}
	return results
}

// ---------------------------------------------------------------------------
// Group conversation operations
// ---------------------------------------------------------------------------

// groupID derives a deterministic group ID from the group name, admin wallet,
// and creation timestamp. The result is a lowercase hex-encoded SHA-256 digest.
func groupID(name, adminWallet string, createdAt int64) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%d", name, adminWallet, createdAt)))
	return fmt.Sprintf("%x", h)
}

// CreateGroup stores a new GroupConversation. Returns the group's unique ID.
// If group.Id is already set (e.g. during genesis import), it is preserved;
// otherwise a new deterministic ID is derived from name, admin, and timestamp.
func (k Keeper) CreateGroup(ctx sdk.Context, group types.GroupConversation) (string, error) {
	now := ctx.BlockTime().Unix() // Must use block time, not wall clock
	if group.CreatedAt == 0 {
		group.CreatedAt = now
	}
	if group.Status == "" {
		group.Status = types.GroupStatusActive
	}
	if group.Id == "" {
		group.Id = groupID(group.Name, group.AdminAddress, group.CreatedAt)
	}

	s := k.storeService.OpenKVStore(ctx)
	groupKey := []byte(types.KeyPrefixGroupChat + group.Id)

	// Idempotency guard (extremely unlikely collision, but safe to check).
	existing, err := s.Get(groupKey)
	if err != nil {
		return "", err
	}
	if existing != nil {
		return "", types.ErrGroupNotFound.Wrapf("group ID collision for %s", group.Id)
	}

	bz, err := json.Marshal(group)
	if err != nil {
		return "", err
	}
	if err := s.Set(groupKey, bz); err != nil {
		return "", err
	}

	// Write membership index entries for all initial members.
	for _, memberPK := range group.Members {
		memberKey := []byte(types.KeyPrefixMembership + memberPK + ":" + group.Id)
		if err := s.Set(memberKey, []byte(group.Id)); err != nil {
			return "", err
		}
	}

	k.Logger(ctx).Info("group created", "group_id", group.Id, "admin", group.AdminAddress)
	return group.Id, nil
}

// GetGroup retrieves a GroupConversation by its ID. Returns nil if not found.
func (k Keeper) GetGroup(ctx sdk.Context, groupID string) *types.GroupConversation {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := s.Get([]byte(types.KeyPrefixGroupChat + groupID))
	if err != nil || bz == nil {
		return nil
	}
	var group types.GroupConversation
	if err := json.Unmarshal(bz, &group); err != nil {
		return nil
	}
	return &group
}

// saveGroup persists an updated GroupConversation back to the store.
func (k Keeper) saveGroup(ctx sdk.Context, group *types.GroupConversation) error {
	s := k.storeService.OpenKVStore(ctx)
	bz, err := json.Marshal(group)
	if err != nil {
		return err
	}
	return s.Set([]byte(types.KeyPrefixGroupChat+group.Id), bz)
}

// AddGroupMember adds memberPubKey to the group identified by groupID.
// Only the wallet address matching group.AdminAddress may call this.
func (k Keeper) AddGroupMember(ctx sdk.Context, groupID, adminWallet, memberPubKey string) error {
	group := k.GetGroup(ctx, groupID)
	if group == nil {
		return types.ErrGroupNotFound
	}
	if group.AdminAddress != adminWallet {
		return types.ErrNotGroupAdmin
	}
	if len(group.Members) >= types.MaxGroupMemberCount {
		return types.ErrGroupFull
	}
	for _, m := range group.Members {
		if m == memberPubKey {
			return types.ErrAlreadyMember
		}
	}
	group.Members = append(group.Members, memberPubKey)

	if err := k.saveGroup(ctx, group); err != nil {
		return err
	}

	// Update membership index.
	s := k.storeService.OpenKVStore(ctx)
	memberKey := []byte(types.KeyPrefixMembership + memberPubKey + ":" + groupID)
	return s.Set(memberKey, []byte(groupID))
}

// RemoveGroupMember removes memberPubKey from the group identified by groupID.
// Only the wallet address matching group.AdminAddress may call this.
func (k Keeper) RemoveGroupMember(ctx sdk.Context, groupID, adminWallet, memberPubKey string) error {
	group := k.GetGroup(ctx, groupID)
	if group == nil {
		return types.ErrGroupNotFound
	}
	if group.AdminAddress != adminWallet {
		return types.ErrNotGroupAdmin
	}

	found := false
	filtered := group.Members[:0]
	for _, m := range group.Members {
		if m == memberPubKey {
			found = true
			continue
		}
		filtered = append(filtered, m)
	}
	if !found {
		return types.ErrNotMember
	}
	group.Members = filtered

	if err := k.saveGroup(ctx, group); err != nil {
		return err
	}

	// Remove from membership index.
	s := k.storeService.OpenKVStore(ctx)
	memberKey := []byte(types.KeyPrefixMembership + memberPubKey + ":" + groupID)
	return s.Delete(memberKey)
}

// GetGroupsByMember returns all GroupConversations that sessionPubKey is a member of.
func (k Keeper) GetGroupsByMember(ctx sdk.Context, sessionPubKey string) []types.GroupConversation {
	s := k.storeService.OpenKVStore(ctx)

	// Iterate over "member:<pubkey>:" prefix to collect all group IDs for this member.
	prefix := []byte(types.KeyPrefixMembership + sessionPubKey + ":")
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()

	var groups []types.GroupConversation
	for ; iter.Valid(); iter.Next() {
		gid := string(iter.Value())
		if group := k.GetGroup(ctx, gid); group != nil {
			groups = append(groups, *group)
		}
	}
	return groups
}

// GetAllGroups returns every registered GroupConversation (used during genesis export).
func (k Keeper) GetAllGroups(ctx sdk.Context) []types.GroupConversation {
	s := k.storeService.OpenKVStore(ctx)
	prefix := []byte(types.KeyPrefixGroupChat)
	iter, err := s.Iterator(prefix, storetypes.PrefixEndBytes(prefix))
	if err != nil {
		return nil
	}
	defer iter.Close()

	var results []types.GroupConversation
	for ; iter.Valid(); iter.Next() {
		var group types.GroupConversation
		if err := json.Unmarshal(iter.Value(), &group); err == nil {
			results = append(results, group)
		}
	}
	return results
}

// ---------------------------------------------------------------------------
// Nodes proxy
// ---------------------------------------------------------------------------

// GetActiveNodes returns all active service nodes from the nodes module.
func (k Keeper) GetActiveNodes(ctx sdk.Context) []nodestypes.ServiceNode {
	return k.nodesKeeper.GetAllActiveNodes(ctx)
}
