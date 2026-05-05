import { app, BrowserWindow, ipcMain, shell, clipboard, Notification } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { setupTray } from './services/tray';
import { registerDbHandlers } from './ipc/db-handlers';
import { registerCryptoHandlers } from './ipc/crypto-handlers';
import { registerWindowHandlers } from './ipc/window-handlers';

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0D0D1A',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: true,
      webSecurity: !isDev,
    },
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
  });

  // Load renderer
  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show when ready to avoid flash
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

function setupAutoUpdater(win: BrowserWindow): void {
  if (isDev) return;

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    win.webContents.send('updater:update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('updater:update-downloaded');
  });

  autoUpdater.on('error', (err) => {
    win.webContents.send('updater:error', err.message);
  });

  // Allow renderer to trigger install
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall();
  });
}

app.whenReady().then(() => {
  mainWindow = createWindow();

  // Register all IPC handlers
  registerWindowHandlers(mainWindow);
  registerDbHandlers();
  registerCryptoHandlers();

  // Setup system tray
  setupTray(mainWindow);

  // Setup auto-updater
  setupAutoUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (isDev && parsedUrl.hostname === 'localhost') return;
    if (!isDev && url.startsWith('file://')) return;
    event.preventDefault();
    shell.openExternal(url);
  });
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

export { mainWindow };
