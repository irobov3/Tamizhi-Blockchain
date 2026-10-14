import { useEffect, useState } from "react";
import { StargateClient } from "@cosmjs/stargate";

export interface ChainState {
  client: StargateClient | null;
  height: number;
  connected: boolean;
  error: string | null;
}

export const CHAIN_CONFIG = {
  CHAIN_ID: "tamizhi-1",
  RPC_URL: "http://localhost:26657",
  REST_URL: "http://localhost:1317",
  DENOM: "utmz",
  DISPLAY_DENOM: "TMZ",
  DECIMALS: 6,
};

/**
 * useChain — establishes a real CosmJS connection to the Tamizhi chain.
 * Polls block height as a heartbeat.
 */
export function useChain(): ChainState {
  const [state, setState] = useState<ChainState>({
    client: null,
    height: 0,
    connected: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let client: StargateClient | null = null;

    (async () => {
      try {
        client = await StargateClient.connect(CHAIN_CONFIG.RPC_URL);
        if (cancelled) {
          client.disconnect();
          return;
        }
        const height = await client.getHeight();
        setState({ client, height, connected: true, error: null });

        timer = setInterval(async () => {
          try {
            if (!client) return;
            const h = await client.getHeight();
            setState((s) => ({ ...s, height: h, connected: true }));
          } catch (err) {
            setState((s) => ({
              ...s,
              connected: false,
              error: (err as Error).message,
            }));
          }
        }, 10_000);
      } catch (err) {
        setState({
          client: null,
          height: 0,
          connected: false,
          error: (err as Error).message,
        });
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (client) client.disconnect();
    };
  }, []);

  return state;
}
