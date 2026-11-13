# Studio Songs — User Guide

A practical reference guide for church studio band directors, audio engineers, and musicians using **Studio Songs** alongside Fender Studio Pro.

---

## 1. First Launch & Guided Tour

When Studio Songs launches for the first time on a fresh setup:
- The library starts completely empty.
- A 4-step guided walkthrough appears introducing how to add songs, search your library, read musical cards, autosave notes, and build setlists.
- You can step through using **Next** and **Back**, or click **Skip Tour**.
- You can replay the walkthrough at any time from **Settings & Help** (gear icon in the top right).

---

## 2. Managing Songs

### Adding a Song (`⌘N`)
1. Click **+ Add Song** in the top bar or press `⌘N`.
2. Enter the **Title** (*mandatory*). Blank or whitespace-only titles are rejected.
3. Enter optional details:
   - **Artist / Composer**
   - **BPM / Tempo:** Accepts any plain text notation, such as `72.5`, `72–76`, or `72 verse, 76 chorus`.
   - **Musical Key:** Dropdown supporting both Major and Minor keys. Sharp and flat spellings (e.g. `C#` vs `Db`) are preserved exactly as selected.
   - **Time Signature:** Common signatures (`2/4`, `3/4`, `4/4`, `6/8`, `9/8`, `12/8`) or choose **Other / Custom** to type values like `5/4`.
   - **Initial Notes:** Structure notes, intro cues, or chord reminders.
4. **Duplicate Title & Artist Warning:** If a song with matching title and artist already exists in your library, a warning banner appears. You can still save it as an intentional duplicate/arrangement.
5. Click **Save Song** to open the song, or **Save & Add Another** to rapidly enter multiple songs.

### Viewing & Autosaving Notes
- Selecting a song displays its **Key**, **BPM**, and **Time Signature** in prominent cards at the top. These stay fixed so you never lose sight of them.
- Click directly inside the **Arrangement Notes** box to edit.
- Notes autosave automatically as you type. Watch the small status indicator in the top right of the notes pane:
  - `Saving…`: Changes are being committed to disk.
  - `Saved`: Confirmed durable write.
  - `Error — Retry`: If a save fails, your text is preserved in full and you can click Retry.
- Standard undo (`⌘Z`) and redo (`⇧⌘Z`) work natively inside notes.

### Editing Song Details vs Notes
- Song metadata (Title, Artist, Key, BPM, Signature) is protected from accidental edits until you click **Edit Details**.
- Cancelling metadata edits never reverts notes you typed and saved.

### Duplicating an Arrangement
- Click **Duplicate** on any song to create an independent copy with all fields and notes copied over.
- An editable form opens with `(Copy)` appended to the title so you can review and tweak it before saving.

---

## 3. Library Search & Ordering (`⌘F`)

- **Default Order:** Songs are listed in creation order (oldest first, newest appended to the bottom). Opening or editing a song never alters this order.
- **Global Search:** Type in the top search box or press `⌘F`.
  - Searches active song **titles** and **artists** only (notes and keys are excluded).
  - Search is case-insensitive and whitespace-tolerant.
  - Direct substring matches appear first.
  - If no direct matches exist, reasonable fuzzy matches for minor typos appear with a yellow `Close match` badge.
  - If no matches exist, "No songs found" is displayed.
  - Clearing the search box instantly restores default library ordering.

---

## 4. Setlists & Live Navigation

### Creating & Managing Setlists
1. Go to the **Setlists** tab and click **New Setlist**.
2. Give the setlist a name, an optional calendar date (`YYYY-MM-DD`), and service running notes.
3. Click **Add Songs** to open the library picker and select one or more songs to insert into the setlist.
4. You can also add any open song to an active setlist using the **Add to Setlist** button in the song view.

### Running Orders & Reordering
- Songs can be reordered by grabbing the drag handle on the left of each row.
- **Accessible keyboard alternative:** Use the `↑` and `↓` buttons on any row to nudge songs up or down.
- **Duplicate Occurrences:** You can add the same song multiple times in one setlist (e.g. for an opening prelude and an altar call). Each occurrence has its own independent place and can be moved without affecting other occurrences.
- **Editing details:** If you update a song's key or notes, all occurrences across all setlists reflect the update immediately.

### Stepping Through Setlists During Rehearsal or Service
- Click any song entry on the left to display its musical cards and notes on the right.
- Use the **Prev** and **Next** buttons in the setlist toolbar, or press:
  - `⌘⌥←` (Command + Option + Left Arrow): Previous song
  - `⌘⌥→` (Command + Option + Right Arrow): Next song
- Navigation stops cleanly at the first and last song (no surprise looping).

### Search Detours
- If you are in a setlist and use global search (`⌘F`) to inspect another song in your library, a blue banner appears: `Viewing search result while navigating a setlist — Back to Setlist`.
- Clicking **Back to Setlist** immediately restores your exact setlist and selected song position.

### Removing Entries & Undo
- Click the trash icon on a setlist row to remove that occurrence.
- An **Undo** toast appears at the bottom of the screen for 6 seconds. Clicking Undo restores the entry to its exact former position.
- The underlying song in your library is never deleted.

### Archiving Setlists
- When a service or event is finished, click the **Archive** icon on the setlist header.
- Archived setlists are tucked away in the **Archived** tab and excluded from Home recents. They can be unarchived at any time.

---

## 5. Deleting & Recovering Songs

1. To delete a song, open it in Library view and click the red trash button.
2. A confirmation prompt explains that the song will be removed from all active and archived setlists.
3. When confirmed, all occurrences in setlists are transactionally removed, and the song moves to **Recently Deleted**.
4. **30-Day Recovery Period:**
   - Open **Settings & Help** → **View Deleted**.
   - See all deleted songs and their countdown days remaining.
   - Click **Restore** to return the song to your library. It returns in its original creation order. (Former setlist occurrences are not restored).
5. After 30 days, expired songs are automatically purged on app launch.

---

## 6. Backups & Merge Imports

### Exporting Backups
1. Click **Settings & Help** (gear icon) → **Export Backup File…**.
2. Choose where to save your `.json` backup file (e.g. on a USB stick or backup drive).
3. The backup file contains all active songs, recoverable deleted songs, setlists, and preferences in documented JSON.

### Merging Backups
1. Click **Settings & Help** → **Merge Import Backup…**.
2. Select an exported backup file.
3. Check or uncheck **Import appearance and text-size settings** (default is unchecked to protect this Mac's screen preferences).
4. Studio Songs validates the file before making any changes:
   - **Local wins:** Existing local songs and setlists are never overwritten by an imported duplicate.
   - **Intentional arrangements preserved:** Songs with the same title but different IDs are imported as distinct arrangements.
   - **No zombie resurrects:** Songs deleted or purged on this Mac are protected from accidental resurrection.
   - **Integrity protection:** Any setlist references pointing to missing or expired songs are cleanly skipped.
5. A summary dialog shows how many songs and setlists were added or skipped.

---

## 7. Keyboard Shortcuts Quick Reference

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `⌘F` | Focus Global Search | Anywhere in app |
| `⌘N` | Add New Song | Anywhere in app (outside text inputs) |
| `Esc` | Close dialog or modal (warns if unsaved) | When modal is open |
| `⌘⌥←` | Previous song in setlist | In Setlist view |
| `⌘⌥→` | Next song in setlist | In Setlist view |
| `⌘Z` | Undo note text | Inside notes editor |
| `⇧⌘Z` | Redo note text | Inside notes editor |
