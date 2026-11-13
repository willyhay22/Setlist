# Setlist (v1.1)

**Setlist** is a lightweight, reliable, 100% offline macOS desktop application designed as a fast musical reference and service running-order tool for studio and church production environments alongside DAWs such as Fender Studio Pro.

---

## 1. Architecture & Design Decisions

### Technology Stack
- **Desktop Runtime:** Electron 33 (macOS arm64 standalone app bundle `Setlist.app`)
- **UI Architecture:** React 18 + TypeScript + Vite
- **Styling:** Native macOS San Francisco typography, responsive dual-theme (Light & Dark appearance matching system preferences dynamically), and accessible text-size scaling.
- **Storage Architecture:** Durable local JSON store with POSIX atomic write-swap (`.tmp` write + `fsyncSync` + atomic `fs.renameSync`), versioned schema migration (v1 → v2), automatic pre-migration snapshotting (`studio_songs_data.pre-v1.1.json`), and rollback snapshots.
- **Offline & Security Guarantee:** Zero CDN assets, zero remote analytics, zero update checks, disabled remote navigation (`will-navigate` denied), isolated context bridge (`contextIsolation: true`, `nodeIntegration: false`), and strict offline Content Security Policy.

### Storage Locations & Data Preservation
All app data is persisted outside the app bundle and development directory:
- **Primary Data Store:** `~/Library/Application Support/Studio Songs/studio_songs_data.json` *(preserved under the established path so updates never lose user data)*
- **Pre-v1.1 Migration Snapshot:** `~/Library/Application Support/Studio Songs/studio_songs_data.pre-v1.1.json`
- **Rollback Snapshot:** `~/Library/Application Support/Studio Songs/studio_songs_data.backup.json`
- **Window Geometry & Clamping:** `~/Library/Application Support/Studio Songs/window-state.json`

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

# Run unit tests (25 automated unit tests across 4 test suites)
npm test

# Build production web assets & Electron TypeScript
npm run build

# Package standalone macOS application bundle
npm run package
```

---

## 4. Key Capabilities & What's New in v1.1

1. **Brand & Credit:** Renamed to **Setlist** across Finder/Dock, window title, and native menu bar. Native About dialog displays the exact credit `© 2026 William Hay` and version 1.1.0 (Build 2026.11).
2. **Fixed Song Header Layout:** Title and artist now have their own full-width block that wraps gracefully at word boundaries (`word-break: normal; overflow-wrap: break-word;`). Action buttons (`+ Add to Setlist`, `Edit Details`, and a `More ▾` menu with `Duplicate` and `Delete`) sit on a dedicated row beneath. In narrow windows (~780px) and at maximum text size, text never squishes into a 1-character-wide column.
3. **Single Current Setlist:** Replaced complex multi-setlist management with one clear, persistent service running order (`currentSetlist`). Includes drag-and-drop and accessible keyboard reordering, duplicate song occurrences, and step navigation (`⌘⌥←` / `⌘⌥→`).
4. **Clear Setlist with Safe Undo:** A dedicated **Clear Setlist** button confirms with *"Clear the current setlist? Your songs will stay in the library."* and provides a 6-second **Undo** notification toast to restore the exact running order.
5. **Clean Song Form & Practical Defaults:** Removed sample placeholders ("e.g. Living Hope"). New songs default to BPM `74`, Time Signature `4/4`, and Key `Unset`. Smart title-casing formats all-lowercase input (e.g. `gratitude` → `Gratitude`, `brandon lake` → `Brandon Lake`) while preserving deliberate mixed casing (`King of My Heart`, `CCLI`).
6. **Non-Disruptive Search Popover (`⌘F`):** Global search on Home or Setlist opens an anchored popover under the search box with keyboard navigation and instant `+ Add to Setlist` action without leaving your view. Searching on Library filters the visible list in-place.
7. **Anchored Guided Tour:** The first-run walkthrough anchors tooltips directly beside real UI elements using `getBoundingClientRect()`, with Skip, Next, Back, and Finish controls. It can be re-run anytime from Settings.
8. **Streamlined Settings:** Single modal organized into 3 clear tabs: *Appearance* (Theme, Text size), *Library & Backups* (Export JSON, Import & Merge JSON, View Deleted), and *Help & About* (About Setlist, Restart Tour, Keyboard Shortcuts).
9. **Native macOS Menus:** Full macOS menu bar featuring `Setlist`, `File`, `Edit`, `View`, `Song`, `Window`, and `Help` menus with standard shortcuts (`⌘N`, `⌘F`, `⌘,`, `⌘W`, `⌘Q`, `⌘⌥←/→`).
