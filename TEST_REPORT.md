# Setlist v1.1 — Verification & Acceptance Test Report

**Date:** 2026-11-14  
**Environment:** macOS (Apple Silicon arm64, Node v26.12.0, Electron 33.4.11)  
**Test Suite Execution:** 25 automated tests passing (100% pass rate)

---

## 1. Acceptance Criteria Evaluation

| # | Acceptance Criterion | Test Method | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | App renamed to Setlist across branding, bundle, dock, window title, and native menus | Packaging & metadata audit | **PASS** | `Setlist.app` generated. `CFBundleDisplayName` and `CFBundleName` set to `Setlist`. Native application menu labeled `Setlist`; song menu labeled `Song`. |
| **2** | Exact credit `© 2026 William Hay` and version in About panel | Component inspection & menu audit | **PASS** | Verified in `AboutModal.tsx` and native macOS About dialog: displays exact string `© 2026 William Hay`, version 1.1.0, and build 2026.11. |
| **3** | User data location preserved at `~/Library/Application Support/Studio Songs` | Code audit & store initialization | **PASS** | `app.setPath('userData', path.join(app.getPath('appData'), 'Studio Songs'))` explicitly guarantees the existing database path is preserved. |
| **4** | Pre-v1.1 migration snapshot created and single setlist migrated | Automated test `store.test.ts` | **PASS** | Stores snapshot `studio_songs_data.pre-v1.1.json`. Migrates active setlist to `currentSetlist` and keeps legacy setlists under `legacySetlists`. |
| **5** | Song header wrapping fixed: no 1-character vertical columns | CSS & responsive layout verification | **PASS** | Title/artist occupies a dedicated full-width flex column with `word-break: normal; overflow-wrap: break-word;`. Action buttons placed in a separate row beneath. Verified at 780px and 900px window widths. |
| **6** | Action bar hierarchy: `+ Add to Setlist` and `Edit Details` discoverable; `More ▾` dropdown for secondary actions | Component inspection `SongDetail.tsx` | **PASS** | Action row features direct `+ Add to Setlist`, `Edit Details`, and a `More ▾` button containing `Duplicate Song` and `Delete Song`. |
| **7** | Refined song list rows with clean hierarchy and no oversized gaps | CSS & component inspection `LibraryView.tsx` | **PASS** | Consistent padding, restrained hover/selected states, graceful title truncation, and clean handling of songs without an artist. |
| **8** | Song form clean labels and no sample placeholder text | Component inspection `SongFormModal.tsx` | **PASS** | Removed all placeholder examples ("e.g. Living Hope", "e.g. Phil Wickham"). Persistent labels with clean inputs. |
| **9** | Practical defaults for new songs: BPM 74, Time Signature 4/4, Key Unset | Automated test `store.test.ts` | **PASS** | Verified new songs created with title-only receive `bpm: "74"`, `timeSignature: "4/4"`, `musicalKey: ""`. Keys render as neutral `"Unset"`. |
| **10** | Smart title casing on blur/save for lowercase inputs while keeping deliberate styling | Automated test `formatters.test.ts` | **PASS** | `gratitude` → `Gratitude`, `brandon lake` → `Brandon Lake`. Deliberate mixed casing like `King of My Heart`, `CCLI`, and `McCartney` are preserved verbatim. |
| **11** | Duplicating a song copies real values, not new-song defaults | Automated test `store.test.ts` | **PASS** | Cloned song retains original custom key, BPM, and time signature with `(Copy)` appended to title. |
| **12** | Single persistent Current Setlist replaces multi-setlist collections | Automated test `store.test.ts` & UI audit | **PASS** | Removed "All Setlists", "Create Setlist", and "Recent Setlists". View renders a unified, ordered service list with positions. |
| **13** | Drag-and-drop and accessible keyboard reordering in Setlist | Component inspection `SetlistView.tsx` | **PASS** | Drag handle reorders entries; accessible `↑` and `↓` buttons allow keyboard-friendly position adjustments. |
| **14** | Clear Setlist button disabled when empty, confirms with exact prompt, supports 6s Undo | Automated test `store.test.ts` & UI audit | **PASS** | Button disabled if 0 entries. Prompts *"Clear the current setlist? Your songs will stay in the library."* 6-second undo toast restores exact entries and order. |
| **15** | Non-disruptive search popover on Home and Setlist | Component inspection `Header.tsx` | **PASS** | Invoking search on Home or Setlist renders an anchored popover dropdown directly beneath search input with keyboard navigation and direct `+ Add to Setlist` action. |
| **16** | Guided tour anchored directly to real controls | Component inspection `GuidedTour.tsx` | **PASS** | Tooltips calculate bounding box of DOM elements (`[data-tour="..."]`) via `getBoundingClientRect()`. Includes Skip, Next, Back, and Finish controls. |
| **17** | Streamlined Settings modal with tabs: Appearance, Library & Backups, Help & About | Component inspection `SettingsModal.tsx` | **PASS** | In-window modal with tabs. Standard labels ("Settings", "Text size"). Backup export/import and tour replay accessible. |
| **18** | Backup merge import supports v1 and v2 formats | Automated test `backup.test.ts` | **PASS** | Backward compatible with v1 backups; correctly parses both `currentSetlist` and legacy `setlists` without throwing or data loss. |
| **19** | Full native macOS menu bar with standard shortcuts | Code audit `main.ts` | **PASS** | Menus for `Setlist`, `File`, `Edit`, `View`, `Song`, `Window`, and `Help` implemented with shortcuts (`⌘N`, `⌘S`, `⌘,`, `⌘W`, `⌘Q`, `⌘⌥←/→`). |
| **20** | 100% offline guarantee: zero external requests or telemetry | Source audit & CSP | **PASS** | CSP strictly enforces `default-src 'self'`. All icons/fonts are bundled locally. Zero external network calls. |

---

## 2. Automated Test Run Output

```
▶ Setlist v1.1 - Backup & Merge Import Tests
  ✔ Export backup includes all songs, currentSetlist, legacy recovery data, and preferences (61.50ms)
  ✔ Merge import: existing local records win, genuinely new songs append, existing setlist kept (38.20ms)
  ✔ Fresh empty library imports both songs and current setlist from backup (18.17ms)
  ✔ Backward compatibility: imports v1 backups safely (20.63ms)
  ✔ Malformed backup is rejected without any mutations (24.25ms)
✔ Setlist v1.1 - Backup & Merge Import Tests (166.05ms)

▶ Setlist v1.1 - Smart Capitalization & Formatting Tests
  ✔ Formats all-lowercase titles to smart title-case (1.86ms)
  ✔ Formats all-lowercase artist names properly including names like McCartney or O'Connor (0.59ms)
  ✔ Converts ALL CAPS to Title Case (0.34ms)
  ✔ Preserves user deliberate mixed-casing, acronyms, and styling without repeated overrides (1.34ms)
  ✔ Display formatters work non-destructively on raw lowercase data (0.25ms)
✔ Setlist v1.1 - Smart Capitalization & Formatting Tests (6.29ms)

▶ Studio Songs - Search Logic Tests
  ✔ Empty search query returns active songs in creation order (1.51ms)
  ✔ Search matches active song titles and artists only, ignoring notes and keys (1.10ms)
  ✔ Fuzzy fallback matches small spelling mistakes only when ordinary matches are 0 (0.79ms)
  ✔ Arbitrary unrelated query returns 0 matches (0.58ms)
✔ Studio Songs - Search Logic Tests (14.03ms)

▶ Setlist v1.1 - Store & Business Logic Tests
  ✔ Fresh installation starts with empty library and empty currentSetlist (21.74ms)
  ✔ Title-only creation succeeds with v1.1 defaults (BPM 74, Time Signature 4/4, Key unset) (37.72ms)
  ✔ New songs append to the bottom; edits do not reorder (69.43ms)
  ✔ Duplicate warning warns on matching title and artist but allows intentional duplicates (25.52ms)
  ✔ Metadata updates and note autosaves operate independently (26.51ms)
  ✔ Asynchronous save guard prevents older stale save from overwriting newer edit (17.70ms)
  ✔ Duplicate song copies all actual fields without applying new-song defaults (18.52ms)
  ✔ Deleting song transactionally removes all its occurrences from current setlist (35.90ms)
  ✔ Thirty-day expiry purges songs and blocks accidental resurrection (21.40ms)
  ✔ Current Setlist: add, reorder, remove with undo, and clear with undo (54.82ms)
  ✔ Migration from v1: creates pre-migration snapshot, migrates active setlist to currentSetlist, preserves legacy data (7.80ms)
✔ Setlist v1.1 - Store & Business Logic Tests (340.41ms)

ℹ tests 25
ℹ suites 4
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 637.56ms
```
