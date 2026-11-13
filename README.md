# Studio Songs

**Studio Songs** is a lightweight, reliable, 100% offline macOS desktop application designed as a fast musical reference tool for studio and church production environments alongside DAWs such as Fender Studio Pro.

---

## 1. Architecture & Design Decisions

### Technology Stack
- **Desktop Runtime:** Electron 33 (macOS arm64 standalone app bundle)
- **UI Architecture:** React 18 + TypeScript + Vite
- **Styling:** Native macOS San Francisco typography, responsive dual-theme (Light & Dark appearance matching system preferences dynamically), and accessible text-size scaling.
- **Storage Architecture:** Durable local JSON store with POSIX atomic write-swap (`.tmp` write + `fsyncSync` + atomic `fs.renameSync`) and an automatic append-only transaction rollback snapshot (`studio_songs_data.backup.json`).
- **Offline & Security Guarantee:** Zero CDN assets, zero remote analytics, zero update checks, disabled remote navigation (`will-navigate` denied), isolated context bridge (`contextIsolation: true`, `nodeIntegration: false`), and strict offline Content Security Policy.

### Storage Locations
All app data is persisted outside the app bundle and development directory:
- **Primary Data Store:** `~/Library/Application Support/Studio Songs/studio_songs_data.json`
- **Rollback Snapshot:** `~/Library/Application Support/Studio Songs/studio_songs_data.backup.json`
- **Window Geometry & Clamping:** `~/Library/Application Support/Studio Songs/window-state.json`

---

## 2. Quick Installation & Launch

### Run Directly or Install to Applications
The application has been fully compiled and packaged. To install it to your user Applications directory or launch immediately:

```bash
# Option A: Launch directly from the build output
open "/Users/wihay/Dev/studio-songs/release/mac-arm64/Studio Songs.app"

# Option B: Copy to /Applications (or ~/Applications)
cp -R "/Users/wihay/Dev/studio-songs/release/mac-arm64/Studio Songs.app" /Applications/
open "/Applications/Studio Songs.app"
```

Once copied to `/Applications`, Studio Songs appears in Spotlight, Launchpad, and can be pinned to your macOS Dock.

---

## 3. Building From Source

```bash
cd /Users/wihay/Dev/studio-songs

# Run unit tests
npm test

# Build production web assets & Electron TypeScript
npm run build

# Package standalone macOS application bundle
npm run package
```

---

## 4. Key Capabilities & Polish

1. **Global Search (`⌘F`):** Searches active song titles and artists instantaneously across the entire library. Shows ordinary exact/substring matches first; falls back to reasonable fuzzy matching for small typos (visibly labeled as "Close match").
2. **Prominent Musical Readouts:** Key, BPM (free-form text, e.g. `72 verse, 76 chorus`), and Time Signature cards remain fixed in view while notes scroll.
3. **Autosaved Notes:** Direct edit notes textarea with debounce, active save indicator (`Saving…` / `Saved`), and native `⌘Z` undo support.
4. **Ordered Setlists:** Drag-and-drop song ordering with keyboard alternatives (`Move Up` / `Move Down`), duplicate song occurrences with distinct entry identities, and non-looping `Prev` / `Next` step buttons (`⌘⌥←` and `⌘⌥→`).
5. **Search Detour Context:** When searching from a setlist, opening a library song maintains a persistent "Back to Setlist" banner that returns you to your exact setlist place.
6. **Recently Deleted & 30-Day Expiry:** Songs deleted from the library are transactionally removed from all active and archived setlists and retained in Recently Deleted for 30 days. Restoring returns them in their original creation order.
7. **Merge Backup Import:** Export plain-text JSON backups anytime. Importing uses an all-or-nothing merge validation where existing local records win, dead setlist references are skipped, and purged song resurrections are blocked.
8. **Window Recovery:** Remembers window geometry and split pane width; automatically detects disconnected external displays and clamps the window safely back onto active displays.
