import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    nodePolyfills({
      // Polyfill Node built-ins (crypto, buffer, stream) that @cosmjs needs
      include: ["buffer", "crypto", "stream", "util", "events"],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "es2020",
  },
}));
