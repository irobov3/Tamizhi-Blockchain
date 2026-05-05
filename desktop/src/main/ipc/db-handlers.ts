import { ipcMain, app } from 'electron';
import path from 'path';
import { getDatabase } from '../services/database';
import type { StoredMessage, ConversationRow, StoredWallet } from '../../shared/types';

let dbInitialized = false;

function ensureDb() {
  if (!dbInitialized) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'tamizhi.db');
    getDatabase(dbPath);
    dbInitialized = true;
  }
  return getDatabase();
}

export function registerDbHandlers(): void {
  // ── Messages ──────────────────────────────────────────────────────────────

  ipcMain.handle('db:getMessages', (_event, conversationId: string, limit?: number, offset?: number) => {
    try {
      const db = ensureDb();
      return db.getMessages(conversationId, limit, offset);
    } catch (err) {
      console.error('[db:getMessages]', err);
      throw err;
    }
  });

  ipcMain.handle('db:saveMessage', (_event, msg: StoredMessage) => {
    try {
      const db = ensureDb();
      db.saveMessage(msg);
      return { success: true };
    } catch (err) {
      console.error('[db:saveMessage]', err);
      throw err;
    }
  });

  ipcMain.handle('db:updateMessageStatus', (_event, id: string, status: string) => {
    try {
      const db = ensureDb();
      db.updateMessageStatus(id, status);
      return { success: true };
    } catch (err) {
      console.error('[db:updateMessageStatus]', err);
      throw err;
    }
  });

  // ── Conversations ─────────────────────────────────────────────────────────

  ipcMain.handle('db:getConversations', (_event) => {
    try {
      const db = ensureDb();
      return db.getConversations();
    } catch (err) {
      console.error('[db:getConversations]', err);
      throw err;
    }
  });

  ipcMain.handle('db:upsertConversation', (_event, conv: ConversationRow) => {
    try {
      const db = ensureDb();
      db.upsertConversation(conv);
      return { success: true };
    } catch (err) {
      console.error('[db:upsertConversation]', err);
      throw err;
    }
  });

  ipcMain.handle('db:markConversationRead', (_event, id: string) => {
    try {
      const db = ensureDb();
      db.markConversationRead(id);
      return { success: true };
    } catch (err) {
      console.error('[db:markConversationRead]', err);
      throw err;
    }
  });

  ipcMain.handle('db:deleteConversation', (_event, id: string) => {
    try {
      const db = ensureDb();
      db.deleteConversation(id);
      return { success: true };
    } catch (err) {
      console.error('[db:deleteConversation]', err);
      throw err;
    }
  });

  // ── Wallet ────────────────────────────────────────────────────────────────

  ipcMain.handle('db:getWallet', (_event) => {
    try {
      const db = ensureDb();
      return db.getWallet();
    } catch (err) {
      console.error('[db:getWallet]', err);
      throw err;
    }
  });

  ipcMain.handle('db:saveWallet', (_event, wallet: StoredWallet) => {
    try {
      const db = ensureDb();
      db.saveWallet(wallet);
      return { success: true };
    } catch (err) {
      console.error('[db:saveWallet]', err);
      throw err;
    }
  });

  // ── Contacts ──────────────────────────────────────────────────────────────

  ipcMain.handle('db:getContacts', (_event) => {
    try {
      const db = ensureDb();
      return db.getContacts();
    } catch (err) {
      console.error('[db:getContacts]', err);
      throw err;
    }
  });

  ipcMain.handle('db:saveContact', (_event, address: string, label: string) => {
    try {
      const db = ensureDb();
      db.saveContact(address, label);
      return { success: true };
    } catch (err) {
      console.error('[db:saveContact]', err);
      throw err;
    }
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  ipcMain.handle('db:getSetting', (_event, key: string) => {
    try {
      const db = ensureDb();
      return db.getSetting(key);
    } catch (err) {
      console.error('[db:getSetting]', err);
      throw err;
    }
  });

  ipcMain.handle('db:setSetting', (_event, key: string, value: string) => {
    try {
      const db = ensureDb();
      db.setSetting(key, value);
      return { success: true };
    } catch (err) {
      console.error('[db:setSetting]', err);
      throw err;
    }
  });
}
