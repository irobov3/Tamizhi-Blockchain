interface ImportMeta {
  readonly env: {
    readonly VITE_API_URL?: string;
    readonly VITE_LCD_URL?: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_RPC_URL?: string;
    readonly VITE_CHAIN_ID?: string;
    readonly [key: string]: string | undefined;
  };
}

// Available in Electron renderer via preload / webpack
declare function require(id: string): unknown;
