# Setlist v1.3 — Verification & Acceptance Test Report

**Date:** 2026-11-14  
**Environment:** macOS (Apple Silicon arm64, Node v26.12.0, Electron 33.4.11)  
**Test Suite Execution:** 33 automated tests passing across 5 suites (100% pass rate)

---

## 1. Acceptance Criteria Evaluation

| # | Acceptance Criterion | Test Method | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Subtle, Calm Motion:** Shared motion durations (80–180ms) and standard easing applied selectively to view navigation, modals, popovers, and buttons. | CSS inspection & layout timing audit | **PASS** | Defined `--motion-duration-micro: 90ms`, `--motion-duration-fast: 130ms`, `--motion-duration-base: 170ms` with cubic bezier deceleration. Views, modals, and popovers transition smoothly with zero layout jumps. |
| **2** | **Accessibility & Reduced Motion:** Full compliance with `@media (prefers-reduced-motion: reduce)`. | CSS audit `app.css` | **PASS** | Media query overrides all durations to `0ms` and removes movement transforms. Focus outlines remain visible and instant. |
| **3** | **Zero Animation Interference:** Song details switch atomically. Dividers track pointer directly without lag. Note typing and autosave do not remount or replay animations. | Code & component inspection | **PASS** | Song title, key, BPM, and notes update in single atomic React state updates. Resizer divider uses direct mouse/touch coordinates without transitions. Notes editor remains mounted across saves. |
| **4** | **Original macOS Application Icon:** Custom, restrained setlist icon replaces Electron default across bundle, Finder, Dock, and About. Includes editable source artwork. | Asset generation & packaging inspection | **PASS** | Designed vector icon in `resources/icon.svg`. Generated `build/icon.icns` and `build/icon.png`. Built into `Setlist.app/Contents/Resources/icon.icns`. `CFBundleIconFile` verified in `Info.plist`. Script provided in `scripts/generate-icon.sh`. |
| **5** | **Dialog Focus Trapping:** Focus enters dialogs automatically, cycles inside on Tab/Shift+Tab, and restores to opening control on dismissal. | Component inspection `useFocusTrap.ts` | **PASS** | Implemented `useFocusTrap` hook across `SongFormModal`, `SettingsModal`, `AboutModal`, `RecentlyDeletedModal`, `SongPickerModal`, and `ImportSummaryModal`. |
| **6** | **Keyboard Shortcut Shielding:** `⌘N` and `⌘F` do not trigger duplicate modals or steal focus when a dialog is already open. | Component inspection `Header.tsx` | **PASS** | `Header.tsx` keyboard handlers check for open dialog state (`songModal`, `isSettingsOpen`, `isRecentlyDeletedOpen`) and block re-triggering. Escape dismisses popovers cleanly. |
| **7** | **DAW Shortcut Protection:** Setlist shortcuts (`⌘⌥←`, `⌘⌥→`) scoped to focused window and never steal inputs from DAWs like Fender Studio Pro. | Code audit `main.ts` | **PASS** | Shortcuts are registered solely as application menu accelerators. No `globalShortcut` listener is present in the codebase. When Setlist is in the background, all keystrokes pass directly to the active DAW. |
| **8** | **Single Instance Locking:** Multiple launches focus the existing instance and prevent competing file writers. | Code audit `main.ts` | **PASS** | `app.requestSingleInstanceLock()` implemented. Secondary instances quit immediately and trigger window focus on the primary instance. |
| **9** | **Release Packaging (DMG & ZIP):** Standalone distribution packages generated for Apple Silicon with verifiable checksums. | Packaging execution & checksum audit | **PASS** | Generated `Setlist-1.3.0-arm64.dmg` (95MB) and `Setlist-1.3.0-arm64.zip` (94MB). Recorded in `release/SHA256SUMS.txt`. |
| **10** | **Ad-Hoc Signing Verification:** Accurately identified as ad-hoc signed without Apple Developer ID. | `codesign -dvv` inspection | **PASS** | `codesign -dvv` confirms `Signature=adhoc` on `arm64` binary. Gatekeeper right-click Open workflow clearly documented in User Guide and Readme. |
| **11** | **Source Repository Cleanliness:** Build artifacts, user data, and temporary files excluded from git. Continuous integration workflow created. | Git audit & `.gitignore` verification | **PASS** | Clean `.gitignore` ignoring build directories, caches, logs, and user JSON databases. Created `.github/workflows/ci.yml` and `.github/ISSUE_TEMPLATE/bug_report.md`. |
| **12** | **Sanitized Future MIDI Note:** Studio/church specific details removed from repository documentation. | File inspection `FUTURE_MIDI.md` | **PASS** | Cleaned `FUTURE_MIDI.md` to reference general studio setup and confirmed hardware constraints without private entity details. |

---

## 2. Automated Test Run Output

```
▶ Setlist v1.1 - Backup & Merge Import Tests
  ✔ Export backup includes all songs, currentSetlist, legacy recovery data, and preferences (50.60ms)
  ✔ Merge import: existing local records win, genuinely new songs append, existing setlist kept (28.26ms)
  ✔ Fresh empty library imports both songs and current setlist from backup (10.50ms)
  ✔ Backward compatibility: imports v1 backups safely (15.22ms)
  ✔ Backward compatibility: imports v2 backups safely (17.12ms)
  ✔ Malformed backup is rejected without any mutations (15.92ms)
✔ Setlist v1.1 - Backup & Merge Import Tests (138.56ms)

▶ Setlist v1.1 - Smart Capitalization & Formatting Tests
  ✔ Formats all-lowercase titles to smart title-case (2.24ms)
  ✔ Formats all-lowercase artist names properly including names like McCartney or O'Connor (0.10ms)
  ✔ Converts ALL CAPS to Title Case (0.17ms)
  ✔ Preserves user deliberate mixed-casing, acronyms, and styling without repeated overrides (0.07ms)
  ✔ Display formatters work non-destructively on raw lowercase data (0.09ms)
✔ Setlist v1.1 - Smart Capitalization & Formatting Tests (3.37ms)

▶ Setlist v1.2 - Key & BPM Readout and Meta Tests
  ✔ parseKeyParts decomposes keys into prominent root and suffix (0.20ms)
  ✔ formatCompactKey formats unambiguous keys (0.09ms)
  ✔ formatCompactBpm preserves numbers and free-text without duplicate BPM tokens (0.10ms)
  ✔ formatSongRowMeta joins key and BPM with middle dot and leaves no stray separators (0.12ms)
  ✔ songNeedsChecking and helpers identify pending untouched defaults (0.91ms)
✔ Setlist v1.2 - Key & BPM Readout and Meta Tests (1.61ms)

▶ Studio Songs - Search Logic Tests
  ✔ Empty search query returns active songs in creation order (0.71ms)
  ✔ Search matches active song titles and artists only, ignoring notes and keys (1.07ms)
  ✔ Fuzzy fallback matches small spelling mistakes only when ordinary matches are 0 (0.78ms)
  ✔ Arbitrary unrelated query returns 0 matches (0.33ms)
✔ Studio Songs - Search Logic Tests (4.53ms)

▶ Setlist v1.1 - Store & Business Logic Tests
  ✔ Fresh installation starts with empty library and empty currentSetlist (13.07ms)
  ✔ Title-only creation succeeds with v1.1 defaults (BPM 74, Time Signature 4/4, Key unset) (27.48ms)
  ✔ New songs append to the bottom; edits do not reorder (56.79ms)
  ✔ Duplicate warning warns on matching title and artist but allows intentional duplicates (23.25ms)
  ✔ Metadata updates and note autosaves operate independently (22.33ms)
  ✔ Asynchronous save guard prevents older stale save from overwriting newer edit (12.81ms)
  ✔ Duplicate song copies all actual fields without applying new-song defaults (12.94ms)
  ✔ Deleting song transactionally removes all its occurrences from current setlist (25.91ms)
  ✔ Thirty-day expiry purges songs and blocks accidental resurrection (16.82ms)
  ✔ Current Setlist: add, reorder, remove with undo, and clear with undo (47.08ms)
  ✔ Migration from v1: creates pre-migration snapshot, migrates active setlist to currentSetlist, preserves legacy data (10.64ms)
  ✔ v1.2: Default value provenance and reviewStatus tracking (39.32ms)
  ✔ v1.2: Vertical notes height preference persists and clamps (10.09ms)
✔ Setlist v1.1 - Store & Business Logic Tests (319.85ms)

ℹ tests 33
ℹ suites 5
ℹ pass 33
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 506.03ms
```
