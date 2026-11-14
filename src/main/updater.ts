import { UpdateCheckResult } from '../shared/types';

export const GITHUB_REPO = 'willyhay22/Setlist';
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

/**
 * Compare two semver strings (e.g. "1.3.0" and "v1.4.0").
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) =>
    v
      .replace(/^[vV]/, '')
      .trim()
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const parts1 = clean(v1);
  const parts2 = clean(v2);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export interface GitHubReleaseItem {
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  body?: string;
  published_at?: string;
}

/**
 * Parse an array of releases from GitHub and determine if an update is available.
 */
export function evaluateLatestRelease(
  releases: GitHubReleaseItem[],
  currentVersion: string
): UpdateCheckResult {
  const published = releases.filter((r) => !r.draft && !r.prerelease && r.tag_name);

  if (published.length === 0) {
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
    };
  }

  // Sort descending by semver
  published.sort((a, b) => compareSemver(b.tag_name, a.tag_name));
  const latest = published[0];

  const hasNewer = compareSemver(latest.tag_name, currentVersion) > 0;

  return {
    updateAvailable: hasNewer,
    currentVersion,
    latestVersion: latest.tag_name.replace(/^[vV]/, ''),
    releaseUrl: latest.html_url,
    releaseNotes: latest.body || '',
    publishedAt: latest.published_at,
  };
}

/**
 * Check GitHub Releases for newer versions.
 * Fails safely without throwing on network errors or offline states.
 */
export async function checkForUpdates(currentVersion: string = '1.3.0'): Promise<UpdateCheckResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(GITHUB_RELEASES_API, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': `Setlist-App/${currentVersion}`,
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
      };
    }

    if (!response.ok) {
      return {
        updateAvailable: false,
        currentVersion,
        error: `GitHub API returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return {
        updateAvailable: false,
        currentVersion,
        error: 'Unexpected response format from GitHub',
      };
    }

    return evaluateLatestRelease(data, currentVersion);
  } catch (err: any) {
    const isAbort = err.name === 'AbortError';
    return {
      updateAvailable: false,
      currentVersion,
      error: isAbort ? 'Connection timed out' : 'Could not reach GitHub (offline)',
    };
  }
}
