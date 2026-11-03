import { describe, it, expect } from 'vitest';
import { applyOrder } from '@/engine/orders/apply';
import { Order, RejectReason } from '@/engine/orders/Order';
import { validateOrder } from '@/engine/orders/validate';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { CONSTRUCTION_COST, DEVELOPMENT_COST, PROSPECT_COST } from '@/definisions/workPrices';
import { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { createTileId } from '@/utils/tileIdUtils';
import { deepFreeze, game, locate, N1, put, setTile, T, tileAt, treasury, workerId } from './fixtures';

const ENGINEER = workerId(N1, WorkerType.Engineer);
const FARMER = workerId(N1, WorkerType.Farmer);
const PROSPECTOR = workerId(N1, WorkerType.Prospector);

// Fixture tiles of nation-1 (see createTwoNationGame): capital (1,1).
const fertileHills = createTileId(1, 2); // next to the capital
const barrenHills = createTileId(0, 2);
const swamp = createTileId(1, 3);
const coastHills = createTileId(2, 4); // barren hills next to the water row

function withTech(state: GameState, id: string): GameState {
  return {
    ...state,
    technologyState: {
      ...state.technologyState,
      technologies: [
        ...state.technologyState.technologies,
        { id, name: id, approximateArrival: [1815, 1815], prerequisites: [], benefits: [], purchased: true, cost: 0 },
      ],
    },
  };
}

const build = (tileId: string, structure: 'rail' | 'depot' | 'port' | 'fort'): Order =>
  ({ kind: 'startConstruction', nationId: N1, workerId: ENGINEER, tileId, structure });
const railTo = (toTileId: string): Order => ({ kind: 'moveAndBuildRail', nationId: N1, workerId: ENGINEER, toTileId });

interface SiteCase {
  name: string;
  setup: (s: GameState) => GameState;
  order: Order;
  expected: 'ok' | RejectReason;
}

const at = (tileId: string) => (s: GameState) => put(s, ENGINEER, tileId);

const siteCases: SiteCase[] = [
  // rail
  { name: 'FR-030 rail started on a tile next to the capital is ok', setup: at(T.farm1), order: build(T.farm1, 'rail'), expected: 'ok' },
  { name: 'FR-030 rail started on a tile with no rail next to it', setup: at(T.orchard1), order: build(T.orchard1, 'rail'), expected: 'invalid-site' },
  { name: 'FR-030 rail started on the capital tile', setup: s => s, order: build(T.capital1, 'rail'), expected: 'invalid-site' },
  { name: 'FR-030 rail onto hills before Compound Steam Engine', setup: s => s, order: railTo(fertileHills), expected: 'invalid-site' },
  { name: 'FR-030 rail onto hills with Compound Steam Engine', setup: s => withTech(s, 'compoundSteamEngine'), order: railTo(fertileHills), expected: 'ok' },
  { name: 'FR-030 rail onto mountains before Dynamite', setup: s => s, order: railTo(T.mountains1), expected: 'invalid-site' },
  { name: 'FR-030 rail onto mountains with Dynamite', setup: s => withTech(s, 'dynamite'), order: railTo(T.mountains1), expected: 'ok' },
  { name: 'FR-030 rail onto swamp before Iron Railroad Bridge', setup: s => put(setTile(s, T.dryPlains1, { connected: true }), ENGINEER, T.dryPlains1), order: railTo(swamp), expected: 'invalid-site' },
  { name: 'FR-030 rail onto swamp with Iron Railroad Bridge', setup: s => withTech(put(setTile(s, T.dryPlains1, { connected: true }), ENGINEER, T.dryPlains1), 'ironRailroadBridge'), order: railTo(swamp), expected: 'ok' },
  { name: 'FR-030 a technology that is listed but not purchased does not count', setup: s => ({ ...s, technologyState: { ...s.technologyState, technologies: [{ id: 'dynamite', name: 'Dynamite', approximateArrival: [1871, 1887], prerequisites: [], benefits: [], purchased: false, cost: 0 }] } }), order: railTo(T.mountains1), expected: 'invalid-site' },

  // depot
  { name: 'FR-030 a depot two tiles from the capital is ok', setup: at(T.orchard1), order: build(T.orchard1, 'depot'), expected: 'ok' },
  { name: 'FR-030 a depot on the capital (already a depot)', setup: s => s, order: build(T.capital1, 'depot'), expected: 'invalid-site' },
  { name: 'FR-030 a depot next to the capital', setup: at(T.farm1), order: build(T.farm1, 'depot'), expected: 'invalid-site' },
  { name: 'FR-030 a depot next to another depot', setup: s => at(T.orchard1)(setTile(s, T.town1, { depot: true })), order: build(T.orchard1, 'depot'), expected: 'invalid-site' },
  { name: 'FR-030 a depot next to a depot under construction', setup: s => at(T.orchard1)(setTile(s, T.town1, { constructionJob: { workerId: 'other', kind: 'depot', startedOnTurn: 1, durationTurns: 3 } })), order: build(T.orchard1, 'depot'), expected: 'invalid-site' },
  { name: 'FR-030 a depot next to a port', setup: s => at(T.orchard1)(setTile(s, T.town1, { port: true })), order: build(T.orchard1, 'depot'), expected: 'invalid-site' },
  { name: 'FR-030 a second depot on a depot tile', setup: s => at(T.orchard1)(setTile(s, T.orchard1, { depot: true })), order: build(T.orchard1, 'depot'), expected: 'invalid-site' },
  { name: 'FR-030 a depot on the same tile as a distant port is ok', setup: s => at(T.coastFarm1)(setTile(s, T.coastFarm1, { port: true })), order: build(T.coastFarm1, 'depot'), expected: 'ok' },
  { name: 'FR-030 a depot on hills before Compound Steam Engine', setup: at(barrenHills), order: build(barrenHills, 'depot'), expected: 'invalid-site' },
  { name: 'FR-030 a depot on hills with Compound Steam Engine', setup: s => withTech(at(barrenHills)(s), 'compoundSteamEngine'), order: build(barrenHills, 'depot'), expected: 'ok' },

  // port
  { name: 'FR-030 a port on a farm by the water is ok', setup: at(T.coastFarm1), order: build(T.coastFarm1, 'port'), expected: 'ok' },
  { name: 'FR-030 a port on the capital (already a port)', setup: s => s, order: build(T.capital1, 'port'), expected: 'invalid-site' },
  { name: 'FR-030 a second port on a port tile', setup: s => at(T.coastFarm1)(setTile(s, T.coastFarm1, { port: true })), order: build(T.coastFarm1, 'port'), expected: 'invalid-site' },
  { name: 'FR-030 a port on hills by the water', setup: at(coastHills), order: build(coastHills, 'port'), expected: 'invalid-site' },
  { name: 'FR-030 a port on a river tile is ok', setup: s => at(T.dryPlains1)(setTile(s, T.dryPlains1, { hasRiver: true })), order: build(T.dryPlains1, 'port'), expected: 'ok' },

  // fort
  { name: 'FR-030 a fort on a tile without one is ok', setup: at(T.farm1), order: build(T.farm1, 'fort'), expected: 'ok' },
  { name: 'FR-030 a fort on the capital (starts at level 1)', setup: s => s, order: build(T.capital1, 'fort'), expected: 'invalid-site' },
  { name: 'FR-030 a fort where a level 1 fort stands', setup: s => at(T.farm1)(setTile(s, T.farm1, { fortLevel: 1 })), order: build(T.farm1, 'fort'), expected: 'invalid-site' },
];

describe('FR-030 construction sites', () => {
  it.each(siteCases.map(c => [c.name, c] as const))('%s', (_name, c) => {
    const state = deepFreeze(c.setup(game()));
    expect(validateOrder(state, c.order)).toEqual(c.expected === 'ok' ? { ok: true } : { ok: false, reason: c.expected });
  });
});

describe('FR-031 cancelling refunds a job ordered this turn', () => {
  const cancel = (s: GameState, id: string, tileId: string) => applyOrder(s, { kind: 'cancelWorkerAction', nationId: N1, workerId: id, tileId });

  it('FR-031 a development ordered and cancelled this turn costs nothing', () => {
    const start = treasury(game(), N1);
    const s = applyOrder(put(game(), FARMER, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: FARMER, tileId: T.farm1 });
    expect(treasury(s, N1)).toBe(start - DEVELOPMENT_COST[1]);

    expect(treasury(cancel(s, FARMER, T.farm1), N1)).toBe(start);
  });

  it('FR-031 a rail ordered by moving and cancelled this turn gives back its terrain price', () => {
    const start = treasury(game(), N1);
    const forest = createTileId(2, 0);
    const s = applyOrder(game(), railTo(forest));
    expect(treasury(s, N1)).toBe(start - 150);

    const c = cancel(s, ENGINEER, forest);
    expect(treasury(c, N1)).toBe(start);
    expect(tileAt(c, forest).constructionJob).toBeUndefined();
  });

  it('FR-031 a prospect ordered and cancelled this turn costs nothing', () => {
    const start = treasury(game(), N1);
    const s = applyOrder(game(), { kind: 'moveAndStartProspecting', nationId: N1, workerId: PROSPECTOR, toTileId: T.mountains1 });
    expect(treasury(s, N1)).toBe(start - PROSPECT_COST);

    expect(treasury(cancel(s, PROSPECTOR, T.mountains1), N1)).toBe(start);
  });

  it('FR-031 a job ordered on an earlier turn stops without a refund', () => {
    const start = treasury(game(), N1);
    let s = applyOrder(put(game(), ENGINEER, T.orchard1), build(T.orchard1, 'depot'));
    s = resolveTurn(s, {}, 1).state;
    expect(tileAt(s, T.orchard1).constructionJob).toBeDefined();

    const c = cancel(s, ENGINEER, T.orchard1);

    expect(tileAt(c, T.orchard1).constructionJob).toBeUndefined();
    expect(locate(c, ENGINEER)!.worker.status).toBe(WorkerStatus.Available);
    expect(treasury(c, N1)).toBe(start - CONSTRUCTION_COST.depot);
  });
});

describe('FR-032 a finished job leaves its tile', () => {
  it('FR-032 a finished development is gone at once, the worker is free and the tile takes a new job next turn', () => {
    let s = applyOrder(put(game(), FARMER, T.farm1), { kind: 'startDevelopment', nationId: N1, workerId: FARMER, tileId: T.farm1 });
    const events = [];
    for (let i = 0; i < 3; i++) {
      const r = resolveTurn(s, {}, 1);
      s = r.state;
      events.push(...r.events);
    }

    expect(tileAt(s, T.farm1).resource).toEqual({ type: ResourceType.Grain, level: 1 });
    expect(tileAt(s, T.farm1).developmentJob).toBeUndefined();
    expect(locate(s, FARMER)!.worker.status).toBe(WorkerStatus.Available);
    expect(events).toContainEqual({ type: 'development-completed', tileId: T.farm1, nationId: N1, level: 1 });
    expect(validateOrder(s, { kind: 'startDevelopment', nationId: N1, workerId: FARMER, tileId: T.farm1 })).toEqual({ ok: true });
  });

  it('FR-032 a finished depot leaves no job behind and no completion flags exist', () => {
    let s = applyOrder(put(game(), ENGINEER, T.orchard1), build(T.orchard1, 'depot'));
    const job = tileAt(s, T.orchard1).constructionJob!;
    expect(Object.keys(job).sort()).toEqual(['durationTurns', 'kind', 'startedOnTurn', 'workerId']);

    for (let i = 0; i < 3; i++) s = resolveTurn(s, {}, 1).state;

    expect(tileAt(s, T.orchard1)).toMatchObject({ depot: true });
    expect(tileAt(s, T.orchard1).constructionJob).toBeUndefined();
    expect(s.transportNetwork.railroadNetworks![N1].depots).toContainEqual(expect.objectContaining({ x: 3, y: 1 }));
  });
});
