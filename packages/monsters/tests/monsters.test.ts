import { describe, it, expect } from 'vitest';
import { SeededRng } from '@platform2e/dice';
import { MONSTERS, ALL_TAGS, TAG_LABELS, findMonster, rollHD } from '../src/index.js';

describe('monster library', () => {
  it('has no duplicate names, ignoring case', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const m of MONSTERS) {
      const key = m.name.toLowerCase();
      if (seen.has(key)) dupes.push(m.name);
      seen.add(key);
    }
    expect(dupes).toEqual([]);
  });

  it('gives every monster usable combat numbers', () => {
    for (const m of MONSTERS) {
      expect(m.hp, m.name).toBeGreaterThan(0);
      expect(Number.isInteger(m.ac), m.name).toBe(true);
      expect(Number.isInteger(m.thac0), m.name).toBe(true);
      expect(m.name.trim(), 'name').not.toBe('');
      expect(m.tags.length, m.name).toBeGreaterThan(0);
    }
  });

  it('only uses known tags, and every tag has a label', () => {
    for (const m of MONSTERS) for (const t of m.tags) expect(ALL_TAGS, m.name).toContain(t);
    for (const t of ALL_TAGS) expect(TAG_LABELS[t]).toBeTruthy();
  });
});

describe('findMonster', () => {
  it('finds by name regardless of case', () => {
    const goblin = findMonster('Goblin');
    expect(goblin?.name).toBe('Goblin');
    expect(findMonster('gOBLIN')).toBe(goblin);
  });

  it('returns undefined for a name that is not in the library', () => {
    expect(findMonster('Definitely Not A Monster')).toBeUndefined();
  });
});

describe('rollHD', () => {
  const rng = (seed = 1) => new SeededRng(seed);
  const many = (hd: string, n = 300) => {
    const r = rng(7);
    return Array.from({ length: n }, () => rollHD(hd, r));
  };

  it('rolls plain hit dice as d8s', () => {
    const rolls = many('3');
    expect(Math.min(...rolls)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...rolls)).toBeLessThanOrEqual(24);
  });

  it('adds and subtracts the modifier, never going below 1', () => {
    const plus = many('3+1');
    expect(Math.min(...plus)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...plus)).toBeLessThanOrEqual(25);
    const minus = many('1-1');
    expect(Math.min(...minus)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...minus)).toBeLessThanOrEqual(7);
  });

  it('treats 1/2 HD as a d4 and 1/4 HD as 1 hp', () => {
    const half = many('1/2');
    expect(Math.min(...half)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...half)).toBeLessThanOrEqual(4);
    expect(many('1/4').every((v) => v === 1)).toBe(true);
  });

  it('rolls open-ended HD like 11+ as that many d8s', () => {
    const rolls = many('11+');
    expect(Math.min(...rolls)).toBeGreaterThanOrEqual(11);
    expect(Math.max(...rolls)).toBeLessThanOrEqual(88);
  });

  it('handles fixed and ranged hp', () => {
    expect(rollHD('45 hp', rng())).toBe(45);
    const ranged = many('45-75 hp');
    expect(Math.min(...ranged)).toBeGreaterThanOrEqual(45);
    expect(Math.max(...ranged)).toBeLessThanOrEqual(75);
  });

  it('falls back to 1 for text it cannot read', () => {
    expect(rollHD('lots', rng())).toBe(1);
    expect(rollHD('', rng())).toBe(1);
  });

  it('is reproducible with a seeded rng', () => {
    expect(rollHD('6+6', rng(42))).toBe(rollHD('6+6', rng(42)));
  });

  it('works for the HD string of every monster in the library', () => {
    const r = rng(3);
    for (const m of MONSTERS) expect(rollHD(m.hd, r), m.name).toBeGreaterThanOrEqual(1);
  });
});
