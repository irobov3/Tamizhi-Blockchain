package types

import (
	sdkerrors "cosmossdk.io/errors"
)

// Module sentinel errors.
var (
	// ErrWorkNotFound is returned when a requested literary work does not exist.
	ErrWorkNotFound = sdkerrors.Register(ModuleName, 1, "literary work not found")

	// ErrWorkAlreadyExists is returned when attempting to submit a duplicate work.
	ErrWorkAlreadyExists = sdkerrors.Register(ModuleName, 2, "literary work already exists")

	// ErrInvalidWork is returned when a work fails validation.
	ErrInvalidWork = sdkerrors.Register(ModuleName, 3, "invalid literary work")

	// ErrUnauthorized is returned when the caller is not authorized to perform an action.
	ErrUnauthorized = sdkerrors.Register(ModuleName, 4, "unauthorized: caller is not the submitter or a curator")

	// ErrWorkAlreadyVerified is returned when attempting to verify an already-verified work.
	ErrWorkAlreadyVerified = sdkerrors.Register(ModuleName, 5, "literary work is already verified")

	// ErrInvalidIPFSCid is returned when an IPFS CID is malformed.
	ErrInvalidIPFSCid = sdkerrors.Register(ModuleName, 6, "invalid IPFS CID")

	// ErrInvalidSHA256Hash is returned when a SHA-256 hash is malformed.
	ErrInvalidSHA256Hash = sdkerrors.Register(ModuleName, 7, "invalid SHA-256 hash")

	// ErrInvalidArweaveTxID is returned when an Arweave TX ID is malformed.
	ErrInvalidArweaveTxID = sdkerrors.Register(ModuleName, 8, "invalid Arweave transaction ID")

	// ErrDuplicateIPFSCid is returned when the IPFS CID is already registered to another work.
	ErrDuplicateIPFSCid = sdkerrors.Register(ModuleName, 9, "IPFS CID is already registered to another work")

	// ErrMaxWorksReached is returned when the global work count limit is reached.
	ErrMaxWorksReached = sdkerrors.Register(ModuleName, 10, "maximum number of works has been reached")

	// ErrInvalidPagination is returned when invalid pagination parameters are provided.
	ErrInvalidPagination = sdkerrors.Register(ModuleName, 11, "invalid pagination parameters")
)
