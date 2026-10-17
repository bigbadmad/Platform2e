# Platform2e

Monorepo of three vanilla TypeScript + Vite apps for AD&D 2e DMs. No UI framework.

## Layout

- `apps/character` character generator (browser only, Excel export through a SheetJS CDN script)
- `apps/dungeon` seeded dungeon generator (browser only)
- `apps/tracker` initiative tracker, with a Supabase backend for online play (see `apps/tracker/CLAUDE.md`)
- `packages/dice` `@platform2e/dice`: `Rng` interface, `SeededRng`, `CryptoRng`, dice helpers
- `packages/monsters` `@platform2e/monsters`: monster library, `findMonster`, `rollHD`
- `tsconfig.base.json` shared compiler options, extended by each app and package

## Commands

Run from the repo root. `npm install` once, then:

- `npm run typecheck` / `npm test` / `npm run build` run across all apps
- `-w apps/<name>` or `-w packages/<name>` targets one workspace, for example `npm test -w apps/tracker`
- `npm run dev:character`, `dev:dungeon`, `dev:tracker` start a dev server

CI (`.github/workflows/ci.yml`) runs typecheck, test and build on Node 22.

## Conventions

- ES modules throughout. Relative imports use `.js` extensions in the character and dungeon apps and `.ts` extensions in the tracker. Match the surrounding app.
- Dependencies shared by every app (typescript, vite, vitest, jsdom) live in the root `package.json`. App `package.json` files list only their own runtime dependencies.
- Compiled output goes to each app's `dist/` and is never committed.
- Packages are source-only: `exports` points at `src/index.ts` and Vite compiles them with the app. They must not touch the DOM or Supabase; their tsconfig leaves out the DOM lib so `window` fails the typecheck.
- All dice and random picks go through `@platform2e/dice`. Pass an `Rng` where a test or a seeded feature needs determinism. `Math.random()` is only for non-gameplay needs such as DOM ids.
- `.npmrc` has `legacy-peer-deps=true` on purpose. See README.

## Planned direction

The dice/RNG code and the monster library are shared. 2e rules tables (character app only so far), treasure and UI helpers are still to be extracted into `packages/*`, then a shared shell and one login across the apps. Until each lands, the apps own their own copy of that code.
