import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AppData,
  Song,
  CurrentSetlistEntry,
  Setlist,
  SetlistEntry,
  AppPreferences,
  ExportBackupData,
  ImportOptions,
  ImportResult,
  SongInput,
  CURRENT_SCHEMA_VERSION,
  THIRTY_DAYS_MS,
} from '../shared/types';
import { smartTitleCase } from '../shared/formatters';

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function normalizeString(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class DurableStore {
  private storageDir: string;
  private dataFilePath: string;
  private backupFilePath: string;
  private memoryData: AppData | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private pendingSavesCount = 0;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
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
        const originalVersion = Number(parsed.schemaVersion) || 1;
        this.memoryData = this.validateAndMigrate(parsed);
        // If data was migrated from an older schema, persist the migrated structure immediately
        if (originalVersion < CURRENT_SCHEMA_VERSION) {
          await this.persistDirect(this.memoryData);
        }
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
      currentSetlist: [],
      preferences: {
        textSize: 'standard',
        theme: 'system',
        hasCompletedTour: false,
        recentSongIds: [],
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

    // Validate songs
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

    let currentSetlist: CurrentSetlistEntry[] = [];
    let legacySetlists: Setlist[] | undefined = Array.isArray(data.legacySetlists) ? data.legacySetlists : undefined;
    let legacySetlistEntries: SetlistEntry[] | undefined = Array.isArray(data.legacySetlistEntries) ? data.legacySetlistEntries : undefined;
    let migrationPendingChoice = Boolean(data.migrationPendingChoice);

    // v1.0 -> v1.1 Migration: migrate named setlists into single currentSetlist
    if (version === 1) {
      // Take a pre-migration snapshot first to guarantee zero data loss
      try {
        const snapshotPath = path.join(this.storageDir, 'studio_songs_data.pre-v1.1.json');
        if (!fs.existsSync(snapshotPath) && fs.existsSync(this.dataFilePath)) {
          fs.copyFileSync(this.dataFilePath, snapshotPath);
        }
      } catch (snapshotErr) {
        console.warn('Could not write pre-migration snapshot:', snapshotErr);
      }

      const rawLegacySetlists = Array.isArray(data.setlists) ? data.setlists : [];
      const rawLegacyEntries = Array.isArray(data.setlistEntries) ? data.setlistEntries : [];
      legacySetlists = rawLegacySetlists;
      legacySetlistEntries = rawLegacyEntries;

      const activeSetlists = rawLegacySetlists.filter((sl: any) => !sl.archived);

      if (activeSetlists.length === 1) {
        // Exactly one active setlist: use its entries as current setlist
        const targetId = activeSetlists[0].id;
        currentSetlist = rawLegacyEntries
          .filter((e: any) => e.setlistId === targetId)
          .sort((a: any, b: any) => a.position - b.position)
          .map((e: any, idx: number) => ({
            id: String(e.id || generateId('entry')),
            songId: String(e.songId),
            position: idx,
          }));
      } else if (activeSetlists.length > 1) {
        // Multiple active setlists: sort by most recently updated as default, and mark pending choice
        const sorted = [...activeSetlists].sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const targetId = sorted[0].id;
        currentSetlist = rawLegacyEntries
          .filter((e: any) => e.setlistId === targetId)
          .sort((a: any, b: any) => a.position - b.position)
          .map((e: any, idx: number) => ({
            id: String(e.id || generateId('entry')),
            songId: String(e.songId),
            position: idx,
          }));
        migrationPendingChoice = true;
      } else {
        currentSetlist = [];
      }
    } else {
      // Version 2 format
      currentSetlist = Array.isArray(data.currentSetlist)
        ? data.currentSetlist.map((e: any, idx: number) => ({
            id: String(e.id || generateId('entry')),
            songId: String(e.songId),
            position: typeof e.position === 'number' ? e.position : idx,
          }))
        : [];
    }

    const prefs = data.preferences || {};
    const preferences: AppPreferences = {
      textSize: ['small', 'standard', 'large', 'x-large'].includes(prefs.textSize) ? prefs.textSize : 'standard',
      theme: ['system', 'light', 'dark'].includes(prefs.theme) ? prefs.theme : 'system',
      hasCompletedTour: Boolean(prefs.hasCompletedTour),
      recentSongIds: Array.isArray(prefs.recentSongIds) ? prefs.recentSongIds.filter((id: any) => typeof id === 'string') : [],
      dividerWidth: typeof prefs.dividerWidth === 'number' && prefs.dividerWidth >= 200 && prefs.dividerWidth <= 600 ? prefs.dividerWidth : 320,
      windowBounds: prefs.windowBounds && typeof prefs.windowBounds === 'object' ? prefs.windowBounds : undefined,
      purgedSongIds: Array.isArray(prefs.purgedSongIds) ? prefs.purgedSongIds.filter((id: any) => typeof id === 'string') : [],
    };

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      songs,
      currentSetlist,
      legacySetlists,
      legacySetlistEntries,
      migrationPendingChoice,
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
    this.writeQueue = queued.catch(() => {});
    return queued;
  }

  private async persistDirect(state: AppData): Promise<void> {
    const jsonString = JSON.stringify(state, null, 2);
    const tmpPath = `${this.dataFilePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;

    const fd = fs.openSync(tmpPath, 'w');
    try {
      fs.writeFileSync(fd, jsonString, 'utf-8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    fs.renameSync(tmpPath, this.dataFilePath);

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

    // Duplicate arrangement warning
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

    // Practical v1.1 Defaults for a genuinely new song:
    // BPM defaults to "74" if empty/whitespace
    const bpm = input.bpm !== undefined && input.bpm.trim() !== '' ? input.bpm.trim() : '74';
    // Time Signature defaults to "4/4" if empty/whitespace
    const timeSignature = input.timeSignature !== undefined && input.timeSignature.trim() !== '' ? input.timeSignature.trim() : '4/4';
    // Musical Key: unset (empty string)
    const musicalKey = (input.musicalKey || '').trim();

    const newSong: Song = {
      id: generateId('song'),
      title: trimmedTitle,
      artist: (input.artist || '').trim(),
      bpm,
      musicalKey,
      timeSignature,
      notes: input.notes || '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await this.queueWrite(async () => {
      this.memoryData!.songs.push(newSong);
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
      if (s.updatedAt > clientUpdatedAt) {
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
    // Copy actual data rather than applying new-song defaults!
    const copy: Song = {
      id: generateId('song'),
      title: `${original.title} (Copy)`,
      artist: original.artist,
      bpm: original.bpm,
      musicalKey: original.musicalKey,
      timeSignature: original.timeSignature,
      notes: original.notes,
      createdAt: now,
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

      // Transactionally remove all occurrences from currentSetlist
      this.memoryData!.currentSetlist = this.memoryData!.currentSetlist
        .filter(entry => entry.songId !== songId)
        .map((entry, idx) => ({ ...entry, position: idx }));

      // Also clean legacy entries if any
      if (this.memoryData!.legacySetlistEntries) {
        this.memoryData!.legacySetlistEntries = this.memoryData!.legacySetlistEntries.filter(
          e => e.songId !== songId
        );
      }

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
        const existingPurged = new Set(this.memoryData!.preferences.purgedSongIds || []);
        for (const pid of purgedIds) {
          existingPurged.add(pid);
        }
        this.memoryData!.preferences.purgedSongIds = Array.from(existingPurged).slice(-5000);

        // Also clean any orphan occurrences in currentSetlist
        this.memoryData!.currentSetlist = this.memoryData!.currentSetlist
          .filter(entry => !existingPurged.has(entry.songId))
          .map((entry, idx) => ({ ...entry, position: idx }));

        await this.persistDirect(this.memoryData!);
      }
    });

    return purgedCount;
  }

  // --- Current Setlist Operations ---

  public async addSongToCurrentSetlist(songId: string): Promise<CurrentSetlistEntry> {
    let newEntry: CurrentSetlistEntry | null = null;

    await this.queueWrite(async () => {
      const s = this.memoryData!.songs.find(item => item.id === songId && item.deletedAt === null);
      if (!s) throw new Error(`Active song not found: ${songId}`);

      const position = this.memoryData!.currentSetlist.length;
      newEntry = {
        id: generateId('entry'),
        songId,
        position,
      };

      this.memoryData!.currentSetlist.push(newEntry);
      await this.persistDirect(this.memoryData!);
    });

    return newEntry!;
  }

  public async addMultipleSongsToCurrentSetlist(songIds: string[]): Promise<CurrentSetlistEntry[]> {
    const createdEntries: CurrentSetlistEntry[] = [];

    await this.queueWrite(async () => {
      let nextPos = this.memoryData!.currentSetlist.length;

      for (const songId of songIds) {
        const s = this.memoryData!.songs.find(item => item.id === songId && item.deletedAt === null);
        if (s) {
          const entry: CurrentSetlistEntry = {
            id: generateId('entry'),
            songId,
            position: nextPos++,
          };
          this.memoryData!.currentSetlist.push(entry);
          createdEntries.push(entry);
        }
      }

      await this.persistDirect(this.memoryData!);
    });

    return createdEntries;
  }

  public async reorderCurrentSetlist(orderedEntryIds: string[]): Promise<void> {
    await this.queueWrite(async () => {
      const entryMap = new Map(this.memoryData!.currentSetlist.map(e => [e.id, e]));
      const reordered: CurrentSetlistEntry[] = [];

      orderedEntryIds.forEach((id, idx) => {
        const entry = entryMap.get(id);
        if (entry) {
          entry.position = idx;
          reordered.push(entry);
          entryMap.delete(id);
        }
      });

      // Append any unmentioned entries at end
      for (const remaining of entryMap.values()) {
        remaining.position = reordered.length;
        reordered.push(remaining);
      }

      this.memoryData!.currentSetlist = reordered;
      await this.persistDirect(this.memoryData!);
    });
  }

  public async removeCurrentSetlistEntry(entryId: string): Promise<{ removedEntry: CurrentSetlistEntry; formerPosition: number }> {
    let result: { removedEntry: CurrentSetlistEntry; formerPosition: number } | null = null;

    await this.queueWrite(async () => {
      const index = this.memoryData!.currentSetlist.findIndex(e => e.id === entryId);
      if (index === -1) {
        throw new Error(`Setlist entry not found: ${entryId}`);
      }

      const [removed] = this.memoryData!.currentSetlist.splice(index, 1);
      const formerPos = removed.position;

      // Re-index remaining entries
      this.memoryData!.currentSetlist.forEach((e, idx) => {
        e.position = idx;
      });

      result = { removedEntry: removed, formerPosition: formerPos };
      await this.persistDirect(this.memoryData!);
    });

    return result!;
  }

  public async restoreCurrentSetlistEntry(entry: CurrentSetlistEntry, targetPosition: number): Promise<void> {
    await this.queueWrite(async () => {
      const s = this.memoryData!.songs.find(item => item.id === entry.songId && item.deletedAt === null);
      if (!s) throw new Error(`Song is deleted or no longer exists: ${entry.songId}`);

      const list = this.memoryData!.currentSetlist.filter(e => e.id !== entry.id);
      const clampedPos = Math.max(0, Math.min(targetPosition, list.length));
      list.splice(clampedPos, 0, entry);

      list.forEach((e, idx) => {
        e.position = idx;
      });

      this.memoryData!.currentSetlist = list;
      await this.persistDirect(this.memoryData!);
    });
  }

  public async clearCurrentSetlist(): Promise<{ formerEntries: CurrentSetlistEntry[] }> {
    let formerEntries: CurrentSetlistEntry[] = [];

    await this.queueWrite(async () => {
      formerEntries = [...this.memoryData!.currentSetlist];
      this.memoryData!.currentSetlist = [];
      await this.persistDirect(this.memoryData!);
    });

    return { formerEntries };
  }

  public async restoreClearedSetlist(entries: CurrentSetlistEntry[]): Promise<void> {
    await this.queueWrite(async () => {
      // Validate that songs still exist and are not deleted
      const activeSongIds = new Set(
        this.memoryData!.songs.filter(s => s.deletedAt === null).map(s => s.id)
      );

      const validEntries = entries
        .filter(e => activeSongIds.has(e.songId))
        .map((e, idx) => ({ ...e, position: idx }));

      this.memoryData!.currentSetlist = validEntries;
      await this.persistDirect(this.memoryData!);
    });
  }

  // --- Migration Helper: Choose legacy setlist as current setlist ---
  public async chooseMigrationSetlist(legacySetlistId: string): Promise<void> {
    await this.queueWrite(async () => {
      if (!this.memoryData!.legacySetlistEntries) return;

      const entries = this.memoryData!.legacySetlistEntries
        .filter(e => e.setlistId === legacySetlistId)
        .sort((a, b) => a.position - b.position)
        .map((e, idx) => ({
          id: generateId('entry'),
          songId: e.songId,
          position: idx,
        }));

      this.memoryData!.currentSetlist = entries;
      this.memoryData!.migrationPendingChoice = false;
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

  // --- Export and Merge Import ---

  public exportBackup(): ExportBackupData {
    const state = this.getState();
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportTimestamp: Date.now(),
      appVersion: '1.1.0',
      songs: state.songs,
      currentSetlist: state.currentSetlist,
      legacySetlists: state.legacySetlists,
      legacySetlistEntries: state.legacySetlistEntries,
      preferences: {
        textSize: state.preferences.textSize,
        theme: state.preferences.theme,
      },
    };
  }

  public async importBackup(backup: any, options: ImportOptions = {}): Promise<ImportResult> {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid backup file: Root must be a JSON object');
    }

    const version = Number(backup.schemaVersion);
    if (!version || (version !== 1 && version !== CURRENT_SCHEMA_VERSION)) {
      throw new Error(`Unsupported schema version ${version}. Supported versions are 1 and ${CURRENT_SCHEMA_VERSION}`);
    }

    if (!Array.isArray(backup.songs)) {
      throw new Error('Invalid backup: "songs" array is missing or invalid');
    }

    const errors: string[] = [];
    let addedSongsCount = 0;
    let skippedSongsCount = 0;
    let importedSetlistCount = 0;
    let skippedSetlistMessage: string | undefined;
    let purgedResurrectionsBlockedCount = 0;

    await this.queueWrite(async () => {
      const state = this.memoryData!;
      const localSongMap = new Map<string, Song>(state.songs.map(s => [s.id, s]));
      const purgedSet = new Set<string>(state.preferences.purgedSongIds || []);

      const newSongsToAppend: Song[] = [];

      for (const rawSong of backup.songs) {
        if (!rawSong.id || !rawSong.title || typeof rawSong.title !== 'string') {
          skippedSongsCount++;
          continue;
        }

        const songId = String(rawSong.id);

        if (purgedSet.has(songId)) {
          purgedResurrectionsBlockedCount++;
          skippedSongsCount++;
          continue;
        }

        if (localSongMap.has(songId)) {
          // Existing local song wins!
          skippedSongsCount++;
          continue;
        }

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

      // Current Setlist Import Handling:
      // Requirement: "A fresh library can restore the imported current setlist; an existing library keeps its own current setlist, including a deliberately cleared one. Explain any skipped imported list in the import summary."
      if (state.currentSetlist.length === 0 && state.songs.length === addedSongsCount) {
        // Fresh library! Can restore imported setlist
        let candidateEntries: Array<{ id: string; songId: string }> = [];

        if (Array.isArray(backup.currentSetlist)) {
          candidateEntries = backup.currentSetlist;
        } else if (Array.isArray(backup.setlistEntries)) {
          // v1 backup: take first active setlist entries if available
          const activeSl = Array.isArray(backup.setlists) ? backup.setlists.find((sl: any) => !sl.archived) : null;
          if (activeSl) {
            candidateEntries = backup.setlistEntries.filter((e: any) => e.setlistId === activeSl.id);
          } else {
            candidateEntries = backup.setlistEntries;
          }
        }

        const validEntries: CurrentSetlistEntry[] = [];
        for (const rawEntry of candidateEntries) {
          const song = localSongMap.get(String(rawEntry.songId));
          if (song && song.deletedAt === null) {
            validEntries.push({
              id: String(rawEntry.id || generateId('entry')),
              songId: song.id,
              position: validEntries.length,
            });
          }
        }

        state.currentSetlist = validEntries;
        importedSetlistCount = validEntries.length;
      } else {
        // Existing library keeps its own current setlist!
        skippedSetlistMessage = 'Kept existing local current setlist. Imported setlist entries were not overwritten.';
      }

      // Explicit appearance preference import option
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
      importedSetlistCount,
      skippedSetlistMessage,
      purgedResurrectionsBlockedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
