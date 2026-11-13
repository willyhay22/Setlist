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
  if (!keyStr) return '—';
  const found = MUSICAL_KEYS.find(k => k.value === keyStr);
  return found ? found.label : keyStr;
}
