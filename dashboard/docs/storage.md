# How storage works (per-customer config files)

This describes how the system stores and serves each customer's guide **as it works
today**. For the bigger design direction, see `../../docs/architecture-midway.md`.

## The two places data lives

There are two separate stores, and keeping them distinct is the whole idea:

| Store | What it holds | Who touches it |
|---|---|---|
| **Postgres** (`properties` table) | The **source of truth** — each property's editable content (`content` jsonb) and a `version` counter, one row per property | The dashboard, when a customer edits and saves |
| **Supabase Storage** (`published` bucket) | The **published output** — a plain JSON file the tablet reads | Written only by the server at publish time; read by tablets |

Editing changes the database. **Publishing** copies the current database content out to a
file the tablet can fetch. Nothing the customer types is visible to guests until they publish.

## One file per customer

Every property has a `slug` — an operator-chosen, readable id (e.g. `maria-yunque`). Publishing
writes that property's content to:

```
published/<slug>/config.json
```

So each customer gets their own file at their own path, and the tablet's short URL is just
`…/test/?p=<slug>`. Publishing again overwrites that same file and bumps the `version` inside
it. The slug is set at provisioning and should not change — it's baked into the tablet's start
URL.

The public URL the tablet reads looks like:

```
https://<your-project>.supabase.co/storage/v1/object/public/published/<slug>/config.json
```

## The flow

```
Customer (browser, logged in)
      │  edit fields → Save
      ▼
  Postgres  properties.content        ← source of truth, private (row-level security)
      │
      │  Publish  (POST /api/publish, verified server-side)
      ▼
  Storage   published/<public_id>/config.json   ← public file, versioned
      │
      │  tablet fetches the public URL (no login)
      ▼
  Tablet    index.html?config=<public URL>  → renders the guide
```

## Read path — how the tablet gets content

The `published` bucket is **public-read**, so the tablet just does an ordinary HTTPS GET of
the file's public URL. No login, no keys, no database access. This is deliberate: the tablet
stays "dumb" and can't be locked out by an expired credential. It's the same shape as the
original setup, where the tablet read a `config.json` hosted on GitHub Pages — only the
address changed.

## Write path — how files get published

Browsers **cannot** write to Storage here (this project's user tokens use an asymmetric
signing key the Storage service doesn't accept). Instead, publishing runs on the server in
[`app/api/publish/route.ts`](../app/api/publish/route.ts):

1. The dashboard sends the logged-in user's token to `/api/publish`.
2. The server verifies the token and confirms that user **owns** the property.
3. The server writes the file using the **service-role key** (server-only, full access), then
   bumps the `version` in the database.

So the only thing that ever writes to Storage is trusted server code, after an ownership
check.

## How customers stay separated

Two independent layers:

- **In the dashboard (database):** Postgres row-level security means a logged-in customer can
  only read and edit the one property row they own. They can't see or change anyone else's —
  and they can't create properties (that's an operator action, see the main README).
- **In Storage (published files):** each file sits at its own `slug` path, so one customer's
  file is separate from another's.

## Security notes

- The `published` bucket is public, so **anyone who has a file's URL can read it**, including
  the wifi password in it. That's the same exposure as the original public GitHub-hosted
  `config.json`. Don't put anything in the guide you wouldn't put on a note in the rental.
- **Slugs are guessable.** A readable slug like `maria-yunque` means the path is discoverable —
  it does *not* provide the obscurity a random id would. This is no worse than today's public
  repo, but treat published content as fully public. If you want a middle ground, use slugs with
  a short random suffix (`maria-yunque-7f3k`): still readable, not trivially guessable.
- The service-role key is what makes server-side publishing work. It must stay server-side
  only (no `NEXT_PUBLIC_` prefix) and never be committed — see the main README.

## Current limitations

- **One file per property, overwritten each publish.** Storage keeps only the latest file;
  the `version` number lives in the database, not as a history of kept files. No rollback yet.
- **Offline is unsolved.** The published file is a different origin (Supabase) than the guide
  (GitHub Pages). Whether the tablet can cache it for use during an internet/power outage is
  still open — the one caveat that matters most for the on-site tablet.
