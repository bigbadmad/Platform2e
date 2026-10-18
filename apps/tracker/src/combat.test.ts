import { describe, it, expect } from 'vitest';
import {
  calcInitiative,
  rollD10,
  sortByInitiative,
  getCombatantsAtSegment,
  maxInitiativeSegment,
  nextActiveSegment,
  firstActiveSegment,
  describeModifiers,
  describeInitiative,
  netModifierOffset,
  speedEffect,
  initiativeParts,
  standingAdjustments,
  cleanAdjustments,
  applyDeclaredAdjustments,
  HASTE_INITIATIVE,
} from './combat.ts';
import type { Combatant, Modifier, ModifierKind } from './types.ts';

// -- Helpers ------------------------------------------------------------------

function mod(kind: ModifierKind, value: number, label = 'test'): Modifier {
  return { id: 'x', kind, value, label };
}

let _id = 0;
function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: String(++_id),
    name: 'C',
    type: 'player',
    maxHp: null,
    currentHp: null,
    modifiers: [],
    d10Roll: null,
    totalInitiative: null,
    prevInitiative: null,
    isSurprised: false,
    isActive: true,
    isHorsDeCombat: false,
    atRange: false,
    targetId: null,
    action: '',
    ...overrides,
  };
}

// -- calcInitiative -----------------------------------------------------------

describe('calcInitiative', () => {
  it('returns the d10 with no modifiers', () => {
    expect(calcInitiative(5, [])).toBe(5);
  });

  it('adds weapon_speed', () => {
    expect(calcInitiative(3, [mod('weapon_speed', 4)])).toBe(7);
  });

  it('adds spell_casting', () => {
    expect(calcInitiative(2, [mod('spell_casting', 5)])).toBe(7);
  });

  it('adds dex_reaction (negative = faster)', () => {
    expect(calcInitiative(7, [mod('dex_reaction', -2)])).toBe(5);
  });

  it('adds dex_reaction (positive = slower)', () => {
    expect(calcInitiative(5, [mod('dex_reaction', 1)])).toBe(6);
  });

  it('adds other modifier', () => {
    expect(calcInitiative(5, [mod('other', 3)])).toBe(8);
  });

  it('haste takes 2 off the total', () => {
    expect(HASTE_INITIATIVE).toBe(-2);
    expect(calcInitiative(9, [], { hasted: true })).toBe(7);
    expect(calcInitiative(5, [mod('weapon_speed', 3)], { hasted: true })).toBe(6);
  });

  it('enforces minimum 1 with haste on very low totals', () => {
    expect(calcInitiative(1, [], { hasted: true })).toBe(1);
    expect(calcInitiative(2, [], { hasted: true })).toBe(1);
  });

  it('enforces minimum 1 when speed and dex push the total to 0 or below', () => {
    expect(calcInitiative(1, [mod('weapon_speed', 1), mod('dex_reaction', -2)])).toBe(1); // raw total 0
    expect(calcInitiative(1, [mod('dex_reaction', -3)])).toBe(1); // raw total -2
  });

  it('slow negates a Dex bonus', () => {
    expect(calcInitiative(5, [mod('dex_reaction', -2)])).toBe(3);
    expect(calcInitiative(5, [mod('dex_reaction', -2)], { slowed: true })).toBe(5);
  });

  it('slow leaves a Dex penalty and other modifiers alone', () => {
    expect(calcInitiative(5, [mod('dex_reaction', 2)], { slowed: true })).toBe(7);
    expect(calcInitiative(5, [mod('weapon_speed', 3), mod('other', -1)], { slowed: true })).toBe(7);
  });

  it('haste and slow cancel each other', () => {
    const mods = [mod('weapon_speed', 3), mod('dex_reaction', -2)];
    expect(speedEffect({ hasted: true, slowed: true })).toBeNull();
    expect(calcInitiative(5, mods, { hasted: true, slowed: true })).toBe(calcInitiative(5, mods));
  });

  it('stacks multiple linear modifiers', () => {
    // 5 + 3 (weapon) - 2 (dex) = 6
    expect(calcInitiative(5, [mod('weapon_speed', 3), mod('dex_reaction', -2)])).toBe(6);
  });

  it('haste stacks with a Dex bonus', () => {
    // 6 + 4 (weapon) - 1 (dex) - 2 (haste) = 7
    expect(calcInitiative(6, [mod('weapon_speed', 4), mod('dex_reaction', -1)], { hasted: true })).toBe(7);
  });
});

describe('speedEffect', () => {
  it('reports the single effect in force', () => {
    expect(speedEffect({})).toBeNull();
    expect(speedEffect({ hasted: true })).toBe('hasted');
    expect(speedEffect({ slowed: true })).toBe('slowed');
  });
});

describe('initiativeParts and describeInitiative', () => {
  it('lists haste as its own part', () => {
    const parts = initiativeParts([mod('weapon_speed', 3, 'Sword')], { hasted: true });
    expect(parts).toEqual([
      { label: 'Sword', value: 3 },
      { label: 'Haste', value: -2 },
    ]);
  });

  it('marks a Dex bonus as ignored under slow, but not a penalty', () => {
    const bonus = initiativeParts([mod('dex_reaction', -2, 'Dex')], { slowed: true });
    expect(bonus).toEqual([{ label: 'Dex', value: -2, ignored: true }]);
    const penalty = initiativeParts([mod('dex_reaction', 1, 'Dex')], { slowed: true });
    expect(penalty).toEqual([{ label: 'Dex', value: 1 }]);
  });

  it('writes the sum out, leaving negated parts out of it', () => {
    const mods = [mod('weapon_speed', 3, 'Sword'), mod('dex_reaction', -2, 'Dex')];
    expect(describeInitiative(5, mods)).toBe('5 +3 -2 = 6');
    expect(describeInitiative(5, mods, { hasted: true })).toBe('5 +3 -2 -2 = 4');
    expect(describeInitiative(5, mods, { slowed: true })).toBe('5 +3 (-2 negated) = 8');
  });
});

describe('adjustments', () => {
  it('standingAdjustments picks out Dex and other modifiers only', () => {
    const mods = [mod('weapon_speed', 3, 'Sword'), mod('dex_reaction', -2, 'Dex'), mod('other', 1, 'Ring')];
    expect(standingAdjustments(mods)).toEqual([
      { kind: 'dex_reaction', label: 'Dex', value: -2 },
      { kind: 'other', label: 'Ring', value: 1 },
    ]);
  });

  it('cleanAdjustments drops anything malformed', () => {
    expect(cleanAdjustments(undefined)).toEqual([]);
    expect(cleanAdjustments('x')).toEqual([]);
    const out = cleanAdjustments([
      { kind: 'dex_reaction', label: '  Dex  ', value: -2 },
      { kind: 'weapon_speed', label: 'Sword', value: 3 }, // not an adjustment kind
      { kind: 'other', label: 'Big', value: 31 }, // out of range
      { kind: 'other', label: 'Half', value: 1.5 }, // not whole
      { kind: 'other', label: 'Str', value: '2' }, // not a number
      null,
      { kind: 'other', value: 1 }, // label falls back
    ]);
    expect(out).toEqual([
      { kind: 'dex_reaction', label: 'Dex', value: -2 },
      { kind: 'other', label: 'Other', value: 1 },
    ]);
  });

  it('cleanAdjustments caps the count and label length', () => {
    const many = Array.from({ length: 9 }, () => ({ kind: 'other', label: 'x'.repeat(80), value: 1 }));
    const out = cleanAdjustments(many);
    expect(out).toHaveLength(6);
    expect(out[0].label).toHaveLength(40);
  });

  it('applyDeclaredAdjustments replaces Dex/other and keeps the weapon', () => {
    const mods = [mod('weapon_speed', 3, 'Sword'), mod('dex_reaction', -2, 'Dex'), mod('other', 1, 'Ring')];
    let n = 0;
    const out = applyDeclaredAdjustments(mods, [{ kind: 'dex_reaction', label: 'Dex', value: -1 }], () => `n${++n}`);
    expect(out.map((m) => [m.kind, m.value])).toEqual([
      ['weapon_speed', 3],
      ['dex_reaction', -1],
    ]);
    expect(out[1].id).toBe('n1');
  });

  it('applyDeclaredAdjustments with an empty list clears them', () => {
    const out = applyDeclaredAdjustments([mod('dex_reaction', -2), mod('other', 1)], [], () => 'z');
    expect(out).toEqual([]);
  });
});

// -- rollD10 ------------------------------------------------------------------

describe('rollD10', () => {
  it('always returns an integer between 1 and 10', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollD10();
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(10);
      expect(Number.isInteger(r)).toBe(true);
    }
  });
});

// -- sortByInitiative ---------------------------------------------------------

describe('sortByInitiative', () => {
  it('sorts ascending by totalInitiative (lower acts first)', () => {
    const a = makeCombatant({ totalInitiative: 8 });
    const b = makeCombatant({ totalInitiative: 3 });
    const c = makeCombatant({ totalInitiative: 6 });
    expect(sortByInitiative([a, b, c]).map((x) => x.totalInitiative)).toEqual([3, 6, 8]);
  });

  it('places inactive combatants after active ones', () => {
    const active = makeCombatant({ totalInitiative: 9 });
    const inactive = makeCombatant({ totalInitiative: 1, isActive: false });
    const sorted = sortByInitiative([inactive, active]);
    expect(sorted[0]).toBe(active);
    expect(sorted[1]).toBe(inactive);
  });

  it('places null initiative after numeric values', () => {
    const rolled = makeCombatant({ totalInitiative: 5 });
    const noRoll = makeCombatant({ totalInitiative: null });
    const sorted = sortByInitiative([noRoll, rolled]);
    expect(sorted[0]).toBe(rolled);
    expect(sorted[1]).toBe(noRoll);
  });

  it('does not mutate the original array', () => {
    const arr = [makeCombatant({ totalInitiative: 5 }), makeCombatant({ totalInitiative: 2 })];
    const first = arr[0];
    sortByInitiative(arr);
    expect(arr[0]).toBe(first);
  });
});

// -- getCombatantsAtSegment ---------------------------------------------------

describe('getCombatantsAtSegment', () => {
  it('returns combatants whose initiative matches the segment', () => {
    const a = makeCombatant({ totalInitiative: 5 });
    const b = makeCombatant({ totalInitiative: 7 });
    expect(getCombatantsAtSegment([a, b], 5, false)).toEqual([a]);
  });

  it('excludes inactive combatants', () => {
    const c = makeCombatant({ totalInitiative: 5, isActive: false });
    expect(getCombatantsAtSegment([c], 5, false)).toEqual([]);
  });

  it('excludes surprised combatants during the surprise phase', () => {
    const surprised = makeCombatant({ totalInitiative: 5, isSurprised: true });
    const normal = makeCombatant({ totalInitiative: 5, isSurprised: false });
    expect(getCombatantsAtSegment([surprised, normal], 5, true)).toEqual([normal]);
  });

  it('includes surprised combatants outside the surprise phase', () => {
    const surprised = makeCombatant({ totalInitiative: 5, isSurprised: true });
    expect(getCombatantsAtSegment([surprised], 5, false)).toEqual([surprised]);
  });

  it('returns empty array when no combatants match', () => {
    const c = makeCombatant({ totalInitiative: 8 });
    expect(getCombatantsAtSegment([c], 5, false)).toEqual([]);
  });
});

// -- maxInitiativeSegment -----------------------------------------------------

describe('maxInitiativeSegment', () => {
  it('returns 10 as the minimum for an empty list', () => {
    expect(maxInitiativeSegment([])).toBe(10);
  });

  it('returns the highest active initiative total', () => {
    const a = makeCombatant({ totalInitiative: 7 });
    const b = makeCombatant({ totalInitiative: 14 });
    expect(maxInitiativeSegment([a, b])).toBe(14);
  });

  it('ignores the surprised-combatant sentinel value (99)', () => {
    const surprised = makeCombatant({ totalInitiative: 99 });
    const normal = makeCombatant({ totalInitiative: 8 });
    expect(maxInitiativeSegment([surprised, normal])).toBe(10); // 8 < 10 minimum
  });

  it('ignores inactive combatants', () => {
    const inactive = makeCombatant({ totalInitiative: 20, isActive: false });
    expect(maxInitiativeSegment([inactive])).toBe(10);
  });

  it('returns 10 when the highest active total is below 10', () => {
    const a = makeCombatant({ totalInitiative: 4 });
    expect(maxInitiativeSegment([a])).toBe(10);
  });
});

// -- nextActiveSegment --------------------------------------------------------

describe('nextActiveSegment', () => {
  it('returns the next segment with activity', () => {
    const c = makeCombatant({ totalInitiative: 7 });
    expect(nextActiveSegment([c], 5, 10, false)).toBe(7);
  });

  it('skips segments with no activity', () => {
    const c = makeCombatant({ totalInitiative: 9 });
    expect(nextActiveSegment([c], 3, 10, false)).toBe(9);
  });

  it('returns null when there is no further activity this round', () => {
    const c = makeCombatant({ totalInitiative: 3 });
    expect(nextActiveSegment([c], 5, 10, false)).toBeNull();
  });

  it('does not return the current segment itself', () => {
    const c = makeCombatant({ totalInitiative: 5 });
    expect(nextActiveSegment([c], 5, 10, false)).toBeNull();
  });

  it('respects maxSegment boundary', () => {
    const c = makeCombatant({ totalInitiative: 12 });
    expect(nextActiveSegment([c], 1, 10, false)).toBeNull(); // 12 > maxSegment 10
  });
});

// -- firstActiveSegment -------------------------------------------------------

describe('firstActiveSegment', () => {
  it('returns the first segment with activity', () => {
    const c = makeCombatant({ totalInitiative: 4 });
    expect(firstActiveSegment([c], 10, false)).toBe(4);
  });

  it('returns 1 when there is no activity', () => {
    expect(firstActiveSegment([], 10, false)).toBe(1);
  });

  it('skips surprised combatants during the surprise phase', () => {
    const surprised = makeCombatant({ totalInitiative: 2, isSurprised: true });
    const normal = makeCombatant({ totalInitiative: 6 });
    expect(firstActiveSegment([surprised, normal], 10, true)).toBe(6);
  });
});

// -- describeModifiers --------------------------------------------------------

describe('describeModifiers', () => {
  it('returns "None" for an empty modifier list', () => {
    expect(describeModifiers([])).toBe('None');
  });

  it('formats positive modifiers with a + prefix', () => {
    expect(describeModifiers([mod('weapon_speed', 3, 'Sword')])).toBe('Sword (+3)');
  });

  it('formats negative modifiers with a - prefix', () => {
    expect(describeModifiers([mod('dex_reaction', -2, 'High DEX')])).toBe('High DEX (-2)');
  });

  it('joins multiple modifiers with commas', () => {
    const result = describeModifiers([
      mod('weapon_speed', 3, 'Sword'),
      mod('dex_reaction', -1, 'DEX'),
    ]);
    expect(result).toBe('Sword (+3), DEX (-1)');
  });
});

// -- netModifierOffset --------------------------------------------------------

describe('netModifierOffset', () => {
  it('returns 0 for no modifiers', () => {
    expect(netModifierOffset([])).toBe(0);
  });

  it('sums every modifier', () => {
    expect(
      netModifierOffset([
        mod('weapon_speed', 3),
        mod('dex_reaction', -2),
        mod('other', 1),
      ]),
    ).toBe(2);
  });

  it('returns a negative sum when dex bonuses dominate', () => {
    expect(netModifierOffset([mod('dex_reaction', -3), mod('weapon_speed', 1)])).toBe(-2);
  });
});
