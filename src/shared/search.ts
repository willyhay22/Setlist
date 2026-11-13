import { Song } from './types';

export interface SearchResultItem {
  song: Song;
  isFuzzy: boolean;
}

export function normalizeSearch(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Levenshtein distance algorithm for reasonable fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function wordFuzzyMatch(queryWord: string, targetWords: string[]): boolean {
  if (queryWord.length < 3) {
    // Too short for fuzzy distance > 0
    return targetWords.some(tw => tw.startsWith(queryWord));
  }

  const maxDistance = queryWord.length >= 6 ? 2 : 1;

  for (const tw of targetWords) {
    // Exact word prefix match
    if (tw.startsWith(queryWord)) return true;
    // Word distance
    const dist = levenshteinDistance(queryWord, tw.slice(0, queryWord.length));
    if (dist <= maxDistance) return true;
  }

  return false;
}

export function searchSongs(songs: Song[], query: string): SearchResultItem[] {
  const normQuery = normalizeSearch(query);
  if (!normQuery) {
    // Return all active songs in default creation order (oldest first, newly added at the bottom)
    return songs
      .filter(s => s.deletedAt === null)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(song => ({ song, isFuzzy: false }));
  }

  const activeSongs = songs
    .filter(s => s.deletedAt === null)
    .sort((a, b) => a.createdAt - b.createdAt);

  const directMatches: Song[] = [];
  const queryTokens = normQuery.split(' ').filter(Boolean);

  for (const song of activeSongs) {
    const normTitle = normalizeSearch(song.title);
    const normArtist = normalizeSearch(song.artist);

    // Matches active song titles and artists only (do NOT search notes, keys, or other fields)
    const combined = `${normTitle} ${normArtist}`;

    // Direct match: all query tokens must match substring in title or artist
    const allTokensMatch = queryTokens.every(token => combined.includes(token));
    if (allTokensMatch) {
      directMatches.push(song);
    }
  }

  if (directMatches.length > 0) {
    return directMatches.map(song => ({ song, isFuzzy: false }));
  }

  // Only if there are NO ordinary matches, show reasonable fuzzy matches for small spelling mistakes
  const fuzzyMatches: Song[] = [];

  for (const song of activeSongs) {
    const normTitle = normalizeSearch(song.title);
    const normArtist = normalizeSearch(song.artist);
    const titleWords = normTitle.split(' ').filter(Boolean);
    const artistWords = normArtist.split(' ').filter(Boolean);
    const allTargetWords = [...titleWords, ...artistWords];

    // Every query token should fuzzy-match at least one target word
    const allFuzzyMatched = queryTokens.every(qToken => wordFuzzyMatch(qToken, allTargetWords));

    if (allFuzzyMatched) {
      fuzzyMatches.push(song);
    }
  }

  return fuzzyMatches.map(song => ({ song, isFuzzy: true }));
}
