import { test, describe } from 'node:test';
import assert from 'node:assert';
import { smartTitleCase, formatDisplayTitle, formatDisplayArtist } from '../src/shared/formatters';
import {
  parseKeyParts,
  formatCompactKey,
  formatCompactBpm,
  formatSongRowMeta,
} from '../src/shared/keys';
import {
  songNeedsChecking,
  getNeedsCheckingFields,
  getNeedsCheckingExplanation,
  Song,
} from '../src/shared/types';

describe('Setlist v1.1 - Smart Capitalization & Formatting Tests', () => {
  test('Formats all-lowercase titles to smart title-case', () => {
    assert.strictEqual(smartTitleCase('gratitude'), 'Gratitude');
    assert.strictEqual(smartTitleCase('living hope'), 'Living Hope');
    assert.strictEqual(smartTitleCase('king of my heart'), 'King of My Heart');
    assert.strictEqual(smartTitleCase('o praise the name'), 'O Praise the Name');
    assert.strictEqual(smartTitleCase('great are you lord'), 'Great Are You Lord');
  });

  test('Formats all-lowercase artist names properly including names like McCartney or O\'Connor', () => {
    assert.strictEqual(smartTitleCase('brandon lake'), 'Brandon Lake');
    assert.strictEqual(smartTitleCase('phil wickham'), 'Phil Wickham');
    assert.strictEqual(smartTitleCase('paul mccartney'), 'Paul McCartney');
    assert.strictEqual(smartTitleCase("sinead o'connor"), "Sinead O'Connor");
  });

  test('Converts ALL CAPS to Title Case', () => {
    assert.strictEqual(smartTitleCase('AMAZING GRACE'), 'Amazing Grace');
    assert.strictEqual(smartTitleCase('ELEVATION WORSHIP'), 'Elevation Worship');
  });

  test('Preserves user deliberate mixed-casing, acronyms, and styling without repeated overrides', () => {
    assert.strictEqual(smartTitleCase('King of My Heart'), 'King of My Heart');
    assert.strictEqual(smartTitleCase('CCLI Song #1234'), 'CCLI Song #1234');
    assert.strictEqual(smartTitleCase('BPM Check IV'), 'BPM Check IV');
    assert.strictEqual(smartTitleCase('iBand Worship'), 'iBand Worship');
  });

  test('Display formatters work non-destructively on raw lowercase data', () => {
    assert.strictEqual(formatDisplayTitle('gratitude'), 'Gratitude');
    assert.strictEqual(formatDisplayArtist('brandon lake'), 'Brandon Lake');
    // Already mixed case remains as entered
    assert.strictEqual(formatDisplayTitle('Praise'), 'Praise');
  });
});

describe('Setlist v1.2 - Key & BPM Readout and Meta Tests', () => {
  test('parseKeyParts decomposes keys into prominent root and suffix', () => {
    const dSharp = parseKeyParts('D#');
    assert.strictEqual(dSharp.root, 'D♯');
    assert.strictEqual(dSharp.suffix, 'major');

    const aMinor = parseKeyParts('Am');
    assert.strictEqual(aMinor.root, 'A');
    assert.strictEqual(aMinor.suffix, 'minor');

    const unset = parseKeyParts('');
    assert.strictEqual(unset.root, 'Unset');
    assert.strictEqual(unset.suffix, '');
  });

  test('formatCompactKey formats unambiguous keys', () => {
    assert.strictEqual(formatCompactKey('D#'), 'D♯ major');
    assert.strictEqual(formatCompactKey('Am'), 'A minor');
    assert.strictEqual(formatCompactKey('Bb'), 'B♭ major');
    assert.strictEqual(formatCompactKey(''), '');
  });

  test('formatCompactBpm preserves numbers and free-text without duplicate BPM tokens', () => {
    assert.strictEqual(formatCompactBpm('74'), '74 BPM');
    assert.strictEqual(formatCompactBpm('72.5'), '72.5 BPM');
    assert.strictEqual(formatCompactBpm('74 BPM'), '74 BPM');
    assert.strictEqual(formatCompactBpm('72 verse, 76 chorus'), '72 verse, 76 chorus BPM');
    assert.strictEqual(formatCompactBpm(''), '');
  });

  test('formatSongRowMeta joins key and BPM with middle dot and leaves no stray separators', () => {
    assert.strictEqual(
      formatSongRowMeta({ musicalKey: 'D#', bpm: '74' }),
      'D♯ major · 74 BPM'
    );
    assert.strictEqual(
      formatSongRowMeta({ musicalKey: 'D#', bpm: '' }),
      'D♯ major'
    );
    assert.strictEqual(
      formatSongRowMeta({ musicalKey: '', bpm: '74' }),
      '74 BPM'
    );
    assert.strictEqual(
      formatSongRowMeta({ musicalKey: '', bpm: '' }),
      ''
    );
    assert.strictEqual(formatSongRowMeta(null), '');
  });

  test('songNeedsChecking and helpers identify pending untouched defaults', () => {
    const songDefault: Partial<Song> = {
      reviewStatus: { bpm: 'default', timeSignature: 'default' },
    };
    assert.strictEqual(songNeedsChecking(songDefault as Song), true);
    assert.deepStrictEqual(getNeedsCheckingFields(songDefault as Song), ['bpm', 'timeSignature']);
    assert.strictEqual(getNeedsCheckingExplanation(songDefault as Song), 'BPM & Time Signature');

    const songBpmOnly: Partial<Song> = {
      reviewStatus: { bpm: 'default', timeSignature: 'reviewed' },
    };
    assert.strictEqual(songNeedsChecking(songBpmOnly as Song), true);
    assert.deepStrictEqual(getNeedsCheckingFields(songBpmOnly as Song), ['bpm']);
    assert.strictEqual(getNeedsCheckingExplanation(songBpmOnly as Song), 'BPM');

    const songReviewed: Partial<Song> = {
      reviewStatus: { bpm: 'reviewed', timeSignature: 'reviewed' },
    };
    assert.strictEqual(songNeedsChecking(songReviewed as Song), false);

    const legacySong: Partial<Song> = {};
    assert.strictEqual(songNeedsChecking(legacySong as Song), false);
    assert.strictEqual(songNeedsChecking(null), false);
  });
});
