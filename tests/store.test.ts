import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DurableStore, THIRTY_DAYS_MS } from '../src/main/store';
import { searchSongs } from '../src/shared/search';

describe('Studio Songs - Store & Business Logic Tests', () => {
  let tempDir: string;
  let store: DurableStore;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-songs-test-'));
    store = new DurableStore(tempDir);
    await store.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('Fresh installation starts with empty library', async () => {
    const state = store.getState();
    assert.strictEqual(state.songs.length, 0);
    assert.strictEqual(state.setlists.length, 0);
    assert.strictEqual(state.setlistEntries.length, 0);
    assert.strictEqual(state.preferences.hasCompletedTour, false);
  });

  test('Title-only creation succeeds, blank title fails, optional fields persist neutral empty strings', async () => {
    // Blank title should throw
    await assert.rejects(
      async () => store.createSong({ title: '   ' }),
      /Title is required/
    );

    // Title-only creation
    const { song } = await store.createSong({ title: 'Amazing Grace' });
    assert.strictEqual(song.title, 'Amazing Grace');
    assert.strictEqual(song.artist, '');
    assert.strictEqual(song.bpm, '');
    assert.strictEqual(song.musicalKey, '');
    assert.strictEqual(song.timeSignature, '');
    assert.strictEqual(song.notes, '');
    assert.strictEqual(song.deletedAt, null);
    assert.ok(song.createdAt > 0);

    // Custom BPM and time signature
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
    // Slight delay to ensure distinct createdAt timestamps
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
    assert.strictEqual(state.songs[0].createdAt, s1.createdAt); // Creation order unchanged!
  });

  test('Duplicate warning warns on matching title and artist but allows intentional duplicates', async () => {
    await store.createSong({ title: 'Way Maker', artist: 'Sinach' });

    // Try creating duplicate with matching normalized title and artist
    const res = await store.createSong({ title: '  way maker  ', artist: 'sinach' });
    assert.ok(res.warning, 'Expected duplicate warning');
    assert.strictEqual(store.getState().songs.length, 2);
    assert.notStrictEqual(store.getState().songs[0].id, res.song.id);
  });

  test('Metadata updates and note autosaves operate independently', async () => {
    const { song } = await store.createSong({ title: 'Great Are You Lord', notes: 'Initial notes' });

    // Update notes directly
    const noteRes = await store.updateSongNotes(song.id, 'Autosaved note 1', song.updatedAt);
    assert.strictEqual(noteRes.success, true);
    assert.strictEqual(store.getState().songs.find(s => s.id === song.id)?.notes, 'Autosaved note 1');

    // Update metadata
    await store.updateSongMetadata(song.id, { title: 'Great Are You Lord (Live)' });
    const s = store.getState().songs.find(item => item.id === song.id);
    assert.strictEqual(s?.title, 'Great Are You Lord (Live)');
    assert.strictEqual(s?.notes, 'Autosaved note 1'); // Notes intact!
  });

  test('Asynchronous save guard prevents older stale save from overwriting newer edit', async () => {
    const { song } = await store.createSong({ title: 'Holy Spirit', notes: 'Version 0' });
    const staleTimestamp = song.updatedAt;

    // Newer save completes at T1
    await store.updateSongNotes(song.id, 'Version 2 (Newer)', staleTimestamp);

    // Older stale save with clientUpdatedAt from Version 0 arrives
    await store.updateSongNotes(song.id, 'Version 1 (Stale)', staleTimestamp);

    // Store should retain Version 2
    assert.strictEqual(store.getState().songs.find(s => s.id === song.id)?.notes, 'Version 2 (Newer)');
  });

  test('Duplicate song copies all fields including notes and assigns new identity and creation order', async () => {
    const { song } = await store.createSong({
      title: 'Cornerstone',
      artist: 'Hillsong',
      bpm: '71',
      musicalKey: 'C',
      timeSignature: '4/4',
      notes: 'Key modulation at verse 3',
    });

    const copy = await store.duplicateSong(song.id);
    assert.strictEqual(copy.title, 'Cornerstone (Copy)');
    assert.strictEqual(copy.artist, song.artist);
    assert.strictEqual(copy.bpm, song.bpm);
    assert.strictEqual(copy.musicalKey, song.musicalKey);
    assert.strictEqual(copy.timeSignature, song.timeSignature);
    assert.strictEqual(copy.notes, song.notes);
    assert.notStrictEqual(copy.id, song.id);
    assert.ok(copy.createdAt >= song.createdAt);
  });

  test('Deleting song transactionally removes all its occurrences from setlists', async () => {
    const { song } = await store.createSong({ title: 'O Praise The Name' });
    const setlist = await store.createSetlist({ name: 'Sunday Service' });

    await store.addSongToSetlist(setlist.id, song.id);
    await store.addSongToSetlist(setlist.id, song.id); // duplicate occurrence

    assert.strictEqual(store.getState().setlistEntries.length, 2);

    // Delete song
    await store.deleteSong(song.id);

    const state = store.getState();
    assert.strictEqual(state.songs.find(s => s.id === song.id)?.deletedAt !== null, true);
    assert.strictEqual(state.setlistEntries.length, 0); // Removed transactionally!

    // Restoring returns song to library without restoring former setlist entries
    await store.restoreSong(song.id);
    const restoredState = store.getState();
    assert.strictEqual(restoredState.songs.find(s => s.id === song.id)?.deletedAt, null);
    assert.strictEqual(restoredState.setlistEntries.length, 0);
  });

  test('Thirty-day expiry purges songs and blocks accidental resurrection', async () => {
    const { song } = await store.createSong({ title: 'Old Song' });
    await store.deleteSong(song.id);

    // Artificially age the deletedAt timestamp beyond 30 days
    store['memoryData']!.songs[0].deletedAt = Date.now() - (THIRTY_DAYS_MS + 1000);
    await store.flush();

    const purged = await store.purgeExpiredSongs();
    assert.strictEqual(purged, 1);
    assert.strictEqual(store.getState().songs.length, 0);
    assert.ok(store.getState().preferences.purgedSongIds.includes(song.id));
  });

  test('Setlist entries with duplicate song occurrences reorder independently and undo restores position', async () => {
    const { song: s1 } = await store.createSong({ title: 'Song A' });
    const { song: s2 } = await store.createSong({ title: 'Song B' });
    const sl = await store.createSetlist({ name: 'Easter 2026' });

    const e1 = await store.addSongToSetlist(sl.id, s1.id);
    const e2 = await store.addSongToSetlist(sl.id, s2.id);
    const e3 = await store.addSongToSetlist(sl.id, s1.id); // Same song again!

    assert.strictEqual(e1.songId, e3.songId);
    assert.notStrictEqual(e1.id, e3.id); // Unique occurrence ID!

    // Reorder: e3, e1, e2
    await store.reorderSetlistEntries(sl.id, [e3.id, e1.id, e2.id]);
    let entries = store.getState().setlistEntries.sort((a, b) => a.position - b.position);
    assert.strictEqual(entries[0].id, e3.id);
    assert.strictEqual(entries[1].id, e1.id);
    assert.strictEqual(entries[2].id, e2.id);

    // Remove entry e1
    const { removedEntry, formerPosition } = await store.removeSetlistEntry(e1.id);
    assert.strictEqual(formerPosition, 1);
    assert.strictEqual(store.getState().setlistEntries.length, 2);

    // Undo restore e1 back to former position
    await store.restoreSetlistEntry(removedEntry, formerPosition);
    entries = store.getState().setlistEntries.sort((a, b) => a.position - b.position);
    assert.strictEqual(entries.length, 3);
    assert.strictEqual(entries[1].id, e1.id);
  });
});
