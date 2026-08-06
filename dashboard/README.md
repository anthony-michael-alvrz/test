# Guest Guide — Owner Dashboard

A landing page where a property owner logs in and edits their guide, then
**publishes** a plain JSON file that the tablet reads. The tablet never logs in
and never talks to the database — it only fetches the published file, exactly as
it fetches `config.json` today.

```
Owner logs in here  ──edit──>  Supabase (Postgres)
                                    │
                                 publish
                                    │
                                    ▼
                     published/<public_id>/config.json   (public file)
                                    │
                                  tablet reads it
```

This is a thin prototype to prove the loop for one property. It intentionally
edits only a few fields (guest name, wi-fi) for now.

**How storage works per customer** (where the config files live, how they're
isolated, read/write paths): see [docs/storage.md](docs/storage.md).

**Every variable/knob to set** (env vars, tablet knobs, Supabase settings): see
[../docs/configuration.md](../docs/configuration.md).

**Who can do what:** the operator (you) provisions a property when a tablet is
installed. Customers log in and can only *edit* the property assigned to them —
they cannot create properties.

## One-time setup

### 1. Create a Supabase project
- Sign up at supabase.com, create a new project (free tier is fine).
- Wait for it to finish provisioning.

### 2. Run the schema
- In Supabase: **SQL Editor → New query**.
- Paste all of [`supabase/schema.sql`](supabase/schema.sql) and run it.
- This creates the `properties` table, the security rules, and the `published`
  storage bucket.

### 3. Turn off email confirmation (prototype convenience)
- **Authentication → Providers → Email** → turn **Confirm email** off.
- This lets you sign up and immediately sign in without an email round-trip.
  (Turn it back on for real use.)

### 4. Point the dashboard at your project
- In Supabase: **Project Settings → API**. Copy the **Project URL**, the
  **anon public** key, and the **service_role** key.
- Paste all three into [`.env.local`](.env.local) in this folder.
- The service_role key is an operator secret — it's only used by the local
  provisioning script and is never sent to the browser or committed.

### 5. Install and run
```bash
npm install
npm run dev
```
Open the URL it prints (usually http://localhost:3000).

## Using it

**As the customer (in the dashboard):**
1. **Create account**, then **Sign in**.
2. Until a property is assigned to you, the page says "No property assigned yet."

**As the operator (you, from a terminal in this folder):**
Provision a property for that customer — this is what you'd do when installing a
tablet. The customer must have created their login first.
```bash
node --env-file=.env.local scripts/provision.mjs customer@email.com
```
It seeds the property from the current guide content and prints its `public_id`.

**Back as the customer:**
3. Reload — your property now appears. Edit the guest name or wi-fi, then **Save**
   (stores it) and **Publish to tablet** (writes the public file, bumps version).
4. The page shows the published file URL. Point the tablet/app at:
   `…/index.html?config=<that URL>`

## Notes / caveats
- **Publishing is server-side.** The browser can't write to Storage directly —
  this project signs user tokens with an asymmetric key that the Storage service
  doesn't validate, so authenticated uploads are rejected. Instead, Publish calls
  `app/api/publish`, which verifies the caller owns the property and writes the
  file with the service-role key. The browser never writes to Storage. This is
  why the service-role key must be set for the running app, not just the
  provisioning script.
- **Offline:** the published file lives on a different origin (Supabase), so the
  tablet's offline cache won't store it without CORS handling. Fine for testing
  online; must be solved before this replaces `config.json` on a real tablet.
- **Security:** customer isolation is enforced by Postgres Row-Level Security on
  the database, and the publish route re-checks ownership before writing. The
  anon key being public is expected.
- **Deploy (later):** `npm run build`, then host on Vercel (free) so owners reach
  it on a real URL. Add all three env vars in Vercel's project settings (the
  service-role key as a server-side secret, never exposed to the browser).
