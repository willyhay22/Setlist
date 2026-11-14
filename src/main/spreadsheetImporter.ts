import XLSX from 'xlsx';
import { SongInput, SongReviewStatus } from '../shared/types';
import { smartTitleCase } from '../shared/formatters';

export interface ParseSpreadsheetResult {
  songs: SongInput[];
  skippedCount: number;
  errors?: string[];
}

/**
 * Standardize musical key strings (e.g. "aflat" -> "Ab", "G#" -> "G#", "C minor" -> "Cm")
 */
export function normalizeMusicalKey(rawKey: string): string {
  if (!rawKey) return 'Unset';
  let key = rawKey.trim();
  if (!key || key.toLowerCase() === 'unset' || key.toLowerCase() === 'none') {
    return 'Unset';
  }

  // Handle words like "flat" or "sharp"
  key = key
    .replace(/\bflat\b/gi, 'b')
    .replace(/\bsharp\b/gi, '#')
    .replace(/\s+/g, '');

  // Handle cases like "Aflat" -> "Ab"
  key = key.replace(/([a-gA-G])(flat)/gi, '$1b').replace(/([a-gA-G])(sharp)/gi, '$1#');

  // Handle minor suffixes (e.g. "Cmin" -> "Cm", "C minor" -> "Cm")
  key = key.replace(/minor/gi, 'm').replace(/min/gi, 'm');

  // Normalize capitalization: First letter uppercase, accidental lowercase 'b' or '#', suffix 'm'
  const match = key.match(/^([a-gA-G])([#b]?)(m?)$/i);
  if (match) {
    const root = match[1].toUpperCase();
    const accidental = match[2] ? (match[2] === '#' ? '#' : 'b') : '';
    const mode = match[3].toLowerCase() === 'm' ? 'm' : '';
    return `${root}${accidental}${mode}`;
  }

  // Fallback to capitalizing first letter
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Intelligent helper to extract Key and BPM from a messy title string if not in columns.
 * e.g. "Thank God I'm Free-E 128" -> title: "Thank God I'm Free", key: "E", bpm: "128"
 * e.g. "Foundation-Ab 150" -> title: "Foundation", key: "Ab", bpm: "150"
 * e.g. "Goodbye Yesterday Aflat" -> title: "Goodbye Yesterday", key: "Ab", bpm: ""
 */
export function extractDetailsFromTitleString(rawTitle: string): {
  cleanTitle: string;
  extractedKey?: string;
  extractedBpm?: string;
} {
  let text = rawTitle.trim();
  let extractedKey: string | undefined;
  let extractedBpm: string | undefined;

  // Check for trailing BPM number (e.g. " ... 128" or " ... - 128")
  const bpmMatch = text.match(/[\s\-_]+([0-9]{2,3}(?:\.[0-9]+)?)\s*$/);
  if (bpmMatch) {
    extractedBpm = bpmMatch[1];
    text = text.substring(0, bpmMatch.index).trim();
  }

  // Check for trailing key pattern (e.g. "- C", "_Db", " Aflat", "-E", "- G", " Bb", " Cm")
  const keyMatch = text.match(/[\s\-_]+([A-Ga-g](?:[#b]|flat|sharp)?(?:m|min|minor)?)\s*$/i);
  if (keyMatch) {
    extractedKey = normalizeMusicalKey(keyMatch[1]);
    text = text.substring(0, keyMatch.index).trim();
  }

  // Clean any trailing hyphens, underscores, or colons from title
  text = text.replace(/[\-_:\s]+$/, '').trim();

  return {
    cleanTitle: text || rawTitle.trim(),
    extractedKey,
    extractedBpm,
  };
}

/**
 * Parse an Excel (.xlsx, .xls) or CSV/TSV file from a file path or buffer.
 */
export function parseSpreadsheet(source: string | Buffer): ParseSpreadsheetResult {
  let workbook: XLSX.WorkBook;

  if (typeof source === 'string') {
    workbook = XLSX.readFile(source, { raw: false });
  } else {
    workbook = XLSX.read(source, { type: 'buffer', raw: false });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { songs: [], skippedCount: 0, errors: ['Spreadsheet contains no sheets.'] };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  const songs: SongInput[] = [];
  let skippedCount = 0;

  for (const row of rows) {
    // Find matching columns by inspecting normalized key names
    let rawTitle = '';
    let rawArtist = '';
    let rawKey = '';
    let rawBpm = '';
    let rawTimeSignature = '';
    let rawNotes = '';

    for (const [colName, val] of Object.entries(row)) {
      const col = colName.toLowerCase().trim().replace(/[\s\-_]+/g, '');
      const strVal = String(val).trim();

      if (col === 'title' || col === 'song' || col === 'songtitle' || col === 'name' || col === 'track') {
        rawTitle = strVal;
      } else if (col === 'artist' || col === 'author' || col === 'composer' || col === 'band' || col === 'writer') {
        rawArtist = strVal;
      } else if (col === 'key' || col === 'musicalkey' || col === 'tonality' || col === 'scale') {
        rawKey = strVal;
      } else if (col === 'bpm' || col === 'tempo' || col === 'speed') {
        rawBpm = strVal;
      } else if (col === 'timesignature' || col === 'timesig' || col === 'meter' || col === 'time') {
        rawTimeSignature = strVal;
      } else if (col === 'notes' || col === 'note' || col === 'arrangement' || col === 'comments' || col === 'cues') {
        rawNotes = strVal;
      }
    }

    // If first row was unmapped or headers were missing, check if row has array-like keys (e.g. __EMPTY)
    if (!rawTitle) {
      for (const [colName, val] of Object.entries(row)) {
        const strVal = String(val).trim();
        if (strVal && !rawTitle) {
          rawTitle = strVal;
        }
      }
    }

    if (!rawTitle) {
      skippedCount++;
      continue;
    }

    // Check if title has embedded key/BPM if they were not supplied in dedicated columns
    let finalTitle = rawTitle;
    let finalKey = rawKey;
    let finalBpm = rawBpm;

    if (!finalKey || !finalBpm) {
      const extracted = extractDetailsFromTitleString(rawTitle);
      if (!finalKey && extracted.extractedKey) {
        finalKey = extracted.extractedKey;
        finalTitle = extracted.cleanTitle;
      }
      if (!finalBpm && extracted.extractedBpm) {
        finalBpm = extracted.extractedBpm;
        finalTitle = extracted.cleanTitle;
      }
    }

    const reviewStatus: SongReviewStatus = {
      bpm: finalBpm ? 'reviewed' : 'default',
      timeSignature: rawTimeSignature ? 'reviewed' : 'default',
    };

    const songInput: SongInput = {
      title: smartTitleCase(finalTitle),
      artist: rawArtist ? smartTitleCase(rawArtist) : '',
      musicalKey: normalizeMusicalKey(finalKey),
      bpm: finalBpm || '74',
      timeSignature: rawTimeSignature || '4/4',
      notes: rawNotes || '',
      reviewStatus,
    };

    songs.push(songInput);
  }

  return { songs, skippedCount };
}

/**
 * Generate a pre-styled Excel (.xlsx) template workbook buffer.
 */
export function generateTemplateWorkbookBuffer(): Buffer {
  const wb = XLSX.utils.book_new();

  const headers = ['Title', 'Artist', 'Key', 'BPM', 'Time Signature', 'Notes'];
  const sampleData = [
    headers,
    ['Amazing Grace', 'John Newton', 'G', '74', '4/4', 'Acoustic intro, build dynamics in V3.'],
    ['Holy Forever', 'Chris Tomlin', 'E', '144', '4/4', 'Lead synth pad into full band chorus.'],
    ['Is He Worthy', 'Andrew Peterson', 'G', '68', '4/4', 'Call and response verses.'],
    ['Yeshua', 'Jesus Image', 'G', '136', '4/4', 'Extended instrumental bridge.'],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 28 }, // Title
    { wch: 22 }, // Artist
    { wch: 10 }, // Key
    { wch: 10 }, // BPM
    { wch: 16 }, // Time Signature
    { wch: 45 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Setlist Songs');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate a CSV template string.
 */
export function generateTemplateCsv(): string {
  return `Title,Artist,Key,BPM,Time Signature,Notes
Amazing Grace,John Newton,G,74,4/4,"Acoustic intro, build dynamics in V3."
Holy Forever,Chris Tomlin,E,144,4/4,"Lead synth pad into full band chorus."
Is He Worthy,Andrew Peterson,G,68,4/4,"Call and response verses."
Yeshua,Jesus Image,G,136,4/4,"Extended instrumental bridge."
`;
}
