/** The engine's only source of randomness. */
export interface Rng {
  /** A number in [0, 1). */
  next: () => number;
}

/** Tiny deterministic PRNG (mulberry32). */
export function createMulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return {
    next: () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/**
 * The RNG for one turn, derived only from the game seed and the turn number, so a replay of
 * the same orders draws the same numbers and no random state lives outside GameState.
 * The mixing formula is the one runTurnPhases used before M1.
 */
export function createTurnRng(seed: number, turn: number): Rng {
  return createMulberry32(((seed ?? 0) ^ (turn * 2654435761)) >>> 0);
}

/**
 * The systems that draw from a random stream of their own (FR-150): a draw in one of them never
 * shifts another's, nor the development and price draws of the shared turn stream (`ctx.rng`).
 * A later requirement adds a name when its system needs one.
 */
export const RNG_STREAMS = ["diplomacy", "combat"] as const;
export type RngStream = (typeof RNG_STREAMS)[number];

/** The 32-bit FNV-1a hash of the string's UTF-16 code units. */
export function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The named stream of one turn: createTurnRng((seed ^ fnv1a32(name)) >>> 0, turn) (FR-150). */
export function createStreamRng(seed: number, turn: number, name: RngStream): Rng {
  return createTurnRng(((seed ?? 0) ^ fnv1a32(name)) >>> 0, turn);
}
