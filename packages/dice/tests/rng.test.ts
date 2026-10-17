import { describe, it, expect, vi, afterEach } from 'vitest';
import { SeededRng, CryptoRng, hashSeed, randomSeed, pickWeighted, rollDie, rollDice } from '../src/index.js';

describe('SeededRng', () => {
  it('is reproducible from a seed', () => {
    const a = new SeededRng(123);
    const b = new SeededRng(123);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it('keeps its sequence stable across releases', () => {
    const r = new SeededRng(123);
    expect(Array.from({ length: 3 }, () => r.next())).toEqual([
      0.7872516233474016, 0.1785435655619949, 0.49531551403924823,
    ]);
  });

  it('can resume from its saved state', () => {
    const a = new SeededRng(5);
    a.next();
    const b = new SeededRng(a.state);
    expect(b.next()).toBe(a.next());
  });

  it('int stays within bounds and reaches both ends', () => {
    const rng = new SeededRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('shuffle keeps every item', () => {
    expect(new SeededRng(1).shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('shuffle and pick give the same results as before the move to this package', () => {
    const r = new SeededRng(99);
    expect(r.shuffle([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([2, 5, 8, 1, 7, 4, 6, 3]);
    expect(r.pick(['a', 'b', 'c', 'd'])).toBe('a');
    expect(r.int(3, 9)).toBe(5);
    expect(r.chance(0.5)).toBe(false);
  });

  it('shuffle does not modify its input', () => {
    const input = [1, 2, 3];
    new SeededRng(1).shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe('hashSeed and randomSeed', () => {
  it('hashSeed is stable and spreads inputs', () => {
    expect(hashSeed('dragon')).toBe(hashSeed('dragon'));
    expect(hashSeed('dragon')).not.toBe(hashSeed('dragons'));
  });

  it('randomSeed is a 32-bit unsigned integer drawn from the given rng', () => {
    const seed = randomSeed(new SeededRng(1));
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
    expect(randomSeed(new SeededRng(1))).toBe(seed);
  });
});

describe('CryptoRng', () => {
  afterEach(() => vi.restoreAllMocks());

  it('next() maps a 32-bit value onto [0, 1)', () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((arr: Uint32Array) => {
      arr[0] = 2 ** 31;
      return arr;
    }) as typeof globalThis.crypto.getRandomValues);
    expect(new CryptoRng().next()).toBe(0.5);
  });

  it('int returns the minimum when the range is empty', () => {
    expect(new CryptoRng().int(4, 3)).toBe(4);
  });

  it('pick and shuffle use unbiased ints', () => {
    const rng = new CryptoRng();
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(items).toContain(rng.pick(items));
    expect(rng.shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });

  it('works with the real Web Crypto source', () => {
    for (let i = 0; i < 200; i++) {
      const v = rollDie(6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});

describe('dice with a seeded rng', () => {
  it('rollDice is reproducible', () => {
    expect(rollDice(3, 6, new SeededRng(4))).toBe(rollDice(3, 6, new SeededRng(4)));
  });
});

describe('pickWeighted', () => {
  const items = [
    { name: 'common', w: 9 },
    { name: 'rare', w: 1 },
  ];

  it('selects by cumulative weight', () => {
    const fixed = (v: number) => ({ next: () => v }) as unknown as SeededRng;
    expect(pickWeighted(items, (i) => i.w, fixed(0)).name).toBe('common');
    expect(pickWeighted(items, (i) => i.w, fixed(0.89)).name).toBe('common');
    expect(pickWeighted(items, (i) => i.w, fixed(0.95)).name).toBe('rare');
  });

  it('falls back to the last item', () => {
    const fixed = { next: () => 0.999999 } as unknown as SeededRng;
    expect(pickWeighted(items, (i) => i.w, fixed).name).toBe('rare');
  });

  it('follows the weights over many draws', () => {
    const rng = new SeededRng(11);
    let rare = 0;
    for (let i = 0; i < 5000; i++) if (pickWeighted(items, (x) => x.w, rng).name === 'rare') rare++;
    expect(rare).toBeGreaterThan(400);
    expect(rare).toBeLessThan(600);
  });
});
