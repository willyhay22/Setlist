# Setlist

A fast, offline musical reference and service running-order app for macOS. Built for church and studio desks alongside DAWs like Fender Studio Pro.

---

## Why Setlist?

During a service or recording session, you don’t need a complicated browser tab, a bloated DAW plugin, or a laggy cloud document. Setlist gives you instant, glanceable song details on your secondary display so you can stay focused on the mix:

- **Glanceable across the desk** — High-contrast Key and BPM displays designed for quick reading at arm’s length.
- **One-click BPM copying** — Click once (or hit Enter) on any song to copy its tempo directly to your clipboard for your DAW transport.
- **Drag-and-drop setlists** — Build and reorder your service running order in seconds, with quick step navigation (`⌘⌥←` / `⌘⌥→`).
- **Always offline** — Zero accounts, zero cloud dependencies, and zero tracking. All data is saved safely to your Mac.
- **Update notifications** — When connected to the internet, Setlist quietly checks for new releases so you're always running the latest version.

---

## Download & Install

**No setup or dependencies required.** Setlist is a completely self-contained macOS app. You do not need to install Node, Python, Homebrew, or any command-line tools on your studio Mac.

1. Download **`Setlist-1.3.0-arm64.dmg`** from [**Releases**](https://github.com/willyhay22/Setlist/releases).
2. Open the DMG and drag **Setlist** into your **Applications** folder.
3. Launch Setlist from Applications or Spotlight.

> **First launch note:** Because Setlist is currently ad-hoc signed, macOS may ask for confirmation on the very first launch. Right-click (or Control-click) `Setlist.app` in Finder, select **Open**, and click **Open**. After that, it launches normally every time.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘ F` | Find song in library |
| `⌘ N` | New song |
| `⌘ S` | Save song / notes |
| `⌘ ,` | Settings (Theme, Text Size, Backups) |
| `⌘⌥ ←` / `⌘⌥ →` | Previous / Next song in setlist |
| `Esc` | Close dialog or search |

---

## Building from Source

If you want to contribute or build locally:

```bash
git clone https://github.com/willyhay22/Setlist.git
cd Setlist
npm install
npm test
npm run package:dmg
```

---

## Documentation & License

- [User Guide](docs/USER_GUIDE.md) — Feature walkthrough, keyboard shortcuts, and backup/restore guide.
- [Changelog](CHANGELOG.md) — Version history and release notes.
- Released under the [MIT License](LICENSE). Copyright © 2026 William Hay.
