// The store plays the nations the person at this client does not (FR-099), keeps a replayable order
// log (FR-100) and can start a new game (FR-105). Real newGame(): nation 1 human, nation 2 scripted.
import { describe, it, expect } from 'vitest';
import { createGameStore } from '@/store/rootStore';
import { computerOrders, newGame, resolveTurn, scriptedPlayer, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { CAPITAL_SITES } from '@/engine/world/startWorld';
import { game as fixture } from '../engine/fixtures';

const N1 = 'nation-1';
const N2 = 'nation-2';
const farmer = (nationId: string) => `worker-${nationId}-2`; // START_CIVILIANS: prospector, farmer, ...
const farmerToFarm: Order = { kind: 'moveAndStartDevelopment', nationId: N1, workerId: farmer(N1), toTileId: '3-9' };
const sell = (amount: number): Order => ({ kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Timber, amount });

describe('FR-099 End Turn asks the scripted player for nation 2\'s orders', () => {
  it('FR-099 advanceTurn gives resolveTurn the computer nations\' orders, so nation 2 acts; nation 1 acts only through submitOrder', () => {
    const store = createGameStore({ seed: 4 });
    const before = store.getState().game;
    expect(before.nations.map(n => n.controller)).toEqual(['human', 'scripted']);
    const expected = resolveTurn(before, { [N2]: scriptedPlayer(before, N2) }, before.seed);

    store.getState().advanceTurn();

    expect(store.getState().game).toEqual(expected.state);
    const events = store.getState().eventLog[0].events;
    expect(events.filter(e => e.type === 'order-rejected')).toEqual([]);
    // Nation 2 moved its civilians off the capital; nation 1, which gave no orders, did not.
    const capital = (s: GameState, site: { x: number; y: number }) => s.map.tiles[site.y][site.x];
    expect(capital(store.getState().game, CAPITAL_SITES[1]).workers.length).toBeLessThan(7);
    expect(capital(store.getState().game, CAPITAL_SITES[0]).workers).toHaveLength(7);
  });

  it('FR-099 FR-020 the human\'s orders still apply when submitted, and an order for nation 2 is refused', () => {
    const store = createGameStore({ seed: 4 });
    expect(store.getState().submitOrder(farmerToFarm)).toEqual({ ok: true });
    const foreign: Order = { ...farmerToFarm, nationId: N2, workerId: farmer(N2), toTileId: '15-9' };
    expect(store.getState().submitOrder(foreign)).toEqual({ ok: false, reason: 'not-owner' });
    const applied = store.getState().game;

    store.getState().advanceTurn();

    expect(store.getState().game).toEqual(resolveTurn(applied, computerOrders(applied), applied.seed).state);
  });

  it('FR-099 a fixture with only human nations resolves with no computer orders, as before', () => {
    const g = fixture(2);
    const store = createGameStore({ game: g });
    store.getState().advanceTurn();
    expect(store.getState().game).toEqual(resolveTurn(g, {}, g.seed).state);
  });
});

describe('FR-100 the order log', () => {
  /** Three turns through the store: the human orders on turns 1 and 3, nation 2 plays every turn. */
  function played() {
    const store = createGameStore({ seed: 9 });
    const initial = store.getState().game;
    expect(store.getState().submitOrder(farmerToFarm).ok).toBe(true);
    expect(store.getState().submitOrder(sell(1)).ok).toBe(true);
    store.getState().advanceTurn();
    store.getState().advanceTurn();
    expect(store.getState().submitOrder(sell(2)).ok).toBe(true);
    expect(store.getState().submitOrder(sell(1)).ok).toBe(true);
    store.getState().advanceTurn();
    return { store, initial };
  }

  it('FR-100 End Turn appends { turn, nationId, orders } for every nation in state order: the human\'s applied orders, nation 2\'s player orders', () => {
    const { store } = played();
    const log = store.getState().orderLog;

    expect(log.map(e => [e.turn, e.nationId])).toEqual([[1, N1], [1, N2], [2, N1], [2, N2], [3, N1], [3, N2]]);
    expect(log[0].orders).toEqual([farmerToFarm, sell(1)]);
    expect(log[2].orders).toEqual([]);
    expect(log[4].orders).toEqual([sell(2), sell(1)]);
    for (const entry of log.filter(e => e.nationId === N2)) expect(entry.orders.length).toBeGreaterThan(0);
  });

  it('FR-100 refused orders are not logged', () => {
    const store = createGameStore({ seed: 9 });
    expect(store.getState().submitOrder(sell(99)).ok).toBe(false);
    store.getState().advanceTurn();
    expect(store.getState().orderLog[0]).toEqual({ turn: 1, nationId: N1, orders: [] });
  });

  it('FR-100 FR-014 replaying the log through resolveTurn from the start state gives the same game', () => {
    const { store, initial } = played();
    const log = store.getState().orderLog;

    let replayed = initial;
    for (const turn of [1, 2, 3]) {
      const orders = Object.fromEntries(log.filter(e => e.turn === turn).map(e => [e.nationId, e.orders]));
      replayed = resolveTurn(replayed, orders, replayed.seed).state;
    }

    expect(replayed).toEqual(store.getState().game);
    expect(JSON.parse(JSON.stringify(log))).toEqual(log);
  });

  it('FR-100 nothing is logged for a turn after game over', () => {
    const store = createGameStore({ game: newGame({ seed: 1, turnLimit: 1 }) });
    store.getState().advanceTurn();
    expect(store.getState().orderLog).toHaveLength(2);
    store.getState().advanceTurn();
    expect(store.getState().orderLog).toHaveLength(2);
  });
});

describe('FR-105 startNewGame', () => {
  it('FR-105 FR-100 a new game resets the game, the order log, the event log, the last refusal and isGameOverHidden', () => {
    const store = createGameStore({ game: newGame({ seed: 1, turnLimit: 1 }) });
    store.getState().submitOrder(farmerToFarm);
    store.getState().advanceTurn();
    store.getState().submitOrder(farmerToFarm); // refused: the game is over
    store.getState().hideGameOver();
    expect(store.getState()).toMatchObject({ isGameOverHidden: true });
    expect(store.getState().orderLog.length).toBeGreaterThan(0);
    expect(store.getState().lastRejection).not.toBeNull();

    // FR-160: the expectation is the engine default (two-islands), so the world is named.
    store.getState().startNewGame({ seed: 12, world: 'two-islands' });

    const s = store.getState();
    expect(s.game).toEqual(newGame({ seed: 12 }));
    expect(s).toMatchObject({ isGameOverHidden: false, lastRejection: null, eventLog: [], orderLog: [], activeNationId: N1 });

    // The cleared turn orders are not carried into the new game's log.
    s.advanceTurn();
    expect(store.getState().orderLog[0]).toEqual({ turn: 1, nationId: N1, orders: [] });
  });

  it('FR-105 FR-019 without a seed the new game draws one; a turn limit is passed through (and clamped)', () => {
    const store = createGameStore({ seed: 1 });
    store.getState().startNewGame({ turnLimit: 1000 });
    expect(store.getState().game.turnLimit).toBe(400);
    expect(Number.isInteger(store.getState().game.seed)).toBe(true);
    expect(store.getState().game.nations.map(n => n.id)).toEqual([N1, N2]);
  });
});


describe('FR-109 startNewGame clears the session', () => {
  it('FR-109 a new game clears the tile and worker selection and closes every dialog', () => {
    const store = createGameStore({ game: newGame({ seed: 1 }) });
    store.getState().selectTile('3-9');
    store.getState().selectWorker('worker-nation-1-2');
    store.getState().openCapital();
    store.getState().openMarket();
    store.getState().openWarehouse();
    store.getState().openTransportAllocation();
    store.getState().openConstructionModal('2-9', 'worker-nation-1-7');
    expect(store.getState()).toMatchObject({ selectedTileId: '3-9', selectedWorkerId: 'worker-nation-1-2', isCapitalOpen: true });

    store.getState().startNewGame({ seed: 2 });

    expect(store.getState()).toMatchObject({
      selectedTileId: undefined,
      selectedWorkerId: undefined,
      isCapitalOpen: false,
      isMarketOpen: false,
      isWarehouseOpen: false,
      isTransportAllocationOpen: false,
      isConstructionModalOpen: false,
      constructionModalTileId: null,
      constructionModalWorkerId: null,
    });
  });
});

describe('FR-160 startNewGame resets every overlay flag, also the ones a later milestone adds', () => {
  /**
   * What startNewGame does not reset: `game`, which it replaces, and the camera, which keeps where the
   * player scrolled. Every other key of the store, whatever its name or type (a flag, a selected id, a
   * log), is part of the old game's session (review F3: a guard by name missed `constructionModalTileId`).
   */
  const KEPT = ['game', 'cameraX', 'cameraY', 'cameraMoves'];
  /** A value unlike `value` of the same kind: a flag flipped, a number moved, an id or a list filled. */
  const changed = (value: unknown): unknown => {
    if (typeof value === 'boolean') return !value;
    if (typeof value === 'number') return value + 1;
    if (typeof value === 'string') return `${value}-changed`;
    if (Array.isArray(value)) return [...value, { changed: true }];
    if (value && typeof value === 'object') return { ...value, changed: true };
    return 'changed';
  };

  it('FR-160 every store key but the game and the camera is back at its initial value after startNewGame', () => {
    const store = createGameStore({ game: newGame({ seed: 1 }) });
    const initial = store.getInitialState() as unknown as Record<string, unknown>;
    const session = Object.keys(initial).filter((key) => typeof initial[key] !== 'function' && !KEPT.includes(key));
    // The keys of M1 to M5; a key M6 to M9 add (for example isDiplomacyOpen or a selected country) is picked up here too
    expect(session).toEqual(expect.arrayContaining([
      'activeNationId', 'lastRejection', 'eventLog', 'orderLog', 'ordersThisTurn', 'isWarehouseOpen', 'isCapitalOpen',
      'isMarketOpen', 'isGameOverHidden', 'isTransportAllocationOpen', 'selectedTileId', 'hoveredTileId', 'selectedWorkerId',
      'isConstructionModalOpen', 'constructionModalTileId', 'constructionModalWorkerId',
    ]));

    store.setState(Object.fromEntries(session.map((key) => [key, changed(initial[key])])));
    const before = store.getState() as unknown as Record<string, unknown>;
    expect(session.filter((key) => JSON.stringify(before[key]) === JSON.stringify(initial[key]))).toEqual([]);
    store.getState().startNewGame({ seed: 2 });

    const after = store.getState() as unknown as Record<string, unknown>;
    expect(session.filter((key) => JSON.stringify(after[key]) !== JSON.stringify(initial[key]))).toEqual([]);
    // The app's default world (FR-144)
    expect(store.getState().game.worldId).toBe('continent');
  });
});

describe('FR-108 the store selects only the player\'s workers', () => {
  it('FR-108 selectWorker and setSelectedWorkerId ignore another nation\'s worker and an unknown id', () => {
    const store = createGameStore({ game: newGame({ seed: 1 }) });
    for (const id of ['worker-nation-2-1', 'no-such-worker']) {
      store.getState().selectWorker(id);
      store.getState().setSelectedWorkerId(id);
      expect(store.getState().selectedWorkerId).toBeUndefined();
    }
    store.getState().setSelectedWorkerId('worker-nation-1-1');
    expect(store.getState().selectedWorkerId).toBe('worker-nation-1-1');
    // Another nation's worker leaves the current selection as it was
    store.getState().selectWorker('worker-nation-2-1');
    expect(store.getState().selectedWorkerId).toBe('worker-nation-1-1');
  });
});
