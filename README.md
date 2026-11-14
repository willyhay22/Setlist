# Setlist (v1.3.0)

**Setlist** is a lightweight, reliable, 100% offline macOS desktop application designed as a fast musical reference and service running-order tool for studio and church production environments alongside DAWs such as Fender Studio Pro.

---

## 1. Overview & Capabilities

- **Offline-First Reference:** Zero cloud sync, zero telemetry, zero analytics, zero external network requests.
- **Manual Musical Details:** Manually enter song title, artist, key, tempo (BPM), time signature, and arrangement notes.
- **Studio-Grade Readability:** Large, high-contrast Key root (48–56px) and BPM (48–56px) with distinct secondary major/minor designations and supporting time signature. Standard text scaling is optimized for arm's length reading from a studio console seat.
- **Copy BPM Only:** One-click copy button on selected songs that copies strictly trimmed tempo numbers or notation directly to the clipboard for instant DAW transport entry.
- **Default Provenance Tracking:** Unreviewed convenience defaults (BPM 74, 4/4) display a calm "Needs checking" badge with one-click verification. Existing libraries are protected against retroactive false positives.
- **Single Reusable Setlist:** Build, arrange, drag-and-drop, or keyboard-reorder your service running order with step navigation (`⌘⌥←` / `⌘⌥→`) and safe undo.
- **Resizable Notes:** Horizontal draggable divider between song information and arrangement notes with durable height persistence in preferences.
- **Original macOS Icon & Motion:** Tasteful, restrained setlist icon and subtle macOS motion with full Reduce Motion accessibility support.

---

## 2. System Requirements & Compatibility

- **Supported Architecture:** Apple Silicon (`arm64` — M1, M2, M3, M4 Macs). *Intel (`x86_64`) can be compiled from source.*
- **Operating System:** macOS 10.15 Catalina or higher (macOS 11 Big Sur or newer recommended for Apple Silicon). Tested on macOS 14 Sonoma / macOS 15 Sequoia.
- **Signing & Gatekeeper Status:** Ad-hoc signed (`codesign -s -`).
  > **Note on Gatekeeper:** Because this release is not signed with an Apple Developer ID distribution certificate, macOS may show a prompt stating that Apple could not verify the developer on first launch. To open:
  > 1. In **Finder**, right-click (or Control-click) `Setlist.app`.
  > 2. Select **Open** from the context menu.
  > 3. Click **Open** in the confirmation dialog. Setlist will launch normally thereafter.

---

## 3. Installation & Downloads

Pre-built binaries are prepared locally and can be published to GitHub Releases:

- **Apple Silicon Disk Image (DMG):** `release/Setlist-1.3.0-arm64.dmg`  
  *(Double-click the DMG and drag Setlist to `/Applications`)*
- **Apple Silicon Application Archive (ZIP):** `release/Setlist-1.3.0-arm64.zip`  
  *(Unzip and move `Setlist.app` to `/Applications`)*
- **Integrity Checksums:** SHA-256 checksums are recorded in [`release/SHA256SUMS.txt`](file:///Users/wihay/Dev/studio-songs/release/SHA256SUMS.txt).

### Data Storage & Preservation
Every fresh installation with no prior data starts with an empty library. User data is stored durably outside the app bundle and repository at:
```
~/Library/Application Support/Studio Songs/studio_songs_data.json
```
Updating the application preserves existing songs, notes, running orders, and preferences.

---

## 4. Building & Testing From Source

### Prerequisites
- macOS with Node.js 20 or 22 LTS
- Git

### Build Commands
```bash
git clone <repository-url>
cd studio-songs

# Install exact dependencies
npm ci

# Run automated test suites (33 unit tests across 5 suites)
npm test

# Build production bundle (renderer & electron)
npm run build

# Package standalone macOS application (directory)
npm run package

# Package installer DMG and standalone ZIP
npm run package:dmg
npm run package:zip
```

---

## 5. Documentation & Resources

- [User Guide](file:///Users/wihay/Dev/studio-songs/USER_GUIDE.md): Detailed workflow walkthrough, keyboard shortcuts, and backup/restore guide.
- [Changelog](file:///Users/wihay/Dev/studio-songs/CHANGELOG.md): Complete release history from v1.0.0 to v1.3.0.
- [Verification Test Report](file:///Users/wihay/Dev/studio-songs/TEST_REPORT.md): Automated and visual test verification results.
- [Future MIDI Investigation Note](file:///Users/wihay/Dev/studio-songs/FUTURE_MIDI.md): Architectural notes regarding future DAW/MIDI controllers (Korg nanoKONTROL2, Behringer X-Touch) — *no MIDI features are active in current versions*.
- [Bug Report Template](file:///Users/wihay/Dev/studio-songs/.github/ISSUE_TEMPLATE/bug_report.md): Issue template for reporting bugs with system information.

---

## 6. License Status

The repository currently contains copyright notices credited to William Hay (`© 2026 William Hay`). A formal open-source license (such as MIT) or proprietary/all-rights-reserved license decision can be selected by the project owner upon repository publishing.
