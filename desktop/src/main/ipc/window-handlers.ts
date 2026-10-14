import { ipcMain, shell, clipboard, Notification, app, BrowserWindow } from 'electron';

export function registerWindowHandlers(mainWindow: BrowserWindow): void {
  // ── Window controls ───────────────────────────────────────────────────────

  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  });

  ipcMain.handle('window:close', () => {
    // On macOS, hide to tray instead of close
    if (process.platform === 'darwin') {
      mainWindow.hide();
    } else {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow.isMaximized();
  });

  ipcMain.handle('window:toggleFullscreen', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  });

  // Notify renderer when maximize state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized', false);
  });

  // ── App info ──────────────────────────────────────────────────────────────

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getPlatform', () => {
    return process.platform;
  });

  // ── Shell ─────────────────────────────────────────────────────────────────

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    try {
      // Basic URL validation
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only http/https URLs are allowed');
      }
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      console.error('[shell:openExternal]', err);
      throw new Error(
        err instanceof Error ? err.message : 'Failed to open URL'
      );
    }
  });

  // ── Clipboard ─────────────────────────────────────────────────────────────

  ipcMain.handle('clipboard:write', (_event, text: string) => {
    try {
      clipboard.writeText(String(text));
      return { success: true };
    } catch (err) {
      console.error('[clipboard:write]', err);
      throw err;
    }
  });

  ipcMain.handle('clipboard:read', () => {
    return clipboard.readText();
  });

  // ── Notifications ─────────────────────────────────────────────────────────

  ipcMain.handle('notification:show', (_event, title: string, body: string) => {
    try {
      if (!Notification.isSupported()) {
        return { success: false, reason: 'Notifications not supported' };
      }
      const notification = new Notification({
        title: String(title),
        body: String(body),
        icon: undefined, // will use app icon
        silent: false,
      });
      notification.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
      });
      notification.show();
      return { success: true };
    } catch (err) {
      console.error('[notification:show]', err);
      throw err;
    }
  });
}
