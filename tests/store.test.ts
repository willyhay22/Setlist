import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DurableStore } from '../src/main/store';
import { THIRTY_DAYS_MS } from '../src/shared/types';

describe('Setlist v1.1 - Store & Business Logic Tests', () => {
  let tempDir: string;
  let store: DurableStore;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setlist-test-'));
    store = new DurableStore(tempDir);
    await store.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('Fresh installation starts with empty library and empty currentSetlist', async () => {
    const state = store.getState();
    assert.strictEqual(state.schemaVersion, 2);
    assert.strictEqual(state.songs.length, 0);
    assert.strictEqual(state.currentSetlist.length, 0);
    assert.strictEqual(state.preferences.hasCompletedTour, false);
  });

  test('Title-only creation succeeds with v1.1 defaults (BPM 74, Time Signature 4/4, Key unset)', async () => {
    // Blank title should throw
    await assert.rejects(
      async () => store.createSong({ title: '   ' }),
      /Title is required/
    );

    // Title-only creation applies new-song defaults
    const { song } = await store.createSong({ title: 'Amazing Grace' });
    assert.strictEqual(song.title, 'Amazing Grace');
    assert.strictEqual(song.artist, '');
    assert.strictEqual(song.bpm, '74'); // Default 74
    assert.strictEqual(song.musicalKey, ''); // Unset
    assert.strictEqual(song.timeSignature, '4/4'); // Default 4/4
    assert.strictEqual(song.notes, '');
    assert.strictEqual(song.deletedAt, null);
    assert.ok(song.createdAt > 0);

    // Explicit custom BPM, key, and signature are preserved verbatim
    const { song: song2 } = await store.createSong({
      title: 'Living Hope',
      artist: 'Phil Wickham',
      bpm: '72 verse, 76 chorus',
      musicalKey: 'Eb',
      timeSignature: '6/8',
      notes: 'Solo piano intro for 4 bars.',
    });
    assert.strictEqual(song2.bpm, '72 verse, 76 chorus');
    assert.strictEqual(song2.musicalKey, 'Eb');
    assert.strictEqual(song2.timeSignature, '6/8');
    assert.strictEqual(song2.notes, 'Solo piano intro for 4 bars.');
  });

  test('New songs append to the bottom; edits do not reorder', async () => {
    const { song: s1 } = await store.createSong({ title: 'Song 1' });
    await new Promise(r => setTimeout(r, 10));
    const { song: s2 } = await store.createSong({ title: 'Song 2' });
    await new Promise(r => setTimeout(r, 10));
    const { song: s3 } = await store.createSong({ title: 'Song 3' });

    let state = store.getState();
    assert.strictEqual(state.songs[0].id, s1.id);
    assert.strictEqual(state.songs[1].id, s2.id);
    assert.strictEqual(state.songs[2].id, s3.id);

    // Edit Song 1
    await store.updateSongMetadata(s1.id, { title: 'Song 1 (Revised)' });

    state = store.getState();
    assert.strictEqual(state.songs[0].id, s1.id);
    assert.strictEqual(state.songs[0].title, 'Song 1 (Revised)');
    assert.strictEqual(state.songs[1].id, s2.id);
    assert.strictEqual(state.songs[2].id, s3.id);
    assert.strictEqual(state.songs[0].createdAt, s1.createdAt);
  });

  test('Duplicate warning warns on matching title and artist but allows intentional duplicates', async () => {
    await store.createSong({ title: 'Way Maker', artist: 'Sinach' });

    const res = await store.createSong({ title: '  way maker  ', artist: 'sinach' });
    assert.ok(res.warning, 'Expected duplicate warning');
    assert.strictEqual(store.getState().songs.length, 2);
    assert.notStrictEqual(store.getState().songs[0].id, res.song.id);
  });

  test('Metadata updates and note autosaves operate independently', async () => {
    const { song } = await store.createSong({ title: 'Great Are You Lord', notes: 'Initial notes' });

    const noteRes = await store.updateSongNotes(song.id, 'Autosaved note 1', song.updatedAt);
    assert.strictEqual(noteRes.success, true);
    assert.strictEqual(store.getState().songs.find(s => s.id === song.id)?.notes, 'Autosaved note 1');

    await store.updateSongMetadata(song.id, { title: 'Great Are You Lord (Live)' });
    const s = store.getState().songs.find(item => item.id === song.id);
    assert.strictEqual(s?.title, 'Great Are You Lord (Live)');
    assert.strictEqual(s?.notes, 'Autosaved note 1');
  });

  test('Asynchronous save guard prevents older stale save from overwriting newer edit', async () => {
    const { song } = await store.createSong({ title: 'Holy Spirit', notes: 'Version 0' });
    const staleTimestamp = song.updatedAt;

    await store.updateSongNotes(song.id, 'Version 2 (Newer)', staleTimestamp);
    await store.updateSongNotes(song.id, 'Version 1 (Stale)', staleTimestamp);

    assert.strictEqual(store.getState().songs.find(s => s.id === song.id)?.notes, 'Version 2 (Newer)');
  });

  test('Duplicate song copies all actual fields without applying new-song defaults', async () => {
    const { song } = await store.createSong({
      title: 'Cornerstone',
      artist: 'Hillsong',
      bpm: '71',
      musicalKey: 'C',
      timeSignature: '3/4',
      notes: 'Key modulation at verse 3',
    });

    const copy = await store.duplicateSong(song.id);
    assert.strictEqual(copy.title, 'Cornerstone (Copy)');
    assert.strictEqual(copy.artist, 'Hillsong');
    assert.strictEqual(copy.bpm, '71'); // Did not revert to 74
    assert.strictEqual(copy.musicalKey, 'C'); // Did not revert to unset
    assert.strictEqual(copy.timeSignature, '3/4'); // Did not revert to 4/4
    assert.strictEqual(copy.notes, song.notes);
    assert.notStrictEqual(copy.id, song.id);
    assert.ok(copy.createdAt >= song.createdAt);
  });

  test('Deleting song transactionally removes all its occurrences from current setlist', async () => {
    const { song } = await store.createSong({ title: 'O Praise The Name' });

    await store.addSongToCurrentSetlist(song.id);
    await store.addSongToCurrentSetlist(song.id); // duplicate occurrence

    assert.strictEqual(store.getState().currentSetlist.length, 2);

    await store.deleteSong(song.id);

    const state = store.getState();
    assert.strictEqual(state.songs.find(s => s.id === song.id)?.deletedAt !== null, true);
    assert.strictEqual(state.currentSetlist.length, 0);

    // Restoration returns to library without restoring setlist entries
    await store.restoreSong(song.id);
    const restoredState = store.getState();
    assert.strictEqual(restoredState.songs.find(s => s.id === song.id)?.deletedAt, null);
    assert.strictEqual(restoredState.currentSetlist.length, 0);
  });

  test('Thirty-day expiry purges songs and blocks accidental resurrection', async () => {
    const { song } = await store.createSong({ title: 'Old Song' });
    await store.deleteSong(song.id);

    store['memoryData']!.songs[0].deletedAt = Date.now() - (THIRTY_DAYS_MS + 1000);
    await store.flush();

    const purged = await store.purgeExpiredSongs();
    assert.strictEqual(purged, 1);
    assert.strictEqual(store.getState().songs.length, 0);
    assert.ok(store.getState().preferences.purgedSongIds.includes(song.id));
  });

  test('Current Setlist: add, reorder, remove with undo, and clear with undo', async () => {
    const { song: s1 } = await store.createSong({ title: 'Song A' });
    const { song: s2 } = await store.createSong({ title: 'Song B' });

    const e1 = await store.addSongToCurrentSetlist(s1.id);
    const e2 = await store.addSongToCurrentSetlist(s2.id);
    const e3 = await store.addSongToCurrentSetlist(s1.id); // Duplicate occurrence!

    assert.strictEqual(e1.songId, e3.songId);
    assert.notStrictEqual(e1.id, e3.id);
    assert.strictEqual(store.getState().currentSetlist.length, 3);

    // Reorder: e3, e1, e2
    await store.reorderCurrentSetlist([e3.id, e1.id, e2.id]);
    let list = store.getState().currentSetlist.sort((a, b) => a.position - b.position);
    assert.strictEqual(list[0].id, e3.id);
    assert.strictEqual(list[1].id, e1.id);
    assert.strictEqual(list[2].id, e2.id);

    // Remove entry e1
    const { removedEntry, formerPosition } = await store.removeCurrentSetlistEntry(e1.id);
    assert.strictEqual(formerPosition, 1);
    assert.strictEqual(store.getState().currentSetlist.length, 2);

    // Undo removal
    await store.restoreCurrentSetlistEntry(removedEntry, formerPosition);
    list = store.getState().currentSetlist.sort((a, b) => a.position - b.position);
    assert.strictEqual(list.length, 3);
    assert.strictEqual(list[1].id, e1.id);

    // Clear Setlist
    const { formerEntries } = await store.clearCurrentSetlist();
    assert.strictEqual(store.getState().currentSetlist.length, 0);
    assert.strictEqual(store.getState().songs.length, 2); // Songs remain in library!

    // Relaunch simulation: deliberately cleared list stays empty
    const store2 = new DurableStore(tempDir);
    await store2.initialize();
    assert.strictEqual(store2.getState().currentSetlist.length, 0);

    // Undo clear restores entries
    await store2.restoreClearedSetlist(formerEntries);
    assert.strictEqual(store2.getState().currentSetlist.length, 3);
  });

  test('Migration from v1: creates pre-migration snapshot, migrates active setlist to currentSetlist, preserves legacy data', async () => {
    // Create a mock v1 database on disk
    const v1Data = {
      schemaVersion: 1,
      songs: [
        {
          id: 'song_praise',
          title: 'Praise',
          artist: 'brandon lake',
          bpm: '74',
          musicalKey: 'D#',
          timeSignature: '4/4',
          notes: '',
          createdAt: 1000,
          updatedAt: 1000,
          deletedAt: null,
        },
        {
          id: 'song_gratitude',
          title: 'gratitude',
          artist: 'brandon lake',
          bpm: '232',
          musicalKey: 'Ab',
          timeSignature: '3/4',
          notes: 'no',
          createdAt: 2000,
          updatedAt: 2000,
          deletedAt: null,
        },
      ],
      setlists: [
        {
          id: 'setlist_test1',
          name: 'test1',
          date: '',
          notes: '',
          archived: false,
          createdAt: 3000,
          updatedAt: 3000,
        },
      ],
      setlistEntries: [
        { id: 'entry_1', setlistId: 'setlist_test1', songId: 'song_praise', position: 0 },
        { id: 'entry_2', setlistId: 'setlist_test1', songId: 'song_gratitude', position: 1 },
        { id: 'entry_3', setlistId: 'setlist_test1', songId: 'song_praise', position: 2 },
      ],
      preferences: {
        textSize: 'standard',
        theme: 'system',
        hasCompletedTour: true,
        recentSongIds: ['song_gratitude'],
        recentSetlistIds: ['setlist_test1'],
        dividerWidth: 320,
        purgedSongIds: [],
      },
    };

    const migrationDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setlist-migration-test-'));
    fs.writeFileSync(path.join(migrationDir, 'studio_songs_data.json'), JSON.stringify(v1Data, null, 2), 'utf-8');

    const migratedStore = new DurableStore(migrationDir);
    await migratedStore.initialize();

    const state = migratedStore.getState();
    assert.strictEqual(state.schemaVersion, 2);

    // Pre-migration snapshot must exist
    const snapshotExists = fs.existsSync(path.join(migrationDir, 'studio_songs_data.pre-v1.1.json'));
    assert.strictEqual(snapshotExists, true);

    // Exactly 1 active setlist was migrated to currentSetlist
    assert.strictEqual(state.currentSetlist.length, 3);
    assert.strictEqual(state.currentSetlist[0].songId, 'song_praise');
    assert.strictEqual(state.currentSetlist[1].songId, 'song_gratitude');
    assert.strictEqual(state.currentSetlist[2].songId, 'song_praise');

    // Legacy setlists preserved in legacySetlists
    assert.strictEqual(state.legacySetlists?.length, 1);
    assert.strictEqual(state.legacySetlists![0].name, 'test1');

    try {
      fs.rmSync(migrationDir, { recursive: true, force: true });
    } catch {}
  });
});
