// Tiny deterministic PRNG (mulberry32)
export function createMulberry32(seed: number) {
  let t = seed >>> 0;
  return {
    next: () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    }
  };
}


