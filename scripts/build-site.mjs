// Assemble every app's build output into one folder, ready to host as a single site:
//   site/            launcher page
//   site/character/  site/dungeon/  site/tracker/
// Run `npm run build` first (the build:site script does both).
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site');
const tools = ['character', 'dungeon', 'tracker'];

function distOf(app) {
  const dist = join(root, 'apps', app, 'dist');
  if (!existsSync(dist)) throw new Error(`apps/${app}/dist is missing. Run "npm run build" first.`);
  return dist;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync(distOf('web'), out, { recursive: true });
for (const app of tools) cpSync(distOf(app), join(out, app), { recursive: true });

console.log(`Site assembled in site/ (home + ${tools.join(', ')})`);
