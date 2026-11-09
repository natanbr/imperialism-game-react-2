// What the store hands to the engine: the GameState under `game`, never the Zustand object
// with its UI state and actions (FR-018, FR-020, FR-021). The engine functions are wrapped in
// spies that keep their real behaviour.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGameStore } from '@/store/rootStore';
import { validateOrder } from '@/engine/orders/validate';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import type { Order } from '@/engine';
import { WorkerType } from '@/types/Workers';
import { game, N1, T, workerId } from '../engine/fixtures';

vi.mock('@/engine/orders/validate', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/engine/orders/validate')>();
  return { ...real, validateOrder: vi.fn(real.validateOrder) };
});
vi.mock('@/engine/turn/resolveTurn', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/engine/turn/resolveTurn')>();
  return { ...real, resolveTurn: vi.fn(real.resolveTurn) };
});

const STORE_ONLY_KEYS = ['submitOrder', 'advanceTurn', 'game', 'activeNationId', 'cameraX', 'selectedWorkerId', 'eventLog'];
const moveFarmer: Order = { kind: 'moveWorker', nationId: N1, workerId: workerId(N1, WorkerType.Farmer), toTileId: T.farm1 };

beforeEach(() => {
  vi.mocked(validateOrder).mockClear();
  vi.mocked(resolveTurn).mockClear();
});

describe('the store passes only the GameState to the engine', () => {
  it('FR-020 submitOrder routes the order through validateOrder with game', () => {
    const g = game();
    const store = createGameStore({ game: g });

    store.getState().submitOrder(moveFarmer);

    expect(validateOrder).toHaveBeenCalledWith(g, moveFarmer);
    const [state] = vi.mocked(validateOrder).mock.calls[0];
    expect(state).toBe(g);
    for (const key of STORE_ONLY_KEYS) expect(state).not.toHaveProperty(key);
  });

  it('FR-021 advanceTurn calls resolveTurn(game, {}, game.seed) once', () => {
    const g = game(5);
    const store = createGameStore({ game: g });

    store.getState().advanceTurn();

    expect(resolveTurn).toHaveBeenCalledTimes(1);
    const [state, orders, seed] = vi.mocked(resolveTurn).mock.calls[0];
    expect(state).toBe(g);
    expect(orders).toEqual({});
    expect(seed).toBe(5);
    for (const key of STORE_ONLY_KEYS) expect(state).not.toHaveProperty(key);
  });

  it('FR-099 on a new game advanceTurn passes nation 2\'s scripted orders, and still only the GameState', () => {
    const store = createGameStore({ seed: 5 });
    const g = store.getState().game;

    store.getState().advanceTurn();

    expect(resolveTurn).toHaveBeenCalledTimes(1);
    const [state, orders, seed] = vi.mocked(resolveTurn).mock.calls[0];
    expect(state).toBe(g);
    expect(orders).toEqual({ 'nation-2': scriptedPlayer(g, 'nation-2') });
    expect(seed).toBe(5);
    for (const key of [...STORE_ONLY_KEYS, 'orderLog', 'startNewGame']) expect(state).not.toHaveProperty(key);
  });
});

describe('FR-077 the store does not resolve a turn after game over', () => {
  it('advanceTurn after the last turn never calls resolveTurn', () => {
    const store = createGameStore({ game: { ...game(), turnLimit: 1 } });
    store.getState().advanceTurn();
    expect(resolveTurn).toHaveBeenCalledTimes(1);

    store.getState().advanceTurn();

    expect(resolveTurn).toHaveBeenCalledTimes(1);
  });
});
