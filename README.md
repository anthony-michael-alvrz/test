# Guest Guide Kiosk

A single-page, offline-capable guest information display for a short-term rental.
Runs full-screen on a locked-down tablet.

## Files

| File | What it is | Do you edit it? |
|---|---|---|
| `config.json` | **All content.** Property details, both languages, every section. | **Yes — this is the only file you normally touch.** |
| `index.html` | The renderer. Reads config.json and builds the page. | No |
| `service-worker.js` | Offline caching. | Only to bump `CACHE_VERSION` |
| `manifest.json` | App name/icon for "Add to Home Screen". | Only for a new property name |
| `icon-192.png`, `icon-512.png` | App icons. | Optional |

## Editing content

Everything is in `config.json`.

- **Property basics** (name, wifi, times, address, host) live once under `property` — they are not translated.
- **Each language** has its own block (`en`, `es`) with the same shape:
  - `ui` — fixed labels ("Wi-Fi Network", "Check-in")
  - `welcome.sub`, `welcome.hostNote`
  - `guide.cards[]` — add or remove cards freely, the grid adapts
  - `guide.rules[]`
  - `checkout.steps[]` — numbering is automatic
  - `local.categories[]` — add or remove whole tabs; each has `items[]`

Keep the `en` and `es` blocks in sync: if you add a guide card to one, add it to the other.

**Always validate your JSON before committing** — one stray comma breaks the page.
Paste it into jsonlint.com, or the page will show an error telling you what failed.

## Adding a new property

Two options:

**A. New repo (cleanest for a separate tablet)**
1. Copy this whole folder into a new repo.
2. Edit `config.json` and the `name` in `manifest.json`.
3. Enable GitHub Pages. Point that tablet at the new URL.

**B. One repo, many properties**
1. Add `config-cabin.json` alongside `config.json`.
2. Point that tablet at `index.html?config=config-cabin.json`.
Each tablet caches its own config, so they stay independent.

## Deploying (GitHub Pages)

1. Push these files to the repo root.
2. Settings > Pages > Deploy from branch > `main` / `root`.
3. Open the published URL **once on the tablet while online** so the service
   worker caches everything. After that it works with no internet.

## Pushing an update to a tablet already in the field

1. Edit `config.json`, commit.
2. Next time the tablet is online and reloads, it picks up the new content
   (config is fetched network-first).
3. If you changed `index.html` or the CSS, also bump `CACHE_VERSION` in
   `service-worker.js` so the old shell is discarded.

## Notes

- Must be served over `http(s)` — service workers and `fetch()` do not work
  from a `file://` path. GitHub Pages is fine.
- Language resets to the first entry in `languages` on reload, which is what
  you want on a shared device.
- The page auto-reloads every 6 hours, but only when actually online.
