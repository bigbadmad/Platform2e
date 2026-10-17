# Platform2e

AD&D 2nd Edition tools for DMs, in one monorepo.

| App | Path | What it does |
|---|---|---|
| Character generator | `apps/character` | Rolls characters with class/race limits, THAC0, saves and an Excel sheet export |
| Dungeon generator | `apps/dungeon` | Seeded random dungeon maps from the classic random dungeon tables |
| Initiative tracker | `apps/tracker` | Encounter, initiative, combat and loot tool, with optional online play via Supabase |
| Launcher | `apps/web` | Home page linking the three tools |

Shared code lives in `packages/`:

| Package | What it is |
|---|---|
| `@platform2e/dice` | `Rng` interface with a seedable generator and a crypto-backed one, dice rolling and weighted picks |
| `@platform2e/monsters` | Monster library with stats and treasure types, `findMonster`, hit point rolling |
| `@platform2e/ui` | `el`/`btn`/`mount` DOM helpers, colour tokens and the navigation bar shown above every tool |

Each app imported its full git history from its original repository
(`CharacterGenerator`, `dungeongenerator`, `initiativetracker`).

## Getting started

Needs Node 22 (see `.nvmrc`).

```
npm install
npm run dev:character   # or dev:dungeon, dev:tracker
```

## Scripts

All run across every app from the repository root.

```
npm run typecheck
npm test
npm run build
```

Use `-w apps/<name>` to target one app, for example `npm test -w apps/dungeon`.

`npm run build:site` builds everything into `site/`, and `npm run preview:site` serves it at http://localhost:4173.

## Hosting

The whole platform is one site (see `netlify.toml`): the launcher at `/` and the tools at `/character/`, `/dungeon/` and `/tracker/`. Players join a tracker session at `/tracker/play.html?code=…`.

The tools were previously separate sites. Moving them over keeps the old addresses working by leaving each old site up and adding a redirect to the new path (Netlify normally passes the query string through, but test a real `play.html?code=…` join link before relying on it).

## Notes

- `.npmrc` sets `legacy-peer-deps=true`. npm 10 crashes resolving the Vitest 4 peer set without it. Remove it once the toolchain's npm no longer hits that bug.
- The tracker's online play needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. See `apps/tracker/CLAUDE.md`.
