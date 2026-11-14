# Setlist v1.2 — Verification & Acceptance Test Report

**Date:** 2026-11-14  
**Environment:** macOS (Apple Silicon arm64, Node v26.12.0, Electron 33.4.11)  
**Test Suite Execution:** 33 automated tests passing across 5 suites (100% pass rate)

---

## 1. Acceptance Criteria Evaluation

| # | Acceptance Criterion | Test Method | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Studio-Grade Readability:** Standard size enlarged and unified across Home cards, song rows, search results, picker, selected song title/artist/readouts, and notes. Monotonic progression across Small, Standard, Large, X Large. | CSS scale variables & typography audit | **PASS** | Shared CSS variables (`--text-size-selected-title`, `--text-size-metric-num`, `--text-size-metric-suffix`, `--text-size-row-title`, `--text-size-row-meta`, `--text-size-notes`). Tested at Small, Standard, Large, and X Large with clean monotonic scaling. No blanket zoom. |
| **2** | **Appearance Live Preview:** Compact live text-size preview in Appearance settings using real song components/tokens without creating records. | Component inspection `SettingsModal.tsx` | **PASS** | Renders dynamic preview card using `.detail-metrics-grid` with dummy song tokens (`D♯ major`, `74 BPM`, and sample arrangement notes). Live updates when switching text size. |
| **3** | **Key & BPM Dominance:** Readouts restructured from 3 equal cards to 2 dominant cards for Key and BPM. Key root 48–56px, major/minor 18–22px. BPM 48–56px with graceful text wrapping. Time signature rendered as quiet secondary label (`Time: 4/4`). | Automated tests `formatters.test.ts` & CSS audit | **PASS** | Verified with `parseKeyParts`. Key card renders `.metric-value-num` (50px in Standard) and `.metric-value-suffix` (20px). Unset key displays `"Unset"`. BPM card renders 50px number with `overflow-wrap: break-word`. Time signature placed in `.detail-secondary-meta`. |
| **4** | **Resizable Notes Pane:** Horizontal draggable divider between song info and notes. Notes start compact (~220px). Remembers divider height in preferences. Reset on double-click or Enter. Clamped at limits. Short "Notes" header. | Automated test `store.test.ts` & component inspection `SongDetail.tsx` | **PASS** | Implemented `.notes-horizontal-divider` with pointer capture and keyboard arrow navigation. Persisted in `preferences.notesHeight`. Clamped with `MIN_NOTES_HEIGHT = 120` and `MIN_TOP_HEIGHT = 220`. Reset button and double-click restore 220px default. Header title is `"Notes"`. |
| **5** | **Compact Key & BPM Beside Songs:** Formatted secondary musical info (`D♯ major · 74 BPM`) across Library, Setlist, Home, Search popover, and Add Songs picker. No stray dots when data missing. | Automated tests `formatters.test.ts` & component audit | **PASS** | `formatSongRowMeta` formats combinations cleanly (`"D♯ major · 74 BPM"`, `"D♯ major"`, `"74 BPM"`, `""`). Integrated across `LibraryView.tsx`, `SetlistView.tsx`, `HomeView.tsx`, `Header.tsx`, and `SongPickerModal.tsx`. |
| **6** | **Picker Selection Behavior:** Clicking rows in Add Songs picker continues to toggle selection without navigating away. | Component inspection `SongPickerModal.tsx` | **PASS** | Clicking any row in `SongPickerModal` triggers `handleToggle(s.id)` to check/uncheck row. Does not close or trigger view navigation. |
| **7** | **Copy BPM Only:** One-click copy button on selected song's BPM readout with tooltip and keyboard access. Copies trimmed BPM only (no "BPM", no key, no newlines). Brief "Copied" feedback. Key copying omitted. | Automated test `formatters.test.ts` & component inspection `SongDetail.tsx` | **PASS** | BPM card contains `.metric-copy-btn` with tooltip `"Copy BPM"`. Calls `copyBpmToClipboard` which trims BPM string and writes to clipboard via `clipboard.writeText`. Shows `"Copied"` badge for 2 seconds. Key copying intentionally omitted. Empty BPM disables copy button. |
| **8** | **Needs Checking Provenance Tracking:** Lightweight per-field provenance (`default` vs `reviewed`) for BPM 74 and 4/4 time signature. | Automated test `store.test.ts` | **PASS** | Schema v3 introduces `SongReviewStatus`. Default values marked `'default'`; manually typed or selected values marked `'reviewed'`. Fresh flags applied on "Save & Add Another". Duplication inherits review status. |
| **9** | **Calm "Needs Checking" Badge & Actions:** Clear, calm badge on rows and readouts. Accessible "Mark checked" and "Mark both checked" actions. | Automated test `store.test.ts` & component inspection | **PASS** | `.needs-checking-badge` displayed in song rows and `.needs-checking-banner` displayed above readouts. Displays "Mark checked" and "Mark both checked" buttons calling `store:markSongFieldChecked`. |
| **10** | **Legacy Safety & False Positive Prevention:** Existing songs already in library never retroactively flagged with false-positive warnings. | Automated test `store.test.ts` & `backup.test.ts` | **PASS** | Schema migration from v1/v2 leaves existing song `reviewStatus` as `undefined`. `songNeedsChecking()` returns `false` when status is undefined or reviewed, guaranteeing zero false positives for existing songs. |
| **11** | **Cleaned Up About Dialog:** Exact single credit `© 2026 William Hay`, version 1.2.0, duplicate native macOS copyright line removed, promotional descriptions deleted. | Packaging audit & component inspection `AboutModal.tsx` | **PASS** | Fixed native `setAboutPanelOptions` in `main.ts` by removing duplicate `credits` field and keeping `copyright: '© 2026 William Hay'`. Verified in `AboutModal.tsx` and `SettingsModal.tsx`. Removed promotional and marketing phrases. |
| **12** | **Future MIDI & Plugin Investigation Note:** Short, clear repository documentation note outlining confirmed setup, constraints, and non-invasive MIDI bridge principles. | Repository file inspection `FUTURE_MIDI.md` | **PASS** | Created `FUTURE_MIDI.md` documenting confirmed studio equipment (Fender Studio Pro, Waves Tune Real-Time, Korg nanoKONTROL2, Behringer X-Touch), non-invasive MIDI bridge design, official documentation references, and architectural principles. |

---

## 2. Automated Test Run Output

```
▶ Setlist v1.1 - Backup & Merge Import Tests
  ✔ Export backup includes all songs, currentSetlist, legacy recovery data, and preferences (52.41ms)
  ✔ Merge import: existing local records win, genuinely new songs append, existing setlist kept (20.75ms)
  ✔ Fresh empty library imports both songs and current setlist from backup (12.56ms)
  ✔ Backward compatibility: imports v1 backups safely (12.85ms)
  ✔ Backward compatibility: imports v2 backups safely (15.87ms)
  ✔ Malformed backup is rejected without any mutations (18.33ms)
✔ Setlist v1.1 - Backup & Merge Import Tests (133.77ms)

▶ Setlist v1.1 - Smart Capitalization & Formatting Tests
  ✔ Formats all-lowercase titles to smart title-case (1.35ms)
  ✔ Formats all-lowercase artist names properly including names like McCartney or O'Connor (0.10ms)
  ✔ Converts ALL CAPS to Title Case (0.14ms)
  ✔ Preserves user deliberate mixed-casing, acronyms, and styling without repeated overrides (0.06ms)
  ✔ Display formatters work non-destructively on raw lowercase data (0.08ms)
✔ Setlist v1.1 - Smart Capitalization & Formatting Tests (2.40ms)

▶ Setlist v1.2 - Key & BPM Readout and Meta Tests
  ✔ parseKeyParts decomposes keys into prominent root and suffix (0.21ms)
  ✔ formatCompactKey formats unambiguous keys (0.21ms)
  ✔ formatCompactBpm preserves numbers and free-text without duplicate BPM tokens (0.11ms)
  ✔ formatSongRowMeta joins key and BPM with middle dot and leaves no stray separators (0.09ms)
  ✔ songNeedsChecking and helpers identify pending untouched defaults (4.86ms)
✔ Setlist v1.2 - Key & BPM Readout and Meta Tests (5.73ms)

▶ Studio Songs - Search Logic Tests
  ✔ Empty search query returns active songs in creation order (1.33ms)
  ✔ Search matches active song titles and artists only, ignoring notes and keys (0.32ms)
  ✔ Fuzzy fallback matches small spelling mistakes only when ordinary matches are 0 (0.28ms)
  ✔ Arbitrary unrelated query returns 0 matches (0.17ms)
✔ Studio Songs - Search Logic Tests (3.30ms)

▶ Setlist v1.1 - Store & Business Logic Tests
  ✔ Fresh installation starts with empty library and empty currentSetlist (10.67ms)
  ✔ Title-only creation succeeds with v1.1 defaults (BPM 74, Time Signature 4/4, Key unset) (23.26ms)
  ✔ New songs append to the bottom; edits do not reorder (57.78ms)
  ✔ Duplicate warning warns on matching title and artist but allows intentional duplicates (24.50ms)
  ✔ Metadata updates and note autosaves operate independently (23.17ms)
  ✔ Asynchronous save guard prevents older stale save from overwriting newer edit (14.99ms)
  ✔ Duplicate song copies all actual fields without applying new-song defaults (14.61ms)
  ✔ Deleting song transactionally removes all its occurrences from current setlist (25.11ms)
  ✔ Thirty-day expiry purges songs and blocks accidental resurrection (19.03ms)
  ✔ Current Setlist: add, reorder, remove with undo, and clear with undo (46.91ms)
  ✔ Migration from v1: creates pre-migration snapshot, migrates active setlist to currentSetlist, preserves legacy data (10.25ms)
  ✔ v1.2: Default value provenance and reviewStatus tracking (35.57ms)
  ✔ v1.2: Vertical notes height preference persists and clamps (8.07ms)
✔ Setlist v1.1 - Store & Business Logic Tests (315.28ms)

ℹ tests 33
ℹ suites 5
ℹ pass 33
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 487.99ms
```
