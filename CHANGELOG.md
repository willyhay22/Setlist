# Changelog

All notable changes to **Setlist** are documented in this file.

---

## [1.4.0] - 2026-11-14

### Added
- **Spreadsheet Batch Import (Excel & CSV):** Bulk import song catalogs directly from Excel workbooks (`.xlsx`, `.xls`) or CSV files. Automatically maps common column variations (`Title`, `Artist`, `Key`, `BPM`, `Time Signature`, `Notes`), smart title-cases names, normalizes musical keys (e.g. `Aflat` → `Ab`, `c minor` → `Cm`), and assigns default value review tracking.
- **Embedded Title Parsing:** Intelligent fallback that extracts musical key and tempo from title strings if separate columns were omitted (e.g. `Thank God I'm Free-E 128` → Title: `Thank God I'm Free`, Key: `E`, BPM: `128`).
- **Starter Import Templates:** Bundled starter templates (`Setlist_Song_Import_Template.xlsx` and `Setlist_Song_Import_Template.csv`) downloadable directly within the app or from the GitHub repository.
- **Native Menu & Settings Integration:** Added `Import Spreadsheet (Excel / CSV)…` and `Save Spreadsheet Template…` to both the native macOS `File` menu and the **Settings → Library & Backups** tab.
- **Automated `afterPack` Code Signing Hook:** Implemented deep ad-hoc signing (`codesign --force --deep --sign -`) across all internal helper binaries and frameworks during packaging to eliminate macOS Gatekeeper damaged-app false positives.

---

## [1.3.0] - 2026-11-14

### Added
- **Original macOS Application Icon:** Restrained studio-grade icon featuring layered setlist cards and musical notation compiled to native `.icns` and PNG assets, configured for Finder, Dock, and About dialogs. Includes editable vector source artwork (`resources/icon.svg`) and automated build script (`scripts/generate-icon.sh`).
- **Subtle, Calm Interface Motion:** Shared motion durations and standard macOS easing tokens (`--motion-duration-micro: 90ms`, `--motion-duration-fast: 130ms`, `--motion-duration-base: 170ms`) applied selectively to navigation transitions, modal dialogs, search popovers, dropdown menus, button states, and setlist reordering.
- **Accessibility & Reduced Motion:** Full support for `@media (prefers-reduced-motion: reduce)` disabling nonessential animation while preserving immediate state changes and visible focus rings.
- **Accessible Dialog Focus Management:** Reusable `useFocusTrap` hook trapping Tab / Shift+Tab navigation within open modal dialogs, auto-focusing primary inputs, and restoring focus to trigger elements upon dismissal.
- **Keyboard Shortcut Shielding:** Scoped `⌘N` (Add Song) and `⌘F` (Find Song) shortcuts so dialog workflows are not interrupted by duplicate triggers or lost focus.
- **GitHub Preparation:**
  - Automated GitHub Actions continuous integration workflow (`.github/workflows/ci.yml`) validating lockfile installation, automated tests, and production compilation.
  - Comprehensive `.gitignore` filtering build artifacts, user databases, caches, and logs.
  - Standardized bug report template (`.github/ISSUE_TEMPLATE/bug_report.md`).
  - Pre-packaged Apple Silicon macOS release installer (`Setlist-1.3.0-arm64.dmg`) and standalone archive (`Setlist-1.3.0-arm64.zip`) with verifiable SHA-256 checksums.

### Improved
- Button dimension stability: Added minimum width to the **Copy BPM** button to prevent subtle header layout shifts between "Copy BPM" and "Copied" states.
- Notes save status alignment: Stabilized save status indicator width to eliminate layout jitter during autosaves.
- Setlist reordering: Visual position transition and highlight when moving songs using keyboard buttons or drag-and-drop.

---

## [1.2.0] - 2026-11-14

### Added
- **Studio-Grade Readability:** Visually enlarged `Standard` text size across Home cards, Library and Setlist rows, search popovers, picker, selected song title/artist, and arrangement notes.
- **Dominant Musical Readouts:** Restructured musical details into two primary focal cards for Key (root 48–56px, major/minor 18–22px) and BPM (48–56px with graceful word wrapping).
- **Secondary Time Signature:** Rendered as a quiet supporting label (`Time: 4/4`) beneath dominant cards.
- **Resizable Arrangement Notes:** Horizontal draggable resizer bar between song details and notes pane with durable persistence in preferences, clamping limits (120px min notes, 220px min top pane), and double-click / keyboard reset.
- **Compact List Metadata:** Formatted musical metadata (`D♯ major · 74 BPM`) displayed on song rows across Library, Setlist, Home, and Search popovers.
- **Copy BPM Only:** One-click copy button on selected song's BPM readout copying only trimmed tempo values (no "BPM", no key, no newlines) with brief "Copied" confirmation. Key copying intentionally omitted.
- **"Needs Checking" Default Provenance Tracking:** Per-field provenance tracking for convenience defaults (BPM 74, Time Signature 4/4). Untouched values show a calm yellow badge with one-click "Mark checked" actions. Existing legacy libraries are protected from retroactive false warnings.

---

## [1.1.0] - 2026-11-14

### Added
- **App Rename to Setlist:** Rebranded to Setlist across bundle, Finder, Dock, window title, and application menus.
- **Fixed Song Header Layout:** Full-width responsive header preventing single-character vertical text column wrapping. Action buttons moved to dedicated row beneath title.
- **Single Current Setlist:** Replaced multi-setlist collections with a single persistent service running order (`currentSetlist`) supporting drag-and-drop, keyboard reordering, and step navigation (`⌘⌥←` / `⌘⌥→`).
- **Clear Setlist with Safe Undo:** Clear setlist action with confirmation prompt and 6-second Undo banner.
- **Smart Title-Casing:** Automatically formats lowercase entries on save (`gratitude` → `Gratitude`, `brandon lake` → `Brandon Lake`) while preserving deliberate mixed casing and styling.
- **Non-Disruptive Search Popover:** Anchored dropdown search on Home and Setlist views allowing instant inspection and addition to setlist without navigating away.
- **Native macOS Menus:** Full macOS menu bar featuring `Setlist`, `File`, `Edit`, `View`, `Song`, `Window`, and `Help` menus.

---

## [1.0.0] - 2026-11-14

### Initial Release
- Initial release of offline Mac application for church studio reference and service running orders.
- Durable atomic JSON storage in `~/Library/Application Support/Studio Songs`.
- Completely offline architecture with zero cloud sync, analytics, or external runtime dependencies.
