/**
 * Ulaa Browser — Main Process
 * உலா உலாவி — முக்கிய செயல்முறை
 */

import {
  app, BrowserWindow, BrowserView, ipcMain,
  session, shell, nativeTheme,
} from 'electron';
import path from 'path';
import { join } from 'path';
import { adBlocker } from './adblock';

// ── Constants ─────────────────────────────────────────────────────────────────
const CHROME_HEIGHT = 90;  // TabBar (40px) + Toolbar (50px)
const HOME_URL      = 'ulaa://newtab';
const NEWTAB_SIGNAL = '__ULAA_NEWTAB__';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TabState {
  id: string;
  view: BrowserView;
  url: string;
  title: string;
  favicon: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  blockedCount: number;
  isNewTab: boolean;
}

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow;
const tabs = new Map<string, TabState>();
let activeTabId: string | null = null;
let tabOrder: string[] = [];

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    backgroundColor: '#0C0C1A',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
    },
  });

  // Load renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('resize',           updateActiveViewBounds);
  mainWindow.on('maximize',         updateActiveViewBounds);
  mainWindow.on('unmaximize',       updateActiveViewBounds);
  mainWindow.on('enter-full-screen', updateActiveViewBounds);
  mainWindow.on('leave-full-screen', updateActiveViewBounds);

  mainWindow.webContents.once('did-finish-load', () => {
    createTab(HOME_URL);
  });
}

// ── View bounds ────────────────────────────────────────────────────────────────
function getViewBounds() {
  const [w, h] = mainWindow.getContentSize();
  return { x: 0, y: CHROME_HEIGHT, width: w, height: Math.max(h - CHROME_HEIGHT, 0) };
}

function updateActiveViewBounds() {
  if (!activeTabId) return;
  const tab = tabs.get(activeTabId);
  if (tab && !tab.isNewTab) {
    tab.view.setBounds(getViewBounds());
  }
}

// ── Tab management ─────────────────────────────────────────────────────────────
function createTab(url = HOME_URL): string {
  const id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const isNewTab = url === HOME_URL || url === NEWTAB_SIGNAL;

  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: 'persist:ulaa',
    },
  });

  const tabState: TabState = {
    id, view,
    url: isNewTab ? '' : url,
    title: isNewTab ? 'புதிய தாவல்' : 'ஏற்றுகிறது…',
    favicon: '',
    loading: !isNewTab,
    canGoBack: false,
    canGoForward: false,
    blockedCount: 0,
    isNewTab,
  };

  tabs.set(id, tabState);
  tabOrder.push(id);

  // ── Web content events ─────────────────────────────────────────────────────
  const wc = view.webContents;

  wc.on('did-start-loading', () => {
    tabState.loading = true;
    tabState.isNewTab = false;
    sendTabUpdate(id);
  });

  wc.on('did-stop-loading', () => {
    tabState.loading   = false;
    tabState.url       = wc.getURL();
    tabState.canGoBack = wc.canGoBack();
    tabState.canGoForward = wc.canGoForward();
    sendTabUpdate(id);
  });

  wc.on('did-navigate', (_, navigatedUrl) => {
    tabState.url       = navigatedUrl;
    tabState.isNewTab  = false;
    tabState.canGoBack = wc.canGoBack();
    tabState.canGoForward = wc.canGoForward();
    sendTabUpdate(id);
  });

  wc.on('did-navigate-in-page', (_, navigatedUrl) => {
    tabState.url = navigatedUrl;
    tabState.canGoBack = wc.canGoBack();
    tabState.canGoForward = wc.canGoForward();
    sendTabUpdate(id);
  });

  wc.on('page-title-updated', (_, title) => {
    tabState.title = title || 'தலைப்பு இல்லை';
    sendTabUpdate(id);
  });

  wc.on('page-favicon-updated', (_, favicons) => {
    tabState.favicon = favicons[0] ?? '';
    sendTabUpdate(id);
  });

  wc.on('did-fail-load', (_, errCode, errDesc, validatedUrl) => {
    if (errCode === -3) return; // Cancelled (user navigated away)
    tabState.loading = false;
    tabState.title   = 'பிழை';
    sendTabUpdate(id);
    // Inject error page
    wc.loadURL(`data:text/html,<html style="background:#0C0C1A;color:#E8E8F0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px"><h2 style="color:#FF6B2B">பக்கம் கிடைக்கவில்லை</h2><p style="color:#888;font-size:14px">${errDesc}</p><p style="color:#555;font-size:12px">${validatedUrl}</p></html>`);
  });

  // Open new tabs for target="_blank"
  wc.setWindowOpenHandler(({ url: newUrl }) => {
    createTab(newUrl);
    return { action: 'deny' };
  });

  // Track blocked count per tab
  const wcId = wc.id;
  adBlocker.resetTabBlocked(wcId);

  // ── Load URL ───────────────────────────────────────────────────────────────
  if (!isNewTab) {
    wc.loadURL(resolveUrl(url));
  }

  // Switch to new tab
  switchTab(id);
  mainWindow.webContents.send('tab:created', serializeTab(tabState));
  mainWindow.webContents.send('tab:order', tabOrder);

  return id;
}

function switchTab(id: string) {
  // Remove all views
  for (const [, t] of tabs) mainWindow.removeBrowserView(t.view);

  const tab = tabs.get(id);
  if (!tab) return;

  activeTabId = id;

  if (!tab.isNewTab) {
    mainWindow.addBrowserView(tab.view);
    tab.view.setBounds(getViewBounds());
  }

  mainWindow.webContents.send('tab:activated', id);
  sendTabUpdate(id);
}

function closeTab(id: string) {
  const tab = tabs.get(id);
  if (!tab) return;

  mainWindow.removeBrowserView(tab.view);
  // Destroy webcontents
  try { (tab.view.webContents as any).destroy(); } catch {}
  tabs.delete(id);
  tabOrder = tabOrder.filter((t) => t !== id);

  mainWindow.webContents.send('tab:closed', id);
  mainWindow.webContents.send('tab:order', tabOrder);

  // Focus another tab
  if (activeTabId === id) {
    if (tabOrder.length > 0) {
      switchTab(tabOrder[tabOrder.length - 1]);
    } else {
      activeTabId = null;
      createTab(HOME_URL);
    }
  }
}

function navigateTab(id: string, rawUrl: string) {
  const tab = tabs.get(id);
  if (!tab) return;

  const url = resolveUrl(rawUrl);
  tab.isNewTab = false;
  tab.loading  = true;
  tab.url      = url;
  sendTabUpdate(id);

  if (!tabs.get(id)?.view.webContents.isDestroyed()) {
    tab.view.webContents.loadURL(url);
  }

  // Make sure BrowserView is visible
  if (id === activeTabId) {
    mainWindow.addBrowserView(tab.view);
    tab.view.setBounds(getViewBounds());
  }
}

// ── URL resolver (smart bar) ───────────────────────────────────────────────────
function resolveUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return 'about:blank';
  if (s === HOME_URL || s === NEWTAB_SIGNAL) return 'about:blank';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(file|ftp|data|about|chrome|chrome-extension):/.test(s)) return s;
  // Looks like a domain
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return `https://${s}`;
  // Search
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function serializeTab(t: TabState) {
  return {
    id: t.id,
    url: t.url,
    title: t.title,
    favicon: t.favicon,
    loading: t.loading,
    canGoBack: t.canGoBack,
    canGoForward: t.canGoForward,
    blockedCount: adBlocker.getTabBlocked(t.view.webContents.id),
    isNewTab: t.isNewTab,
  };
}

function sendTabUpdate(id: string) {
  const tab = tabs.get(id);
  if (!tab) return;
  mainWindow.webContents.send('tab:updated', serializeTab(tab));
}

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Setup ad blocker
  adBlocker.setup(session.fromPartition('persist:ulaa'), (tabWcId) => {
    // Find which tab this belongs to and notify renderer
    for (const [tabId, tab] of tabs) {
      if (tab.view.webContents.id === tabWcId && tabId === activeTabId) {
        const count = adBlocker.getTabBlocked(tabWcId);
        mainWindow.webContents.send('adblock:count', { tabId, count });
        break;
      }
    }
  });

  createWindow();

  // ── IPC ────────────────────────────────────────────────────────────────────
  ipcMain.handle('tab:create',    (_, url?)   => createTab(url));
  ipcMain.handle('tab:close',     (_, id)     => closeTab(id));
  ipcMain.handle('tab:switch',    (_, id)     => switchTab(id));
  ipcMain.handle('tab:navigate',  (_, id, url) => navigateTab(id, url));

  ipcMain.handle('tab:back', () => {
    const tab = activeTabId ? tabs.get(activeTabId) : null;
    if (tab?.view.webContents.canGoBack()) tab.view.webContents.goBack();
  });
  ipcMain.handle('tab:forward', () => {
    const tab = activeTabId ? tabs.get(activeTabId) : null;
    if (tab?.view.webContents.canGoForward()) tab.view.webContents.goForward();
  });
  ipcMain.handle('tab:reload', () => {
    const tab = activeTabId ? tabs.get(activeTabId) : null;
    tab?.view.webContents.reload();
  });
  ipcMain.handle('tab:stop', () => {
    const tab = activeTabId ? tabs.get(activeTabId) : null;
    tab?.view.webContents.stop();
  });
  ipcMain.handle('tab:get-all', () =>
    tabOrder.map((id) => tabs.get(id)).filter(Boolean).map(serializeTab as any),
  );
  ipcMain.handle('tab:get-active', () => activeTabId);

  ipcMain.handle('page:get-text', async () => {
    if (!activeTabId) return '';
    const tab = tabs.get(activeTabId);
    if (!tab || tab.isNewTab) return '';
    try {
      const text = await tab.view.webContents.executeJavaScript(
        `document.body ? document.body.innerText.slice(0, 8000) : ''`,
      );
      return text as string;
    } catch { return ''; }
  });

  ipcMain.handle('page:get-url', () => {
    if (!activeTabId) return '';
    return tabs.get(activeTabId)?.url ?? '';
  });

  ipcMain.handle('adblock:total', () => adBlocker.getTotalBlocked());

  // Window controls
  ipcMain.on('window:minimize',  () => mainWindow.minimize());
  ipcMain.on('window:maximize',  () =>
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(),
  );
  ipcMain.on('window:close',     () => mainWindow.close());

  // External links
  ipcMain.on('shell:open', (_, url: string) => shell.openExternal(url));

  // Download events
  session.fromPartition('persist:ulaa').on('will-download', (_, item) => {
    const filename    = item.getFilename();
    const totalBytes  = item.getTotalBytes();
    const url         = item.getURL();
    const savePath    = path.join(app.getPath('downloads'), filename);
    item.setSavePath(savePath);

    mainWindow.webContents.send('download:started', { filename, url, totalBytes, savePath });

    item.on('updated', (__, state) => {
      if (state === 'progressing') {
        mainWindow.webContents.send('download:progress', {
          filename,
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
        });
      }
    });

    item.once('done', (__, state) => {
      mainWindow.webContents.send('download:done', { filename, state, savePath });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
