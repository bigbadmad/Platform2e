import { defaultRng, rollDice, type Rng } from '@platform2e/dice';

/** Roll actual HP from a 2e HD string such as "2", "3+1", "1-1", "6+6", "1/2", "45 hp". */
export function rollHD(hd: string, rng: Rng = defaultRng): number {
  const s = hd.trim().toLowerCase();

  // Fixed or range HP notation: "45 hp", "45-75 hp"
  if (s.includes('hp')) {
    const range = s.match(/(\d+)-(\d+)\s*hp/);
    if (range) {
      const lo = parseInt(range[1], 10);
      const hi = parseInt(range[2], 10);
      return rng.int(lo, hi);
    }
    const fixed = s.match(/(\d+)\s*hp/);
    return fixed ? parseInt(fixed[1], 10) : 1;
  }

  // Fractional HD: "1/2" → 1d4, "1/4" → 1 HP
  if (s.includes('/')) {
    const den = parseInt(s.split('/')[1] ?? '2', 10);
    return den >= 4 ? 1 : rollN(1, 4, 0, rng);
  }

  // Open-ended: "11+"
  const openMatch = s.match(/^(\d+)\+$/);
  if (openMatch) return rollN(parseInt(openMatch[1], 10), 8, 0, rng);

  // Standard: "X", "X+Y", "X-Y"
  const m = s.match(/^(\d+)(?:([+-])(\d+))?$/);
  if (m) {
    const num = parseInt(m[1], 10);
    const mod = m[2] ? (m[2] === '+' ? 1 : -1) * parseInt(m[3], 10) : 0;
    return rollN(num, 8, mod, rng);
  }

  return 1;
}

function rollN(n: number, sides: number, mod: number, rng: Rng): number {
  return Math.max(1, rollDice(n, sides, rng) + mod);
}
