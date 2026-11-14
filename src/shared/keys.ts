export interface KeyOption {
  value: string;
  label: string;
  mode: 'major' | 'minor';
}

export const MUSICAL_KEYS: KeyOption[] = [
  // Major keys (Sharps)
  { value: 'C', label: 'C Major', mode: 'major' },
  { value: 'C#', label: 'C# Major', mode: 'major' },
  { value: 'D', label: 'D Major', mode: 'major' },
  { value: 'D#', label: 'D# Major', mode: 'major' },
  { value: 'E', label: 'E Major', mode: 'major' },
  { value: 'F', label: 'F Major', mode: 'major' },
  { value: 'F#', label: 'F# Major', mode: 'major' },
  { value: 'G', label: 'G Major', mode: 'major' },
  { value: 'G#', label: 'G# Major', mode: 'major' },
  { value: 'A', label: 'A Major', mode: 'major' },
  { value: 'A#', label: 'A# Major', mode: 'major' },
  { value: 'B', label: 'B Major', mode: 'major' },

  // Major keys (Flats)
  { value: 'Db', label: 'D♭ Major', mode: 'major' },
  { value: 'Eb', label: 'E♭ Major', mode: 'major' },
  { value: 'Gb', label: 'G♭ Major', mode: 'major' },
  { value: 'Ab', label: 'A♭ Major', mode: 'major' },
  { value: 'Bb', label: 'B♭ Major', mode: 'major' },
  { value: 'Cb', label: 'C♭ Major', mode: 'major' },

  // Minor keys (Sharps)
  { value: 'Am', label: 'A Minor', mode: 'minor' },
  { value: 'A#m', label: 'A# Minor', mode: 'minor' },
  { value: 'Bm', label: 'B Minor', mode: 'minor' },
  { value: 'Cm', label: 'C Minor', mode: 'minor' },
  { value: 'C#m', label: 'C# Minor', mode: 'minor' },
  { value: 'Dm', label: 'D Minor', mode: 'minor' },
  { value: 'D#m', label: 'D# Minor', mode: 'minor' },
  { value: 'Em', label: 'E Minor', mode: 'minor' },
  { value: 'Fm', label: 'F Minor', mode: 'minor' },
  { value: 'F#m', label: 'F# Minor', mode: 'minor' },
  { value: 'Gm', label: 'G Minor', mode: 'minor' },
  { value: 'G#m', label: 'G# Minor', mode: 'minor' },

  // Minor keys (Flats)
  { value: 'Bbm', label: 'B♭ Minor', mode: 'minor' },
  { value: 'Ebm', label: 'E♭ Minor', mode: 'minor' },
  { value: 'Abm', label: 'A♭ Minor', mode: 'minor' },
  { value: 'Dbm', label: 'D♭ Minor', mode: 'minor' },
  { value: 'Gbm', label: 'G♭ Minor', mode: 'minor' },
];

export function formatKeyDisplay(keyStr: string): string {
  if (!keyStr) return 'Unset';
  const found = MUSICAL_KEYS.find(k => k.value === keyStr);
  return found ? found.label : keyStr;
}

/**
 * Splits key into prominent root (e.g. "D♯", "C", "A") and secondary suffix ("major", "minor").
 * Used for selected-song readout where root is 48-56px and suffix is 18-22px.
 */
export function parseKeyParts(keyStr: string): { root: string; suffix: string } {
  if (!keyStr || !keyStr.trim()) {
    return { root: 'Unset', suffix: '' };
  }

  const found = MUSICAL_KEYS.find(k => k.value === keyStr);
  if (found) {
    // Standardize sharps to ♯ and flats to ♭ for clear musical typography
    const cleanLabel = found.label
      .replace(/#/g, '♯')
      .replace(/b(?= )/g, '♭');
    const parts = cleanLabel.split(' ');
    return {
      root: parts[0] || keyStr,
      suffix: (parts[1] || '').toLowerCase(),
    };
  }

  // Fallback for custom or direct input
  const trimmed = keyStr.trim();
  if (/m$/i.test(trimmed) && !/bpm/i.test(trimmed)) {
    return {
      root: trimmed.slice(0, -1).replace(/#/g, '♯'),
      suffix: 'minor',
    };
  }

  return {
    root: trimmed.replace(/#/g, '♯'),
    suffix: '',
  };
}

/**
 * Formats a key for compact row display, e.g. "D♯ major" or "A minor".
 */
export function formatCompactKey(keyStr: string): string {
  if (!keyStr || !keyStr.trim()) return '';
  const { root, suffix } = parseKeyParts(keyStr);
  if (root === 'Unset') return '';
  return suffix ? `${root} ${suffix}` : root;
}

/**
 * Formats BPM for compact row display, e.g. "74 BPM" or "72 verse, 76 chorus".
 * Avoids redundant duplicate "BPM BPM".
 */
export function formatCompactBpm(bpmStr: string): string {
  if (!bpmStr || !bpmStr.trim()) return '';
  const trimmed = bpmStr.trim();
  if (/bpm/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} BPM`;
}

/**
 * Combines compact key and BPM for row displays (e.g. "D♯ major · 74 BPM").
 * Leaves NO stray separators if either or both values are missing.
 */
export function formatSongRowMeta(song?: { musicalKey?: string; bpm?: string } | null): string {
  if (!song) return '';
  const keyText = formatCompactKey(song.musicalKey || '');
  const bpmText = formatCompactBpm(song.bpm || '');

  if (keyText && bpmText) {
    return `${keyText} · ${bpmText}`;
  }
  return keyText || bpmText || '';
}
