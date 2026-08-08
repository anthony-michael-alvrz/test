# Contributing

## Branches
- **`midway`** — active development. Do your work here.
- **`main`** — production. GitHub Pages serves the tablet app from `main` (root), and the live
  wall tablet reads from it, so **never push straight to `main`**.
- **Release** = merge `midway` → `main` (`git checkout main && git merge midway && git push`),
  then confirm the Pages build went green.

## Commits — every commit carries its own release notes
The commit message is the single source of truth for *what went into this commit*, so a future
developer can understand it from `git log` alone. Follow this format:

```
<type>(<scope>): <imperative summary>

Why:   <the problem / motivation>
What:  <the key changes>
Notes: <migrations, gotchas, follow-ups — or "none">
```

- **types:** `feat` `fix` `chore` `docs` `refactor` `test` `ops`
- **scopes:** `tablet` `dashboard` `backend` `deploy` `docs` `repo`
- Header ≤ 72 chars, imperative mood ("add", not "added").

A commit-message template lives in `.gitmessage`. Enable it once, locally:

```
git config commit.template .gitmessage
```

### Example
```
fix(tablet): serve last-good guide when the network drops

Why:   a powered tablet that briefly lost wifi showed a "Couldn't load the
       guide" error instead of the guide it had already downloaded.
What:  cache the published config on a successful load; boot() falls back to
       the cached copy with a "showing saved version" note.
Notes: none
```

## Deferred (later)
- A human-readable CHANGELOG can be **auto-generated** from these commit messages
  (git-cliff / release-please) — no need to hand-maintain one.
- Commit-message linting (commitlint) will run in CI.
