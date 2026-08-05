# Midway Architecture — Design

Status: **design only**, no implementation. Written 2026-08-05 on branch `midway`.

A halfway point between today's single-property static site and a full multi-tenant SaaS.
The goal is to reach most of the value — multiple properties, non-technical self-service —
without taking on the infrastructure of the full future-state design.

---

## Why change anything

Today's system works well for one property owned by the person who wrote it. Two things
break as it grows:

1. **Editing requires git.** Changing a guest name means editing `config.json` and
   committing. Fine for a developer, impossible to hand to a property manager.
2. **Each property needs its own repo or config file.** Workable at two, unmanageable at
   twenty, and there is no shared view across them.

Neither is a technical limit — they're operational ones. That matters, because it means the
trigger to build this is *a non-technical client or a third property*, not a code problem.
At one property this design is speculative and should stay on a branch.

---

## The constraint that shapes everything

The tablet lives in a rental in Rio Grande, Puerto Rico. Power outages and drained batteries
are common, internet is not guaranteed, and **no host is on site**. When power returns the
system must come back to its normal starting state on its own — splash screen, default
language, kiosk locked — with or without internet.

Today's architecture is exceptionally good at this, and the reason is worth naming precisely:
**the tablet is dumb.** It holds static files in a service-worker cache, authenticates
against nothing, and depends on no origin server that can fail. There is almost nothing to
go wrong.

Any design that makes the tablet smarter is a design that makes it more fragile. That is the
central tension of this document.

### Why the tablet must not authenticate

The full future-state diagram has the tablet performing *"Authenticate Device."* This should
not be built, and the failure mode is specific:

Authentication means credentials, and credentials expire. Suppose the tablet holds a token
valid for 30 days. A power outage takes the property offline for four days. The tablet boots,
has no internet, and cannot reach the auth server to refresh. A naive implementation now
shows a sign-in screen — to a guest, in a rental, with nobody available to fix it.

That is a *worse* availability failure than anything the current static design can produce,
and it arrives exactly when it cannot be repaired. Caching a token longer only moves the
cliff; it does not remove it.

**Rule: the tablet never holds a credential, and never needs one to render content it
already has.**

---

## Core pattern

Separate the *authoring* path from the *delivery* path. Authoring can be dynamic,
authenticated, and allowed to fail. Delivery must stay as dumb as it is today.

```
Property manager
      |
      v
  Dashboard  ──writes──>  Postgres
 (authenticated)              |
                          publish
                              |
                              v
                   Versioned JSON per property
                      (public read, on CDN)
                              |
                            polls
                              v
                      Tablet PWA (unchanged model)
```

The publish step is the whole trick. The dashboard writes structured data to Postgres; a
publish action renders that into a **static JSON file per property** and puts it on
storage/CDN. The tablet fetches that file over plain public HTTP and caches it — which is
exactly what it does today with `config.json`.

Consequences:

- **No device auth**, so nothing to expire. The offline story is unchanged.
- **The backend can be completely down** for a week and no guest notices. It is not in the
  serving path.
- **The tablet barely changes** — a different URL and a version field. The renderer, the
  service worker, the 5-minute poll, and the offline behavior all stay as they are.
- **Migration is incremental**, not a rewrite. Each stage below is independently shippable.

### What "versioned" means here

The published file carries a monotonically increasing `version`. The tablet compares versions
rather than diffing the whole body, which is a cleaner form of what
[`index.html:544-554`](../index.html) already does by comparing raw text. It also makes
rollback trivial: republish an older version.

---

## Vendor choices

The collapsed diagram shows Next.js + Cloudflare + Supabase. That can be reduced further.

| Concern | Choice | Note |
|---|---|---|
| Database | Supabase (Postgres) | Row-level security handles per-customer isolation |
| Auth | Supabase Auth | Dashboard users only — never the tablet |
| File storage / CDN | Supabase Storage | Published JSON, images, themes, fonts |
| Dashboard | Static SPA or Next.js | Hosted anywhere; no server of its own required |
| Custom API layer | **Not initially** | The dashboard can reach Supabase directly under RLS |

**Skipping the custom API layer is the main simplification.** An API gateway in front of a
database you control, called only by your own dashboard, is a layer that adds deployment,
secrets, and a failure mode without adding safety that RLS doesn't already provide. Add it
when there's a second consumer or logic that can't live in the database.

That is two vendors instead of three, one bill instead of two, and one less thing to debug at
2am.

### The one thing to watch

Supabase pauses free-tier projects after a period of inactivity. This is harmless for guest
delivery (the tablet reads published files, not the database) but it will surprise you the
first time you open the dashboard after a quiet month. Anything that *does* depend on the
database being awake — a scheduled publish, for instance — needs to account for it.

---

## Data model sketch

Deliberately small. Roughly:

- **organizations** — a customer. Owns properties and users.
- **properties** — one rental unit. Check-in/out times, address, theme selection, wifi.
- **property_content** — the translatable body: cards, rules, checkout steps, local
  recommendations. Versioned; one row per published version so rollback is real.
- **languages** — which locales a property publishes.
- **themes** — reference to a theme file; not per-customer CSS at this stage.
- **devices** — *deferred.* Only needed for telemetry, which is explicitly out of scope.

Multi-tenancy is enforced by row-level security on `organization_id`, not in application
code.

---

## Multi-tenancy and published paths

Each property publishes to a path derived from an opaque id:

```
/published/<property_public_id>/config.json
```

`property_public_id` is a random identifier, not a sequential number or the property name —
so paths aren't guessable or enumerable. The tablet is configured once with its URL, the same
way it's configured with a URL today.

This preserves the existing multi-property mechanism in spirit: the README already documents
`index.html?config=config-cabin.json`, and this is the same idea with the file generated
rather than hand-edited.

---

## Staged migration

Each stage stands alone and leaves a working system.

**Stage 0 — today.** Static files on GitHub Pages, `config.json` edited by hand, polled every
5 minutes.

**Stage 1 — published file, no backend.** Move the tablet from reading a repo-local
`config.json` to reading a versioned published JSON at a configured URL. Generate that file
by hand or with a script. **No database, no dashboard, no auth.**

This is the highest-risk stage and the one worth testing hardest, because it touches the
offline path. It is also independently valuable: it decouples content from the repo, so
content changes stop requiring commits. Do this first and live with it before building
anything else.

**Stage 2 — dashboard and publish pipeline.** Supabase schema, RLS, dashboard for editing,
publish action that renders Stage 1's file from the database. The tablet is untouched — it
cannot tell the difference, which is the proof the pattern is right.

**Stage 3 — deferred optionals.** See below. Only when something concrete demands them.

---

## Requirement traceability

Against the requirements previously agreed (R-01 … R-09):

| ID | Requirement | Effect of this design |
|---|---|---|
| R-01 | Availability | **Preserved.** Delivery path stays static and public-read; no new runtime dependency for guests. |
| R-02 | Boot to welcome page after restart | **Unaffected.** Kiosk shell concern (Fully Kiosk start-on-boot), untouched by backend work. |
| R-03 | Admin exit | **Unaffected.** Fully Kiosk PIN exit. |
| R-04 | No exit from URL | **Unaffected.** Fully Kiosk mode. |
| R-05 | Full screen | **Unaffected.** `manifest.json` display mode. |
| R-06 | Offline cache | **Mechanism changes — needs care.** The published JSON is cross-origin, so the service worker's cache-first logic must be verified against it. Opaque cross-origin responses are skipped by the current `res.status === 200` check in `service-worker.js`; this must be handled explicitly or offline silently breaks. |
| R-07 | Remote update | **Improved.** Publishing replaces committing. Polling logic is retained. |
| R-08 | Two languages | **Preserved**, moves from parallel `en`/`es` blocks into content rows. |
| R-09 | Admin changes while locked | **Improved.** A dashboard replaces editing JSON in GitHub. The router-password ordering problem remains a device concern, unchanged. |

**R-06 is the one to be careful about.** The current service worker caches only responses with
`status === 200`, and a cross-origin fetch without CORS returns an opaque response with
status `0` — the same reason Google Fonts aren't cached today. Serving the published JSON
from another origin without addressing this would break offline while appearing to work
online. Either serve it same-origin, or configure CORS and cache explicitly.

---

## Explicitly deferred

Matching the "Add Later" box in the collapsed diagram. None of these should be built now:

- **Telemetry / device health** — useful once devices are in homes you can't visit, worthless
  at one property you own.
- **MDM / Android Enterprise** — the current decision is Fully Kiosk Plus. Revisit at ~5
  devices, and note that Device Owner provisioning requires a factory reset, so it's cheapest
  on new hardware.
- **Push notifications** — the 5-minute poll is sufficient and far more robust offline.
- **Advanced monitoring** — needs something to monitor first.

---

## Security note (present tense)

Independent of this design: [`config.json`](../config.json) currently contains the wifi
password, the host's phone number, and the laundry door code (`1234`), in a repository served
by GitHub Pages. **Pages on a free account requires a public repository**, which would make
all of it world-readable and indexable today. This should be verified and decided on
regardless of whether the midway design is ever built.

The midway design improves the situation — content sits behind an authenticated dashboard and
publishes to an unguessable path — but it does not remove the underlying fact that anything
the tablet can read without a credential is, by construction, publicly readable. Genuinely
sensitive values should be treated as "visible to anyone who finds the URL," and the door code
in particular may be better delivered another way.

---

## Open questions

- What triggers building this? Suggested: a non-technical client, or a third property.
- Is the dashboard for the owner only, or for clients managing their own properties? Changes
  the auth and RLS model substantially.
- Do published files stay same-origin with the tablet app (simpler offline story) or move to
  a separate storage origin (simpler publishing)? This is the R-06 decision.
- Should themes remain a fixed set, or become per-customer? Per-customer CSS is a much larger
  surface than it appears.
