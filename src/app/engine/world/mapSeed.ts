import { fnv1a32 } from "../rng";

type MapSeed = { kind: "seed"; seed: number } | { kind: "empty" } | { kind: "invalid" };

/** The store draws a seed at Start only for an empty entry. Zero is a replayable seed. */
export function parseMapSeed(input: string): MapSeed {
  const key = input.trim();
  if (!key) return { kind: "empty" };
  if (/^[0-9]+$/.test(key)) {
    const seed = Number(key);
    return seed <= 0xffffffff ? { kind: "seed", seed } : { kind: "invalid" };
  }
  if (/^[A-Za-z0-9 -]{1,64}$/.test(key) && /[A-Za-z]/.test(key)) {
    return { kind: "seed", seed: fnv1a32(key) };
  }
  return { kind: "invalid" };
}
