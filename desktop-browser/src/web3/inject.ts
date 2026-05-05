// String injected as a <script srcdoc> wrapper or via iframe-document write.
// Because our MVP renders pages via <iframe src=...> (cross-origin), we
// cannot actually evaluate this inside the page DOM — the browser sandbox
// blocks it. We still ship the source string here so dApps served from
// our own origin (the React shell, ipfs:// pages we proxy, or future
// native-webview integration) can use it via a <script src> tag.
//
// For cross-origin pages, dApps must use the postMessage handshake
// directly — see docs/PROVIDER.md.

export const INJECTED_PROVIDER_JS = `
(function() {
  if (window.tamizhi) return;
  var pendingRequests = new Map();

  window.addEventListener('message', function(e) {
    if (!e.data || e.data.target !== 'tamizhi-response') return;
    var id = e.data.id;
    var handler = pendingRequests.get(id);
    if (!handler) return;
    pendingRequests.delete(id);
    if (e.data.error) handler.reject(e.data.error);
    else handler.resolve(e.data.result);
  });

  function rpc(method, params) {
    return new Promise(function(resolve, reject) {
      var id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      pendingRequests.set(id, { resolve: resolve, reject: reject });
      window.parent.postMessage({
        target: 'tamizhi-request',
        id: id,
        method: method,
        params: params
      }, '*');
    });
  }

  window.tamizhi = {
    isTamizhiBrowser: true,
    chainId: 'tamizhi-1',
    request: function(args) { return rpc(args.method, args.params); },
    enable: function() { return rpc('enable'); },
    getAccounts: function() { return rpc('getAccounts'); },
    signAmino: function(signer, signDoc) { return rpc('signAmino', { signer: signer, signDoc: signDoc }); },
    signDirect: function(signer, signDoc) { return rpc('signDirect', { signer: signer, signDoc: signDoc }); },
    sendTx: function(tx) { return rpc('sendTx', { tx: tx }); },
    getChainId: function() { return rpc('getChainId'); }
  };

  window.dispatchEvent(new Event('tamizhi#initialized'));
})();
`;
