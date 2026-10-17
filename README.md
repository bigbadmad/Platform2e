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
| `@platform2e/ui` | `el`/`btn`/`mount` DOM helpers, the shared theme, and the navigation bar with its Help panel shown above every tool |
| `@platform2e/analytics` | Typed usage events, sent only when a provider is configured |

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

The tools were previously separate sites, and those keep running untouched. The platform site holds its own built copy of each tool and does not link to the old ones. If you later want the old addresses to forward here, add redirects on the old sites (Netlify normally passes the query string through, but test a real `play.html?code=…` join link first). Anything saved in a browser (an encounter in progress, a saved dungeon) belongs to one address, so move it with the tracker's Export/Import and the dungeon's Save/Load.

## Analytics

Usage numbers come from a privacy-friendly provider (Plausible or Umami). Nothing is sent, and no provider script is added to any page, unless you configure one.

**Turn it on** by setting these on the Netlify site, then redeploying (Vite bakes them in at build time):

| Variable | Value |
|---|---|
| `VITE_ANALYTICS_PROVIDER` | `plausible` or `umami` |
| `VITE_ANALYTICS_SITE` | Plausible: your site's domain. Umami: the website id |
| `VITE_ANALYTICS_SRC` | Script address. Optional for Plausible (defaults to `https://plausible.io/js/script.js`, set it for a self-hosted install). Required for Umami |

**Umami:** add the site in Umami, open its tracking code, and copy the website id (`VITE_ANALYTICS_SITE`) and the script address (`VITE_ANALYTICS_SRC`). Events appear on their own.

**Plausible:** add each event name from the table below as a custom event goal in the site's settings, or it will not show up. Also register the properties you want to break down.

The provider records page views for each tool (the launcher, `/character/`, `/dungeon/`, `/tracker/` and `/tracker/play.html`) and where visitors came from. Add `?utm_source=…` to links you share, for example one per Facebook group, to see which group sends people.

**Events** (defined in `packages/analytics/src/events.ts`):

| Event | Sent when | Properties |
|---|---|---|
| `character_rolled` | Ability scores are rolled | `method`: `4d6` or `3d6` |
| `character_exported` | A sheet is exported | `class`, `race` |
| `dungeon_generated` | A dungeon is generated | `mode` (`full` or `step`), `size`, `level` |
| `dungeon_saved`, `dungeon_loaded`, `dungeon_exported_png` | Save, load, PNG export | none |
| `help_opened` | The Help panel is opened | `page`, `topic` |
| `tracker_encounter_started` | Start Encounter | `players`, `monsters` (count groups such as `2-3`) |
| `tracker_random_encounter` | A random encounter is generated | `terrain` |
| `tracker_session_started` | A DM starts an online session | none |
| `tracker_exported`, `tracker_imported` | Encounter export, import | none |

No event carries a name, session code, seed or anything a person typed. The one place a secret appears is the player page's address (`play.html?code=…`), so on that page Umami is told to leave the query string out of the page view. Other pages keep theirs, which is what lets `?utm_source=…` work. Plausible stores page paths without query strings other than UTM tags, as I understand its documentation, but check that before relying on it.

**Who is left out:** anyone with Do Not Track or Global Privacy Control on, anyone on localhost, and any browser where you run `localStorage.setItem('p2e-no-analytics', '1')` in the console (do this on your own devices so your testing does not count).

**Checking it works:** build with `VITE_ANALYTICS_DEBUG=1` to log every event to the browser console, with or without a provider. After the first deploy, click around and look for the events in the provider's dashboard.

## Notes

- `.npmrc` sets `legacy-peer-deps=true`. npm 10 crashes resolving the Vitest 4 peer set without it. Remove it once the toolchain's npm no longer hits that bug.
- The tracker's online play needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. See `apps/tracker/CLAUDE.md`.
