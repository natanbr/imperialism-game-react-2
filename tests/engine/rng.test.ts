import { describe, it, expect } from 'vitest';
import { createTurnRng } from '@/engine/rng';

const draw = (seed: number, turn: number, n = 5) => {
  const rng = createTurnRng(seed, turn);
  return Array.from({ length: n }, () => rng.next());
};

describe('turn RNG', () => {
  it('FR-002 gives the same sequence for the same seed and turn', () => {
    expect(draw(42, 3)).toEqual(draw(42, 3));
  });

  it('FR-002 gives different sequences for different turns or seeds', () => {
    expect(draw(42, 3)).not.toEqual(draw(42, 4));
    expect(draw(42, 3)).not.toEqual(draw(43, 3));
  });

  it('FR-002 draws numbers in [0, 1)', () => {
    for (const v of draw(7, 1, 200)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
