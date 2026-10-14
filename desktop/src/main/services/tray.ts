import { Tray, Menu, nativeImage, BrowserWindow, app, ipcMain } from 'electron';
import path from 'path';

let tray: Tray | null = null;
let unreadCount = 0;

export function setupTray(mainWindow: BrowserWindow): void {
  // Try to load icon, fall back to empty if not found
  let icon: Electron.NativeImage;
  const iconPath = path.join(__dirname, '../../../assets/icons/tray-icon.png');

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // Create a minimal placeholder icon (16x16 saffron square via buffer)
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Tamizhi');

  updateTrayMenu(mainWindow);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  // Allow renderer to update badge count
  ipcMain.handle('tray:setBadge', (_event: unknown, count: number) => {
    setUnreadCount(count, mainWindow);
  });
}

function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Tamizhi',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: unreadCount > 0 ? `Show (${unreadCount} unread)` : 'Show',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'New Message',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:new-message');
      },
    },
    { type: 'separator' },
    {
      label: 'Wallet',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:navigate', '/wallet');
      },
    },
    {
      label: 'Explorer',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:navigate', '/explorer');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Tamizhi',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function setUnreadCount(count: number, mainWindow: BrowserWindow): void {
  unreadCount = count;
  updateTrayMenu(mainWindow);

  // macOS dock badge
  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '');
  }

  if (tray) {
    tray.setToolTip(
      count > 0 ? `Tamizhi — ${count} unread message${count > 1 ? 's' : ''}` : 'Tamizhi'
    );
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
