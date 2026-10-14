/**
 * Bridge between the injected `window.tamizhi` provider and the React Native
 * side. Handles permission checks, prompts, and signing via CosmJS.
 */
import type { RefObject } from 'react';
import type WebView from 'react-native-webview';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { Secp256k1HdWallet } from '@cosmjs/amino';
import { useWalletStore } from '../store/wallet';
import { promptPermission } from '../store/web3';
import {
  checkPermission,
  setPermission,
  type ConnectChoice,
  type SignChoice,
} from './permissions';
import { CONFIG } from '../config';

type WebViewRef = RefObject<WebView>;

interface IncomingMsg {
  type: string;
  id: string;
  method: string;
  params?: any;
}

/**
 * Send a response back to the page. The injected JS listens for
 * 'tamizhi-response' messages on document/window.
 */
function sendToWebView(
  ref: WebViewRef,
  payload: { id: string; result?: any; error?: string }
) {
  const msg = JSON.stringify({ type: 'tamizhi-response', ...payload });
  // Inject a script that dispatches a message event so the in-page
  // listener picks it up. postMessage on the ref talks back to the page.
  const js = `
    (function() {
      try {
        var data = ${JSON.stringify(msg)};
        var ev = new MessageEvent('message', { data: data });
        document.dispatchEvent(ev);
        window.dispatchEvent(ev);
      } catch (e) {}
      true;
    })();
  `;
  ref.current?.injectJavaScript(js);
}

/**
 * Build a CosmJS wallet from the stored mnemonic. Throws if not present.
 *
 * NOTE: the stored mnemonic is plaintext in this stub — when unifying with
 * mobile-wallet keystore, replace this with the encrypted-at-rest version.
 */
async function getDirectWallet(): Promise<DirectSecp256k1HdWallet> {
  const acc = useWalletStore.getState().account;
  if (!acc?.mnemonic) throw new Error('Wallet not initialized');
  return DirectSecp256k1HdWallet.fromMnemonic(acc.mnemonic, {
    prefix: 'tamizhi',
  });
}

async function getAminoWallet(): Promise<Secp256k1HdWallet> {
  const acc = useWalletStore.getState().account;
  if (!acc?.mnemonic) throw new Error('Wallet not initialized');
  return Secp256k1HdWallet.fromMnemonic(acc.mnemonic, { prefix: 'tamizhi' });
}

async function dispatchMethod(
  method: string,
  params: any
): Promise<any> {
  switch (method) {
    case 'enable': {
      const acc = useWalletStore.getState().account;
      if (!acc) throw new Error('No wallet configured');
      return { chainId: CONFIG.CHAIN_ID, address: acc.address };
    }

    case 'getAccounts': {
      const wallet = await getDirectWallet();
      const accounts = await wallet.getAccounts();
      return accounts.map((a) => ({
        address: a.address,
        algo: a.algo,
        pubkey: Array.from(a.pubkey),
      }));
    }

    case 'signAmino': {
      const { signer, signDoc } = params ?? {};
      if (!signer || !signDoc) throw new Error('signAmino requires signer and signDoc');
      const wallet = await getAminoWallet();
      const result = await wallet.signAmino(signer, signDoc);
      return result;
    }

    case 'signDirect': {
      const { signer, signDoc } = params ?? {};
      if (!signer || !signDoc) throw new Error('signDirect requires signer and signDoc');
      const wallet = await getDirectWallet();
      // signDoc.bodyBytes / authInfoBytes may arrive as base64; CosmJS
      // expects Uint8Array. Coerce if needed.
      const coerce = (v: any) =>
        v instanceof Uint8Array
          ? v
          : Array.isArray(v)
          ? new Uint8Array(v)
          : typeof v === 'string'
          ? Uint8Array.from(atob(v), (c) => c.charCodeAt(0))
          : v;
      const doc = {
        bodyBytes: coerce(signDoc.bodyBytes),
        authInfoBytes: coerce(signDoc.authInfoBytes),
        chainId: signDoc.chainId,
        accountNumber: BigInt(signDoc.accountNumber),
      };
      const result = await wallet.signDirect(signer, doc as any);
      return result;
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

/**
 * Persist a "remember" choice from the permission modal.
 */
async function rememberChoice(
  domain: string,
  method: string,
  granted: boolean
): Promise<void> {
  if (method === 'enable' || method === 'getAccounts') {
    const v: ConnectChoice = granted ? 'allowed' : 'denied';
    await setPermission(domain, { [method]: v });
  } else if (method === 'signAmino' || method === 'signDirect') {
    const v: SignChoice = granted ? 'always-allow' : 'always-deny';
    await setPermission(domain, { [method]: v });
  }
}

/**
 * Handle a parsed message from the WebView.
 */
export async function handleWebViewMessage(
  webViewRef: WebViewRef,
  domain: string,
  msg: IncomingMsg
): Promise<void> {
  if (!msg || msg.type !== 'tamizhi-request') return;
  const { id, method, params } = msg;

  // Permission check
  const decision = await checkPermission(domain, method);

  if (decision === 'deny') {
    sendToWebView(webViewRef, { id, error: 'User denied' });
    return;
  }

  if (decision === 'prompt') {
    const { granted, remember } = await promptPermission(
      domain,
      method,
      params
    );
    if (remember) {
      try {
        await rememberChoice(domain, method, granted);
      } catch (e) {
        console.warn('rememberChoice failed', e);
      }
    }
    if (!granted) {
      sendToWebView(webViewRef, { id, error: 'User denied' });
      return;
    }
  }

  try {
    const result = await dispatchMethod(method, params);
    sendToWebView(webViewRef, { id, result });
  } catch (e: any) {
    sendToWebView(webViewRef, { id, error: e?.message ?? String(e) });
  }
}

/**
 * Convenience entrypoint for WebView's onMessage callback.
 */
export function onWebViewMessage(
  webViewRef: WebViewRef,
  domain: string,
  raw: string
): void {
  let parsed: IncomingMsg | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!parsed) return;
  handleWebViewMessage(webViewRef, domain, parsed).catch((e) => {
    console.warn('handleWebViewMessage error', e);
  });
}
