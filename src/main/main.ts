import { app, BrowserWindow, ipcMain, dialog, nativeTheme, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { DurableStore } from './store';
import { WindowStateManager } from './windowState';
import { ImportOptions } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let store: DurableStore;
let windowManager: WindowStateManager;
let isQuitting = false;
let forceQuit = false;

app.setName('Studio Songs');

// Prevent multiple instances
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

async function createWindow() {
  let userDataDir = app.getPath('userData');
  const legacyDir = path.join(app.getPath('appData'), 'studio-songs');
  if (!fs.existsSync(userDataDir) && fs.existsSync(legacyDir)) {
    userDataDir = legacyDir;
  }
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
    title: 'Studio Songs',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#f5f5f7',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Track window bounds and clamp on display changes
  windowManager.registerDisplayListeners(mainWindow);

  mainWindow.on('resize', () => {
    if (mainWindow) windowManager.saveState(mainWindow);
  });

  mainWindow.on('move', () => {
    if (mainWindow) windowManager.saveState(mainWindow);
  });

  // Disable remote navigation
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.includes('localhost')) {
      e.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Handle window close confirmation & save flush
  mainWindow.on('close', async (e) => {
    if (forceQuit) return;

    e.preventDefault();
    // Ask renderer if there are unsaved forms or pending note edits
    mainWindow?.webContents.send('app:request-close');
  });

  // Load app: offline file
  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Closing the main window quits the app completely
    app.quit();
  });
}

// Native theme tracking
nativeTheme.on('updated', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow.webContents.send('theme:changed', theme);
  }
});

// Periodic purge of expired songs (every 60 mins)
const PURGE_INTERVAL = 60 * 60 * 1000;
setInterval(() => {
  if (store) {
    store.purgeExpiredSongs().catch((err) => {
      console.error('Periodic purge error:', err);
    });
  }
}, PURGE_INTERVAL);

// Register IPC handlers
ipcMain.handle('store:getState', async () => {
  return store.getState();
});

ipcMain.handle('store:createSong', async (_, input) => {
  return store.createSong(input);
});

ipcMain.handle('store:updateSongMetadata', async (_, songId, input) => {
  return store.updateSongMetadata(songId, input);
});

ipcMain.handle('store:updateSongNotes', async (_, songId, notes, clientUpdatedAt) => {
  return store.updateSongNotes(songId, notes, clientUpdatedAt);
});

ipcMain.handle('store:duplicateSong', async (_, songId) => {
  return store.duplicateSong(songId);
});

ipcMain.handle('store:deleteSong', async (_, songId) => {
  return store.deleteSong(songId);
});

ipcMain.handle('store:restoreSong', async (_, songId) => {
  return store.restoreSong(songId);
});

ipcMain.handle('store:createSetlist', async (_, input) => {
  return store.createSetlist(input);
});

ipcMain.handle('store:updateSetlist', async (_, setlistId, input) => {
  return store.updateSetlist(setlistId, input);
});

ipcMain.handle('store:setSetlistArchived', async (_, setlistId, archived) => {
  return store.setSetlistArchived(setlistId, archived);
});

ipcMain.handle('store:addSongToSetlist', async (_, setlistId, songId) => {
  return store.addSongToSetlist(setlistId, songId);
});

ipcMain.handle('store:addMultipleSongsToSetlist', async (_, setlistId, songIds) => {
  return store.addMultipleSongsToSetlist(setlistId, songIds);
});

ipcMain.handle('store:reorderSetlistEntries', async (_, setlistId, orderedEntryIds) => {
  return store.reorderSetlistEntries(setlistId, orderedEntryIds);
});

ipcMain.handle('store:removeSetlistEntry', async (_, entryId) => {
  return store.removeSetlistEntry(entryId);
});

ipcMain.handle('store:restoreSetlistEntry', async (_, entry, targetPosition) => {
  return store.restoreSetlistEntry(entry, targetPosition);
});

ipcMain.handle('store:updatePreferences', async (_, prefs) => {
  return store.updatePreferences(prefs);
});

ipcMain.handle('store:touchRecentSong', async (_, songId) => {
  store.touchRecentSong(songId);
});

ipcMain.handle('store:touchRecentSetlist', async (_, setlistId) => {
  store.touchRecentSetlist(setlistId);
});

ipcMain.handle('store:flush', async () => {
  await store.flush();
});

ipcMain.handle('theme:getSystem', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

// App close response from renderer
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
        `Failed to save changes before closing: ${err.message}. Your changes are retained. Please retry closing or save your changes.`
      );
    }
  }
});

// Backup Export Dialog
ipcMain.handle('dialog:exportBackup', async () => {
  if (!mainWindow) return { cancelled: true };

  const defaultFileName = `studio-songs-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Studio Songs Backup',
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
    title: 'Import Studio Songs Backup',
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

// Setup native application menu
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  createApplicationMenu();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Closing the main window quits the app completely
  app.quit();
});
