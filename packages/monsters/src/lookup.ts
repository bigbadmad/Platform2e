import { MONSTERS } from './data.js';
import type { MonsterTemplate } from './types.js';

/** Find a monster by name, ignoring case. Returns undefined when the library has no such entry. */
export function findMonster(name: string): MonsterTemplate | undefined {
  const wanted = name.toLowerCase();
  return MONSTERS.find((m) => m.name.toLowerCase() === wanted);
}
