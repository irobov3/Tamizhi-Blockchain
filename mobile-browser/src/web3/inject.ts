/**
 * JavaScript that gets injected into every WebView page so dApps can
 * detect and use the Tamizhi wallet via `window.tamizhi`.
 *
 * The provider exposes a Keplr-like API surface adapted for Tamizhi:
 *   - tamizhi.enable()
 *   - tamizhi.getAccounts()
 *   - tamizhi.signAmino(signer, signDoc)
 *   - tamizhi.signDirect(signer, signDoc)
 *   - tamizhi.request({ method, params })
 *
 * Communication is via window.ReactNativeWebView.postMessage (page → RN)
 * and document/window 'message' events (RN → page).
 *
 * IMPORTANT: this file's exported string is fed to <WebView injectedJavaScript>.
 * It must end with a truthy value (`true;`) per react-native-webview docs.
 */

export const INJECTED_JS = `
(function() {
  if (window.tamizhi) return;
  var pendingRequests = new Map();

  function post(data) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }
  }

  function onMessage(e) {
    try {
      var msg = JSON.parse(e.data);
      if (!msg || msg.type !== 'tamizhi-response') return;
      var handler = pendingRequests.get(msg.id);
      if (!handler) return;
      pendingRequests.delete(msg.id);
      if (msg.error) handler.reject(new Error(String(msg.error)));
      else handler.resolve(msg.result);
    } catch (err) {}
  }

  // RN's WebView dispatches messages on both document and window depending
  // on platform; listen on both to be safe.
  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);

  function request(args) {
    return new Promise(function(resolve, reject) {
      var id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      pendingRequests.set(id, { resolve: resolve, reject: reject });
      post({
        type: 'tamizhi-request',
        id: id,
        method: args && args.method,
        params: args && args.params,
      });
    });
  }

  window.tamizhi = {
    isTamizhiBrowser: true,
    chainId: 'tamizhi-1',
    request: request,
    enable: function() { return request({ method: 'enable' }); },
    getAccounts: function() { return request({ method: 'getAccounts' }); },
    signAmino: function(signer, signDoc) {
      return request({ method: 'signAmino', params: { signer: signer, signDoc: signDoc } });
    },
    signDirect: function(signer, signDoc) {
      return request({ method: 'signDirect', params: { signer: signer, signDoc: signDoc } });
    },
  };

  try { window.dispatchEvent(new Event('tamizhi#initialized')); } catch (e) {}
  true;
})();
`;
