import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AppData,
  Song,
  Setlist,
  SetlistEntry,
  AppPreferences,
  ExportBackupData,
  ImportOptions,
  ImportResult,
  SongInput,
  SetlistInput,
} from '../shared/types';

export const CURRENT_SCHEMA_VERSION = 1;
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function normalizeString(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class DurableStore {
  private dataFilePath: string;
  private backupFilePath: string;
  private memoryData: AppData | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private pendingSavesCount = 0;

  constructor(storageDir: string) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dataFilePath = path.join(storageDir, 'studio_songs_data.json');
    this.backupFilePath = path.join(storageDir, 'studio_songs_data.backup.json');
  }

  public async initialize(): Promise<AppData> {
    if (this.memoryData) {
      return this.memoryData;
    }

    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.memoryData = this.validateAndMigrate(parsed);
      } catch (err: any) {
        // If main file is corrupted, check if backup file exists and is valid
        if (fs.existsSync(this.backupFilePath)) {
          try {
            const backupRaw = fs.readFileSync(this.backupFilePath, 'utf-8');
            const backupParsed = JSON.parse(backupRaw);
            this.memoryData = this.validateAndMigrate(backupParsed);
            console.warn('Main data file was corrupted; successfully recovered from backup file.');
          } catch (backupErr) {
            throw new Error(
              `DurableStore startup error: Corrupted database file at ${this.dataFilePath}. Automatic reset is disabled to protect user data. Please inspect or restore from a backup: ${err.message}`
            );
          }
        } else {
          throw new Error(
            `DurableStore startup error: Corrupted database file at ${this.dataFilePath}. Automatic reset is disabled to protect user data: ${err.message}`
          );
        }
      }
    } else {
      // Fresh installation with no data starts with an empty library
      this.memoryData = this.createEmptyState();
      await this.persistDirect(this.memoryData);
    }

    // Auto-purge expired songs on launch
    await this.purgeExpiredSongs();

    return this.memoryData!;
  }

  private createEmptyState(): AppData {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      songs: [],
      setlists: [],
      setlistEntries: [],
      preferences: {
        textSize: 'standard',
        theme: 'system',
        hasCompletedTour: false,
        recentSongIds: [],
        recentSetlistIds: [],
        dividerWidth: 320,
        purgedSongIds: [],
      },
    };
  }

  private validateAndMigrate(data: any): AppData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format: expected root object');
    }

    const version = Number(data.schemaVersion) || 1;
    if (version > CURRENT_SCHEMA_VERSION) {
      throw new Error(`Unsupported schema version: ${version} (expected <= ${CURRENT_SCHEMA_VERSION})`);
    }

    const songs: Song[] = Array.isArray(data.songs) ? data.songs.map((s: any) => ({
      id: String(s.id || generateId('song')),
      title: String(s.title || '').trim(),
      artist: String(s.artist || '').trim(),
      bpm: String(s.bpm || ''),
      musicalKey: String(s.musicalKey || ''),
      timeSignature: String(s.timeSignature || ''),
      notes: typeof s.notes === 'string' ? s.notes : '',
      createdAt: Number(s.createdAt) || Date.now(),
      updatedAt: Number(s.updatedAt) || Date.now(),
      deletedAt: s.deletedAt != null ? Number(s.deletedAt) : null,
    })) : [];

    const setlists: Setlist[] = Array.isArray(data.setlists) ? data.setlists.map((sl: any) => ({
      id: String(sl.id || generateId('setlist')),
      name: String(sl.name || '').trim(),
      date: String(sl.date || ''),
      notes: typeof sl.notes === 'string' ? sl.notes : '',
      archived: Boolean(sl.archived),
      createdAt: Number(sl.createdAt) || Date.now(),
      updatedAt: Number(sl.updatedAt) || Date.now(),
    })) : [];

    const setlistEntries: SetlistEntry[] = Array.isArray(data.setlistEntries) ? data.setlistEntries.map((e: any, idx: number) => ({
      id: String(e.id || generateId('entry')),
      setlistId: String(e.setlistId),
      songId: String(e.songId),
      position: typeof e.position === 'number' ? e.position : idx,
    })) : [];

    const prefs = data.preferences || {};
    const preferences: AppPreferences = {
      textSize: ['small', 'standard', 'large', 'x-large'].includes(prefs.textSize) ? prefs.textSize : 'standard',
      theme: ['system', 'light', 'dark'].includes(prefs.theme) ? prefs.theme : 'system',
      hasCompletedTour: Boolean(prefs.hasCompletedTour),
      recentSongIds: Array.isArray(prefs.recentSongIds) ? prefs.recentSongIds.filter((id: any) => typeof id === 'string') : [],
      recentSetlistIds: Array.isArray(prefs.recentSetlistIds) ? prefs.recentSetlistIds.filter((id: any) => typeof id === 'string') : [],
      dividerWidth: typeof prefs.dividerWidth === 'number' && prefs.dividerWidth >= 200 && prefs.dividerWidth <= 600 ? prefs.dividerWidth : 320,
      windowBounds: prefs.windowBounds && typeof prefs.windowBounds === 'object' ? prefs.windowBounds : undefined,
      purgedSongIds: Array.isArray(prefs.purgedSongIds) ? prefs.purgedSongIds.filter((id: any) => typeof id === 'string') : [],
    };

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      songs,
      setlists,
      setlistEntries,
      preferences,
    };
  }

  private queueWrite(operation: () => Promise<void>): Promise<void> {
    this.pendingSavesCount++;
    const queued = this.writeQueue
      .then(() => operation())
      .finally(() => {
        this.pendingSavesCount--;
      });
    this.writeQueue = queued.catch(() => {}); // prevent chain rejection
    return queued;
  }

  private async persistDirect(state: AppData): Promise<void> {
    const jsonString = JSON.stringify(state, null, 2);
    const tmpPath = `${this.dataFilePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;

    // Write to temporary file with sync
    const fd = fs.openSync(tmpPath, 'w');
    try {
      fs.writeFileSync(fd, jsonString, 'utf-8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    // Atomic swap via rename
    fs.renameSync(tmpPath, this.dataFilePath);

    // Also update backup file asynchronously
    try {
      fs.writeFileSync(this.backupFilePath, jsonString, 'utf-8');
    } catch {
      // Non-critical if backup write fails
    }
  }

  public async flush(): Promise<void> {
    await this.writeQueue;
    if (this.memoryData) {
      await this.persistDirect(this.memoryData);
    }
  }

  public hasPendingSaves(): boolean {
    return this.pendingSavesCount > 0;
  }

  public getState(): AppData {
    if (!this.memoryData) {
      throw new Error('DurableStore is not initialized');
    }
    return JSON.parse(JSON.stringify(this.memoryData));
  }

  // --- Song Operations ---

  public async createSong(input: SongInput): Promise<{ song: Song; warning?: string }> {
    const trimmedTitle = input.title ? input.title.trim() : '';
    if (!trimmedTitle) {
      throw new Error('Title is required and cannot be whitespace-only');
    }

    const state = this.getState();
    const normalizedTitle = normalizeString(trimmedTitle);
    const normalizedArtist = normalizeString(input.artist || '');

    // Check duplicate warning
    let warning: string | undefined;
    const existingMatch = state.songs.find(
      s => s.deletedAt === null &&
      normalizeString(s.title) === normalizedTitle &&
      normalizeString(s.artist) === normalizedArtist
    );

    if (existingMatch) {
      warning = `A song with title "${existingMatch.title}" and artist "${existingMatch.artist || 'None'}" already exists. Saved as a new arrangement.`;
    }

    const now = Date.now();
    const newSong: Song = {
      id: generateId('song'),
      title: trimmedTitle,
      artist: (input.artist || '').trim(),
      bpm: (input.bpm || '').trim(),
      musicalKey: (input.musicalKey || '').trim(),
      timeSignature: (input.timeSignature || '').trim(),
      notes: input.notes || '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await this.queueWrite(async () => {
      // Append to bottom of library
      this.memoryData!.songs.push(newSong);
      // Track in recents
      this.touchRecentSong(newSong.id);
      await this.persistDirect(this.memoryData!);
    });

    return { song: { ...newSong }, warning };
  }

  public async updateSongMetadata(
    songId: string,
    input: Omit<SongInput, 'notes'>
  ): Promise<Song> {
    const trimmedTitle = input.title ? input.title.trim() : '';
    if (!trimmedTitle) {
      throw new Error('Title is required and cannot be whitespace-only');
    }

    let updatedSong: Song | null = null;

    await this.queueWrite(async () => {
      const s = this.memoryData!.songs.find(item => item.id === songId);
      if (!s) {
        throw new Error(`Song not found: ${songId}`);
      }
      if (s.deletedAt !== null) {
        throw new Error(`Cannot edit deleted song: ${songId}`);
      }

      s.title = trimmedTitle;
      if (input.artist !== undefined) s.artist = input.artist.trim();
      if (input.bpm !== undefined) s.bpm = input.bpm.trim();
      if (input.musicalKey !== undefined) s.musicalKey = input.musicalKey.trim();
      if (input.timeSignature !== undefined) s.timeSignature = input.timeSignature.trim();
      s.updatedAt = Date.now();
      // Keep createdAt unchanged! Creation order is preserved!

      updatedSong = { ...s };
      await this.persistDirect(this.memoryData!);
    });

    return updatedSong!;
  }

  public async updateSongNotes(songId: string, notes: string, clientUpdatedAt: number): Promise<{ success: boolean; updatedAt: number }> {
    let now = Date.now();

    await this.queueWrite(async () => {
      const s = this.memoryData!.songs.find(item => item.id === songId);
      if (!s) {
        throw new Error(`Song not found: ${songId}`);
      }
      // Guard against older asynchronous saves overwriting newer edits
      if (s.updatedAt > clientUpdatedAt) {
        // Newer write already happened; ignore stale overwrite
        return;
      }
      s.notes = notes;
      s.updatedAt = Math.max(now, s.updatedAt + 1);
      now = s.updatedAt;
      await this.persistDirect(this.memoryData!);
    });

    return { success: true, updatedAt: now };
  }

  public async duplicateSong(songId: string): Promise<Song> {
    const state = this.getState();
    const original = state.songs.find(s => s.id === songId);
    if (!original) {
      throw new Error(`Song not found: ${songId}`);
    }

    const now = Date.now();
    const copy: Song = {
      id: generateId('song'),
      title: `${original.title} (Copy)`,
      artist: original.artist,
      bpm: original.bpm,
      musicalKey: original.musicalKey,
      timeSignature: original.timeSignature,
      notes: original.notes,
      createdAt: now, // new identity and creation order
      updatedAt: now,
      deletedAt: null,
    };

    await this.queueWrite(async () => {
      this.memoryData!.songs.push(copy);
      this.touchRecentSong(copy.id);
      await this.persistDirect(this.memoryData!);
    });

    return copy;
  }

  public async deleteSong(songId: string): Promise<void> {
    await this.queueWrite(async () => {
      const s = this.memoryData!.songs.find(item => item.id === songId);
      if (!s) {
        throw new Error(`Song not found: ${songId}`);
      }

      s.deletedAt = Date.now();
      s.updatedAt = Date.now();

      // Transactionally remove all setlist entries referencing this song from both active and archived setlists
      this.memoryData!.setlistEntries = this.memoryData!.setlistEntries.filter(
        entry => entry.songId !== songId
      );

      // Remove from recents
      this.memoryData!.preferences.recentSongIds = this.memoryData!.preferences.recentSongIds.filter(
        id => id !== songId
      );

      await this.persistDirect(this.memoryData!);
    });
  }

  public async restoreSong(songId: string): Promise<Song> {
    let restoredSong: Song | null = null;

    await this.queueWrite(async () => {
      const s = this.memoryData!.songs.find(item => item.id === songId);
      if (!s) {
        throw new Error(`Song not found: ${songId}`);
      }
      if (s.deletedAt === null) {
        throw new Error(`Song is not deleted: ${songId}`);
      }

      s.deletedAt = null;
      s.updatedAt = Date.now();
      // s.createdAt is preserved, so its original creation order is preserved!

      this.touchRecentSong(s.id);
      restoredSong = { ...s };
      await this.persistDirect(this.memoryData!);
    });

    return restoredSong!;
  }

  public async purgeExpiredSongs(): Promise<number> {
    let purgedCount = 0;
    const now = Date.now();

    await this.queueWrite(async () => {
      const remainingSongs: Song[] = [];
      const purgedIds: string[] = [];

      for (const s of this.memoryData!.songs) {
        if (s.deletedAt !== null && now - s.deletedAt >= THIRTY_DAYS_MS) {
          purgedCount++;
          purgedIds.push(s.id);
        } else {
          remainingSongs.push(s);
        }
      }

      if (purgedCount > 0) {
        this.memoryData!.songs = remainingSongs;
        // Keep tombstone IDs bounded to 5000 to prevent unbounded growth while blocking resurrection
        const existingPurged = new Set(this.memoryData!.preferences.purgedSongIds || []);
        for (const pid of purgedIds) {
          existingPurged.add(pid);
        }
        this.memoryData!.preferences.purgedSongIds = Array.from(existingPurged).slice(-5000);

        // Also clean any orphan entries just in case
        this.memoryData!.setlistEntries = this.memoryData!.setlistEntries.filter(
          entry => !existingPurged.has(entry.songId)
        );

        await this.persistDirect(this.memoryData!);
      }
    });

    return purgedCount;
  }

  // --- Setlist Operations ---

  public async createSetlist(input: SetlistInput): Promise<Setlist> {
    const trimmedName = input.name ? input.name.trim() : '';
    if (!trimmedName) {
      throw new Error('Setlist name is required');
    }

    const now = Date.now();
    const setlist: Setlist = {
      id: generateId('setlist'),
      name: trimmedName,
      date: (input.date || '').trim(),
      notes: input.notes || '',
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.queueWrite(async () => {
      this.memoryData!.setlists.push(setlist);
      this.touchRecentSetlist(setlist.id);
      await this.persistDirect(this.memoryData!);
    });

    return setlist;
  }

  public async updateSetlist(
    setlistId: string,
    input: SetlistInput
  ): Promise<Setlist> {
    const trimmedName = input.name ? input.name.trim() : '';
    if (!trimmedName) {
      throw new Error('Setlist name is required');
    }

    let updatedSetlist: Setlist | null = null;

    await this.queueWrite(async () => {
      const sl = this.memoryData!.setlists.find(item => item.id === setlistId);
      if (!sl) {
        throw new Error(`Setlist not found: ${setlistId}`);
      }

      sl.name = trimmedName;
      if (input.date !== undefined) sl.date = input.date.trim();
      if (input.notes !== undefined) sl.notes = input.notes;
      sl.updatedAt = Date.now();

      updatedSetlist = { ...sl };
      await this.persistDirect(this.memoryData!);
    });

    return updatedSetlist!;
  }

  public async setSetlistArchived(setlistId: string, archived: boolean): Promise<Setlist> {
    let updatedSetlist: Setlist | null = null;

    await this.queueWrite(async () => {
      const sl = this.memoryData!.setlists.find(item => item.id === setlistId);
      if (!sl) {
        throw new Error(`Setlist not found: ${setlistId}`);
      }

      sl.archived = archived;
      sl.updatedAt = Date.now();

      if (archived) {
        // Exclude from recents
        this.memoryData!.preferences.recentSetlistIds = this.memoryData!.preferences.recentSetlistIds.filter(
          id => id !== setlistId
        );
      }

      updatedSetlist = { ...sl };
      await this.persistDirect(this.memoryData!);
    });

    return updatedSetlist!;
  }

  public async addSongToSetlist(setlistId: string, songId: string): Promise<SetlistEntry> {
    let newEntry: SetlistEntry | null = null;

    await this.queueWrite(async () => {
      const sl = this.memoryData!.setlists.find(item => item.id === setlistId);
      if (!sl) throw new Error(`Setlist not found: ${setlistId}`);

      const s = this.memoryData!.songs.find(item => item.id === songId && item.deletedAt === null);
      if (!s) throw new Error(`Active song not found: ${songId}`);

      const currentEntries = this.memoryData!.setlistEntries.filter(e => e.setlistId === setlistId);
      const position = currentEntries.length;

      newEntry = {
        id: generateId('entry'),
        setlistId,
        songId,
        position,
      };

      this.memoryData!.setlistEntries.push(newEntry);
      sl.updatedAt = Date.now();
      await this.persistDirect(this.memoryData!);
    });

    return newEntry!;
  }

  public async addMultipleSongsToSetlist(setlistId: string, songIds: string[]): Promise<SetlistEntry[]> {
    const createdEntries: SetlistEntry[] = [];

    await this.queueWrite(async () => {
      const sl = this.memoryData!.setlists.find(item => item.id === setlistId);
      if (!sl) throw new Error(`Setlist not found: ${setlistId}`);

      const currentEntries = this.memoryData!.setlistEntries.filter(e => e.setlistId === setlistId);
      let nextPos = currentEntries.length;

      for (const songId of songIds) {
        const s = this.memoryData!.songs.find(item => item.id === songId && item.deletedAt === null);
        if (s) {
          const entry: SetlistEntry = {
            id: generateId('entry'),
            setlistId,
            songId,
            position: nextPos++,
          };
          this.memoryData!.setlistEntries.push(entry);
          createdEntries.push(entry);
        }
      }

      sl.updatedAt = Date.now();
      await this.persistDirect(this.memoryData!);
    });

    return createdEntries;
  }

  public async reorderSetlistEntries(setlistId: string, orderedEntryIds: string[]): Promise<void> {
    await this.queueWrite(async () => {
      const sl = this.memoryData!.setlists.find(item => item.id === setlistId);
      if (!sl) throw new Error(`Setlist not found: ${setlistId}`);

      orderedEntryIds.forEach((id, index) => {
        const entry = this.memoryData!.setlistEntries.find(e => e.id === id && e.setlistId === setlistId);
        if (entry) {
          entry.position = index;
        }
      });

      sl.updatedAt = Date.now();
      await this.persistDirect(this.memoryData!);
    });
  }

  public async removeSetlistEntry(entryId: string): Promise<{ removedEntry: SetlistEntry; formerPosition: number }> {
    let result: { removedEntry: SetlistEntry; formerPosition: number } | null = null;

    await this.queueWrite(async () => {
      const index = this.memoryData!.setlistEntries.findIndex(e => e.id === entryId);
      if (index === -1) {
        throw new Error(`Setlist entry not found: ${entryId}`);
      }

      const [removed] = this.memoryData!.setlistEntries.splice(index, 1);
      const formerPos = removed.position;

      // Re-index remaining entries in this setlist
      const siblings = this.memoryData!.setlistEntries
        .filter(e => e.setlistId === removed.setlistId)
        .sort((a, b) => a.position - b.position);

      siblings.forEach((e, idx) => {
        e.position = idx;
      });

      result = { removedEntry: removed, formerPosition: formerPos };
      await this.persistDirect(this.memoryData!);
    });

    return result!;
  }

  public async restoreSetlistEntry(entry: SetlistEntry, targetPosition: number): Promise<void> {
    await this.queueWrite(async () => {
      const sl = this.memoryData!.setlists.find(item => item.id === entry.setlistId);
      if (!sl) throw new Error(`Setlist not found: ${entry.setlistId}`);

      const s = this.memoryData!.songs.find(item => item.id === entry.songId && item.deletedAt === null);
      if (!s) throw new Error(`Song is deleted or no longer exists: ${entry.songId}`);

      const siblings = this.memoryData!.setlistEntries
        .filter(e => e.setlistId === entry.setlistId && e.id !== entry.id)
        .sort((a, b) => a.position - b.position);

      const clampedPos = Math.max(0, Math.min(targetPosition, siblings.length));
      siblings.splice(clampedPos, 0, entry);

      siblings.forEach((e, idx) => {
        e.position = idx;
      });

      // Update in master array
      const existingIdx = this.memoryData!.setlistEntries.findIndex(e => e.id === entry.id);
      if (existingIdx !== -1) {
        this.memoryData!.setlistEntries.splice(existingIdx, 1);
      }
      this.memoryData!.setlistEntries.push(entry);

      await this.persistDirect(this.memoryData!);
    });
  }

  // --- Preferences & Recents ---

  public async updatePreferences(prefs: Partial<AppPreferences>): Promise<AppPreferences> {
    await this.queueWrite(async () => {
      Object.assign(this.memoryData!.preferences, prefs);
      await this.persistDirect(this.memoryData!);
    });
    return this.getState().preferences;
  }

  public touchRecentSong(songId: string): void {
    if (!this.memoryData) return;
    const existing = this.memoryData.preferences.recentSongIds.filter(id => id !== songId);
    this.memoryData.preferences.recentSongIds = [songId, ...existing].slice(0, 10);
  }

  public touchRecentSetlist(setlistId: string): void {
    if (!this.memoryData) return;
    const existing = this.memoryData.preferences.recentSetlistIds.filter(id => id !== setlistId);
    this.memoryData.preferences.recentSetlistIds = [setlistId, ...existing].slice(0, 10);
  }

  // --- Export and Merge Import ---

  public exportBackup(): ExportBackupData {
    const state = this.getState();
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportTimestamp: Date.now(),
      appVersion: '1.0.0',
      songs: state.songs,
      setlists: state.setlists,
      setlistEntries: state.setlistEntries,
      preferences: {
        textSize: state.preferences.textSize,
        theme: state.preferences.theme,
      },
    };
  }

  public async importBackup(backup: any, options: ImportOptions = {}): Promise<ImportResult> {
    // 1. Strict validation of whole file before any mutation
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid backup file: Root must be a JSON object');
    }

    const version = Number(backup.schemaVersion);
    if (!version || version > CURRENT_SCHEMA_VERSION) {
      throw new Error(`Unsupported schema version ${version}. Maximum supported is ${CURRENT_SCHEMA_VERSION}`);
    }

    if (!Array.isArray(backup.songs)) {
      throw new Error('Invalid backup: "songs" array is missing or invalid');
    }
    if (!Array.isArray(backup.setlists)) {
      throw new Error('Invalid backup: "setlists" array is missing or invalid');
    }
    if (!Array.isArray(backup.setlistEntries)) {
      throw new Error('Invalid backup: "setlistEntries" array is missing or invalid');
    }

    const errors: string[] = [];
    let addedSongsCount = 0;
    let skippedSongsCount = 0;
    let addedSetlistsCount = 0;
    let skippedSetlistsCount = 0;
    let addedEntriesCount = 0;
    let skippedEntriesCount = 0;
    let purgedResurrectionsBlockedCount = 0;

    await this.queueWrite(async () => {
      const state = this.memoryData!;
      const localSongMap = new Map<string, Song>(state.songs.map(s => [s.id, s]));
      const purgedSet = new Set<string>(state.preferences.purgedSongIds || []);

      // Validate & merge songs
      // Requirement: Existing local songs win when an imported copy has different details.
      // Requirement: Local deleted-song record wins over imported active copy with same ID (do not resurrect).
      // Requirement: For an ID previously purged locally, retain minimal deletion identity metadata to prevent accidental resurrection from an old backup.
      // Requirement: Append genuinely new imported songs after existing songs, preserving their order within the backup.
      const newSongsToAppend: Song[] = [];

      for (const rawSong of backup.songs) {
        if (!rawSong.id || !rawSong.title || typeof rawSong.title !== 'string') {
          skippedSongsCount++;
          continue;
        }

        const songId = String(rawSong.id);

        if (purgedSet.has(songId)) {
          // Block resurrection of locally purged songs!
          purgedResurrectionsBlockedCount++;
          skippedSongsCount++;
          continue;
        }

        if (localSongMap.has(songId)) {
          // Existing local song wins! Skipped.
          skippedSongsCount++;
          continue;
        }

        // New song to import
        const newSong: Song = {
          id: songId,
          title: String(rawSong.title).trim(),
          artist: String(rawSong.artist || '').trim(),
          bpm: String(rawSong.bpm || ''),
          musicalKey: String(rawSong.musicalKey || ''),
          timeSignature: String(rawSong.timeSignature || ''),
          notes: typeof rawSong.notes === 'string' ? rawSong.notes : '',
          createdAt: Number(rawSong.createdAt) || Date.now(),
          updatedAt: Number(rawSong.updatedAt) || Date.now(),
          deletedAt: rawSong.deletedAt != null ? Number(rawSong.deletedAt) : null,
        };

        // If imported song is already older than 30 days and deleted, don't resurrect or add it
        if (newSong.deletedAt !== null && Date.now() - newSong.deletedAt >= THIRTY_DAYS_MS) {
          skippedSongsCount++;
          purgedSet.add(songId);
          continue;
        }

        newSongsToAppend.push(newSong);
        localSongMap.set(newSong.id, newSong);
        addedSongsCount++;
      }

      state.songs.push(...newSongsToAppend);

      // Validate & merge setlists
      // Requirement: Existing local setlists also win for the same stable identity; import genuinely new setlists.
      const localSetlistMap = new Map<string, Setlist>(state.setlists.map(sl => [sl.id, sl]));
      const newSetlistsToAppend: Setlist[] = [];

      for (const rawSl of backup.setlists) {
        if (!rawSl.id || !rawSl.name || typeof rawSl.name !== 'string') {
          skippedSetlistsCount++;
          continue;
        }

        const setlistId = String(rawSl.id);
        if (localSetlistMap.has(setlistId)) {
          skippedSetlistsCount++;
          continue;
        }

        const newSetlist: Setlist = {
          id: setlistId,
          name: String(rawSl.name).trim(),
          date: String(rawSl.date || ''),
          notes: typeof rawSl.notes === 'string' ? rawSl.notes : '',
          archived: Boolean(rawSl.archived),
          createdAt: Number(rawSl.createdAt) || Date.now(),
          updatedAt: Number(rawSl.updatedAt) || Date.now(),
        };

        newSetlistsToAppend.push(newSetlist);
        localSetlistMap.set(newSetlist.id, newSetlist);
        addedSetlistsCount++;
      }

      state.setlists.push(...newSetlistsToAppend);

      // Merge setlist entries
      // Requirement: Never retain entries pointing to deleted, missing or expired songs. Validate or explicitly report skipped unavailable references.
      // Requirement: Reimporting the same backup must not create duplicate setlist occurrences.
      const existingEntryIds = new Set(state.setlistEntries.map(e => e.id));

      for (const rawEntry of backup.setlistEntries) {
        if (!rawEntry.id || !rawEntry.setlistId || !rawEntry.songId) {
          skippedEntriesCount++;
          continue;
        }

        const entryId = String(rawEntry.id);
        if (existingEntryIds.has(entryId)) {
          skippedEntriesCount++;
          continue;
        }

        const song = localSongMap.get(String(rawEntry.songId));
        if (!song || song.deletedAt !== null) {
          // Target song is missing, deleted, or expired!
          skippedEntriesCount++;
          continue;
        }

        const setlist = localSetlistMap.get(String(rawEntry.setlistId));
        if (!setlist) {
          // Target setlist missing
          skippedEntriesCount++;
          continue;
        }

        const newEntry: SetlistEntry = {
          id: entryId,
          setlistId: setlist.id,
          songId: song.id,
          position: typeof rawEntry.position === 'number' ? rawEntry.position : state.setlistEntries.filter(e => e.setlistId === setlist.id).length,
        };

        state.setlistEntries.push(newEntry);
        existingEntryIds.add(entryId);
        addedEntriesCount++;
      }

      // Re-index entries per setlist to guarantee valid consecutive positions
      for (const sl of state.setlists) {
        const entries = state.setlistEntries
          .filter(e => e.setlistId === sl.id)
          .sort((a, b) => a.position - b.position);
        entries.forEach((e, idx) => {
          e.position = idx;
        });
      }

      // Explicit appearance / text-size option
      if (options.importPreferences && backup.preferences) {
        if (['small', 'standard', 'large', 'x-large'].includes(backup.preferences.textSize)) {
          state.preferences.textSize = backup.preferences.textSize;
        }
        if (['system', 'light', 'dark'].includes(backup.preferences.theme)) {
          state.preferences.theme = backup.preferences.theme;
        }
      }

      state.preferences.purgedSongIds = Array.from(purgedSet).slice(-5000);

      await this.persistDirect(state);
    });

    return {
      success: true,
      addedSongsCount,
      skippedSongsCount,
      addedSetlistsCount,
      skippedSetlistsCount,
      addedEntriesCount,
      skippedEntriesCount,
      purgedResurrectionsBlockedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
