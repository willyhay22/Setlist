const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'en', 'for', 'if', 'in',
  'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'v', 'vs', 'via', 'with'
]);

// Checks if a string has intentional mixed-case (e.g. "King of My Heart", "McCartney", "CCLI")
export function isAllLower(str: string): boolean {
  const letters = str.replace(/[^\p{L}]/gu, '');
  return letters.length > 0 && str === str.toLowerCase();
}

export function isAllCaps(str: string): boolean {
  const letters = str.replace(/[^\p{L}]/gu, '');
  return letters.length > 1 && str === str.toUpperCase();
}

/**
 * Smart title-casing for titles and names.
 * Preserves deliberate acronyms, mixed casing, and special artist punctuation.
 * Automatically formats all-lowercase or all-caps input.
 */
export function smartTitleCase(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If the user already typed deliberate mixed-casing (neither all-lower nor all-caps),
  // keep user casing authoritative!
  if (!isAllLower(trimmed) && !isAllCaps(trimmed)) {
    return trimmed;
  }

  // Split on words while preserving whitespace/hyphens
  const words = trimmed.toLowerCase().split(/(\s+|-|\/)/);

  let wordIndex = 0;
  const result = words.map((word) => {
    // If it's whitespace or punctuation, return as-is
    if (!word || /^\s+$/.test(word) || word === '-' || word === '/') {
      return word;
    }

    const currentIdx = wordIndex++;
    const isFirstOrLast = currentIdx === 0;

    // Check McX or O'X names
    if (/^mc[a-z]/i.test(word)) {
      return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3);
    }
    if (/^o'[a-z]/i.test(word)) {
      return "O'" + word.charAt(2).toUpperCase() + word.slice(3);
    }

    // Lowercase minor words unless it's the first word
    if (!isFirstOrLast && MINOR_WORDS.has(word)) {
      return word.toLowerCase();
    }

    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return result.join('');
}

/**
 * Display formatter: formats titles without altering the stored raw database value.
 */
export function formatDisplayTitle(title: string): string {
  if (!title) return '';
  // If stored in all lowercase, present formatted
  if (isAllLower(title) || isAllCaps(title)) {
    return smartTitleCase(title);
  }
  return title;
}

/**
 * Display formatter: formats artist names without altering stored raw database value.
 */
export function formatDisplayArtist(artist: string): string {
  if (!artist) return '';
  if (isAllLower(artist) || isAllCaps(artist)) {
    return smartTitleCase(artist);
  }
  return artist;
}
