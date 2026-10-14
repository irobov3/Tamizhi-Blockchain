/**
 * Ulaa Browser — Preload / Context Bridge
 * Safe IPC API exposed to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

export type TabInfo = {
  id: string;
  url: string;
  title: string;
  favicon: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  blockedCount: number;
  isNewTab: boolean;
};

const ulaaAPI = {
  // ── Tab management ─────────────────────────────────────────────────────────
  createTab:    (url?: string)              => ipcRenderer.invoke('tab:create', url),
  closeTab:     (id: string)               => ipcRenderer.invoke('tab:close', id),
  switchTab:    (id: string)               => ipcRenderer.invoke('tab:switch', id),
  navigate:     (id: string, url: string)  => ipcRenderer.invoke('tab:navigate', id, url),
  goBack:       ()                          => ipcRenderer.invoke('tab:back'),
  goForward:    ()                          => ipcRenderer.invoke('tab:forward'),
  reload:       ()                          => ipcRenderer.invoke('tab:reload'),
  stop:         ()                          => ipcRenderer.invoke('tab:stop'),
  getAllTabs:    ()                          => ipcRenderer.invoke('tab:get-all') as Promise<TabInfo[]>,
  getActiveTab: ()                          => ipcRenderer.invoke('tab:get-active') as Promise<string | null>,

  // ── Page content (for AI) ──────────────────────────────────────────────────
  getPageText:  ()                          => ipcRenderer.invoke('page:get-text') as Promise<string>,
  getPageUrl:   ()                          => ipcRenderer.invoke('page:get-url') as Promise<string>,

  // ── Ad blocker ─────────────────────────────────────────────────────────────
  getTotalBlocked: ()                       => ipcRenderer.invoke('adblock:total') as Promise<number>,

  // ── Window controls ────────────────────────────────────────────────────────
  minimize:  () => ipcRenderer.send('window:minimize'),
  maximize:  () => ipcRenderer.send('window:maximize'),
  closeWin:  () => ipcRenderer.send('window:close'),

  // ── Shell ──────────────────────────────────────────────────────────────────
  openExternal: (url: string) => ipcRenderer.send('shell:open', url),

  // ── Events ─────────────────────────────────────────────────────────────────
  on: (channel: string, cb: (...args: any[]) => void) => {
    const allowed = [
      'tab:created', 'tab:closed', 'tab:updated',
      'tab:activated', 'tab:order',
      'download:started', 'download:progress', 'download:done',
      'adblock:count',
    ];
    if (!allowed.includes(channel)) return () => {};
    const listener = (_: Electron.IpcRendererEvent, ...args: any[]) => cb(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
};

contextBridge.exposeInMainWorld('ulaa', ulaaAPI);

declare global {
  interface Window {
    ulaa: typeof ulaaAPI;
  }
}
