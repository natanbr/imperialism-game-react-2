import { describe, it, expect } from 'vitest';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { TWO_NATION_IDS } from '@/testing/mockNation';
import { newGame, play, replay } from './headless';

const orderCount = (log: ReturnType<typeof play>) =>
  log.reduce((n, t) => n + Object.values(t.orders).reduce((m, list) => m + list.length, 0), 0);

describe('replay determinism', () => {
  it('FR-014 the same initial state and the same order list over 10 turns give deep-equal states', () => {
    const played = play(newGame(5), 10);
    const log = played.map(t => t.orders);
    expect(orderCount(played)).toBeGreaterThan(20);

    const replayed = replay(newGame(5), log);

    expect(replayed).toEqual(played.at(-1)!.state);
    expect(replayed.turn).toBe(11);
  });

  it('FR-014 a recorded order log survives a JSON round trip and replays to the same state', () => {
    const played = play(newGame(5), 10);
    const log = JSON.parse(JSON.stringify(played.map(t => t.orders)));

    expect(replay(newGame(5), log)).toEqual(played.at(-1)!.state);
  });

  it('FR-002 FR-014 two games interleaved turn by turn end exactly as when run alone (no hidden state)', () => {
    const aloneA = play(newGame(5), 10).at(-1)!.state;
    const aloneB = play(newGame(9), 10).at(-1)!.state;

    let a = newGame(5);
    let b = newGame(9);
    for (let i = 0; i < 10; i++) {
      const ordersA = Object.fromEntries(TWO_NATION_IDS.map(id => [id, scriptedPlayer(a, id)]));
      const ordersB = Object.fromEntries(TWO_NATION_IDS.map(id => [id, scriptedPlayer(b, id)]));
      b = resolveTurn(b, ordersB, b.seed).state;
      a = resolveTurn(a, ordersA, a.seed).state;
    }

    expect(a).toEqual(aloneA);
    expect(b).toEqual(aloneB);
  });
});
