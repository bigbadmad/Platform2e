/** A source of randomness. Everything that rolls dice takes one of these. */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

abstract class RngBase implements Rng {
  abstract next(): number;

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

/**
 * Small seedable PRNG (mulberry32). The same seed always gives the same sequence, and the whole
 * state is one number, so it can be saved and resumed.
 */
export class SeededRng extends RngBase {
  state: number;

  constructor(state: number) {
    super();
    this.state = state >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

interface CryptoLike {
  getRandomValues(array: Uint32Array): Uint32Array;
}

/** Looked up on every call so tests can replace getRandomValues. */
function webCrypto(): CryptoLike {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available in this environment');
  }
  return c;
}

/** Cryptographically strong randomness from Web Crypto. Not seedable. */
export class CryptoRng extends RngBase {
  next(): number {
    return webCrypto().getRandomValues(new Uint32Array(1))[0] / 4294967296;
  }

  /** Rejection sampling: values in the biased tail are discarded and redrawn. */
  override int(min: number, max: number): number {
    const range = max - min + 1;
    if (range < 1) return min;
    const limit = Math.floor(0x100000000 / range) * range; // largest multiple of range <= 2^32
    const buf = new Uint32Array(1);
    const crypto = webCrypto();
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return min + (buf[0] % range);
  }
}

/** The source the dice helpers use when none is passed. */
export const defaultRng: Rng = new CryptoRng();
