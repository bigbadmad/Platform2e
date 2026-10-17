import { describe, it, expect } from 'vitest';
import { findMonster } from '@platform2e/monsters';
import { MONSTERS as SPAWN_TABLE } from '../content.js';

// Spawn entries the shared monster library has no stat block for yet. Add the stat block to
// packages/monsters and remove the name here, so a dungeon room can be sent to the tracker.
const NOT_IN_LIBRARY = ['Giant Ant', 'Giant Spider'];

describe('dungeon monsters and the shared monster library', () => {
  it('every spawn entry has a stat block, except the known gaps', () => {
    const missing = SPAWN_TABLE.filter((m) => !findMonster(m.name)).map((m) => m.name).sort();
    expect(missing).toEqual(NOT_IN_LIBRARY);
  });
});
