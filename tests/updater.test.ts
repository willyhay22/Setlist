import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compareSemver, evaluateLatestRelease, GitHubReleaseItem } from '../src/main/updater';

describe('Updater - Semver Comparison', () => {
  it('identifies newer versions correctly', () => {
    assert.strictEqual(compareSemver('1.4.0', '1.3.0'), 1);
    assert.strictEqual(compareSemver('v1.3.1', '1.3.0'), 1);
    assert.strictEqual(compareSemver('2.0.0', '1.9.9'), 1);
  });

  it('identifies older versions correctly', () => {
    assert.strictEqual(compareSemver('1.2.0', '1.3.0'), -1);
    assert.strictEqual(compareSemver('v1.3.0', '1.3.1'), -1);
    assert.strictEqual(compareSemver('0.9.9', '1.0.0'), -1);
  });

  it('identifies identical versions', () => {
    assert.strictEqual(compareSemver('1.3.0', '1.3.0'), 0);
    assert.strictEqual(compareSemver('v1.3.0', '1.3.0'), 0);
    assert.strictEqual(compareSemver('1.3.0', 'v1.3.0'), 0);
  });

  it('handles prerelease suffixes gracefully', () => {
    assert.strictEqual(compareSemver('v1.4.0-beta.1', '1.3.0'), 1);
  });
});

describe('Updater - Release Evaluation', () => {
  it('detects an update when a newer published release is present', () => {
    const releases: GitHubReleaseItem[] = [
      {
        tag_name: 'v1.4.0',
        name: 'Setlist 1.4.0',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/willyhay22/Setlist/releases/tag/v1.4.0',
        body: 'Notes for v1.4.0',
        published_at: '2026-12-01T10:00:00Z',
      },
      {
        tag_name: 'v1.3.0',
        name: 'Setlist 1.3.0',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/willyhay22/Setlist/releases/tag/v1.3.0',
      },
    ];

    const result = evaluateLatestRelease(releases, '1.3.0');
    assert.strictEqual(result.updateAvailable, true);
    assert.strictEqual(result.latestVersion, '1.4.0');
    assert.strictEqual(result.releaseUrl, 'https://github.com/willyhay22/Setlist/releases/tag/v1.4.0');
    assert.strictEqual(result.releaseNotes, 'Notes for v1.4.0');
  });

  it('ignores draft and prerelease tags', () => {
    const releases: GitHubReleaseItem[] = [
      {
        tag_name: 'v2.0.0-draft',
        name: 'Setlist 2.0.0 draft',
        draft: true,
        prerelease: false,
        html_url: 'https://github.com/willyhay22/Setlist/releases/tag/v2.0.0-draft',
      },
      {
        tag_name: 'v1.5.0-beta',
        name: 'Setlist 1.5.0 beta',
        draft: false,
        prerelease: true,
        html_url: 'https://github.com/willyhay22/Setlist/releases/tag/v1.5.0-beta',
      },
      {
        tag_name: 'v1.3.0',
        name: 'Setlist 1.3.0',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/willyhay22/Setlist/releases/tag/v1.3.0',
      },
    ];

    const result = evaluateLatestRelease(releases, '1.3.0');
    assert.strictEqual(result.updateAvailable, false);
    assert.strictEqual(result.latestVersion, '1.3.0');
  });

  it('reports up to date when the latest release matches the current version', () => {
    const releases: GitHubReleaseItem[] = [
      {
        tag_name: 'v1.3.0',
        name: 'Setlist 1.3.0',
        draft: false,
        prerelease: false,
        html_url: 'https://github.com/willyhay22/Setlist/releases/tag/v1.3.0',
      },
    ];

    const result = evaluateLatestRelease(releases, '1.3.0');
    assert.strictEqual(result.updateAvailable, false);
    assert.strictEqual(result.latestVersion, '1.3.0');
  });

  it('handles empty release array cleanly', () => {
    const result = evaluateLatestRelease([], '1.3.0');
    assert.strictEqual(result.updateAvailable, false);
    assert.strictEqual(result.latestVersion, '1.3.0');
  });
});
