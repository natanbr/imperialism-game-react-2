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
