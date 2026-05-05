package types

import "encoding/binary"

const (
	// ModuleName is the name of the literature module.
	ModuleName = "literature"

	// StoreKey is the store key for the module.
	StoreKey = ModuleName

	// RouterKey is the message router key for the module.
	RouterKey = ModuleName

	// QuerierRoute is the querier route for the module.
	QuerierRoute = ModuleName
)

// KV store key prefixes.
var (
	// KeyPrefixWork is the prefix for literary work entries.
	// Key: KeyPrefixWork | workID (string bytes)
	KeyPrefixWork = []byte{0x01}

	// KeyPrefixWorkCount is the key for the global work count.
	KeyPrefixWorkCount = []byte{0x02}

	// KeyPrefixWorkByAuthor is the prefix for the author→workID index.
	// Key: KeyPrefixWorkByAuthor | authorAddr (string bytes) | 0x00 | workID (string bytes)
	KeyPrefixWorkByAuthor = []byte{0x03}

	// KeyPrefixWorkByIPFS is the prefix for an IPFS CID→workID reverse index.
	// Key: KeyPrefixWorkByIPFS | ipfsCid (string bytes)
	KeyPrefixWorkByIPFS = []byte{0x04}

	// KeyPrefixVerifiedWork is the prefix for tracking verified work IDs.
	// Key: KeyPrefixVerifiedWork | workID (string bytes)
	KeyPrefixVerifiedWork = []byte{0x05}
)

// Separator is used to separate composite key parts.
var Separator = []byte{0x00}

// WorkKey returns the KV store key for a literary work.
func WorkKey(workID string) []byte {
	key := make([]byte, len(KeyPrefixWork)+len(workID))
	copy(key, KeyPrefixWork)
	copy(key[len(KeyPrefixWork):], []byte(workID))
	return key
}

// WorkCountKey returns the KV store key for the global work count.
func WorkCountKey() []byte {
	return KeyPrefixWorkCount
}

// WorkByAuthorKey returns the KV store key for the author→workID index.
// This allows iterating all works by a given author.
func WorkByAuthorKey(authorAddr string, workID string) []byte {
	addrBytes := []byte(authorAddr)
	workIDBytes := []byte(workID)
	key := make([]byte, len(KeyPrefixWorkByAuthor)+len(addrBytes)+len(Separator)+len(workIDBytes))
	offset := 0
	copy(key[offset:], KeyPrefixWorkByAuthor)
	offset += len(KeyPrefixWorkByAuthor)
	copy(key[offset:], addrBytes)
	offset += len(addrBytes)
	copy(key[offset:], Separator)
	offset += len(Separator)
	copy(key[offset:], workIDBytes)
	return key
}

// WorkByAuthorPrefixKey returns the prefix key for iterating all works by a given author.
func WorkByAuthorPrefixKey(authorAddr string) []byte {
	addrBytes := []byte(authorAddr)
	key := make([]byte, len(KeyPrefixWorkByAuthor)+len(addrBytes)+len(Separator))
	offset := 0
	copy(key[offset:], KeyPrefixWorkByAuthor)
	offset += len(KeyPrefixWorkByAuthor)
	copy(key[offset:], addrBytes)
	offset += len(addrBytes)
	copy(key[offset:], Separator)
	return key
}

// WorkByIPFSKey returns the KV store key for the IPFS CID→workID reverse index.
func WorkByIPFSKey(ipfsCid string) []byte {
	key := make([]byte, len(KeyPrefixWorkByIPFS)+len(ipfsCid))
	copy(key, KeyPrefixWorkByIPFS)
	copy(key[len(KeyPrefixWorkByIPFS):], []byte(ipfsCid))
	return key
}

// VerifiedWorkKey returns the KV store key for tracking a verified work.
func VerifiedWorkKey(workID string) []byte {
	key := make([]byte, len(KeyPrefixVerifiedWork)+len(workID))
	copy(key, KeyPrefixVerifiedWork)
	copy(key[len(KeyPrefixVerifiedWork):], []byte(workID))
	return key
}

// Uint64ToBigEndian converts a uint64 to 8-byte big-endian.
func Uint64ToBigEndian(i uint64) []byte {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, i)
	return b
}

// BigEndianToUint64 converts 8-byte big-endian bytes to uint64.
func BigEndianToUint64(b []byte) uint64 {
	return binary.BigEndian.Uint64(b)
}
