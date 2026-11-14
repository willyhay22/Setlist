import { app, BrowserWindow, ipcMain, dialog, nativeTheme, Menu, MenuItemConstructorOptions, clipboard, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { DurableStore } from './store';
import { WindowStateManager } from './windowState';
import { ImportOptions } from '../shared/types';
import { checkForUpdates } from './updater';

// App branding: Setlist
app.setName('Setlist');

// Explicitly preserve the established user-data location under ~/Library/Application Support/Studio Songs
const legacyUserData = path.join(app.getPath('appData'), 'Studio Songs');
const altLegacyUserData = path.join(app.getPath('appData'), 'studio-songs');

let targetUserDataDir = legacyUserData;
if (!fs.existsSync(legacyUserData) && fs.existsSync(altLegacyUserData)) {
  targetUserDataDir = altLegacyUserData;
}
app.setPath('userData', targetUserDataDir);

let mainWindow: BrowserWindow | null = null;
let store: DurableStore;
let windowManager: WindowStateManager;
let forceQuit = false;

// Prevent multiple instances: repeated launch focuses the existing instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function sendRendererAction(action: string, payload?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('menu:action', action, payload);
  }
}

async function createWindow() {
  const userDataDir = app.getPath('userData');
  store = new DurableStore(userDataDir);
  await store.initialize();

  windowManager = new WindowStateManager(userDataDir);
  const bounds = windowManager.getClampedBounds();

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 780,
    minHeight: 500,
    title: 'Setlist',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#18181b' : '#f6f6f8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  windowManager.registerDisplayListeners(mainWindow);

  mainWindow.on('resize', () => {
    if (mainWindow) windowManager.saveState(mainWindow);
  });

  mainWindow.on('move', () => {
    if (mainWindow) windowManager.saveState(mainWindow);
  });

  // Security: deny external navigation and window creation
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.includes('localhost')) {
      e.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Safe window close
  mainWindow.on('close', async (e) => {
    if (forceQuit) return;
    e.preventDefault();
    mainWindow?.webContents.send('app:request-close');
  });

  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();

    // Silent background check for updates after 3s (fails quietly if offline)
    setTimeout(async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const res = await checkForUpdates(app.getVersion());
          if (res.updateAvailable) {
            mainWindow.webContents.send('app:update-available', res);
          }
        } catch {
          // Silent catch for background check
        }
      }
    }, 3000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
}

// Track OS theme updates
nativeTheme.on('updated', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow.webContents.send('theme:changed', theme);
  }
});

// Periodic purge (every 60 mins)
const PURGE_INTERVAL = 60 * 60 * 1000;
setInterval(() => {
  if (store) {
    store.purgeExpiredSongs().catch((err) => {
      console.error('Periodic purge error:', err);
    });
  }
}, PURGE_INTERVAL);

// --- IPC Handlers ---
ipcMain.handle('store:getState', async () => store.getState());
ipcMain.handle('store:createSong', async (_, input) => store.createSong(input));
ipcMain.handle('store:updateSongMetadata', async (_, songId, input) => store.updateSongMetadata(songId, input));
ipcMain.handle('store:updateSongNotes', async (_, songId, notes, clientUpdatedAt) => store.updateSongNotes(songId, notes, clientUpdatedAt));
ipcMain.handle('store:duplicateSong', async (_, songId) => store.duplicateSong(songId));
ipcMain.handle('store:deleteSong', async (_, songId) => store.deleteSong(songId));
ipcMain.handle('store:restoreSong', async (_, songId) => store.restoreSong(songId));
ipcMain.handle('store:markSongFieldChecked', async (_, songId, field) => store.markSongFieldChecked(songId, field));
ipcMain.handle('app:copyToClipboard', async (_, text: string) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Current Setlist IPC
ipcMain.handle('store:addSongToCurrentSetlist', async (_, songId) => store.addSongToCurrentSetlist(songId));
ipcMain.handle('store:addMultipleSongsToCurrentSetlist', async (_, songIds) => store.addMultipleSongsToCurrentSetlist(songIds));
ipcMain.handle('store:reorderCurrentSetlist', async (_, orderedEntryIds) => store.reorderCurrentSetlist(orderedEntryIds));
ipcMain.handle('store:removeCurrentSetlistEntry', async (_, entryId) => store.removeCurrentSetlistEntry(entryId));
ipcMain.handle('store:restoreCurrentSetlistEntry', async (_, entry, targetPosition) => store.restoreCurrentSetlistEntry(entry, targetPosition));
ipcMain.handle('store:clearCurrentSetlist', async () => store.clearCurrentSetlist());
ipcMain.handle('store:restoreClearedSetlist', async (_, entries) => store.restoreClearedSetlist(entries));
ipcMain.handle('store:chooseMigrationSetlist', async (_, legacySetlistId) => store.chooseMigrationSetlist(legacySetlistId));

ipcMain.handle('store:updatePreferences', async (_, prefs) => store.updatePreferences(prefs));
ipcMain.handle('store:touchRecentSong', async (_, songId) => store.touchRecentSong(songId));
ipcMain.handle('store:flush', async () => store.flush());

ipcMain.handle('theme:getSystem', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));

// Updates & External Links
ipcMain.handle('app:checkForUpdates', async () => {
  return checkForUpdates(app.getVersion());
});

ipcMain.handle('app:openExternal', async (_, url: string) => {
  if (typeof url === 'string' && (url.startsWith('https://github.com/') || url.startsWith('http://localhost'))) {
    await shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'Untrusted URL' };
});

// Window close confirmation response
ipcMain.on('app:respond-close', async (_, canClose: boolean) => {
  if (canClose) {
    try {
      await store.flush();
      forceQuit = true;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
      app.quit();
    } catch (err: any) {
      dialog.showErrorBox(
        'Save Error',
        `Failed to save changes before closing: ${err.message}. Your changes are retained.`
      );
    }
  }
});

// Backup Export Dialog
ipcMain.handle('dialog:exportBackup', async () => {
  if (!mainWindow) return { cancelled: true };

  const defaultFileName = `setlist-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Setlist Backup',
    defaultPath: defaultFileName,
    filters: [{ name: 'JSON Backup (*.json)', extensions: ['json'] }],
  });

  if (canceled || !filePath) {
    return { cancelled: true };
  }

  try {
    const data = store.exportBackup();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { cancelled: false, filePath };
  } catch (err: any) {
    return { cancelled: false, error: err.message };
  }
});

// Backup Import Dialog
ipcMain.handle('dialog:importBackup', async (_, options: ImportOptions) => {
  if (!mainWindow) return { cancelled: true };

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Setlist Backup',
    properties: ['openFile'],
    filters: [{ name: 'JSON Backup (*.json)', extensions: ['json'] }],
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { cancelled: true };
  }

  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const parsed = JSON.parse(raw);
    const result = await store.importBackup(parsed, options);
    return { cancelled: false, result };
  } catch (err: any) {
    return { cancelled: false, error: err.message };
  }
});

// Manual Update Check via Native Dialog
async function handleManualUpdateCheck() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const res = await checkForUpdates(app.getVersion());
  if (res.updateAvailable && res.releaseUrl) {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version of Setlist is available: v${res.latestVersion}`,
      detail: `You are running version ${app.getVersion()}.\n\nWould you like to open GitHub to download the new version?`,
      buttons: ['Download Update', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      shell.openExternal(res.releaseUrl);
    }
  } else if (res.error) {
    await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Update Check',
      message: 'Could not connect to GitHub.',
      detail: `${res.error}\n\nMake sure your Mac is connected to the internet.`,
      buttons: ['OK'],
    });
  } else {
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Setlist is Up to Date',
      message: `You're on the latest version of Setlist (v${app.getVersion()}).`,
      detail: 'No newer updates are available.',
      buttons: ['OK'],
    });
  }
}

// Complete Native Application Menu Bar
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Setlist',
            submenu: [
              {
                label: 'About Setlist',
                role: 'about' as const,
              },
              {
                label: 'Check for Updates…',
                click: () => handleManualUpdateCheck(),
              },
              { type: 'separator' as const },
              {
                label: 'Settings…',
                accelerator: 'CmdOrCtrl+,',
                click: () => sendRendererAction('open-settings'),
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const, label: 'Hide Setlist' },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const, label: 'Show All' },
              { type: 'separator' as const },
              {
                label: 'Quit Setlist',
                accelerator: 'CmdOrCtrl+Q',
                click: () => {
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.close();
                  } else {
                    app.quit();
                  }
                },
              },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Song',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendRendererAction('new-song'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendRendererAction('save'),
        },
        { type: 'separator' as const },
        {
          label: 'Import Backup…',
          click: () => sendRendererAction('trigger-import'),
        },
        {
          label: 'Export Backup…',
          click: () => sendRendererAction('trigger-export'),
        },
        { type: 'separator' as const },
        {
          label: 'Close Window',
          accelerator: 'CmdOrCtrl+W',
          click: () => sendRendererAction('close-window-or-modal'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'pasteAndMatchStyle' as const },
        { role: 'selectAll' as const },
        { type: 'separator' as const },
        {
          label: 'Find Song',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendRendererAction('find-song'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+1',
          click: () => sendRendererAction('nav-home'),
        },
        {
          label: 'Library',
          accelerator: 'CmdOrCtrl+2',
          click: () => sendRendererAction('nav-library'),
        },
        {
          label: 'Setlist',
          accelerator: 'CmdOrCtrl+3',
          click: () => sendRendererAction('nav-setlist'),
        },
        { type: 'separator' as const },
        {
          label: 'Text Size',
          submenu: [
            {
              label: 'Small',
              click: () => sendRendererAction('set-text-size', 'small'),
            },
            {
              label: 'Standard',
              click: () => sendRendererAction('set-text-size', 'standard'),
            },
            {
              label: 'Large',
              click: () => sendRendererAction('set-text-size', 'large'),
            },
            {
              label: 'Extra Large',
              click: () => sendRendererAction('set-text-size', 'x-large'),
            },
          ],
        },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Song',
      submenu: [
        {
          label: 'Add Selected Song to Setlist',
          click: () => sendRendererAction('add-selected-to-setlist'),
        },
        { type: 'separator' as const },
        {
          label: 'Previous Song',
          accelerator: 'CmdOrCtrl+Alt+Left',
          click: () => sendRendererAction('prev-song'),
        },
        {
          label: 'Next Song',
          accelerator: 'CmdOrCtrl+Alt+Right',
          click: () => sendRendererAction('next-song'),
        },
        { type: 'separator' as const },
        {
          label: 'Clear Setlist…',
          click: () => sendRendererAction('clear-setlist'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Setlist Help',
          click: () => sendRendererAction('open-help'),
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => sendRendererAction('open-shortcuts'),
        },
        { type: 'separator' as const },
        {
          label: 'Check for Updates…',
          click: () => handleManualUpdateCheck(),
        },
        { type: 'separator' as const },
        {
          label: 'Replay Guided Tour',
          click: () => sendRendererAction('replay-tour'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  // Set native macOS About Panel configuration
  app.setAboutPanelOptions({
    applicationName: 'Setlist',
    applicationVersion: '1.3.0',
    version: '1.3.0',
    copyright: '© 2026 William Hay',
  });

  createApplicationMenu();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
