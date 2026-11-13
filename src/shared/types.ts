export type TextSize = 'small' | 'standard' | 'large' | 'x-large';
export type ThemePreference = 'system' | 'light' | 'dark';

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const CURRENT_SCHEMA_VERSION = 1;

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: string; // Plain text: "72.5", "72–76", "72 verse, 76 chorus"
  musicalKey: string; // e.g. "C", "C#", "Db", "Am", "F#m", etc.
  timeSignature: string; // "4/4", "3/4", "6/8", or custom
  notes: string;
  createdAt: number; // Order index / timestamp
  updatedAt: number;
  deletedAt: number | null; // null if active; ms timestamp when moved to Recently Deleted
}

export interface Setlist {
  id: string;
  name: string;
  date: string; // Stored as "YYYY-MM-DD" calendar date without timezone shift
  notes: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SetlistEntry {
  id: string; // Stable ID unique to each occurrence
  setlistId: string;
  songId: string; // References song.id (single source of truth)
  position: number; // 0-based ordering within setlist
}

export interface AppPreferences {
  textSize: TextSize;
  theme: ThemePreference;
  hasCompletedTour: boolean;
  recentSongIds: string[];
  recentSetlistIds: string[];
  dividerWidth: number;
  windowBounds?: {
    x?: number;
    y?: number;
    width: number;
    height: number;
  };
  purgedSongIds: string[]; // Tombstones to avoid resurrection on backup import
}

export interface AppData {
  schemaVersion: number;
  songs: Song[];
  setlists: Setlist[];
  setlistEntries: SetlistEntry[];
  preferences: AppPreferences;
}

export interface ExportBackupData {
  schemaVersion: number;
  exportTimestamp: number;
  appVersion: string;
  songs: Song[];
  setlists: Setlist[];
  setlistEntries: SetlistEntry[];
  preferences?: {
    textSize: TextSize;
    theme: ThemePreference;
  };
}

export interface ImportOptions {
  importPreferences?: boolean;
}

export interface ImportResult {
  success: boolean;
  addedSongsCount: number;
  skippedSongsCount: number;
  addedSetlistsCount: number;
  skippedSetlistsCount: number;
  addedEntriesCount: number;
  skippedEntriesCount: number;
  purgedResurrectionsBlockedCount: number;
  message?: string;
  errors?: string[];
}

export interface SongInput {
  title: string;
  artist?: string;
  bpm?: string;
  musicalKey?: string;
  timeSignature?: string;
  notes?: string;
}

export interface SetlistInput {
  name: string;
  date?: string;
  notes?: string;
}
