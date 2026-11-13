// M5 (decision 2): one random stream per system. `ctx.rngFor(name)` gives a new system its own stream,
// so a draw in diplomacy or combat never shifts the development and price draws of `ctx.rng`.
import { describe, it, expect } from 'vitest';
import { createTurnRng, fnv1a32, RNG_STREAMS, type RngStream } from '@/engine/rng';
import { createTurnContext } from '@/engine/turn/context';

const draws = (rng: { next: () => number }, n: number) => Array.from({ length: n }, () => rng.next());

describe('FR-150 ctx.rngFor', () => {
  it('FR-150 the stream names are a fixed list: "diplomacy" and "combat"', () => {
    expect([...RNG_STREAMS]).toEqual(['diplomacy', 'combat']);
  });

  it('FR-150 fnv1a32 is the 32-bit FNV-1a hash (published test vectors)', () => {
    expect(['', 'a', 'foobar'].map(fnv1a32)).toEqual([0x811c9dc5, 0xe40c292c, 0xbf9cf968]);
  });

  it('FR-150 a stream is createTurnRng((seed ^ fnv1a32(name)) >>> 0, turn), the turn being resolved', () => {
    for (const name of RNG_STREAMS) {
      const ctx = createTurnContext({ turn: 7, seed: 12345 });
      expect(draws(ctx.rngFor(name), 5)).toEqual(draws(createTurnRng((12345 ^ fnv1a32(name)) >>> 0, 7), 5));
    }
  });

  it('FR-150 the same seed, turn and name give the same draws; another name, seed or turn gives others', () => {
    const of = (seed: number, turn: number, name: RngStream) => draws(createTurnContext({ turn, seed }).rngFor(name), 5);
    expect(of(3, 4, 'combat')).toEqual(of(3, 4, 'combat'));
    expect(of(3, 4, 'combat')).not.toEqual(of(3, 4, 'diplomacy'));
    expect(of(3, 4, 'combat')).not.toEqual(of(4, 4, 'combat'));
    expect(of(3, 4, 'combat')).not.toEqual(of(3, 5, 'combat'));
  });

  it('FR-150 within one turn a name is one stream: a second rngFor call goes on where the first stopped', () => {
    const ctx = createTurnContext({ turn: 2, seed: 9 });
    const first = draws(ctx.rngFor('combat'), 3);
    const next = draws(ctx.rngFor('combat'), 3);
    expect([...first, ...next]).toEqual(draws(createTurnContext({ turn: 2, seed: 9 }).rngFor('combat'), 6));
  });

  it('FR-150 drawing any number of values from rngFor("combat") leaves the draws of ctx.rng unchanged', () => {
    const alone = draws(createTurnContext({ turn: 5, seed: 77 }).rng, 10);
    for (const n of [1, 13, 500]) {
      const ctx = createTurnContext({ turn: 5, seed: 77 });
      draws(ctx.rngFor('combat'), n);
      const head = draws(ctx.rng, 4);
      draws(ctx.rngFor('diplomacy'), n);
      const tail = draws(ctx.rng, 6);
      expect([...head, ...tail]).toEqual(alone);
    }
  });

  it('FR-150 ctx.rng is unchanged: createTurnRng(seed, turn + 1), as before M5', () => {
    expect(draws(createTurnContext({ turn: 5, seed: 77 }).rng, 5)).toEqual(draws(createTurnRng(77, 6), 5));
  });

  it('FR-150 a name outside the list throws', () => {
    const ctx = createTurnContext({ turn: 1, seed: 1 });
    expect(() => ctx.rngFor('weather' as RngStream)).toThrow(/weather/);
  });
});
