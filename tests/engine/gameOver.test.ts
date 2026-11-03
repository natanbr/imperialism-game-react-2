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
import { deepFreeze, game, N1, N2, treasury } from './fixtures';

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
