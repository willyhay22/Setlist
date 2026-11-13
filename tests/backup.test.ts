import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DurableStore } from '../src/main/store';
import { ExportBackupData } from '../src/shared/types';

describe('Studio Songs - Backup & Merge Import Tests', () => {
  let tempDir: string;
  let store: DurableStore;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-songs-backup-test-'));
    store = new DurableStore(tempDir);
    await store.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('Export backup includes all active and deleted songs, setlists, entries, and preferences', async () => {
    const { song: s1 } = await store.createSong({ title: 'Song 1', artist: 'Artist 1' });
    const { song: s2 } = await store.createSong({ title: 'Song 2', artist: 'Artist 2' });
    await store.deleteSong(s2.id); // soft-deleted

    const sl = await store.createSetlist({ name: 'Sunday Service' });
    await store.addSongToSetlist(sl.id, s1.id);
    await store.updatePreferences({ textSize: 'large', theme: 'dark' });

    const backup = store.exportBackup();
    assert.strictEqual(backup.schemaVersion, 1);
    assert.strictEqual(backup.songs.length, 2);
    assert.strictEqual(backup.setlists.length, 1);
    assert.strictEqual(backup.setlistEntries.length, 1);
    assert.strictEqual(backup.preferences?.textSize, 'large');
    assert.strictEqual(backup.preferences?.theme, 'dark');
  });

  test('Merge import: existing local songs and setlists win; genuinely new records append in order', async () => {
    // Local record
    const { song: localSong } = await store.createSong({ title: 'Local Version of Song', artist: 'Local Band' });

    const foreignBackup: ExportBackupData = {
      schemaVersion: 1,
      exportTimestamp: Date.now(),
      appVersion: '1.0.0',
      songs: [
        {
          id: localSong.id,
          title: 'Remote Edited Title (Should Be Ignored)',
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
        {
          id: 'imported_new_song_2',
          title: 'Genuinely New Song B',
          artist: 'New Artist B',
          bpm: '80',
          musicalKey: 'D',
          timeSignature: '3/4',
          notes: 'New notes B',
          createdAt: 6000,
          updatedAt: 6000,
          deletedAt: null,
        },
      ],
      setlists: [
        {
          id: 'imported_setlist_1',
          name: 'Easter Celebration',
          date: '2026-04-05',
          notes: 'Morning service',
          archived: false,
          createdAt: 7000,
          updatedAt: 7000,
        },
      ],
      setlistEntries: [
        {
          id: 'entry_1',
          setlistId: 'imported_setlist_1',
          songId: 'imported_new_song_1',
          position: 0,
        },
        {
          id: 'entry_2',
          setlistId: 'imported_setlist_1',
          songId: 'non_existent_song_id', // Invalid reference! Must be skipped!
          position: 1,
        },
      ],
    };

    const res = await store.importBackup(foreignBackup, { importPreferences: false });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.addedSongsCount, 2);
    assert.strictEqual(res.skippedSongsCount, 1); // localSong skipped because local wins!
    assert.strictEqual(res.addedSetlistsCount, 1);
    assert.strictEqual(res.addedEntriesCount, 1);
    assert.strictEqual(res.skippedEntriesCount, 1); // entry_2 skipped because songId missing!

    const state = store.getState();
    // Local song remained untouched
    const retained = state.songs.find(s => s.id === localSong.id);
    assert.strictEqual(retained?.title, 'Local Version of Song');

    // Genuinely new songs appended
    assert.strictEqual(state.songs.length, 3);
    assert.strictEqual(state.songs[1].id, 'imported_new_song_1');
    assert.strictEqual(state.songs[2].id, 'imported_new_song_2');

    // Repeated import is idempotent
    const secondImport = await store.importBackup(foreignBackup);
    assert.strictEqual(secondImport.addedSongsCount, 0);
    assert.strictEqual(secondImport.addedSetlistsCount, 0);
    assert.strictEqual(secondImport.addedEntriesCount, 0);
  });

  test('Local deleted record wins over imported active copy; purged tombstones block resurrection', async () => {
    const { song } = await store.createSong({ title: 'Song to be Deleted' });
    await store.deleteSong(song.id); // Marked deleted locally

    // Purge another song ID
    store['memoryData']!.preferences.purgedSongIds.push('permanently_purged_id');
    await store.flush();

    const backup: ExportBackupData = {
      schemaVersion: 1,
      exportTimestamp: Date.now(),
      appVersion: '1.0.0',
      songs: [
        {
          id: song.id,
          title: 'Resurrected Song Attempt',
          artist: 'Someone',
          bpm: '100',
          musicalKey: 'A',
          timeSignature: '4/4',
          notes: '',
          createdAt: song.createdAt,
          updatedAt: Date.now(),
          deletedAt: null, // Attempting to resurrect as active!
        },
        {
          id: 'permanently_purged_id',
          title: 'Old Expired Song',
          artist: 'Old Band',
          bpm: '',
          musicalKey: '',
          timeSignature: '',
          notes: '',
          createdAt: 100,
          updatedAt: 100,
          deletedAt: null,
        },
      ],
      setlists: [],
      setlistEntries: [],
    };

    const res = await store.importBackup(backup);
    assert.strictEqual(res.addedSongsCount, 0);
    assert.strictEqual(res.purgedResurrectionsBlockedCount, 1);

    const state = store.getState();
    // Song is still deleted locally
    const s = state.songs.find(item => item.id === song.id);
    assert.notStrictEqual(s?.deletedAt, null);
    // Purged song was not added
    assert.strictEqual(state.songs.some(item => item.id === 'permanently_purged_id'), false);
  });

  test('Malformed backup is rejected without any partial mutations', async () => {
    const { song } = await store.createSong({ title: 'Original Song' });

    const malformed = {
      schemaVersion: 999, // unsupported version
      songs: 'not-an-array',
    };

    await assert.rejects(
      async () => store.importBackup(malformed),
      /Unsupported schema version/
    );

    // State is strictly unchanged
    assert.strictEqual(store.getState().songs.length, 1);
    assert.strictEqual(store.getState().songs[0].id, song.id);
  });
});
