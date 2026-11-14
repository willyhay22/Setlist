import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeMusicalKey,
  extractDetailsFromTitleString,
  parseSpreadsheet,
  generateTemplateWorkbookBuffer,
  generateTemplateCsv,
} from '../src/main/spreadsheetImporter';

describe('Spreadsheet Importer - Key Normalization', () => {
  it('normalizes common flats and sharps', () => {
    assert.strictEqual(normalizeMusicalKey('Aflat'), 'Ab');
    assert.strictEqual(normalizeMusicalKey('B flat'), 'Bb');
    assert.strictEqual(normalizeMusicalKey('csharp'), 'C#');
    assert.strictEqual(normalizeMusicalKey('F sharp'), 'F#');
    assert.strictEqual(normalizeMusicalKey('Db'), 'Db');
    assert.strictEqual(normalizeMusicalKey('Gb'), 'Gb');
    assert.strictEqual(normalizeMusicalKey('E'), 'E');
  });

  it('normalizes minor keys', () => {
    assert.strictEqual(normalizeMusicalKey('Cm'), 'Cm');
    assert.strictEqual(normalizeMusicalKey('c minor'), 'Cm');
    assert.strictEqual(normalizeMusicalKey('F#m'), 'F#m');
    assert.strictEqual(normalizeMusicalKey('Am'), 'Am');
  });

  it('returns Unset for empty or unset keys', () => {
    assert.strictEqual(normalizeMusicalKey(''), 'Unset');
    assert.strictEqual(normalizeMusicalKey('unset'), 'Unset');
    assert.strictEqual(normalizeMusicalKey('none'), 'Unset');
  });
});

describe('Spreadsheet Importer - Embedded Details Extraction', () => {
  it('extracts key and BPM from trailing formatted strings', () => {
    const res1 = extractDetailsFromTitleString("Thank God I'm Free-E 128");
    assert.strictEqual(res1.cleanTitle, "Thank God I'm Free");
    assert.strictEqual(res1.extractedKey, 'E');
    assert.strictEqual(res1.extractedBpm, '128');

    const res2 = extractDetailsFromTitleString('Foundation-Ab 150');
    assert.strictEqual(res2.cleanTitle, 'Foundation');
    assert.strictEqual(res2.extractedKey, 'Ab');
    assert.strictEqual(res2.extractedBpm, '150');

    const res3 = extractDetailsFromTitleString('Goodbye Yesterday Aflat');
    assert.strictEqual(res3.cleanTitle, 'Goodbye Yesterday');
    assert.strictEqual(res3.extractedKey, 'Ab');
    assert.strictEqual(res3.extractedBpm, undefined);

    const res4 = extractDetailsFromTitleString('Firefall - C');
    assert.strictEqual(res4.cleanTitle, 'Firefall');
    assert.strictEqual(res4.extractedKey, 'C');
  });
});

describe('Spreadsheet Importer - Parsing & Templates', () => {
  it('parses CSV data with various columns', () => {
    const csvContent = Buffer.from(
      `Title,Artist,Key,BPM,Time Signature,Notes\n` +
      `Living Hope,Phil Wickham,Eb,71,4/4,Acoustic lead\n` +
      `Way Maker,Sinach,E,68,4/4,Piano start\n`
    );

    const result = parseSpreadsheet(csvContent);
    assert.strictEqual(result.songs.length, 2);
    assert.strictEqual(result.songs[0].title, 'Living Hope');
    assert.strictEqual(result.songs[0].artist, 'Phil Wickham');
    assert.strictEqual(result.songs[0].musicalKey, 'Eb');
    assert.strictEqual(result.songs[0].bpm, '71');
    assert.strictEqual(result.songs[0].reviewStatus?.bpm, 'reviewed');
    assert.strictEqual(result.songs[0].notes, 'Acoustic lead');
  });

  it('marks default values provenance when fields are missing in spreadsheet', () => {
    const csvContent = Buffer.from(
      `Title,Artist\n` +
      `Simple Song,Simple Artist\n`
    );

    const result = parseSpreadsheet(csvContent);
    assert.strictEqual(result.songs.length, 1);
    assert.strictEqual(result.songs[0].title, 'Simple Song');
    assert.strictEqual(result.songs[0].bpm, '74');
    assert.strictEqual(result.songs[0].reviewStatus?.bpm, 'default');
    assert.strictEqual(result.songs[0].musicalKey, 'Unset');
  });

  it('generates a valid template workbook buffer', () => {
    const buf = generateTemplateWorkbookBuffer();
    assert.ok(buf.length > 0);
    const parsed = parseSpreadsheet(buf);
    assert.ok(parsed.songs.length >= 4);
    assert.strictEqual(parsed.songs[0].title, 'Amazing Grace');
  });

  it('generates a valid CSV template', () => {
    const csv = generateTemplateCsv();
    assert.ok(csv.includes('Amazing Grace'));
    assert.ok(csv.includes('Holy Forever'));
  });
});
