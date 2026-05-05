import { create } from "zustand";

export type NetworkConfig = {
  id: string;
  label: string;
  rpc: string;
  rest: string;
  chainId: string;
  bech32Prefix: string;
  denom: string; // micro denom, e.g. utmz
  display: string; // display denom, e.g. TMZ
  exponent: number; // 6
};

export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    id: "testnet",
    label: "Testnet (local)",
    rpc: "http://localhost:26657",
    rest: "http://localhost:1317",
    chainId: "tamizhi-testnet-1",
    bech32Prefix: "tamizhi",
    denom: "utmz",
    display: "TMZ",
    exponent: 6,
  },
  mainnet: {
    id: "mainnet",
    label: "Mainnet",
    rpc: "https://rpc.tamizhi.ai",
    rest: "https://api.tamizhi.ai",
    chainId: "tamizhi-1",
    bech32Prefix: "tamizhi",
    denom: "utmz",
    display: "TMZ",
    exponent: 6,
  },
};

type NetworkState = {
  current: NetworkConfig;
  custom?: NetworkConfig;
  setNetwork: (id: string) => void;
  setCustom: (cfg: NetworkConfig) => void;
};

export const useNetwork = create<NetworkState>((set, get) => ({
  current: NETWORKS.testnet,
  setNetwork: (id) => {
    const cfg =
      id === "custom" ? get().custom ?? NETWORKS.testnet : NETWORKS[id] ?? NETWORKS.testnet;
    set({ current: cfg });
  },
  setCustom: (cfg) => set({ custom: cfg, current: cfg }),
}));
