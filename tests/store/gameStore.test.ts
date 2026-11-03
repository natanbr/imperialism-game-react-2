// The store holds one engine GameState plus UI state, and reaches the engine only through
// submitOrder and advanceTurn (FR-018 to FR-022). Replaces the pre-M1 turnSlice test.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGameStore, randomSeed, EVENT_LOG_TURNS } from '@/store/rootStore';
import { applyOrder, resolveTurn, type Order } from '@/engine';
import { WorkerType } from '@/types/Workers';
import { PROSPECT_COST } from '@/definisions/workPrices';
import { game, locate, N1, N2, setTreasury, setWarehouse, T, treasury, workerId } from '../engine/fixtures';

const W = {
  prospector: workerId(N1, WorkerType.Prospector),
  farmer: workerId(N1, WorkerType.Farmer),
};
const prospect: Order = { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 };
const moveFarmer: Order = { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 };

const UI_KEYS = ['activeNationId', 'lastRejection', 'eventLog', 'cameraX', 'cameraY', 'selectedTileId', 'selectedWorkerId',
  'isWarehouseOpen', 'isCapitalOpen', 'isMarketOpen', 'isGameOverHidden', 'isTransportAllocationOpen', 'isConstructionModalOpen'];

describe('FR-018 the store holds one GameState plus UI state', () => {
  it('keeps the game under `game` and the UI state beside it, never mixed', () => {
    const g = game();
    const s = createGameStore({ game: g }).getState();

    expect(s.game).toBe(g);
    expect(s.activeNationId).toBe(N1);
    for (const key of UI_KEYS) expect(s.game).not.toHaveProperty(key);
    for (const key of ['map', 'nations', 'turn', 'year', 'seed', 'transportNetwork']) expect(s).not.toHaveProperty(key);
  });

  it('a new game carries no UI fields (activeNationId, newsLog, turnOrder), before and after a turn', () => {
    const store = createGameStore({ seed: 1 });
    for (const key of ['activeNationId', 'newsLog', 'turnOrder']) expect(store.getState().game).not.toHaveProperty(key);

    store.getState().advanceTurn();

    for (const key of ['activeNationId', 'newsLog', 'turnOrder']) expect(store.getState().game).not.toHaveProperty(key);
  });

  it('FR-027 a new game starts on turn 1 in 1815, nation-1 with its seven workers on the capital', () => {
    const g = createGameStore({ seed: 1 }).getState().game;

    expect(g).toMatchObject({ turn: 1, year: 1815, seed: 1, difficulty: 'normal' });
    expect(g.nations.map(n => n.id)).toEqual(['nation-1']);
    expect(g.map.config).toMatchObject({ cols: 40, rows: 40 });
    const capital = g.map.tiles.flat().find(t => t.cityId === 'capital-1')!;
    expect(capital.workers).toHaveLength(7);
    expect(g.transportNetwork.railroadNetworks?.['nation-1']).toBeDefined();
  });
});

describe('FR-019 a new game picks a seed', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the seed it is given', () => {
    expect(createGameStore({ seed: 42 }).getState().game.seed).toBe(42);
  });

  it('draws a seed at random when none is given, so two new games differ', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.25).mockReturnValueOnce(0.75);

    const a = createGameStore().getState().game.seed;
    const b = createGameStore().getState().game.seed;

    expect(random).toHaveBeenCalledTimes(2);
    expect(a).toBe(randomSeed(() => 0.25));
    expect(b).toBe(randomSeed(() => 0.75));
    expect(a).not.toBe(b);
  });

  it('random seeds are positive 31-bit integers', () => {
    expect(randomSeed(() => 0)).toBe(1);
    const high = randomSeed(() => 0.9999999999);
    expect(Number.isInteger(high)).toBe(true);
    expect(high).toBeLessThan(2 ** 31);
  });
});

describe('FR-020 submitOrder validates, then applies', () => {
  it('a valid order replaces game with the engine result and returns ok', () => {
    const g = game();
    const store = createGameStore({ game: g });

    const result = store.getState().submitOrder(moveFarmer);

    expect(result).toEqual({ ok: true });
    expect(store.getState().game).toEqual(applyOrder(g, moveFarmer));
    expect(locate(store.getState().game, W.farmer)!.tile.id).toBe(T.farm1);
    expect(store.getState().lastRejection).toBeNull();
  });

  it('a refused order leaves game untouched and keeps the order and the reason for the UI', () => {
    const g = setTreasury(game(), N1, PROSPECT_COST - 1);
    const store = createGameStore({ game: g });

    const result = store.getState().submitOrder(prospect);

    expect(result).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(store.getState().game).toBe(g);
    expect(store.getState().lastRejection).toEqual({ order: prospect, reason: 'insufficient-funds' });
  });

  it('the next accepted order clears the refusal', () => {
    const store = createGameStore({ game: setTreasury(game(), N1, PROSPECT_COST - 1) });
    store.getState().submitOrder(prospect);

    store.getState().submitOrder(moveFarmer);

    expect(store.getState().lastRejection).toBeNull();
  });

  it('an order for a nation other than the active one is refused with not-owner', () => {
    const g = game();
    const store = createGameStore({ game: g });
    const foreign: Order = { kind: 'moveWorker', nationId: N2, workerId: workerId(N2, WorkerType.Farmer), toTileId: T.farm2 };

    expect(store.getState().submitOrder(foreign)).toEqual({ ok: false, reason: 'not-owner' });
    expect(store.getState().game).toBe(g);
    expect(store.getState().lastRejection).toEqual({ order: foreign, reason: 'not-owner' });
  });

  it('UI state is not touched by an order', () => {
    const store = createGameStore({ game: game() });
    store.getState().setCamera(120, 80);
    store.getState().selectTile(T.farm1);

    store.getState().submitOrder(moveFarmer);

    expect(store.getState()).toMatchObject({ cameraX: 120, cameraY: 80, selectedTileId: T.farm1 });
  });
});

describe('FR-021 advanceTurn resolves the turn with the engine and keeps the events', () => {
  it('stores resolveTurn(game, {}, seed) and logs its events under the resolved turn', () => {
    const store = createGameStore({ game: game(7) });
    store.getState().submitOrder(prospect);
    const before = store.getState().game;
    const expected = resolveTurn(before, {}, before.seed);

    store.getState().advanceTurn();

    expect(store.getState().game).toEqual(expected.state);
    expect(store.getState().eventLog).toEqual([{ turn: before.turn, year: before.year, events: expected.events }]);
    expect(expected.events.map(e => e.type)).toContain('resource-discovered');
  });

  it('playing through the store equals the headless engine given the same orders', () => {
    const initial = game(3);
    const store = createGameStore({ game: initial });
    for (const order of [prospect, moveFarmer]) expect(store.getState().submitOrder(order).ok).toBe(true);

    store.getState().advanceTurn();

    expect(store.getState().game).toEqual(resolveTurn(initial, { [N1]: [prospect, moveFarmer] }, initial.seed).state);
  });

  it('FR-021 FR-039 advances the turn and builds the freight cars ordered this turn (pre-M1 turnSlice test)', () => {
    const store = createGameStore({ game: setWarehouse(game(), N1, { lumber: 5, steel: 5 }) });
    const before = store.getState().game;
    expect(store.getState().submitOrder({ kind: 'changeTransportCapacity', nationId: N1, delta: 5 }).ok).toBe(true);

    store.getState().advanceTurn();

    const after = store.getState().game;
    expect(after.turn).toBe(before.turn + 1);
    expect(typeof after.year).toBe('number');
    expect(after.nations[0].transportCapacityPendingIncrease ?? 0).toBe(0);
    expect(after.nations[0].transportCapacity).toBe(before.nations[0].transportCapacity + 5);
  });

  it('clears the last refusal', () => {
    const store = createGameStore({ game: setTreasury(game(), N1, 0) });
    store.getState().submitOrder(prospect);
    expect(store.getState().lastRejection).not.toBeNull();

    store.getState().advanceTurn();

    expect(store.getState().lastRejection).toBeNull();
    expect(treasury(store.getState().game, N1)).toBeGreaterThanOrEqual(0);
  });

  it(`keeps only the last ${EVENT_LOG_TURNS} turns in the event log`, () => {
    const store = createGameStore({ game: game() });
    for (let i = 0; i < EVENT_LOG_TURNS + 2; i++) store.getState().advanceTurn();

    const log = store.getState().eventLog;
    expect(log).toHaveLength(EVENT_LOG_TURNS);
    expect(log[0].turn).toBe(3);
    expect(log[log.length - 1].turn).toBe(EVENT_LOG_TURNS + 2);
  });
});

describe('FR-022 only submitOrder and advanceTurn change the game', () => {
  it('every other store action leaves game as it was', () => {
    const g = game();
    const store = createGameStore({ game: g });
    const actions = Object.entries(store.getState()).filter(
      ([name, value]) => typeof value === 'function' && name !== 'submitOrder' && name !== 'advanceTurn'
    );
    expect(actions.length).toBeGreaterThan(10);

    for (const [, action] of actions) (action as (...args: unknown[]) => void)(T.farm1, W.farmer);

    expect(store.getState().game).toBe(g);
  });
});

describe('FR-055 opening the capital clears a stale refusal', () => {
  it('a refusal from the map is gone when the capital dialog opens', () => {
    const store = createGameStore({ game: setTreasury(game(), N1, 0) });
    store.getState().submitOrder(prospect);
    expect(store.getState().lastRejection).not.toBeNull();

    store.getState().openCapital();

    expect(store.getState().isCapitalOpen).toBe(true);
    expect(store.getState().lastRejection).toBeNull();
  });

  it('a refusal of an order sent while the dialog is open still shows', () => {
    const store = createGameStore({ game: setTreasury(game(), N1, 0) });
    store.getState().openCapital();

    store.getState().submitOrder(prospect);

    expect(store.getState().lastRejection).toEqual({ order: prospect, reason: 'insufficient-funds' });
  });
});

describe('FR-077 advanceTurn does nothing after game over', () => {
  it('the turn that ends the game is logged; a further advanceTurn changes nothing and logs nothing', () => {
    const store = createGameStore({ game: { ...game(), turnLimit: 1 } });
    store.getState().advanceTurn();
    const over = store.getState().game;
    expect(over.gameOver).toBeDefined();
    expect(store.getState().eventLog).toHaveLength(1);
    expect(store.getState().eventLog[0].events.map(e => e.type)).toContain('game-over');

    store.getState().advanceTurn();
    store.getState().advanceTurn();

    expect(store.getState().game).toBe(over);
    expect(store.getState().eventLog).toHaveLength(1);
  });

  it('keeps the last refusal and the event log as they were', () => {
    const store = createGameStore({ game: { ...game(), turnLimit: 1 } });
    store.getState().advanceTurn();
    store.getState().submitOrder(moveFarmer);
    const rejection = store.getState().lastRejection;
    expect(rejection).toEqual({ order: moveFarmer, reason: 'game-over' });
    const log = store.getState().eventLog;

    store.getState().advanceTurn();

    expect(store.getState().eventLog).toBe(log);
    expect(store.getState().lastRejection).toBe(rejection);
  });
});
