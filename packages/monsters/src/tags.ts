import type { MonsterTag } from './types.js';

export const ALL_TAGS: MonsterTag[] = [
  'humanoid', 'undead', 'beast', 'giant', 'dragon',
  'monster', 'elemental', 'fiend', 'construct',
];

export const TAG_LABELS: Record<MonsterTag, string> = {
  humanoid:  'Humanoid',
  undead:    'Undead',
  beast:     'Beast',
  giant:     'Giant',
  dragon:    'Dragon',
  monster:   'Monster',
  elemental: 'Elemental',
  fiend:     'Fiend',
  construct: 'Construct',
};
