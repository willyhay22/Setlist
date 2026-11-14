# Setlist — User Guide (v1.3)

A practical reference guide for church studio band directors, audio engineers, and musicians using **Setlist** alongside Fender Studio Pro.

---

## 1. Installation, Updates & First Launch

### Installing from a Release Build
1. Download either the disk image (`Setlist-1.3.0-arm64.dmg`) or the ZIP archive (`Setlist-1.3.0-arm64.zip`).
2. If using the DMG:
   - Double-click the DMG to open it.
   - Drag the **Setlist** application icon into your Mac's **Applications** folder shortcut.
3. If using the ZIP:
   - Double-click the ZIP archive to unpack `Setlist.app`.
   - Drag `Setlist.app` to `/Applications`.
4. **First Launch (Gatekeeper Verification):**
   - Because Setlist is an ad-hoc signed internal release, macOS may display a dialog stating Apple cannot verify the developer.
   - To open: Right-click (or Control-click) `Setlist.app` in Finder, choose **Open**, and click **Open** in the confirmation dialog. Setlist will remember this preference for subsequent launches.

### Updating Setlist
- To update, replace the existing `Setlist.app` in `/Applications` with the new version.
- **Your data is preserved:** Setlist stores all song details, notes, setlists, and preferences in your user library at `~/Library/Application Support/Studio Songs/`. Replacing the application bundle never erases your library.

### Guided Tour
When launched with an empty library:
- An anchored 4-step walkthrough introduces the core layout: Add Song (`⌘N`), Global Search (`⌘F`), Musical Details & Notes, and Current Setlist.
- Replay the walkthrough at any time from **Settings** (`⌘,`) → **Help & About** → **Replay Guided Tour**.

---

## 2. Managing Songs

### Adding a Song (`⌘N`)
1. Click **+ Add Song** or press `⌘N`.
2. Enter the **Title** (*mandatory*). Blank titles are rejected.
3. Review or adjust musical details:
   - **Artist / Composer:** Formatted to smart title-case on blur/save (e.g. `brandon lake` becomes `Brandon Lake`) while preserving deliberate mixed casing.
   - **BPM / Tempo:** Convenience default is `74`. Accepts any text (e.g., `72.5`, `72–76`, or `72 verse, 76 chorus`).
   - **Musical Key:** Defaults to `Unset`. Dropdown supports Major and Minor keys with sharp/flat preservation.
   - **Time Signature:** Convenience default is `4/4`. Supports standard signatures (`2/4`, `3/4`, `4/4`, `6/8`, `9/8`, `12/8`) or custom entries.
   - **Initial Notes:** Arrangement notes, cues, and song structure.
4. **Duplicate Warning:** If a matching title and artist exists, an intentional duplicate notice appears.
5. Click **Save Song** or **Save & Add Another**.

### Default Value Checking ("Needs Checking")
- Untouched convenience defaults (BPM `74` and Time Signature `4/4`) are marked with a quiet yellow `"Needs checking"` badge in song lists and an alert banner above the readouts.
- Click **Mark checked** (or **Mark both checked**) to confirm that the default value is correct for this song.
- Actively entering or changing a value in the song form automatically marks it reviewed.
- Existing legacy library records are never retroactively flagged.

### Dominant Musical Readouts
When viewing a song:
- **Key Card:** High-contrast root note (48–56px) with major/minor designation (18–22px). Unset key reads `"Unset"`.
- **BPM Card:** Prominent tempo display (48–56px) that wraps gracefully on long descriptive text without clipping.
- **Copy BPM Only:** Hover over the BPM card or press `Tab` and click **Copy BPM**. This copies **only** the trimmed tempo value (`"74"`, `"72 verse, 76 chorus"`) directly to the clipboard for pasting into Fender Studio Pro's tempo field. It never appends "BPM" or newlines. Shows a brief `"Copied"` confirmation. Key copying is intentionally omitted.
- **Time Signature:** Displayed quietly beneath the main cards (`Time: 4/4`).

### Resizable Arrangement Notes
- Notes sit in a resizable lower pane (default height: 220px).
- **Resize:** Drag the horizontal divider bar or focus it and use `↑`/`↓` arrow keys.
- **Reset:** Double-click the divider bar or click **Reset** in the notes header to restore 220px.
- **Persistence:** Custom divider heights are remembered across app restarts.
- Notes autosave continuously with status indicators (`Saving…`, `Saved`, `Error — Retry`).

---

## 3. Current Setlist: Running Order

- **Add Songs:** Click **+ Add** in the setlist toolbar or **+ Add to Setlist** from song headers or search popovers.
- **Reorder:** Drag the grip handle on any row or click the accessible `↑` and `↓` buttons.
- **Step Navigation:** Step through songs during rehearsals or services:
  - `⌘⌥←` (Command + Option + Left Arrow): Previous song
  - `⌘⌥→` (Command + Option + Right Arrow): Next song
- **Clear Setlist:** Click **Clear** to wipe the running order with a confirmation prompt. A 6-second **Undo** toast allows immediate recovery.

---

## 4. Search & Accessibility

- **Global Search (`⌘F`):**
  - On Home or Setlist, search opens an anchored dropdown popover without leaving your view.
  - On Library, typing filters the visible list in-place.
  - Press `Escape` while search is active to dismiss the popover and clear search focus.
- **Subtle Motion & Accessibility:**
  - Setlist features calm, restrained transitions (80–180ms) for navigation, dialogs, and reordering.
  - Setlist respects macOS **Reduce Motion** (`System Settings > Accessibility > Display > Reduce motion`). When enabled, all nonessential motion is disabled while preserving immediate state changes and visible focus rings.
- **Dialog Focus Trapping:**
  - Opening any dialog (`⌘N`, `⌘,`, etc.) automatically focuses its primary field.
  - `Tab` and `Shift+Tab` remain trapped within the dialog.
  - Dismissing the dialog with `Escape` or the close button returns focus to the opening control.

---

## 5. Backups & Disaster Recovery

- **Export Backup:** Open **Settings** (`⌘,`) → **Library & Backups** → **Export Backup File…** to save a `.json` backup file.
- **Import & Merge:** Click **Import & Merge Backup…** to merge external songs:
  - Local records always take precedence over imported duplicates.
  - Deleted or purged items are protected from accidental resurrection.
- **30-Day Recovery:** Deleted songs are kept in **Recently Deleted** for 30 days before permanent purging. Restore songs anytime from **Settings** → **Library & Backups** → **View Deleted Songs**.

---

## 6. Keyboard Shortcuts Quick Reference

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `⌘F` | Focus Global Search / Open Popover | Anywhere (outside open dialogs) |
| `⌘N` | Add New Song | Anywhere (outside open dialogs) |
| `⌘,` | Open Settings | Anywhere in app |
| `⌘1` | Navigate to Home | Anywhere in app |
| `⌘2` | Navigate to Library | Anywhere in app |
| `⌘3` | Navigate to Setlist | Anywhere in app |
| `⌘0` | Reset Text Size to Standard | Anywhere in app |
| `⌘+` / `⌘=` | Make Text Bigger | Anywhere in app |
| `⌘-` | Make Text Smaller | Anywhere in app |
| `⌘⌥←` | Previous song in setlist | Setlist navigation (app focused) |
| `⌘⌥→` | Next song in setlist | Setlist navigation (app focused) |
| `⌘W` | Close active dialog or window | Window or active modal |
| `⌘Q` | Quit Setlist | Anywhere in app |
| `⌘Z` | Undo note text | Inside notes editor |
| `⇧⌘Z` | Redo note text | Inside notes editor |
| `Esc` | Dismiss modal dialog or search popover | Active modal / search |
