package types

// Event type constants for the literature module.
const (
	EventTypeSubmitWork    = "submit_work"
	EventTypeUpdateArweave = "update_arweave"
	EventTypeVerifyWork    = "verify_work"

	AttributeKeyWorkID      = "work_id"
	AttributeKeySubmitter   = "submitter"
	AttributeKeyIPFSCid     = "ipfs_cid"
	AttributeKeyArweaveTxID = "arweave_tx_id"
	AttributeKeyCurator     = "curator"
)
