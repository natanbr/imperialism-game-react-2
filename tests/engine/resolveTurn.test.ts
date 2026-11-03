import { describe, it, expect } from 'vitest';
import { applyTurnOrders, resolveTurn } from '@/engine/turn/resolveTurn';
import { applyOrder } from '@/engine/orders/apply';
import { Order } from '@/engine/orders/Order';
import { GameEvent } from '@/engine/turn/context';
import { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { createTileId } from '@/utils/tileIdUtils';
import { deepFreeze, game, locate, N1, N2, put, setTile, T, tileAt, workerId } from './fixtures';

const W = {
  prospector: workerId(N1, WorkerType.Prospector),
  farmer: workerId(N1, WorkerType.Farmer),
  engineer: workerId(N1, WorkerType.Engineer),
  farmer2: workerId(N2, WorkerType.Farmer),
};
const farm2b = createTileId(4, 0); // a nation-2 farm next to the border

const sampleOrders = (): Record<string, Order[]> => ({
  [N1]: [
    { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 },
    { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 },
    { kind: 'setTransportAllocations', nationId: N1, allocations: { grain: 2 } },
  ],
  [N2]: [{ kind: 'moveWorker', nationId: N2, workerId: W.farmer2, toTileId: T.farm2 }],
});

describe('resolveTurn', () => {
  it('FR-011 advances the turn by one and the year every fourth turn, as before', () => {
    const t1 = resolveTurn(game(), {}, 1).state;
    expect([t1.turn, t1.year]).toEqual([2, 1900]);

    const t4 = resolveTurn({ ...game(), turn: 4 }, {}, 1).state;
    expect([t4.turn, t4.year]).toEqual([5, 1901]);
  });

  it('FR-011 applies the transport capacity bought last turn and clears the queue', () => {
    const state: GameState = { ...game(), nations: game().nations.map(n => ({ ...n, transportCapacityPendingIncrease: 3 })) };

    const s = resolveTurn(state, {}, 1).state;

    expect(s.nations.map(n => [n.transportCapacity, n.transportCapacityPendingIncrease])).toEqual([[13, 0], [11, 0]]);
  });

  it('FR-011 resets workers: moved ones become available, working ones keep their job', () => {
    let state = applyOrder(game(), { kind: 'moveWorker', nationId: N1, workerId: W.engineer, toTileId: T.orchard1 });
    state = applyOrder(state, { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 });

    const s = resolveTurn(state, {}, 1).state;

    expect(locate(s, W.engineer)!.worker).toMatchObject({ status: WorkerStatus.Available, justMoved: false, previousTileId: undefined });
    expect(locate(s, W.farmer)!.worker).toMatchObject({ status: WorkerStatus.Working, justMoved: false });
  });

  it('FR-011 applies each nation\'s orders, then runs the systems (a one-turn prospect resolves)', () => {
    const { state: s, events } = resolveTurn(game(), sampleOrders(), 1);

    expect(locate(s, W.prospector)!.tile.id).toBe(T.mountains1);
    expect(tileAt(s, T.mountains1).resource?.discovered).toBe(true);
    expect(locate(s, W.prospector)!.worker.status).toBe(WorkerStatus.Available);
    expect(tileAt(s, T.farm1).developmentJob?.workerId).toBe(W.farmer);
    expect(s.transportAllocationsByNation?.[N1]).toEqual({ grain: 2 });
    expect(locate(s, W.farmer2)!.tile.id).toBe(T.farm2);
    expect(events).toContainEqual(expect.objectContaining({ type: 'resource-discovered', tileId: T.mountains1, nationId: N1 }));
    expect(events.at(-1)).toEqual({ type: 'turn-ended', turn: 2, year: 1900 });
  });

  it('FR-011 a refused order becomes an order-rejected event and changes nothing', () => {
    const bad: Order = { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.water };
    const forged: Order = { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 };

    const { state: s, events } = resolveTurn(game(), { [N1]: [bad], [N2]: [forged] }, 1);

    const rejected = events.filter((e): e is Extract<GameEvent, { type: 'order-rejected' }> => e.type === 'order-rejected');
    expect(rejected).toEqual([
      { type: 'order-rejected', nationId: N1, order: bad, reason: 'invalid-target' },
      { type: 'order-rejected', nationId: N2, order: forged, reason: 'not-owner' },
    ]);
    expect(locate(s, W.farmer)!.tile.id).toBe(T.capital1);
  });

  it('FR-011 FR-012 orders are applied nation by nation in state order and the accepted ones reach the context', () => {
    const orders = sampleOrders();
    const emitted: GameEvent[] = [];
    // Listed nation-2 first: state order (nation-1, nation-2) must still win.
    const { accepted } = applyTurnOrders(game(), { [N2]: orders[N2], [N1]: orders[N1] }, e => emitted.push(e));

    expect(accepted).toEqual([...orders[N1], ...orders[N2]]);
    expect(emitted).toEqual([]);
  });

  it('FR-011 giving the orders to resolveTurn equals applying them first and resolving with none', () => {
    const orders = sampleOrders();
    const applied = [...orders[N1], ...orders[N2]].reduce(applyOrder, game());

    expect(resolveTurn(game(), orders, 7).state).toEqual(resolveTurn(applied, {}, 7).state);
  });

  it('FR-013 leaves a deep-frozen input state and order list unchanged', () => {
    const state = deepFreeze(game());
    const orders = deepFreeze(sampleOrders());
    const snapshot = structuredClone(state);

    resolveTurn(state, orders, 1);

    expect(state).toEqual(snapshot);
  });

  it('FR-002 randomness comes only from the seed and the turn: same seed, same find; other seeds differ', () => {
    // A prospect on a mountain with no known resource makes the development system draw a mineral.
    const blind = (seed: number) => {
      let s = put(game(seed), W.prospector, T.mountains1, { status: WorkerStatus.Working });
      s = setTile(s, T.mountains1, { terrain: TerrainType.Mountains, resource: undefined, prospecting: { startedOnTurn: 1, workerId: W.prospector } });
      return tileAt(resolveTurn(s, {}, seed).state, T.mountains1).resource?.type;
    };

    expect(blind(3)).toBe(blind(3));
    const finds = new Set(Array.from({ length: 12 }, (_, i) => blind(i + 1)));
    expect(finds.size).toBeGreaterThan(1);
  });

  it('FR-011 unknown nations in the order map are rejected, not applied', () => {
    const order: Order = { kind: 'moveWorker', nationId: 'nation-9', workerId: W.farmer, toTileId: farm2b };

    const { events } = resolveTurn(game(), { 'nation-9': [order] }, 1);

    expect(events).toContainEqual({ type: 'order-rejected', nationId: 'nation-9', order, reason: 'unknown-nation' });
  });
});
