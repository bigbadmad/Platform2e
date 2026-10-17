# Platform2e

Monorepo of three vanilla TypeScript + Vite apps for AD&D 2e DMs. No UI framework.

## Layout

- `apps/character` character generator (browser only, Excel export through a SheetJS CDN script)
- `apps/dungeon` seeded dungeon generator (browser only)
- `apps/tracker` initiative tracker, with a Supabase backend for online play (see `apps/tracker/CLAUDE.md`)
- `apps/web` launcher page for the whole site
- `packages/dice` `@platform2e/dice`: `Rng` interface, `SeededRng`, `CryptoRng`, dice helpers
- `packages/monsters` `@platform2e/monsters`: monster library, `findMonster`, `rollHD`
- `packages/ui` `@platform2e/ui`: `el`/`btn`/`mount` DOM helpers, colour tokens and the platform nav bar
- `packages/analytics` `@platform2e/analytics`: `initAnalytics()` and a typed `track()`
- `tsconfig.base.json` shared compiler options, extended by each app and package

## Commands

Run from the repo root. `npm install` once, then:

- `npm run typecheck` / `npm test` / `npm run build` run across all apps
- `-w apps/<name>` or `-w packages/<name>` targets one workspace, for example `npm test -w apps/tracker`
- `npm run dev:character`, `dev:dungeon`, `dev:tracker`, `dev:web` start a dev server
- `npm run build:site` builds everything and assembles one folder, `site/` (launcher at `/`, tools at `/character/`, `/dungeon/`, `/tracker/`). `npm run preview:site` serves it on port 4173.

CI (`.github/workflows/ci.yml`) runs typecheck, test and build on Node 22.

## Hosting

One site: `netlify.toml` at the repo root runs `npm run build:site` and publishes `site/`. The tracker's online play needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set on that site. Analytics is off unless `VITE_ANALYTICS_PROVIDER` and `VITE_ANALYTICS_SITE` are set (see README). Every app builds with `base: './'`, so it works from any sub-path, and links between tools are relative. Add a new tool by giving it a `dist/`, listing it in `scripts/build-site.mjs`, and adding it to `PLATFORM_LINKS` in `packages/ui`.

## Conventions

- ES modules throughout. Relative imports use `.js` extensions in the character and dungeon apps and `.ts` extensions in the tracker. Match the surrounding app.
- Dependencies shared by every app (typescript, vite, vitest, jsdom) live in the root `package.json`. App `package.json` files list only their own runtime dependencies.
- Compiled output goes to each app's `dist/` and is never committed.
- Packages are source-only: `exports` points at `src/index.ts` and Vite compiles them with the app. The game-logic packages (`dice`, `monsters`) must not touch the DOM or Supabase; their tsconfig leaves out the DOM lib so `window` fails the typecheck. `ui` and `analytics` use the DOM, and neither may touch Supabase.
- The privacy note on the launcher (`apps/web/src/privacy.ts`) says what is collected and follows the analytics configuration of the build. If you change what analytics or the tracker sends, update it and its tests.
- Platform chrome (nav bar, launcher) uses the `--p2e-*` tokens from `packages/ui`. Each tool keeps its own look inside its page; the tools do not share a theme.
- Usage events are declared in `packages/analytics/src/events.ts` and sent with `track(name, props)`. Add the event there first. Never put a name, code, seed or anything typed by a user in a property, and send counts through `countBucket`.
- All dice and random picks go through `@platform2e/dice`. Pass an `Rng` where a test or a seeded feature needs determinism. `Math.random()` is only for non-gameplay needs such as DOM ids.
- `.npmrc` has `legacy-peer-deps=true` on purpose. See README.

## Planned direction

The dice/RNG code, the monster library and the platform chrome are shared. 2e rules tables (character app only so far) and treasure are still to be extracted into `packages/*` once a second app needs them. Next: one login across the apps (Supabase accounts), then cloud saves.
