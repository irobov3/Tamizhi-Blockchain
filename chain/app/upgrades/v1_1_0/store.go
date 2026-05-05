package v1_1_0

// No store migrations needed for v1.1.0.
// New fields (UptimeJailThreshold, SlashFraction) are computed from constants,
// not stored in the KV store, so no migration is required.
//
// If a future upgrade needs to migrate existing node records, add:
//   func MigrateStore(ctx sdk.Context, storeService store.KVStoreService) error
// here and call it from CreateUpgradeHandler before RunMigrations.
