package types

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// WorkPeriod represents a literary period classification.
type WorkPeriod string

// WorkGenre represents the genre of a literary work.
type WorkGenre string

const (
	// Literary periods
	PeriodAncient    WorkPeriod = "ancient"     // Sangam era and earlier
	PeriodClassical  WorkPeriod = "classical"   // Post-Sangam classical
	PeriodMedieval   WorkPeriod = "medieval"    // Medieval period
	PeriodModern     WorkPeriod = "modern"      // Modern Tamil literature
	PeriodContemporary WorkPeriod = "contemporary" // Contemporary works

	// Literary genres
	GenrePoetry    WorkGenre = "poetry"
	GenreProse     WorkGenre = "prose"
	GenreNovel     WorkGenre = "novel"
	GenreShortStory WorkGenre = "short_story"
	GenreDrama     WorkGenre = "drama"
	GenreEpic      WorkGenre = "epic"
	GenreLyric     WorkGenre = "lyric"
	GenreSatire    WorkGenre = "satire"
	GenreFolklore  WorkGenre = "folklore"

	// License types
	LicensePublicDomain   = "public_domain"
	LicenseCCBY           = "cc_by_4.0"
	LicenseCCBYSA         = "cc_by_sa_4.0"
	LicenseCCBYNC         = "cc_by_nc_4.0"
	LicenseCCBYNCND       = "cc_by_nc_nd_4.0"
	LicenseAllRightsReserved = "all_rights_reserved"

	// MaxTitleLength is the maximum length for a title.
	MaxTitleLength = 512

	// MaxTagCount is the maximum number of tags per work.
	MaxTagCount = 20

	// MaxTagLength is the maximum length of a single tag.
	MaxTagLength = 64

	// MaxIPFSCidLength is the maximum length of an IPFS CID.
	MaxIPFSCidLength = 128

	// SHA256HashLength is the expected length of a SHA-256 hash (hex-encoded).
	SHA256HashLength = 64

	// MaxArweaveTxIDLength is the maximum length of an Arweave transaction ID.
	MaxArweaveTxIDLength = 64

	// MaxSizeBytes is the maximum allowed content size (1 GB).
	MaxSizeBytes = int64(1 << 30)
)

// WorkAuthor describes the author of a literary work.
type WorkAuthor struct {
	Name               string `protobuf:"bytes,1,opt,name=name,proto3" json:"name"`
	NameTransliterated string `protobuf:"bytes,2,opt,name=name_transliterated,json=nameTransliterated,proto3" json:"name_transliterated"`
	IdentityDID        string `protobuf:"bytes,3,opt,name=identity_did,json=identityDid,proto3" json:"identity_did,omitempty"`
	Era                string `protobuf:"bytes,4,opt,name=era,proto3" json:"era,omitempty"`
	Region             string `protobuf:"bytes,5,opt,name=region,proto3" json:"region,omitempty"`
}

// Implement proto.Message so it can be used as a nested field in a Msg.
func (m *WorkAuthor) Reset()         { *m = WorkAuthor{} }
func (m *WorkAuthor) String() string { return m.Name }
func (*WorkAuthor) ProtoMessage()    {}

// Validate checks WorkAuthor for consistency.
func (a WorkAuthor) Validate() error {
	if strings.TrimSpace(a.Name) == "" {
		return fmt.Errorf("author name cannot be empty")
	}
	if len(a.Name) > MaxTitleLength {
		return fmt.Errorf("author name exceeds maximum length of %d", MaxTitleLength)
	}
	return nil
}

// WorkContent holds content addressing metadata for a literary work.
type WorkContent struct {
	IPFSCid     string `protobuf:"bytes,1,opt,name=ipfs_cid,json=ipfsCid,proto3" json:"ipfs_cid"`
	SHA256Hash  string `protobuf:"bytes,2,opt,name=sha256_hash,json=sha256Hash,proto3" json:"sha256_hash"`
	SizeBytes   int64  `protobuf:"varint,3,opt,name=size_bytes,json=sizeBytes,proto3" json:"size_bytes"`
	ArweaveTxID string `protobuf:"bytes,4,opt,name=arweave_tx_id,json=arweaveTxId,proto3" json:"arweave_tx_id,omitempty"`
	MimeType    string `protobuf:"bytes,5,opt,name=mime_type,json=mimeType,proto3" json:"mime_type,omitempty"`
	Encoding    string `protobuf:"bytes,6,opt,name=encoding,proto3" json:"encoding,omitempty"`
}

func (m *WorkContent) Reset()         { *m = WorkContent{} }
func (m *WorkContent) String() string { return m.IPFSCid }
func (*WorkContent) ProtoMessage()    {}

// Validate checks WorkContent for consistency.
func (c WorkContent) Validate() error {
	if strings.TrimSpace(c.IPFSCid) == "" {
		return fmt.Errorf("IPFS CID cannot be empty")
	}
	if len(c.IPFSCid) > MaxIPFSCidLength {
		return fmt.Errorf("IPFS CID exceeds maximum length of %d", MaxIPFSCidLength)
	}
	if strings.TrimSpace(c.SHA256Hash) == "" {
		return fmt.Errorf("SHA-256 hash cannot be empty")
	}
	if len(c.SHA256Hash) != SHA256HashLength {
		return fmt.Errorf("SHA-256 hash must be exactly %d hex characters, got %d", SHA256HashLength, len(c.SHA256Hash))
	}
	if _, err := hex.DecodeString(c.SHA256Hash); err != nil {
		return fmt.Errorf("SHA-256 hash contains invalid hex characters: %w", err)
	}
	if c.SizeBytes <= 0 {
		return fmt.Errorf("content size must be positive, got %d", c.SizeBytes)
	}
	if c.SizeBytes > MaxSizeBytes {
		return fmt.Errorf("content size %d exceeds maximum %d bytes", c.SizeBytes, MaxSizeBytes)
	}
	if c.ArweaveTxID != "" && len(c.ArweaveTxID) > MaxArweaveTxIDLength {
		return fmt.Errorf("arweave TX ID exceeds maximum length of %d", MaxArweaveTxIDLength)
	}
	return nil
}

// WorkClassification holds metadata about the period, genre, and tags of a work.
type WorkClassification struct {
	Period   WorkPeriod `protobuf:"bytes,1,opt,name=period,proto3,casttype=WorkPeriod" json:"period"`
	Genre    WorkGenre  `protobuf:"bytes,2,opt,name=genre,proto3,casttype=WorkGenre" json:"genre"`
	Tags     []string   `protobuf:"bytes,3,rep,name=tags,proto3" json:"tags,omitempty"`
	Language string     `protobuf:"bytes,4,opt,name=language,proto3" json:"language"`
	Script   string     `protobuf:"bytes,5,opt,name=script,proto3" json:"script,omitempty"`
}

func (m *WorkClassification) Reset()         { *m = WorkClassification{} }
func (m *WorkClassification) String() string { return string(m.Period) }
func (*WorkClassification) ProtoMessage()    {}

// Validate checks WorkClassification for consistency.
func (c WorkClassification) Validate() error {
	if strings.TrimSpace(string(c.Period)) == "" {
		return fmt.Errorf("period cannot be empty")
	}
	if strings.TrimSpace(string(c.Genre)) == "" {
		return fmt.Errorf("genre cannot be empty")
	}
	if len(c.Tags) > MaxTagCount {
		return fmt.Errorf("tag count %d exceeds maximum of %d", len(c.Tags), MaxTagCount)
	}
	for i, tag := range c.Tags {
		if strings.TrimSpace(tag) == "" {
			return fmt.Errorf("tag at index %d cannot be empty", i)
		}
		if len(tag) > MaxTagLength {
			return fmt.Errorf("tag at index %d exceeds maximum length of %d", i, MaxTagLength)
		}
	}
	if strings.TrimSpace(c.Language) == "" {
		return fmt.Errorf("language cannot be empty")
	}
	return nil
}

// WorkRights describes the intellectual property rights of a work.
type WorkRights struct {
	License           string `protobuf:"bytes,1,opt,name=license,proto3" json:"license"`
	CopyrightHolder   string `protobuf:"bytes,2,opt,name=copyright_holder,json=copyrightHolder,proto3" json:"copyright_holder,omitempty"`
	CopyrightYear     int32  `protobuf:"varint,3,opt,name=copyright_year,json=copyrightYear,proto3" json:"copyright_year,omitempty"`
	IsPublicDomain    bool   `protobuf:"varint,4,opt,name=is_public_domain,json=isPublicDomain,proto3" json:"is_public_domain"`
	OriginalSourceURL string `protobuf:"bytes,5,opt,name=original_source_url,json=originalSourceUrl,proto3" json:"original_source_url,omitempty"`
}

func (m *WorkRights) Reset()         { *m = WorkRights{} }
func (m *WorkRights) String() string { return m.License }
func (*WorkRights) ProtoMessage()    {}

// Validate checks WorkRights for consistency.
func (r WorkRights) Validate() error {
	if strings.TrimSpace(r.License) == "" {
		return fmt.Errorf("license cannot be empty")
	}
	if r.CopyrightYear < 0 {
		return fmt.Errorf("copyright year cannot be negative")
	}
	return nil
}

// LiteraryWork is the core on-chain data structure representing a Tamil literary work.
type LiteraryWork struct {
	// WorkID is the unique chain-assigned identifier.
	WorkID string `json:"work_id"`

	// Title is the work title in Tamil script.
	Title string `json:"title"`

	// TitleTransliterated is the romanized version of the title.
	TitleTransliterated string `json:"title_transliterated"`

	// TitleEnglish is an optional English translation of the title.
	TitleEnglish string `json:"title_english,omitempty"`

	// Author contains author information.
	Author WorkAuthor `json:"author"`

	// Content contains content-addressing metadata.
	Content WorkContent `json:"content"`

	// Classification contains period/genre/tag metadata.
	Classification WorkClassification `json:"classification"`

	// Rights contains licensing and copyright information.
	Rights WorkRights `json:"rights"`

	// Description is a brief description of the work (optional).
	Description string `json:"description,omitempty"`

	// IsVerified indicates whether the work has been verified by a curator.
	IsVerified bool `json:"is_verified"`

	// VerifiedBy is the address of the curator who verified the work.
	VerifiedBy string `json:"verified_by,omitempty"`

	// VerifiedAt is the time at which the work was verified.
	VerifiedAt *time.Time `json:"verified_at,omitempty"`

	// ChainMetadata contains on-chain provenance information.
	BlockHeight int64  `json:"block_height"`
	TxHash      string `json:"tx_hash"`
	Timestamp   time.Time `json:"timestamp"`
	UploadedBy  string `json:"uploaded_by"`
}

// Validate performs full validation of a LiteraryWork.
func (w LiteraryWork) Validate() error {
	if strings.TrimSpace(w.WorkID) == "" {
		return fmt.Errorf("work ID cannot be empty")
	}
	if strings.TrimSpace(w.Title) == "" {
		return fmt.Errorf("title cannot be empty")
	}
	if len(w.Title) > MaxTitleLength {
		return fmt.Errorf("title length %d exceeds maximum %d", len(w.Title), MaxTitleLength)
	}
	if strings.TrimSpace(w.TitleTransliterated) == "" {
		return fmt.Errorf("transliterated title cannot be empty")
	}
	if len(w.TitleTransliterated) > MaxTitleLength {
		return fmt.Errorf("transliterated title length %d exceeds maximum %d", len(w.TitleTransliterated), MaxTitleLength)
	}
	if err := w.Author.Validate(); err != nil {
		return fmt.Errorf("invalid author: %w", err)
	}
	if err := w.Content.Validate(); err != nil {
		return fmt.Errorf("invalid content: %w", err)
	}
	if err := w.Classification.Validate(); err != nil {
		return fmt.Errorf("invalid classification: %w", err)
	}
	if err := w.Rights.Validate(); err != nil {
		return fmt.Errorf("invalid rights: %w", err)
	}
	if strings.TrimSpace(w.UploadedBy) == "" {
		return fmt.Errorf("uploaded_by cannot be empty")
	}
	if w.IsVerified {
		if strings.TrimSpace(w.VerifiedBy) == "" {
			return fmt.Errorf("verified_by cannot be empty when is_verified is true")
		}
		if w.VerifiedAt == nil {
			return fmt.Errorf("verified_at cannot be nil when is_verified is true")
		}
	}
	return nil
}

// GenerateWorkID generates a unique, deterministic work ID.
//
// It hashes the submitter address, block height, and tx hash together so that
// two submissions in the same block always produce different IDs (the headerHash
// is the same for all txs in a block, so we CANNOT use txHash[:8] alone —
// that would cause all works in one block to share the same ID and overwrite
// each other).
func GenerateWorkID(submitter string, blockHeight int64, txHash string) string {
	raw := fmt.Sprintf("%s|%d|%s", submitter, blockHeight, txHash)
	h := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("tmz-work-%x", h[:12]) // 24 hex chars, globally unique
}
