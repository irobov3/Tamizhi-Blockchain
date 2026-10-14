/**
 * Returns a JavaScript string to inject into a WebView so that dApps
 * can interact with the Tamizhi wallet via window.tamizhi.
 *
 * The injected script must end with `true;` as required by react-native-webview.
 */
export function getProviderScript(address: string): string {
  return `
(function() {
  if (window.tamizhi) { true; return; }

  window.tamizhi = {
    isInstalled: true,
    version: '0.1.0',
    chainId: 'tamizhi-testnet-1',
    _address: '${address}',

    enable: function() {
      return Promise.resolve([window.tamizhi._address]);
    },

    getAccounts: function() {
      return Promise.resolve([window.tamizhi._address]);
    },

    signAmino: function(signerAddress, signDoc) {
      return new Promise(function(resolve, reject) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SIGN_AMINO',
          signerAddress: signerAddress,
          signDoc: signDoc
        }));
        window._tamizhiSignResolve = resolve;
        window._tamizhiSignReject = reject;
      });
    },

    signDirect: function(signerAddress, signDoc) {
      return new Promise(function(resolve, reject) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SIGN_DIRECT',
          signerAddress: signerAddress,
          signDoc: signDoc
        }));
        window._tamizhiSignResolve = resolve;
        window._tamizhiSignReject = reject;
      });
    },

    sendTransaction: function(tx) {
      return new Promise(function(resolve, reject) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SEND_TX',
          tx: tx
        }));
        window._tamizhiTxResolve = resolve;
        window._tamizhiTxReject = reject;
      });
    }
  };

  try {
    window.dispatchEvent(new Event('tamizhi#initialized'));
  } catch(e) {}

  console.log('[Tamizhi] Web3 provider injected, address:', window.tamizhi._address);
  true;
})();
  `;
}
