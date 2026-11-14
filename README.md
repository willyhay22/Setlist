# Setlist

A fast, offline musical reference and service app for macOS. 

---

## Why Setlist?


- **Glanceable across the desk** — High-contrast Key and BPM displays designed for quick reading at arm’s length.
- **One-click BPM copying** — Click once (or hit Enter) on any song to copy its tempo directly to your clipboard for your DAW transport.
- **Drag-and-drop setlists** — Build and reorder your service running order in seconds, with quick step navigation (`⌘⌥←` / `⌘⌥→`).
- **Always offline** — Zero accounts, zero cloud dependencies, and zero tracking. All data is saved safely to your Mac.
- **Update notifications** — When connected to the internet, Setlist quietly checks for new releases so you're always running the latest version.

---

## Download & Install

**No setup or dependencies required.** Setlist is a completely self-contained macOS app. You do not need to install any other dependencies.

1. Download **`Setlist-1.3.0-arm64.dmg`** from [**Releases**](https://github.com/willyhay22/Setlist/releases).
2. Open the DMG and drag **Setlist** into your **Applications** folder.
3. Launch Setlist from Applications or Spotlight.

> **First launch note:** Because Setlist is currently ad-hoc signed, macOS may block opening on the very first launch. To fix this, go to System Settings > Privacy & Security, scroll down to the Security section, and click Open Anyway.

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
