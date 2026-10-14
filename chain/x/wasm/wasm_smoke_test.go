package wasm_test

import (
	"testing"

	wasmkeeper "github.com/CosmWasm/wasmd/x/wasm/keeper"
	wasmtypes "github.com/CosmWasm/wasmd/x/wasm/types"
)

// TestWasmDefaultParams verifies that the wasmd v0.53.0 Params type is
// accessible and has sensible defaults. Note: v0.53.0 removed MaxWasmCodeSize
// from Params (it is now governed via WasmConfig), so we check the fields that
// actually exist.
func TestWasmDefaultParams(t *testing.T) {
	params := wasmtypes.DefaultParams()

	// CodeUploadAccess must be set (defaults to AllowEverybody).
	if params.CodeUploadAccess.Permission == wasmtypes.AccessTypeUnspecified {
		t.Error("CodeUploadAccess.Permission should not be unspecified")
	}
	t.Logf("Wasm params: CodeUploadAccess=%+v, InstantiateDefaultPermission=%s",
		params.CodeUploadAccess, params.InstantiateDefaultPermission)
}

func TestWasmModuleName(t *testing.T) {
	if wasmtypes.ModuleName != "wasm" {
		t.Errorf("ModuleName = %q, want 'wasm'", wasmtypes.ModuleName)
	}
}

// TestWasmBuiltInCapabilities verifies the built-in capability list is non-empty.
func TestWasmBuiltInCapabilities(t *testing.T) {
	caps := wasmkeeper.BuiltInCapabilities()
	if len(caps) == 0 {
		t.Error("BuiltInCapabilities should not be empty")
	}
	t.Logf("Built-in wasm capabilities (%d): %v", len(caps), caps)
}

// TestWasmStoreKey verifies the store key constant is the expected value.
func TestWasmStoreKey(t *testing.T) {
	if wasmtypes.StoreKey != "wasm" {
		t.Errorf("StoreKey = %q, want 'wasm'", wasmtypes.StoreKey)
	}
}
