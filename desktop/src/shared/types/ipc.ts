// Typed IPC channel definitions for Tamizhi Desktop
// These mirror what's registered in main process handlers

export type IpcChannel =
  // Window
  | 'window:minimize'
  | 'window:maximize'
  | 'window:close'
  | 'window:isMaximized'
  | 'window:toggleFullscreen'
  | 'window:maximized' // event FROM main
  // App
  | 'app:getVersion'
  | 'app:getPlatform'
  // Database
  | 'db:getMessages'
  | 'db:saveMessage'
  | 'db:updateMessageStatus'
  | 'db:getConversations'
  | 'db:upsertConversation'
  | 'db:markConversationRead'
  | 'db:deleteConversation'
  | 'db:getWallet'
  | 'db:saveWallet'
  | 'db:getContacts'
  | 'db:saveContact'
  | 'db:getSetting'
  | 'db:setSetting'
  // Crypto
  | 'crypto:generateWallet'
  | 'crypto:deriveX25519'
  | 'crypto:encryptMessage'
  | 'crypto:decryptMessage'
  | 'crypto:sign'
  // Shell
  | 'shell:openExternal'
  // Clipboard
  | 'clipboard:write'
  | 'clipboard:read'
  // Notifications
  | 'notification:show'
  // Tray
  | 'tray:setBadge'
  | 'tray:new-message' // event FROM main
  | 'tray:navigate' // event FROM main
  // Updater
  | 'updater:install'
  | 'updater:update-available' // event FROM main
  | 'updater:update-downloaded' // event FROM main
  | 'updater:error'; // event FROM main

// Payload types for IPC invoke calls
export interface IpcInvokeMap {
  'window:minimize': { args: []; result: void };
  'window:maximize': { args: []; result: boolean };
  'window:close': { args: []; result: void };
  'window:isMaximized': { args: []; result: boolean };
  'app:getVersion': { args: []; result: string };
  'app:getPlatform': { args: []; result: string };
  'db:getMessages': {
    args: [conversationId: string, limit?: number, offset?: number];
    result: import('./index').StoredMessage[];
  };
  'db:saveMessage': {
    args: [msg: import('./index').StoredMessage];
    result: { success: boolean };
  };
  'db:updateMessageStatus': {
    args: [id: string, status: string];
    result: { success: boolean };
  };
  'db:getConversations': {
    args: [];
    result: import('./index').ConversationRow[];
  };
  'db:upsertConversation': {
    args: [conv: import('./index').ConversationRow];
    result: { success: boolean };
  };
  'db:markConversationRead': {
    args: [id: string];
    result: { success: boolean };
  };
  'db:deleteConversation': {
    args: [id: string];
    result: { success: boolean };
  };
  'db:getWallet': {
    args: [];
    result: import('./index').StoredWallet | null;
  };
  'db:saveWallet': {
    args: [wallet: import('./index').StoredWallet];
    result: { success: boolean };
  };
  'db:getContacts': {
    args: [];
    result: import('./index').ContactRow[];
  };
  'db:saveContact': {
    args: [address: string, label: string];
    result: { success: boolean };
  };
  'crypto:generateWallet': {
    args: [mnemonic?: string];
    result: {
      mnemonic: string;
      address: string;
      publicKey: string;
      x25519Public: string;
      x25519Secret: string;
    };
  };
  'crypto:encryptMessage': {
    args: [args: {
      plaintext: string;
      recipientX25519Public: string;
      senderX25519Secret: string;
    }];
    result: import('./index').EncryptedMessage;
  };
  'crypto:decryptMessage': {
    args: [args: {
      ciphertext: string;
      nonce: string;
      ephemeralPubKey: string;
      recipientX25519Secret: string;
    }];
    result: string;
  };
  'shell:openExternal': {
    args: [url: string];
    result: { success: boolean };
  };
  'clipboard:write': {
    args: [text: string];
    result: { success: boolean };
  };
  'notification:show': {
    args: [title: string, body: string];
    result: { success: boolean };
  };
}
