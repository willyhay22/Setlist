import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DurableStore } from '../src/main/store';
import { ExportBackupData } from '../src/shared/types';

describe('Setlist v1.1 - Backup & Merge Import Tests', () => {
  let tempDir: string;
  let store: DurableStore;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setlist-backup-test-'));
    store = new DurableStore(tempDir);
    await store.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('Export backup includes all songs, currentSetlist, legacy recovery data, and preferences', async () => {
    const { song: s1 } = await store.createSong({
      title: 'Song 1',
      artist: 'Artist 1',
      reviewStatus: { bpm: 'default', timeSignature: 'reviewed' },
    });
    const { song: s2 } = await store.createSong({ title: 'Song 2', artist: 'Artist 2' });
    await store.deleteSong(s2.id); // soft-deleted

    await store.addSongToCurrentSetlist(s1.id);
    await store.updatePreferences({ textSize: 'large', theme: 'dark', notesHeight: 250 });

    const backup = store.exportBackup();
    assert.strictEqual(backup.schemaVersion, 3);
    assert.strictEqual(backup.songs.length, 2);
    assert.strictEqual(backup.songs[0].reviewStatus?.bpm, 'default');
    assert.strictEqual(backup.songs[0].reviewStatus?.timeSignature, 'reviewed');
    assert.strictEqual(backup.currentSetlist.length, 1);
    assert.strictEqual(backup.preferences?.textSize, 'large');
    assert.strictEqual(backup.preferences?.theme, 'dark');
  });

  test('Merge import: existing local records win, genuinely new songs append, existing setlist kept', async () => {
    const { song: localSong } = await store.createSong({ title: 'Local Version', artist: 'Local Artist' });
    await store.addSongToCurrentSetlist(localSong.id);

    const foreignBackup: ExportBackupData = {
      schemaVersion: 2,
      exportTimestamp: Date.now(),
      appVersion: '1.1.0',
      songs: [
        {
          id: localSong.id,
          title: 'Remote Title Should Be Ignored',
          artist: 'Remote Artist',
          bpm: '99',
          musicalKey: 'C',
          timeSignature: '4/4',
          notes: 'Remote notes',
          createdAt: localSong.createdAt,
          updatedAt: Date.now() + 1000,
          deletedAt: null,
        },
        {
          id: 'imported_new_song_1',
          title: 'Genuinely New Song A',
          artist: 'New Artist A',
          bpm: '70',
          musicalKey: 'G',
          timeSignature: '4/4',
          notes: 'New notes A',
          createdAt: 5000,
          updatedAt: 5000,
          deletedAt: null,
        },
      ],
      currentSetlist: [
        {
          id: 'entry_remote_1',
          songId: 'imported_new_song_1',
          position: 0,
        },
      ],
    };

    const res = await store.importBackup(foreignBackup, { importPreferences: false });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.addedSongsCount, 1);
    assert.strictEqual(res.skippedSongsCount, 1); // localSong won
    // Existing library keeps its own current setlist
    assert.ok(res.skippedSetlistMessage);

    const state = store.getState();
    assert.strictEqual(state.songs.find(s => s.id === localSong.id)?.title, 'Local Version');
    assert.strictEqual(state.currentSetlist.length, 1);
    assert.strictEqual(state.currentSetlist[0].songId, localSong.id);
  });

  test('Fresh empty library imports both songs and current setlist from backup', async () => {
    const freshBackup: ExportBackupData = {
      schemaVersion: 2,
      exportTimestamp: Date.now(),
      appVersion: '1.1.0',
      songs: [
        {
          id: 'song_a',
          title: 'Song A',
          artist: 'Artist A',
          bpm: '74',
          musicalKey: 'C',
          timeSignature: '4/4',
          notes: '',
          createdAt: 1000,
          updatedAt: 1000,
          deletedAt: null,
        },
      ],
      currentSetlist: [
        {
          id: 'entry_a',
          songId: 'song_a',
          position: 0,
        },
      ],
    };

    const res = await store.importBackup(freshBackup);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.addedSongsCount, 1);
    assert.strictEqual(res.importedSetlistCount, 1);

    const state = store.getState();
    assert.strictEqual(state.currentSetlist.length, 1);
    assert.strictEqual(state.currentSetlist[0].songId, 'song_a');
  });

  test('Backward compatibility: imports v1 backups safely', async () => {
    const v1Backup = {
      schemaVersion: 1,
      exportTimestamp: Date.now(),
      appVersion: '1.0.0',
      songs: [
        {
          id: 'v1_song',
          title: 'Legacy Song',
          artist: 'Legacy Band',
          bpm: '72',
          musicalKey: 'G',
          timeSignature: '4/4',
          notes: '',
          createdAt: 100,
          updatedAt: 100,
          deletedAt: null,
        },
      ],
      setlists: [
        {
          id: 'v1_sl',
          name: 'Old Sunday Setlist',
          date: '2026-01-01',
          notes: '',
          archived: false,
          createdAt: 200,
          updatedAt: 200,
        },
      ],
      setlistEntries: [
        {
          id: 'v1_entry',
          setlistId: 'v1_sl',
          songId: 'v1_song',
          position: 0,
        },
      ],
    };

    const res = await store.importBackup(v1Backup);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.addedSongsCount, 1);

    const state = store.getState();
    assert.strictEqual(state.songs.some(s => s.id === 'v1_song'), true);
    // Legacy songs must have undefined reviewStatus
    assert.strictEqual(state.songs.find(s => s.id === 'v1_song')?.reviewStatus, undefined);
  });

  test('Backward compatibility: imports v2 backups safely', async () => {
    const v2Backup = {
      schemaVersion: 2,
      exportTimestamp: Date.now(),
      appVersion: '1.1.0',
      songs: [
        {
          id: 'v2_song',
          title: 'V2 Song',
          artist: 'V2 Artist',
          bpm: '74',
          musicalKey: 'D',
          timeSignature: '4/4',
          notes: '',
          createdAt: 300,
          updatedAt: 300,
          deletedAt: null,
        },
      ],
      currentSetlist: [
        { id: 'v2_entry', songId: 'v2_song', position: 0 },
      ],
    };

    const res = await store.importBackup(v2Backup);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.addedSongsCount, 1);

    const state = store.getState();
    assert.strictEqual(state.songs.some(s => s.id === 'v2_song'), true);
    assert.strictEqual(state.songs.find(s => s.id === 'v2_song')?.reviewStatus, undefined);
  });

  test('Malformed backup is rejected without any mutations', async () => {
    const { song } = await store.createSong({ title: 'Original Song' });

    const malformed = {
      schemaVersion: 999,
      songs: 'not-an-array',
    };

    await assert.rejects(
      async () => store.importBackup(malformed),
      /Unsupported schema version/
    );

    assert.strictEqual(store.getState().songs.length, 1);
    assert.strictEqual(store.getState().songs[0].id, song.id);
  });
});
