# Character Generator (AD&D 2e)

A browser-based AD&D 2nd Edition character generator with ability score rollers and automatic class/race limits, saving throws, THAC0, and derived stat modifiers.

## Layout

- `src/` TypeScript source split into small modules:
  - `types.ts` shared enums and interfaces
  - `data.ts` game tables and constants
  - dice come from the shared `@platform2e/dice` package (crypto-backed)
  - `statCalc.ts`, `multiclass.ts` derived stats and multiclass rules
  - `exporter.ts` Excel character sheet export (uses SheetJS from npm, loaded on the first export)
  - `generator.ts` main logic class
  - `main.ts` app bootstrap and DOM wiring
- `tests/` Vitest suites (jsdom)
- `index.html` Vite entry point

## Commands

Run from the repository root with `-w apps/character`, or from this folder:

```
npm run dev         # Vite dev server
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run build       # typecheck, then Vite build into dist/
```

The build uses a relative base (`./`), so `dist/` can be served from any sub-path.
