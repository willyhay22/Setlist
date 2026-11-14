import { contextBridge, ipcRenderer } from 'electron';
import {
  AppData,
  Song,
  CurrentSetlistEntry,
  AppPreferences,
  ImportResult,
  SongInput,
  TextSize,
} from '../shared/types';

export interface ElectronAPI {
  getState: () => Promise<AppData>;
  createSong: (input: SongInput) => Promise<{ song: Song; warning?: string }>;
  updateSongMetadata: (songId: string, input: Omit<SongInput, 'notes'>) => Promise<Song>;
  updateSongNotes: (songId: string, notes: string, clientUpdatedAt: number) => Promise<{ success: boolean; updatedAt: number }>;
  duplicateSong: (songId: string) => Promise<Song>;
  deleteSong: (songId: string) => Promise<void>;
  restoreSong: (songId: string) => Promise<Song>;
  markSongFieldChecked: (songId: string, field: 'bpm' | 'timeSignature' | 'both') => Promise<Song>;
  copyToClipboard: (text: string) => Promise<{ success: boolean; error?: string }>;

  // Current Setlist
  addSongToCurrentSetlist: (songId: string) => Promise<CurrentSetlistEntry>;
  addMultipleSongsToCurrentSetlist: (songIds: string[]) => Promise<CurrentSetlistEntry[]>;
  reorderCurrentSetlist: (orderedEntryIds: string[]) => Promise<void>;
  removeCurrentSetlistEntry: (entryId: string) => Promise<{ removedEntry: CurrentSetlistEntry; formerPosition: number }>;
  restoreCurrentSetlistEntry: (entry: CurrentSetlistEntry, targetPosition: number) => Promise<void>;
  clearCurrentSetlist: () => Promise<{ formerEntries: CurrentSetlistEntry[] }>;
  restoreClearedSetlist: (entries: CurrentSetlistEntry[]) => Promise<void>;
  chooseMigrationSetlist: (legacySetlistId: string) => Promise<void>;

  updatePreferences: (prefs: Partial<AppPreferences>) => Promise<AppPreferences>;
  touchRecentSong: (songId: string) => Promise<void>;
  exportBackup: () => Promise<{ cancelled: boolean; filePath?: string; error?: string }>;
  importBackup: (options: { importPreferences?: boolean }) => Promise<{ cancelled: boolean; result?: ImportResult; error?: string }>;
  getSystemTheme: () => Promise<'dark' | 'light'>;
  onSystemThemeChanged: (callback: (theme: 'dark' | 'light') => void) => () => void;
  onRequestClose: (callback: () => void) => () => void;
  respondCanClose: (canClose: boolean) => void;
  flushPendingSaves: () => Promise<void>;

  // Native application menu command triggers
  onMenuAction: (callback: (action: string, payload?: any) => void) => () => void;
}

const api: ElectronAPI = {
  getState: () => ipcRenderer.invoke('store:getState'),
  createSong: (input) => ipcRenderer.invoke('store:createSong', input),
  updateSongMetadata: (songId, input) => ipcRenderer.invoke('store:updateSongMetadata', songId, input),
  updateSongNotes: (songId, notes, clientUpdatedAt) => ipcRenderer.invoke('store:updateSongNotes', songId, notes, clientUpdatedAt),
  duplicateSong: (songId) => ipcRenderer.invoke('store:duplicateSong', songId),
  deleteSong: (songId) => ipcRenderer.invoke('store:deleteSong', songId),
  restoreSong: (songId) => ipcRenderer.invoke('store:restoreSong', songId),
  markSongFieldChecked: (songId, field) => ipcRenderer.invoke('store:markSongFieldChecked', songId, field),
  copyToClipboard: (text) => ipcRenderer.invoke('app:copyToClipboard', text),

  addSongToCurrentSetlist: (songId) => ipcRenderer.invoke('store:addSongToCurrentSetlist', songId),
  addMultipleSongsToCurrentSetlist: (songIds) => ipcRenderer.invoke('store:addMultipleSongsToCurrentSetlist', songIds),
  reorderCurrentSetlist: (orderedEntryIds) => ipcRenderer.invoke('store:reorderCurrentSetlist', orderedEntryIds),
  removeCurrentSetlistEntry: (entryId) => ipcRenderer.invoke('store:removeCurrentSetlistEntry', entryId),
  restoreCurrentSetlistEntry: (entry, targetPosition) => ipcRenderer.invoke('store:restoreCurrentSetlistEntry', entry, targetPosition),
  clearCurrentSetlist: () => ipcRenderer.invoke('store:clearCurrentSetlist'),
  restoreClearedSetlist: (entries) => ipcRenderer.invoke('store:restoreClearedSetlist', entries),
  chooseMigrationSetlist: (legacySetlistId) => ipcRenderer.invoke('store:chooseMigrationSetlist', legacySetlistId),

  updatePreferences: (prefs) => ipcRenderer.invoke('store:updatePreferences', prefs),
  touchRecentSong: (songId) => ipcRenderer.invoke('store:touchRecentSong', songId),
  exportBackup: () => ipcRenderer.invoke('dialog:exportBackup'),
  importBackup: (options) => ipcRenderer.invoke('dialog:importBackup', options),
  getSystemTheme: () => ipcRenderer.invoke('theme:getSystem'),
  onSystemThemeChanged: (callback) => {
    const handler = (_: any, theme: 'dark' | 'light') => callback(theme);
    ipcRenderer.on('theme:changed', handler);
    return () => ipcRenderer.removeListener('theme:changed', handler);
  },
  onRequestClose: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:request-close', handler);
    return () => ipcRenderer.removeListener('app:request-close', handler);
  },
  respondCanClose: (canClose) => ipcRenderer.send('app:respond-close', canClose),
  flushPendingSaves: () => ipcRenderer.invoke('store:flush'),

  onMenuAction: (callback) => {
    const handler = (_: any, action: string, payload?: any) => callback(action, payload);
    ipcRenderer.on('menu:action', handler);
    return () => ipcRenderer.removeListener('menu:action', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
