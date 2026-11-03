import { describe, it, expect } from 'vitest';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { TWO_NATION_IDS } from '@/testing/mockNation';
import { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { game, N1, put, setTile, T, tileAt, workerId } from './fixtures';
import { newGame, play, replay } from './headless';

// No order reaches the RNG today (validate refuses prospecting a tile with no resource), so the
// state is built directly: a prospector already working on a mountain with no known resource
// makes the development system draw a mineral.
const blindProspect = (seed: number): GameState => {
  const prospector = workerId(N1, WorkerType.Prospector);
  const s = put(game(seed), prospector, T.mountains1, { status: WorkerStatus.Working });
  return setTile(s, T.mountains1, { terrain: TerrainType.Mountains, resource: undefined, prospecting: { startedOnTurn: 1, workerId: prospector } });
};
const runTurns = (state: GameState, turns: number): GameState => {
  let s = state;
  for (let i = 0; i < turns; i++) s = resolveTurn(s, {}, s.seed).state;
  return s;
};

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

  it('FR-002 FR-014 a replay that draws from the RNG: same seed gives deep-equal states, another seed another find', () => {
    const first = runTurns(blindProspect(3), 3);
    const again = runTurns(blindProspect(3), 3);
    const other = runTurns(blindProspect(4), 3);

    const found = tileAt(first, T.mountains1).resource?.type;
    expect(found).toBeDefined();
    expect(again).toEqual(first);
    expect(tileAt(other, T.mountains1).resource?.type).toBeDefined();
    expect(tileAt(other, T.mountains1).resource?.type).not.toBe(found);
  });
});
