import { test, describe } from 'node:test';
import assert from 'node:assert';
import { searchSongs } from '../src/shared/search';
import { Song } from '../src/shared/types';

describe('Studio Songs - Search Logic Tests', () => {
  const songs: Song[] = [
    {
      id: '1',
      title: 'Amazing Grace',
      artist: 'John Newton',
      bpm: '72',
      musicalKey: 'G',
      timeSignature: '3/4',
      notes: 'Mentions Bethel and guitar',
      createdAt: 1000,
      updatedAt: 1000,
      deletedAt: null,
    },
    {
      id: '2',
      title: 'Grace Like a Wave',
      artist: 'Elevation Worship',
      bpm: '128',
      musicalKey: 'E',
      timeSignature: '4/4',
      notes: 'Synth heavy',
      createdAt: 2000,
      updatedAt: 2000,
      deletedAt: null,
    },
    {
      id: '3',
      title: 'Living Hope',
      artist: 'Phil Wickham',
      bpm: '72',
      musicalKey: 'Eb',
      timeSignature: '4/4',
      notes: 'Gospel feel',
      createdAt: 3000,
      updatedAt: 3000,
      deletedAt: null,
    },
    {
      id: '4',
      title: 'Deleted Song with Grace',
      artist: 'Deleted Artist',
      bpm: '80',
      musicalKey: 'C',
      timeSignature: '4/4',
      notes: '',
      createdAt: 4000,
      updatedAt: 4000,
      deletedAt: 5000, // Deleted!
    },
  ];

  test('Empty search query returns active songs in creation order', () => {
    const results = searchSongs(songs, '');
    assert.strictEqual(results.length, 3);
    assert.strictEqual(results[0].song.id, '1');
    assert.strictEqual(results[1].song.id, '2');
    assert.strictEqual(results[2].song.id, '3');
    assert.strictEqual(results.some(r => r.song.deletedAt !== null), false);
  });

  test('Search matches active song titles and artists only, ignoring notes and keys', () => {
    // Querying notes word "Bethel" or "guitar" should return NO matches
    const noteSearch = searchSongs(songs, 'Bethel');
    assert.strictEqual(noteSearch.length, 0);

    // Querying key "Eb" should not match musicalKey field
    const keySearch = searchSongs(songs, 'Eb');
    assert.strictEqual(keySearch.length, 0);

    // Matching title "grace"
    const titleSearch = searchSongs(songs, '  grace  ');
    assert.strictEqual(titleSearch.length, 2);
    assert.strictEqual(titleSearch[0].song.id, '1');
    assert.strictEqual(titleSearch[1].song.id, '2');
    assert.strictEqual(titleSearch[0].isFuzzy, false);

    // Matching artist "Wickham"
    const artistSearch = searchSongs(songs, 'wickham');
    assert.strictEqual(artistSearch.length, 1);
    assert.strictEqual(artistSearch[0].song.title, 'Living Hope');
  });

  test('Fuzzy fallback matches small spelling mistakes only when ordinary matches are 0', () => {
    // "Amazng" has a 1-character typo for "Amazing"
    const typoSearch = searchSongs(songs, 'Amazng');
    assert.strictEqual(typoSearch.length, 1);
    assert.strictEqual(typoSearch[0].song.title, 'Amazing Grace');
    assert.strictEqual(typoSearch[0].isFuzzy, true); // visibly identified as close match

    // "Elvation" has typo for "Elevation"
    const artistTypo = searchSongs(songs, 'Elvation');
    assert.strictEqual(artistTypo.length, 1);
    assert.strictEqual(artistTypo[0].song.title, 'Grace Like a Wave');
    assert.strictEqual(artistTypo[0].isFuzzy, true);
  });

  test('Arbitrary unrelated query returns 0 matches', () => {
    const noResults = searchSongs(songs, 'xzyqwer');
    assert.strictEqual(noResults.length, 0);
  });
});
