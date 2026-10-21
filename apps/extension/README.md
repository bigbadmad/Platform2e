# Platform2e Initiative (Chrome side panel)

The tracker's player page (`apps/tracker/src/player/`) packaged as a Chrome side panel, so a player can keep it open beside Google Meet. It is an addition to `play.html`, which still works as before. The panel imports the player code in place, so there is nothing to keep in sync.

## Build and load

```
npm run build -w apps/extension
```

Then open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and pick `apps/extension/dist`. Click the toolbar icon to open the panel. Players join by typing the session code, since there is no link to carry it.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are read from `apps/tracker/.env.local`, the same file the tracker uses. They are baked in at build time.

`npm run package -w apps/extension` also writes `platform2e-initiative.zip` for the Chrome Web Store.

## Differences from the web player page

- Analytics is off. Extension pages cannot load remote scripts, so `@platform2e/analytics` is aliased to a stub in `vite.config.ts`.
- Font Awesome is bundled from npm instead of the CDN.
- Seat and draft are stored in the extension's own `localStorage`, separate from the website's.
- The only permission is `sidePanel`. The worker (`public/background.js`) just makes the toolbar icon open the panel.
