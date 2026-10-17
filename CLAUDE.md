# Platform2e

Monorepo of three vanilla TypeScript + Vite apps for AD&D 2e DMs. No UI framework.

## Layout

- `apps/character` character generator (browser only, Excel export through a SheetJS CDN script)
- `apps/dungeon` seeded dungeon generator (browser only)
- `apps/tracker` initiative tracker, with a Supabase backend for online play (see `apps/tracker/CLAUDE.md`)
- `tsconfig.base.json` shared compiler options, extended by each app

## Commands

Run from the repo root. `npm install` once, then:

- `npm run typecheck` / `npm test` / `npm run build` run across all apps
- `-w apps/<name>` targets one app, for example `npm test -w apps/tracker`
- `npm run dev:character`, `dev:dungeon`, `dev:tracker` start a dev server

CI (`.github/workflows/ci.yml`) runs typecheck, test and build on Node 22.

## Conventions

- ES modules throughout. Relative imports use `.js` extensions in the character and dungeon apps and `.ts` extensions in the tracker. Match the surrounding app.
- Dependencies shared by every app (typescript, vite, vitest, jsdom) live in the root `package.json`. App `package.json` files list only their own runtime dependencies.
- Compiled output goes to each app's `dist/` and is never committed.
- `.npmrc` has `legacy-peer-deps=true` on purpose. See README.

## Planned direction

Shared code (dice/RNG, 2e rules tables, monsters, treasure, UI helpers) is to be extracted into `packages/*`, then a shared shell and one login across the apps. Until that lands, each app owns its own copy of that code.
