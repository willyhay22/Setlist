import { contextBridge, ipcRenderer } from 'electron';
import {
  AppData,
  Song,
  Setlist,
  SetlistEntry,
  AppPreferences,
  ImportResult,
  SongInput,
  SetlistInput,
} from '../shared/types';

export interface ElectronAPI {
  getState: () => Promise<AppData>;
  createSong: (input: SongInput) => Promise<{ song: Song; warning?: string }>;
  updateSongMetadata: (songId: string, input: Omit<SongInput, 'notes'>) => Promise<Song>;
  updateSongNotes: (songId: string, notes: string, clientUpdatedAt: number) => Promise<{ success: boolean; updatedAt: number }>;
  duplicateSong: (songId: string) => Promise<Song>;
  deleteSong: (songId: string) => Promise<void>;
  restoreSong: (songId: string) => Promise<Song>;
  createSetlist: (input: SetlistInput) => Promise<Setlist>;
  updateSetlist: (setlistId: string, input: SetlistInput) => Promise<Setlist>;
  setSetlistArchived: (setlistId: string, archived: boolean) => Promise<Setlist>;
  addSongToSetlist: (setlistId: string, songId: string) => Promise<SetlistEntry>;
  addMultipleSongsToSetlist: (setlistId: string, songIds: string[]) => Promise<SetlistEntry[]>;
  reorderSetlistEntries: (setlistId: string, orderedEntryIds: string[]) => Promise<void>;
  removeSetlistEntry: (entryId: string) => Promise<{ removedEntry: SetlistEntry; formerPosition: number }>;
  restoreSetlistEntry: (entry: SetlistEntry, targetPosition: number) => Promise<void>;
  updatePreferences: (prefs: Partial<AppPreferences>) => Promise<AppPreferences>;
  touchRecentSong: (songId: string) => Promise<void>;
  touchRecentSetlist: (setlistId: string) => Promise<void>;
  exportBackup: () => Promise<{ cancelled: boolean; filePath?: string; error?: string }>;
  importBackup: (options: { importPreferences?: boolean }) => Promise<{ cancelled: boolean; result?: ImportResult; error?: string }>;
  getSystemTheme: () => Promise<'dark' | 'light'>;
  onSystemThemeChanged: (callback: (theme: 'dark' | 'light') => void) => () => void;
  onRequestClose: (callback: () => void) => () => void;
  respondCanClose: (canClose: boolean) => void;
  flushPendingSaves: () => Promise<void>;
}

const api: ElectronAPI = {
  getState: () => ipcRenderer.invoke('store:getState'),
  createSong: (input) => ipcRenderer.invoke('store:createSong', input),
  updateSongMetadata: (songId, input) => ipcRenderer.invoke('store:updateSongMetadata', songId, input),
  updateSongNotes: (songId, notes, clientUpdatedAt) => ipcRenderer.invoke('store:updateSongNotes', songId, notes, clientUpdatedAt),
  duplicateSong: (songId) => ipcRenderer.invoke('store:duplicateSong', songId),
  deleteSong: (songId) => ipcRenderer.invoke('store:deleteSong', songId),
  restoreSong: (songId) => ipcRenderer.invoke('store:restoreSong', songId),
  createSetlist: (input) => ipcRenderer.invoke('store:createSetlist', input),
  updateSetlist: (setlistId, input) => ipcRenderer.invoke('store:updateSetlist', setlistId, input),
  setSetlistArchived: (setlistId, archived) => ipcRenderer.invoke('store:setSetlistArchived', setlistId, archived),
  addSongToSetlist: (setlistId, songId) => ipcRenderer.invoke('store:addSongToSetlist', setlistId, songId),
  addMultipleSongsToSetlist: (setlistId, songIds) => ipcRenderer.invoke('store:addMultipleSongsToSetlist', setlistId, songIds),
  reorderSetlistEntries: (setlistId, orderedEntryIds) => ipcRenderer.invoke('store:reorderSetlistEntries', setlistId, orderedEntryIds),
  removeSetlistEntry: (entryId) => ipcRenderer.invoke('store:removeSetlistEntry', entryId),
  restoreSetlistEntry: (entry, targetPosition) => ipcRenderer.invoke('store:restoreSetlistEntry', entry, targetPosition),
  updatePreferences: (prefs) => ipcRenderer.invoke('store:updatePreferences', prefs),
  touchRecentSong: (songId) => ipcRenderer.invoke('store:touchRecentSong', songId),
  touchRecentSetlist: (setlistId) => ipcRenderer.invoke('store:touchRecentSetlist', setlistId),
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
};

contextBridge.exposeInMainWorld('api', api);
