# Setlist — User Guide (v1.2)

A practical reference guide for church studio band directors, audio engineers, and musicians using **Setlist** alongside Fender Studio Pro.

---

## 1. First Launch & Guided Tour

When Setlist launches for the first time on a fresh setup:
- The library starts completely empty.
- An anchored 4-step guided walkthrough appears with pointers directly indicating real interface controls:
  1. **Add Song (`⌘N`):** Quickly create songs with practical defaults.
  2. **Global Search (`⌘F`):** Search your entire song library without losing your current screen.
  3. **Musical Details & Notes:** Prominent Key, BPM, and Time Signature cards that stay fixed while arrangement notes autosave.
  4. **Current Setlist:** Build and arrange your service running order with drag-and-drop or keyboard moves.
- You can step through using **Next** and **Back**, or click **Skip**.
- Replay the walkthrough at any time from **Settings** (`⌘,`) → **Help & About** → **Replay Guided Tour**.

---

## 2. Managing Songs

### Adding a Song (`⌘N`)
1. Click **+ Add Song** in the top bar or press `⌘N`.
2. Enter the **Title** (*mandatory*). Blank or whitespace-only titles are rejected.
3. Review or adjust song details:
   - **Artist / Composer:** Smart title-casing formats all-lowercase input (e.g. `brandon lake` becomes `Brandon Lake`) on save while preserving deliberate artist styling.
   - **BPM / Tempo:** Convenience default is `74`. Accepts any plain text notation, such as `72.5`, `72–76`, or `72 verse, 76 chorus`.
   - **Musical Key:** Defaults to `Unset`. Dropdown supports both Major and Minor keys. Sharp and flat spellings (e.g. `D#` vs `Eb`) are preserved exactly as selected.
   - **Time Signature:** Convenience default is `4/4`. Supports common signatures (`2/4`, `3/4`, `4/4`, `6/8`, `9/8`, `12/8`) or custom entries.
   - **Initial Notes:** Structure notes, intro cues, or chord reminders.
4. **Duplicate Title & Artist Warning:** If a song with matching title and artist already exists in your library, a warning banner appears. You can still save it as an intentional duplicate/arrangement.
5. Click **Save Song** to open the song, or **Save & Add Another** to rapidly enter multiple songs.

### Default Value Checking ("Needs Checking")
- Convenience defaults (BPM `74` and Time Signature `4/4`) are marked with a subtle `"Needs checking"` indicator if you save without editing them.
- In song lists (Library, Setlist, Home, Search), rows show a quiet yellow `"Needs checking"` badge.
- In the song details view, an alert banner indicates exactly which field needs verification (e.g. `"BPM needs checking"` or `"BPM & Time Signature need checking"`).
- Click **Mark checked** (or **Mark both checked**) to confirm that the default value is correct for this song.
- When creating or editing songs, any field you actively type or select is automatically marked reviewed.
- Existing songs already in your library are never flagged retroactively.

### Dominant Musical Readouts
When viewing a selected song, the musical details are arranged for high visibility from the console:
- **Key Card:** The musical root note is rendered in large, bold typography (48–56px), with the major/minor designation clearly shown underneath. If no key has been chosen, it reads `"Unset"`.
- **BPM Card:** Rendered in large, bold numbers (48–56px). Longer descriptive text wraps cleanly within the card without clipping.
- **Copy BPM Only:** Hover over the BPM card or press `Tab` to focus the **Copy BPM** button. Clicking or pressing `Enter`/`Space` copies **only** the trimmed tempo value (e.g., `"74"` or `"72 verse, 76 chorus"`) directly to the clipboard, ready to paste into Fender Studio Pro's main tempo box. It displays a brief `"Copied"` confirmation. Key copying is intentionally omitted.
- **Time Signature:** Quietly displayed beneath the two primary cards (`Time: 4/4`).

### Resizable Arrangement Notes
- The arrangement notes area sits in a lower pane beneath the song header and musical readouts.
- By default, it starts in a compact layout (220px tall) so you have full view of musical details.
- **Resizing:** Grab the horizontal divider bar between the top details and the notes pane and drag up or down. You can also focus the divider with keyboard navigation and use `↑` and `↓` arrow keys.
- **Resetting:** Double-click the divider bar or click the **Reset** link in the notes header (or press `Enter`/`Space` while the divider is focused) to return to the default 220px height.
- **Persistence:** Your divider position is saved automatically in preferences and restored across app restarts.
- Notes autosave continuously as you type. Watch the status indicator in the top right:
  - `Saving…`: Changes are being committed to disk.
  - `Saved`: Confirmed durable write.
  - `Error — Retry`: If a save fails, your text is preserved in full and you can click Retry.
- Standard undo (`⌘Z`) and redo (`⇧⌘Z`) work natively inside notes.

### Header & Actions
- The title and artist sit in their own full-width block that wraps gracefully at word boundaries even in narrow window splits (~780px wide).
- Direct actions sit on a dedicated bar beneath the title:
  - **+ Add to Setlist:** Instantly appends the song to your current setlist.
  - **Edit Details:** Opens metadata dialog to modify key, tempo, time signature, or title.
  - **More ▾ Dropdown:** Houses secondary actions:
    - **Duplicate Song (`⌘D`):** Clones all fields, notes, and review status without applying new-song defaults.
    - **Delete Song:** Safely removes the song from library and active setlist with confirmation and 30-day recovery.

---

## 3. Library Search & Ordering (`⌘F`)

- **Default Order:** Songs are listed in creation order (oldest first, newest appended to the bottom). Opening or editing a song never alters this order.
- **Compact Key & BPM:** Each song row displays formatted key and tempo info (e.g., `D♯ major · 74 BPM`), giving you immediate context at a glance.
- **Global Search:** Type in the top search box or press `⌘F`.
  - When invoked on **Home** or **Setlist**, search opens an anchored popover dropdown directly underneath the search bar. Use `↑`/`↓` arrows to navigate results, press `Enter` to select, or click the `+` button to add directly to the current setlist without leaving your place.
  - When invoked on **Library**, typing instantly filters the visible song list in-place.
  - Searches active song **titles** and **artists** only (notes and keys are excluded).
  - Search is case-insensitive and whitespace-tolerant.
  - Direct substring matches appear first; fuzzy matches for minor typos appear with a yellow `Close match` badge.

---

## 4. Current Setlist: Running Order

Setlist maintains a single, persistent service running order (`currentSetlist`).

### Building the Running Order
- Click **+ Add Songs to Setlist** in the setlist toolbar to open the song picker dialog.
- Clicking any row in the picker toggles selection without closing or navigating away.
- Alternatively, click **+ Add to Setlist** from any song header in the Library or from the search popover.
- You can add the same song multiple times in the setlist (e.g. for an opening prelude and an altar call). Each occurrence has an independent entry identity.

### Reordering Songs
- **Drag-and-Drop:** Grab the grip handle on the left of any setlist row to drag it into position.
- **Keyboard Buttons:** Click the `↑` and `↓` buttons on any row to nudge songs up or down.

### Stepping Through Songs During Rehearsals or Services
- Click any song entry in the left pane to view its musical readouts and arrangement notes.
- Step through the setlist using the **Prev** and **Next** buttons in the toolbar or native shortcuts:
  - `⌘⌥←` (Command + Option + Left Arrow): Previous song in setlist
  - `⌘⌥→` (Command + Option + Right Arrow): Next song in setlist
- Navigation stops cleanly at the first and last song (no surprise looping).

### Clearing the Setlist with Safe Undo
- Click **Clear Setlist** in the setlist header.
- A confirmation dialog appears:
  > *"Clear the current setlist? Your songs will stay in the library."*
- When confirmed, the setlist is cleared and a 6-second notification banner appears:
  > *"Current setlist cleared. [Undo]"*
- Clicking **Undo** restores the exact former songs and positions.

---

## 5. Deleting & Recovering Songs

1. To delete a song, open it in Library view and select **More ▾** → **Delete Song**.
2. A confirmation prompt explains that the song will be removed from the current setlist.
3. When confirmed, all occurrences in the setlist are transactionally removed, and the song moves to **Recently Deleted**.
4. **30-Day Recovery Period:**
   - Open **Settings** (`⌘,`) → **Library & Backups** → **View Deleted Songs**.
   - See all deleted songs and their countdown days remaining.
   - Click **Restore** to return the song to your library. It returns in its original creation order.
5. After 30 days, expired songs are automatically purged on app launch.

---

## 6. Backups & Merge Imports

### Exporting Backups
1. Press `⌘,` to open **Settings** → **Library & Backups** → **Export Backup File…**.
2. Choose where to save your `.json` backup file (e.g. on a USB drive).
3. The backup file contains all active songs, recoverable deleted songs, the current setlist running order, review status metadata, and preferences in documented JSON.

### Merging Backups
1. In **Settings** → **Library & Backups**, click **Import & Merge Backup…**.
2. Select an exported backup file (compatible with v1, v2, and v3 backups).
3. Setlist validates the file before making any changes:
   - **Local wins:** Existing local songs and setlists are never overwritten by an imported copy.
   - **Arrangements preserved:** Songs with identical titles but different IDs are appended as distinct arrangements.
   - **Tombstone protection:** Songs deleted or purged on this Mac are protected from accidental resurrection.
   - **Integrity protection:** Setlist references pointing to missing or expired songs are cleanly skipped.
4. A summary dialog shows how many songs and entries were added or skipped.

---

## 7. Keyboard Shortcuts Quick Reference

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `⌘F` | Focus Global Search | Anywhere in app |
| `⌘N` | Add New Song | Anywhere in app (outside text inputs) |
| `⌘,` | Open Settings | Anywhere in app |
| `⌘1` | Navigate to Home | Anywhere in app |
| `⌘2` | Navigate to Library | Anywhere in app |
| `⌘3` | Navigate to Setlist | Anywhere in app |
| `⌘0` | Reset Text Size to Standard | Anywhere in app |
| `⌘+` / `⌘=` | Make Text Bigger | Anywhere in app |
| `⌘-` | Make Text Smaller | Anywhere in app |
| `⌘⌥←` | Previous song in setlist | Anywhere in app |
| `⌘⌥→` | Next song in setlist | Anywhere in app |
| `⌘W` | Close Window / Dialog | Window or active modal |
| `⌘Q` | Quit Setlist | Anywhere in app |
| `⌘Z` | Undo note text | Inside notes editor |
| `⇧⌘Z` | Redo note text | Inside notes editor |
