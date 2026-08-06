# Configuration reference

Every variable and knob you set to run this project, in one place, so nothing is buried in
code. Grouped by where it's set.

## 1. Dashboard environment variables

Set in `dashboard/.env.local` (gitignored — your real values stay on your machine). A
fill-in-the-blanks template with the same names lives in
[`dashboard/.env.example`](../dashboard/.env.example).

| Variable | Kind | Used by | What it does | Where to get it |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | dashboard (browser + server), provision script | Your Supabase project's API URL — where the dashboard reads and writes data | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | dashboard (browser) | Lets the browser talk to Supabase under row-level security. Public by design | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | publish route (server), provision script | Full-access key that **bypasses** security rules. Writes published files and provisions properties. Never commit or expose | Supabase → Project Settings → API → service_role |
| `NEXT_PUBLIC_TABLET_BASE_URL` | public | dashboard (browser) | Where the guide (`index.html`) is deployed. Builds the full tablet URL shown after publishing. Falls back to the GitHub Pages URL if unset | Your deployed guide's base URL |

**Prefix rule:** `NEXT_PUBLIC_` means the value is sent to the browser (fine for public
values). No prefix means server-only — that's why the service-role key has none. When you
deploy the dashboard (e.g. Vercel), set the same four in the host's env settings, keeping the
service-role key as a server-only secret.

## 2. Tablet app knobs

| Where | Name | What it does |
|---|---|---|
| `index.html` URL | `?p=<slug>` | **Preferred** — the short tablet URL. The guide expands it to `<publishBase>/<slug>/config.json` using `settings.json`. Set as the tablet's start URL (Fully Kiosk), e.g. `…/test/?p=maria-yunque`. |
| `index.html` URL | `?config=<url>` | Escape hatch — load a config from an explicit full URL (wins over `?p=`). Defaults to the in-repo `config.json` when neither is given. See `index.html:305`. |
| `settings.json` | `publishBase` | The Supabase Storage folder that holds published files. The one place the Supabase URL lives (config, not code) — change it only if the Supabase project changes. Same-origin with the guide and precached for offline. |
| `service-worker.js` | `CACHE_VERSION` | Cache-buster. Bump it (`v7` → `v8` …) after editing `index.html`, `settings.json`, or a theme, so tablets discard the old cached version. See `service-worker.js:2`. |
| `index.html` | poll interval | How often the tablet re-checks its config — currently 5 minutes, hard-coded. |
| `config.json` | `theme`, `property.*`, `en`/`es` | The guide's content (guest name, wifi, rules…). Not env vars, but the values that change per booking/property. See the main [README](../README.md). |

## 3. Supabase project settings (one-time, not in code)

- Run [`dashboard/supabase/schema.sql`](../dashboard/supabase/schema.sql) — creates the
  `properties` table, its row-level-security rules, and the public-read `published` bucket.
- **Auth → Providers → Email → Confirm email: OFF** (prototype convenience; turn on for real
  use).

## 4. Standing up a fresh environment — checklist

1. Create a Supabase project; run `schema.sql`; turn email confirmation off.
2. Copy `dashboard/.env.example` → `dashboard/.env.local` and fill in the four values.
3. Deploy the guide (GitHub Pages) and set `NEXT_PUBLIC_TABLET_BASE_URL` to its base URL.
4. Provision a property, publish, and point the tablet's start URL at the published config.

Related: [dashboard/docs/storage.md](../dashboard/docs/storage.md) explains how the published
files are stored and served.
