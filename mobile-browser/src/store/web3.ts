/**
 * Transient state for in-flight Web3 permission prompts.
 *
 * The WebView message handler inserts a pending request here; the
 * Web3PermissionModal subscribes and resolves/rejects it via approve/deny.
 */
import { create } from 'zustand';

export interface PendingRequest {
  id: string;
  domain: string;
  method: string;
  params?: any;
  resolve: (granted: boolean, remember?: boolean) => void;
}

interface Web3State {
  pending: PendingRequest | null;
  setPending: (p: PendingRequest | null) => void;
}

export const useWeb3Store = create<Web3State>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
}));

/**
 * Show a permission modal and await the user's decision.
 * Resolves to { granted, remember }.
 */
export function promptPermission(
  domain: string,
  method: string,
  params?: any
): Promise<{ granted: boolean; remember: boolean }> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    useWeb3Store.getState().setPending({
      id,
      domain,
      method,
      params,
      resolve: (granted, remember = false) => {
        useWeb3Store.getState().setPending(null);
        resolve({ granted, remember });
      },
    });
  });
}
