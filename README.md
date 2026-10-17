# Platform2e

AD&D 2nd Edition tools for DMs, in one monorepo.

| App | Path | What it does |
|---|---|---|
| Character generator | `apps/character` | Rolls characters with class/race limits, THAC0, saves and an Excel sheet export |
| Dungeon generator | `apps/dungeon` | Seeded random dungeon maps from the classic random dungeon tables |
| Initiative tracker | `apps/tracker` | Encounter, initiative, combat and loot tool, with optional online play via Supabase |

Shared code lives in `packages/`:

| Package | What it is |
|---|---|
| `@platform2e/dice` | `Rng` interface with a seedable generator and a crypto-backed one, dice rolling and weighted picks |
| `@platform2e/monsters` | Monster library with stats and treasure types, `findMonster`, hit point rolling |

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

## Notes

- `.npmrc` sets `legacy-peer-deps=true`. npm 10 crashes resolving the Vitest 4 peer set without it. Remove it once the toolchain's npm no longer hits that bug.
- The tracker's online play needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. See `apps/tracker/CLAUDE.md`.
