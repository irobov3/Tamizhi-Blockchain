import { useEffect, useState } from 'react';
import { signalingClient } from '../api/signaling';
import { probeConnectivity } from '../utils/network';

/**
 * Coarse connectivity state — derived from:
 *  - signaling WebSocket open/closed
 *  - periodic HEAD probes against the storage server
 *
 * Avoids the `@react-native-community/netinfo` native module so we
 * don't perturb the existing prebuild.
 */
export type Connectivity = 'online' | 'connecting' | 'offline';

export function useConnectivity(pollMs = 15000): Connectivity {
  const [state, setState] = useState<Connectivity>('connecting');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (cancelled) return;
      if (signalingClient.isConnected) {
        setState('online');
        return;
      }
      const ok = await probeConnectivity();
      if (cancelled) return;
      setState(ok ? 'online' : 'offline');
    }

    check();
    const id = setInterval(check, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollMs]);

  return state;
}
