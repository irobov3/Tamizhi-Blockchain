import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tamizhi', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Storage (SQLite via main process)
  db: {
    getMessages: (conversationId: string) =>
      ipcRenderer.invoke('db:getMessages', conversationId),
    saveMessage: (msg: unknown) => ipcRenderer.invoke('db:saveMessage', msg),
    getConversations: () => ipcRenderer.invoke('db:getConversations'),
    getWallet: () => ipcRenderer.invoke('db:getWallet'),
    saveWallet: (wallet: unknown) => ipcRenderer.invoke('db:saveWallet', wallet),
    getContacts: () => ipcRenderer.invoke('db:getContacts'),
    saveContact: (address: string, label: string) =>
      ipcRenderer.invoke('db:saveContact', address, label),
    updateMessageStatus: (id: string, status: string) =>
      ipcRenderer.invoke('db:updateMessageStatus', id, status),
    markConversationRead: (id: string) =>
      ipcRenderer.invoke('db:markConversationRead', id),
    upsertConversation: (conv: unknown) =>
      ipcRenderer.invoke('db:upsertConversation', conv),
    deleteConversation: (id: string) =>
      ipcRenderer.invoke('db:deleteConversation', id),
  },

  // Crypto (runs in main for security)
  crypto: {
    generateWallet: () => ipcRenderer.invoke('crypto:generateWallet'),
    encryptMessage: (args: unknown) =>
      ipcRenderer.invoke('crypto:encryptMessage', args),
    decryptMessage: (args: unknown) =>
      ipcRenderer.invoke('crypto:decryptMessage', args),
    sign: (args: unknown) => ipcRenderer.invoke('crypto:sign', args),
    deriveX25519: (mnemonic: string) =>
      ipcRenderer.invoke('crypto:deriveX25519', mnemonic),
  },

  // System
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', title, body),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Events from main
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  off: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  once: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.once(channel, (_event, ...args) => callback(...args));
  },
});
