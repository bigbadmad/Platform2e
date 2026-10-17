import { defaultRng, type Rng } from './rng.js';

/** Roll one die with the given number of sides: 1..sides. */
export function rollDie(sides: number, rng: Rng = defaultRng): number {
  return rng.int(1, sides);
}

/** Roll `count` dice of `sides` sides and sum them. */
export function rollDice(count: number, sides: number, rng: Rng = defaultRng): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(sides, rng);
  return total;
}

export function roll3d6(rng: Rng = defaultRng): number {
  return rollDice(3, 6, rng);
}

export function roll4d6DropLowest(rng: Rng = defaultRng): number {
  const rolls = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)];
  const lowest = Math.min(...rolls);
  return rolls.reduce((a, b) => a + b, 0) - lowest;
}

/**
 * Pick one item with probability proportional to its weight.
 * Falls back to the last item if rounding leaves nothing selected. Returns undefined for an empty list.
 */
export function pickWeighted<T>(
  items: readonly T[],
  weight: (item: T) => number,
  rng: Rng = defaultRng,
): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let r = rng.next() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}
