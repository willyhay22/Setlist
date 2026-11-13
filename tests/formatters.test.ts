import { test, describe } from 'node:test';
import assert from 'node:assert';
import { smartTitleCase, formatDisplayTitle, formatDisplayArtist } from '../src/shared/formatters';

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
