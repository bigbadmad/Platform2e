import { defaultRng, type Rng } from './rng.js';

/** Turns free text (or an empty string) into a 32-bit seed. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A fresh 32-bit seed. */
export function randomSeed(rng: Rng = defaultRng): number {
  return Math.floor(rng.next() * 0xffffffff) >>> 0;
}
