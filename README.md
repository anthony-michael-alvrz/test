# Guest Guide Kiosk

Offline-capable guest information display for a short-term rental.
Runs full-screen on a locked-down tablet.

## Three separate layers

| Layer | Lives in | Edit it when |
|---|---|---|
| **Content** | `config.json` | Guest name, wifi, any text changes |
| **Look** | `themes/*.css` | You want a different visual style |
| **Structure** | `index.html` | Almost never |

All variables and settings (env vars, cache version, Supabase config) are listed in
[docs/configuration.md](docs/configuration.md).

## Changing the guest name between bookings

1. Open `config.json` on GitHub, click the pencil icon.
2. Change `property.guestName`.
3. Commit.

The tablet checks `config.json` every 5 minutes while online and reloads
itself only if something changed — so a name swap lands within ~5 minutes
with no trip to the property. (GitHub's CDN adds a minute or two.)

## Editing content

Everything is in `config.json`.

- `property` — guest name, location line, wifi, times, host. Not translated.
- `en` / `es` — one block each, same shape:
  - `ui` — fixed labels
  - `welcome.sub`, `welcome.hostNote`
  - `guide.cards[]` — add or remove freely, the grid adapts
  - `guide.rules[]`
  - `checkout.steps[]` — numbering is automatic
  - `local.categories[]` — each becomes a subtab; add a third if you want

Keep `en` and `es` in sync. Validate at jsonlint.com before committing —
one stray comma blanks the page (you'll get an error screen explaining it).

## Changing the theme

Set `"theme"` in `config.json` to any file in `themes/`:

```json
"theme": "themes/yunque.css"
```

Two ship with the project:
- **yunque.css** — flat, airy, muted greens (current)
- **slate.css** — cooler, squarer, serif headings

To build your own, copy one and change the token values.
Full token reference: `themes/README-THEMES.md`.

**Rule:** themes set variables only — never layout. If you find yourself
writing `display:` or `grid-template:` in a theme, that belongs in
`index.html` instead.

After editing a theme, bump `CACHE_VERSION` in `service-worker.js` so
tablets discard the cached old version.

## Running a second property from one repo

1. Add `config-cabin.json` next to `config.json`.
2. Point that tablet at `index.html?config=config-cabin.json`.

Each tablet caches its own config independently. They can use different
themes too — the theme is named inside each config.

## Deploying (GitHub Pages)

Push to the repo root, then Settings > Pages > Deploy from branch > `main` / `root`.

Open the published URL **once on the tablet while online** so the service
worker caches everything. After that it works with no internet.

## Notes

- Must be served over `http(s)`. Service workers and `fetch()` don't work
  from `file://` — GitHub Pages is fine, double-clicking the file is not.
- To preview locally: `python3 -m http.server` in this folder, then
  visit `localhost:8000`.
- Splash reappears when you tap the property name in the header.
- Language resets to the first entry in `languages` on reload.
