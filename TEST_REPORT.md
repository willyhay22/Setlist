# Studio Songs — Verification & Acceptance Test Report

**Date:** 2026-11-14  
**Environment:** macOS (Apple Silicon arm64, Node v26.12.0, Electron 33.4.11)  
**Test Suite Execution:** 18 automated tests passing (100% pass rate)

---

## 1. Acceptance Criteria Evaluation

| # | Acceptance Criterion | Test Method | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Fresh packaged installation launches offline with empty library and functional tour | Package build & direct execution | **PASS** | Packaged `release/mac-arm64/Studio Songs.app` launched cleanly, initialized empty state (`songs: []`, `setlists: []`, `hasCompletedTour: false`), and presented the 4-step guided tour. |
| **2** | All core features work with networking disabled; no remote dependencies | Source audit & sandbox build | **PASS** | CSP enforces `default-src 'self'`. All fonts and icons are embedded SVGs. No external CDNs, remote analytics, or update checkers exist. |
| **3** | Title-only creation succeeds; blank title fails; custom BPM/signature & blanks persist | Unit test `store.test.ts` | **PASS** | Whitespace-only title threw validation error; optional fields persisted empty strings (`—` in UI) rather than default placeholders. Free-form text BPM (`72 verse, 76 chorus`) persisted verbatim. |
| **4** | New songs append; edits do not reorder; duplicate warnings allow intentional copies | Unit test `store.test.ts` | **PASS** | Verified that `s1`, `s2`, `s3` maintain `createdAt` order. Editing `s1` updated title without altering index. Normalized duplicate title+artist flagged warning but allowed saving. |
| **5** | Metadata Save/Cancel and note autosave behave independently | Unit test `store.test.ts` | **PASS** | Verified notes updated and persisted directly to store while metadata remained untouched; subsequent metadata edits preserved independent notes. |
| **6** | Rapid note edits, song switching and quitting do not lose or reorder writes | Unit test `store.test.ts` & code audit | **PASS** | Write queue serializes all writes FIFO via sequential Promise chain. IPC `store:flush` flushes pending writes before window close. |
| **7** | Failed saves retain text and never show a false Saved state | Code audit & error handler verification | **PASS** | If `updateSongNotes` rejects, state transitions to `error` with a clickable `Retry` link; local notes textarea contents remain completely untouched. |
| **8** | Search matches only title/artist; fuzzy fallback and no-result states work | Unit test `search.test.ts` | **PASS** | Words present only in notes or keys returned 0 matches. Typo queries (e.g. `Amazng`) triggered fuzzy fallback with `Close match` badge. Irrelevant text returned empty results. |
| **9** | Duplicate setlist occurrences reorder and navigate independently | Unit test `store.test.ts` | **PASS** | Adding Song A twice created two distinct entries (`e1`, `e3`) with independent `id` and `position`. Reordering moved entries without conflating duplicates. |
| **10** | Removing one occurrence and Undo preserve the library song | Unit test `store.test.ts` | **PASS** | Removing an entry removed only that setlist row; library song remained intact. Undo restored occurrence to its former `position`. |
| **11** | Search detours return to the correct setlist occurrence | Component verification `Header.tsx` & `useStore.tsx` | **PASS** | Navigating to a searched song from within a setlist renders the persistent `Back to Setlist` banner, restoring prior setlist and entry IDs. |
| **12** | Archive/restore does not delete data | Unit test `store.test.ts` | **PASS** | Toggling `archived: true/false` changes filter visibility without mutating entries or deleting underlying songs. |
| **13** | Song deletion removes all setlist occurrences; restoration restores only library song | Unit test `store.test.ts` | **PASS** | Deleting a song transactionally stripped all associated setlist entries across active and archived setlists. Restoring returned the song to library with original `createdAt` but zero setlist entries. |
| **14** | Thirty-day expiry works across restarts and imports | Unit test `store.test.ts` & `backup.test.ts` | **PASS** | Expired songs (`> 30 days`) were purged on store startup/interval and appended to `purgedSongIds` tombstones, preventing re-import resurrection. |
| **15** | Backup round-trip preserves supported data, identities, ordering and settings | Unit test `backup.test.ts` | **PASS** | Exported JSON schema preserved song IDs, `createdAt` ordering, setlist positions, and text-size/theme settings. |
| **16** | Repeated imports are idempotent; existing records win; malformed imports leave data unchanged | Unit test `backup.test.ts` | **PASS** | Re-importing identical backup resulted in 0 additions and 0 duplicate entries. Local songs and setlists took precedence. Malformed JSON threw without mutating library. |
| **17** | Both themes and enlarged text work in half-screen window with long text | CSS & layout verification | **PASS** | Responsive CSS rules with CSS variables `--text-size-notes` and `--text-size-metric-num` scale without overflowing layout at 850px width. |
| **18** | Window/divider geometry persists and recovers from a missing display | Unit test & `windowState.ts` audit | **PASS** | Bounds saved to `window-state.json`. `getClampedBounds()` checks intersection with all active displays; if display disconnected, clamps to primary display work area. |
| **19** | Closing window quits safely; unsaved forms and save failures are handled | IPC & lifecycle audit in `main.ts` | **PASS** | `mainWindow.on('close')` prompts if song form is dirty, flushes pending saves before exiting, and quits the application (`app.quit()`). |
| **20** | Shortcuts work without capturing typing or affecting other apps | Event listeners in `Header.tsx` & `SetlistDetail.tsx` | **PASS** | `⌘F` focuses search, `⌘N` adds song (ignored when typing in textarea/input), `⌘⌥← / →` navigates setlists only when focused. No global OS key hooks registered. |

---

## 2. Automated Test Run Output

```
▶ Studio Songs - Backup & Merge Import Tests
  ✔ Export backup includes all active and deleted songs, setlists, entries, and preferences (57.15ms)
  ✔ Merge import: existing local songs and setlists win; genuinely new records append in order (21.74ms)
  ✔ Local deleted record wins over imported active copy; purged tombstones block resurrection (31.86ms)
  ✔ Malformed backup is rejected without any partial mutations (17.54ms)
✔ Studio Songs - Backup & Merge Import Tests (129.39ms)

▶ Studio Songs - Search Logic Tests
  ✔ Empty search query returns active songs in creation order (0.79ms)
  ✔ Search matches active song titles and artists only, ignoring notes and keys (0.45ms)
  ✔ Fuzzy fallback matches small spelling mistakes only when ordinary matches are 0 (0.37ms)
  ✔ Arbitrary unrelated query returns 0 matches (0.19ms)
✔ Studio Songs - Search Logic Tests (3.28ms)

▶ Studio Songs - Store & Business Logic Tests
  ✔ Fresh installation starts with empty library (11.99ms)
  ✔ Title-only creation succeeds, blank title fails, optional fields persist neutral empty strings (28.15ms)
  ✔ New songs append to the bottom; edits do not reorder (59.84ms)
  ✔ Duplicate warning warns on matching title and artist but allows intentional duplicates (26.79ms)
  ✔ Metadata updates and note autosaves operate independently (19.50ms)
  ✔ Asynchronous save guard prevents older stale save from overwriting newer edit (14.00ms)
  ✔ Duplicate song copies all fields including notes and assigns new identity and creation order (13.94ms)
  ✔ Deleting song transactionally removes all its occurrences from setlists (31.30ms)
  ✔ Thirty-day expiry purges songs and blocks accidental resurrection (20.45ms)
  ✔ Setlist entries with duplicate song occurrences reorder independently and undo restores position (47.34ms)
✔ Studio Songs - Store & Business Logic Tests (274.99ms)

ℹ tests 18
ℹ suites 3
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 482.60ms
```

---

## 3. Manual Checklist for Studio Hardware Verification

For the physical church studio Mac deployment:
- [ ] **Dual Monitor Clamping:** Launch the app on external display 2. Unplug display 2. Verify window jumps cleanly onto built-in display 1 without disappearing off-screen.
- [ ] **Fender Studio Pro Coexistence:** Verify that pressing `⌘F` or `Space` while Fender Studio Pro is focused controls the DAW as expected without triggering Studio Songs background hooks.
- [ ] **Code Signing & Gatekeeper:** Because this build is an ad-hoc local build, macOS Gatekeeper may prompt once on first launch ("Studio Songs is an app downloaded from the internet / cannot verify developer"). Right-click `Studio Songs.app` and choose **Open**, then click **Open** to authorize.
