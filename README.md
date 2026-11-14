# Setlist (v1.2)

**Setlist** is a lightweight, reliable, 100% offline macOS desktop application designed as a fast musical reference and service running-order tool for studio and church production environments alongside DAWs such as Fender Studio Pro.

---

## 1. Architecture & Design Decisions

### Technology Stack
- **Desktop Runtime:** Electron 33 (macOS arm64 standalone app bundle `Setlist.app`)
- **UI Architecture:** React 18 + TypeScript + Vite
- **Styling:** Native macOS San Francisco typography, responsive dual-theme (Light & Dark appearance matching system preferences dynamically), and accessible shared text-size scaling.
- **Storage Architecture:** Durable local JSON store with POSIX atomic write-swap (`.tmp` write + `fsyncSync` + atomic `fs.renameSync`), versioned schema migration (v1 → v2 → v3), automatic pre-migration snapshotting (`studio_songs_data.pre-v1.1.json`), and rollback snapshots.
- **Offline & Security Guarantee:** Zero CDN assets, zero remote analytics, zero update checks, disabled remote navigation (`will-navigate` denied), isolated context bridge (`contextIsolation: true`, `nodeIntegration: false`), and strict offline Content Security Policy.

### Storage Locations & Data Preservation
All app data is persisted outside the app bundle and development directory:
- **Primary Data Store:** `~/Library/Application Support/Studio Songs/studio_songs_data.json` *(preserved under the established path so updates never lose user data)*
- **Pre-v1.1 Migration Snapshot:** `~/Library/Application Support/Studio Songs/studio_songs_data.pre-v1.1.json`
- **Rollback Snapshot:** `~/Library/Application Support/Studio Songs/studio_songs_data.backup.json`
- **Window Geometry & Preferences:** `~/Library/Application Support/Studio Songs/window-state.json`

---

## 2. Quick Installation & Launch

### Run Directly or Install to Applications
The application has been fully compiled and packaged into a standalone macOS arm64 application:

```bash
# Option A: Launch directly from the build output
open "/Users/wihay/Dev/studio-songs/release/mac-arm64/Setlist.app"

# Option B: Copy to /Applications (or ~/Applications)
cp -R "/Users/wihay/Dev/studio-songs/release/mac-arm64/Setlist.app" /Applications/
open "/Applications/Setlist.app"
```

Once copied to `/Applications`, Setlist appears in Spotlight, Launchpad, and can be pinned to your macOS Dock.

---

## 3. Building From Source

```bash
cd /Users/wihay/Dev/studio-songs

# Run unit tests (33 automated unit tests across 5 test suites)
npm test

# Build production web assets & Electron TypeScript
npm run build

# Package standalone macOS application bundle
npm run package
```

---

## 4. Key Capabilities & What's New in v1.2

1. **Studio-Grade Readability (Standard Size):**
   - The `Standard` text size is visibly enlarged and unified across the entire app so it can be comfortably read from a studio console seat at arms length.
   - Applies consistently across Home cards, Library & Setlist song rows, search results, Add Songs picker, selected song title/artist, musical readouts, and arrangement notes.
   - Smooth, monotonic progression across `Small`, `Standard`, `Large`, and `X Large` without blanket browser zoom (maintaining crisp UI controls and toolbars).
   - Live interactive text-size preview in **Settings** (`⌘,`) → **Appearance**.

2. **Dominant Key & BPM Hierarchy:**
   - Musical details are rearranged from three equal cards to two dominant visual focal points: **Key** and **BPM**.
   - **Key Readout:** Large root note (48–56px) with distinct secondary major/minor designation (18–22px). Unset key clearly reads `"Unset"`.
   - **BPM Readout:** High-visibility tempo number (48–56px) that wraps gracefully when descriptive tempo notation is used (e.g., `72 verse, 76 chorus`).
   - **Time Signature:** Presented as a quiet, secondary label (`Time: 4/4`) directly under the readouts rather than competing for primary visual weight.

3. **Resizable Arrangement Notes:**
   - Added a horizontal draggable resizer bar between the song info / musical readouts and the arrangement notes pane.
   - Notes start in a compact lower pane (default height: 220px) allowing maximum room for song details.
   - Drag smoothly or use keyboard navigation (`↑`/`↓` arrows on the divider) to resize.
   - Double-click the resizer bar or press `Enter`/`Space` while focused to reset to the default 220px height.
   - Custom notes height is persisted durably in user preferences (`preferences.notesHeight`).
   - Clamped with sensible minimums (minimum 120px notes pane, minimum 220px top pane).

4. **Compact Key & BPM Across Lists:**
   - Song rows in the Library, Current Setlist, Home screen recent/setlist previews, Search popover, and Add Songs picker now display clear, compact musical metadata (e.g., `D♯ major · 74 BPM`).
   - Clean formatting logic eliminates stray dots or separators when key or BPM is blank.
   - In the Add Songs picker, clicking anywhere on a row toggles selection without navigating away.

5. **Copy BPM Only:**
   - Dedicated **Copy BPM** button on the selected song's BPM readout (and keyboard-accessible with `Enter` or `Space`).
   - Copies **only** the trimmed tempo string (`"74"`, `"72.5"`, `"72 verse, 76 chorus"`) directly to the clipboard for instant pasting into Fender Studio Pro's tempo field.
   - Never copies the unit "BPM", extra spaces, musical key, or newlines.
   - Brief `"Copied"` visual confirmation indicator.
   - Disabled when BPM is empty. Does not alter selection or clear needs-checking flags. Key copying is intentionally omitted.

6. **"Needs Checking" Default Provenance Tracking:**
   - BPM `74` and Time Signature `4/4` are convenience defaults. Setlist now tracks provenance (`default` vs `reviewed`) at the field level.
   - Untouched or prefilled convenience values display a calm `"Needs checking"` badge in list rows and beside the readout cards.
   - Accessible `"Mark checked"` and `"Mark both checked"` actions allow operators to confirm values with one click.
   - Manually entering or selecting values in the song form automatically marks them reviewed.
   - "Save & Add Another" resets touched tracking so subsequent songs are properly flagged.
   - Existing/legacy songs are never retroactively flagged with false-positive warnings.
   - Song duplication inherits flags without verifying.

7. **Cleaned Up About Dialog:**
   - Fixed native macOS About dialog duplicate copyright display by removing redundant credits field.
   - Displays exact single copyright credit: `© 2026 William Hay`, version 1.2.0.
   - Removed marketing/promotional text from Settings and About dialogs.

8. **Future MIDI & Plugin Investigation Note:**
   - Included repository documentation note ([FUTURE_MIDI.md](file:///Users/wihay/Dev/studio-songs/FUTURE_MIDI.md)) outlining future MIDI/controller integration constraints, hardware details (Korg nanoKONTROL2, Behringer X-Touch), and non-invasive MIDI bridge principles.
