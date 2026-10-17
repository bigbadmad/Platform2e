import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { rollDie, rollDice, roll3d6, roll4d6DropLowest } from '../src/index.js';

function setMockRandomSequence(seq: number[]) {
  let i = 0;
  vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((arr: Uint32Array) => {
    arr[0] = seq[i++ % seq.length] >>> 0;
    return arr;
  }) as typeof globalThis.crypto.getRandomValues);
}

describe('dice (crypto-backed)', () => {
  beforeEach(() => {
    // default deterministic value
    setMockRandomSequence([0]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rollDie returns values in 1..N', () => {
    setMockRandomSequence([0, 5, 1023]);
    expect(rollDie(6)).toBe(1); // 0 % 6 + 1
    expect(rollDie(6)).toBe(6); // 5 % 6 + 1
    expect(rollDie(20)).toBe((1023 % 20) + 1);
  });

  it('roll3d6 uses three rolls', () => {
    // 0,1,2 -> (1)+(2)+(3) = 6
    setMockRandomSequence([0, 1, 2]);
    expect(roll3d6()).toBe(6);
  });

  it('roll4d6DropLowest drops the lowest of four', () => {
    // 0,1,2,3 -> 1,2,3,4 -> drop 1 => 2+3+4 = 9
    setMockRandomSequence([0, 1, 2, 3]);
    expect(roll4d6DropLowest()).toBe(9);
  });

  it('discards values in the biased tail and retries', () => {
    // For die=6, limit = Math.floor(0x100000000 / 6) * 6 = 4294967292.
    // 4294967293 >= limit so it is rejected; next value 2 → 2 % 6 + 1 = 3.
    // Without rejection the first value would give 4294967293 % 6 + 1 = 2.
    setMockRandomSequence([4294967293, 2]);
    expect(rollDie(6)).toBe(3);
  });

  it('rollDice returns 0 when x is 0', () => {
    // No dice rolled; crypto should never be called.
    expect(rollDice(0, 6)).toBe(0);
  });

  it('rollDice sums exactly x rolls of y-sided die', () => {
    // Values 0,1,2 → rollDie(6) = 1,2,3 → sum = 6 for x=3
    setMockRandomSequence([0, 1, 2]);
    expect(rollDice(3, 6)).toBe(6);
  });

  it('rollDice with x=1 equals a single rollDie(y)', () => {
    setMockRandomSequence([4]); // 4 % 8 + 1 = 5
    expect(rollDice(1, 8)).toBe(5);
  });
});
