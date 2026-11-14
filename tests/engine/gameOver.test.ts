// FR-068, FR-069: the game ends after turnLimit turns; after that nothing changes.
import { describe, it, expect } from 'vitest';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { newGame as engineNewGame } from '@/engine/newGame';
import { tryApplyOrder } from '@/engine/orders/apply';
import { Order } from '@/engine/orders/Order';
import { validateOrder } from '@/engine/orders/validate';
import { scoreTable } from '@/engine/score/score';
import { turnLimitOf } from '@/engine/turn/gameOver';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { seasonOf } from '@/engine/calendar';
import { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { transferProvince } from '@/engine/world/provinces';
import { deepFreeze, game, N1, N2, setPair, treasury } from './fixtures';

const resolve = (state: GameState, orders = {}) => resolveTurn(state, orders, state.seed);
/** The fixture on its last turn: turn 40 is Winter 1824. */
const lastTurn = (): GameState => ({ ...game(), turn: 40, year: 1824 });

const sellTimber: Order = { kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Timber, amount: 2 };
const lumber: Order = { kind: 'setProduction', nationId: N1, building: 'lumberMill', amount: 1 };

describe('FR-068 game length', () => {
  it('FR-068 a new game lasts 40 turns unless told otherwise; the fixture also lasts 40', () => {
    expect(engineNewGame({ seed: 1 }).turnLimit).toBe(40);
    expect(engineNewGame({ seed: 1, turnLimit: 3 }).turnLimit).toBe(3);
    expect(game().turnLimit).toBe(40);
    expect(turnLimitOf({ ...game(), turnLimit: undefined })).toBe(40);
    expect(turnLimitOf({ ...game(), turnLimit: 7 })).toBe(7);
  });

  it('FR-105 newGame clamps the turn limit to a whole number from 1 to 400; a value that is not a finite number gives 40', () => {
    const limit = (turnLimit: number) => engineNewGame({ seed: 1, turnLimit }).turnLimit;
    expect([0, -5, 0.5, 1, 2.7, 400, 401, 1e9].map(limit)).toEqual([1, 1, 1, 1, 2, 400, 400, 400]);
    expect([NaN, Infinity, -Infinity].map(limit)).toEqual([40, 40, 40]);
    expect(engineNewGame({ seed: 1, turnLimit: undefined }).turnLimit).toBe(40);
  });

  it('FR-105 a NaN turn limit still ends the game after turn 40', () => {
    let s = { ...engineNewGame({ seed: 1, turnLimit: NaN }), turn: 40, year: 1824 };
    s = resolve(s).state;
    expect(s.gameOver).toMatchObject({ turn: 40 });
  });

  it('FR-027 FR-068 turn 40 is Winter 1824, the season before the first Council meeting (Spring 1825)', () => {
    expect(seasonOf(40)).toBe('winter');
    let s = game();
    for (let i = 0; i < 39; i++) s = { ...s, turn: s.turn + 1, year: s.year + (seasonOf(s.turn) === 'winter' ? 1 : 0) };
    expect([s.turn, s.year]).toEqual([40, 1824]);
  });

  it('FR-068 the game is not over before its last turn resolves', () => {
    const { state, events } = resolve({ ...game(), turn: 39, year: 1824 });
    expect(state.gameOver).toBeUndefined();
    expect(events.some(e => e.type === 'game-over')).toBe(false);
  });

  it('FR-068 resolving the last turn ends the game: the record holds the last turn, its year and the final scores', () => {
    const { state, events } = resolve(deepFreeze(lastTurn()));

    expect([state.turn, state.year]).toEqual([41, 1825]);
    expect(state.gameOver).toEqual({ turn: 40, year: 1824, scores: scoreTable(state) });
    expect(state.gameOver!.scores.map(s => s.nationId).sort()).toEqual([N1, N2]);
    expect(events.slice(-2)).toEqual([
      { type: 'turn-ended', turn: 41, year: 1825 },
      { type: 'game-over', turn: 40, year: 1824, scores: scoreTable(state) },
    ]);
  });

  it('FR-068 the last turn\'s deals count in the final score', () => {
    const withSale = resolve(lastTurn(), { [N1]: [sellTimber] }).state;
    const without = resolve(lastTurn()).state;

    expect(treasury(withSale, N1) - treasury(without, N1)).toBe(200);
    const points = (s: GameState) => s.gameOver!.scores.find(x => x.nationId === N1)!.points.treasury;
    expect(points(withSale) - points(without)).toBe(2);
  });

  it('FR-068 a one-turn game is over after its first resolve', () => {
    const { state } = resolve({ ...game(), turnLimit: 1 });
    expect(state.gameOver).toMatchObject({ turn: 1, year: 1815 });
  });
});

describe('FR-069 after game over', () => {
  const over = () => deepFreeze(resolve(lastTurn()).state);

  it('FR-069 every order is refused with game-over, even one that was valid before', () => {
    expect(validateOrder(lastTurn(), lumber)).toEqual({ ok: true });
    expect(validateOrder(lastTurn(), sellTimber)).toEqual({ ok: true });

    const s = over();
    for (const order of [sellTimber, lumber, { ...sellTimber, nationId: 'nation-9' }] as Order[]) {
      expect(validateOrder(s, order)).toEqual({ ok: false, reason: 'game-over' });
      expect(tryApplyOrder(s, order).state).toBe(s);
    }
  });

  it('FR-069 resolveTurn is a no-op: the same state object, no phase, no clock, each order reported as refused', () => {
    const s = over();
    const orders = { [N1]: [sellTimber], [N2]: [{ ...sellTimber, nationId: N2 }] };

    const result = resolve(s, orders);

    expect(result.state).toBe(s);
    expect(result.events).toEqual([
      { type: 'order-rejected', nationId: N1, order: sellTimber, reason: 'game-over' },
      { type: 'order-rejected', nationId: N2, order: { ...sellTimber, nationId: N2 }, reason: 'game-over' },
    ]);
    expect(resolve(s).events).toEqual([]);
    expect(resolve(s).state).toBe(s);
  });

  it('FR-069 the scripted player has nothing to order after the end', () => {
    expect(scriptedPlayer(over(), N1)).toEqual([]);
  });
});

describe('FR-295 the Council of Governors can end the game (M10)', () => {
  /** The continent on `turn`; with `win` Testland holds 5 provinces, Arvelia as its colony and the 3 island minors' votes (9 of 12). */
  function continentOn(turn: number, year: number, win: boolean): GameState {
    let s: GameState = { ...engineNewGame({ seed: 1, world: 'continent', market: 'world' }), turn, year };
    if (!win) return s;
    s = transferProvince(transferProvince(s, 'province-nation-2-ne', N1), 'province-minor-1', N1);
    s = { ...s, minorNations: s.minorNations.map(m => (m.id === 'minor-1' ? { ...m, colonyOf: N1 } : m)) };
    return ['minor-2', 'minor-3', 'minor-4'].reduce((acc, minorId) => setPair(acc, minorId, N1, { points: 60 }), s);
  }

  it('FR-295 FR-068 a continent game whose turn-40 Council has no winner ends by the turn limit, the record as FR-068', () => {
    const { state } = resolve(continentOn(40, 1824, false));
    expect(state.gameOver).toEqual({ turn: 40, year: 1824, scores: scoreTable(state) });
  });

  it('FR-295 a Council winner ends the game on a meeting turn before the last: reason council, the winner, the vote', () => {
    const { state } = resolve(continentOn(20, 1819, true));
    expect(state.gameOver).toMatchObject({ turn: 20, year: 1819, scores: scoreTable(state), reason: 'council', winnerId: N1 });
    expect(state.gameOver!.council!.nominees[0]).toMatchObject({ nationId: N1, total: 9 });
  });

  it('FR-295 FR-069 after a Council win every order is refused with game-over and resolveTurn returns the same state', () => {
    const s = deepFreeze(resolve(continentOn(20, 1819, true)).state);
    expect(validateOrder(s, sellTimber)).toEqual({ ok: false, reason: 'game-over' });
    expect(resolve(s, { [N1]: [sellTimber] }).state).toBe(s);
  });
});
