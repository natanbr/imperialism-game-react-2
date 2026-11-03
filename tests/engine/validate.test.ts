import { describe, it, expect } from 'vitest';
import { validateOrder } from '@/engine/orders/validate';
import { ORDER_KINDS, Order, RejectReason } from '@/engine/orders/Order';
import { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { CONSTRUCTION_COST, DEVELOPMENT_COST, PROSPECT_COST } from '@/definisions/workPrices';
import type { ConstructionKind } from '@/types/jobs/ConstructionJob';
import { createTileId } from '@/utils/tileIdUtils';
import { deepFreeze, game, N1, N2, put, setTile, setTreasury, setWarehouse, T, workerId } from './fixtures';

const W = {
  prospector: workerId(N1, WorkerType.Prospector),
  farmer: workerId(N1, WorkerType.Farmer),
  miner: workerId(N1, WorkerType.Miner),
  engineer: workerId(N1, WorkerType.Engineer),
  farmer2: workerId(N2, WorkerType.Farmer),
};
const barrenHills1 = createTileId(0, 2);
const enemyBorder = createTileId(4, 1);

const moved = { status: WorkerStatus.Moved, justMoved: true, previousTileId: T.capital1 };
const working = { status: WorkerStatus.Working };

type Setup = (s: GameState) => GameState;
interface Case {
  name: string;
  setup?: Setup;
  order: Order;
  expected: 'ok' | RejectReason;
}

const developing = (s: GameState) =>
  setTile(put(s, W.farmer, T.farm1, working), T.farm1, {
    developmentJob: { workerId: W.farmer, workerType: WorkerType.Farmer, targetLevel: 1, startedOnTurn: 1, durationTurns: 2 },
  });
const engineerBuildingAtCapital = (s: GameState) =>
  setTile(put(s, W.engineer, T.capital1, working), T.capital1, {
    constructionJob: { workerId: W.engineer, kind: 'depot', startedOnTurn: 1, durationTurns: 2 },
  });
const prospecting = (s: GameState) =>
  setTile(put(s, W.prospector, T.mountains1, working), T.mountains1, { prospecting: { startedOnTurn: 1, workerId: W.prospector } });

const cases: Case[] = [
  // moveWorker
  { name: 'FR-004 moveWorker to an owned land tile is ok', order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-004 unknown nation', order: { kind: 'moveWorker', nationId: 'nation-9', workerId: W.farmer, toTileId: T.farm1 }, expected: 'unknown-nation' },
  { name: 'FR-004 unknown worker', order: { kind: 'moveWorker', nationId: N1, workerId: 'ghost', toTileId: T.farm1 }, expected: 'unknown-worker' },
  { name: 'FR-004 another nation\'s worker', order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer2, toTileId: T.farm1 }, expected: 'not-owner' },
  { name: 'FR-004 moveWorker onto a foreign tile', order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.farm2 }, expected: 'not-owner' },
  { name: 'FR-004 moveWorker onto its own tile', order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.capital1 }, expected: 'invalid-target' },
  { name: 'FR-004 moveWorker onto water', order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.water }, expected: 'invalid-target' },
  { name: 'FR-004 moveWorker onto a tile id that does not exist', order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: 'nowhere' }, expected: 'invalid-target' },
  { name: 'FR-006 moveWorker with a working worker', setup: developing, order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.range1 }, expected: 'worker-busy' },
  { name: 'FR-006 moveWorker with a worker that already moved', setup: s => put(s, W.farmer, T.farm1, moved), order: { kind: 'moveWorker', nationId: N1, workerId: W.farmer, toTileId: T.range1 }, expected: 'worker-moved' },

  // moveAndBuildRail
  { name: 'FR-008 rail-on-move to an adjacent rail site is ok', order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-008 rail-on-move by a farmer', order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }, expected: 'wrong-worker-type' },
  { name: 'FR-008 rail-on-move to a tile that is not adjacent', order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.orchard1 }, expected: 'invalid-target' },
  { name: 'FR-008 rail-on-move onto a foreign tile', order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: enemyBorder }, expected: 'not-owner' },
  { name: 'FR-008 rail-on-move onto a tile that already has rail', setup: s => setTile(s, T.farm1, { connected: true }), order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'invalid-site' },
  { name: 'FR-008 rail-on-move onto a tile with an unfinished construction job', setup: s => setTile(s, T.farm1, { constructionJob: { workerId: 'other', kind: 'depot', startedOnTurn: 1, durationTurns: 2 } }), order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'tile-occupied' },
  { name: 'FR-006 FR-008 rail-on-move with a working engineer', setup: engineerBuildingAtCapital, order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'worker-busy' },
  { name: 'FR-006 FR-008 rail-on-move with an engineer that already moved', setup: s => put(s, W.engineer, T.capital1, moved), order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'worker-moved' },
  { name: 'FR-008 rail-on-move without money for the rail', setup: s => setTreasury(s, N1, CONSTRUCTION_COST.rail - 1), order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'insufficient-funds' },

  // startProspecting
  { name: 'FR-004 prospecting a hidden resource is ok', setup: s => put(s, W.prospector, T.mountains1), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'ok' },
  { name: 'FR-004 prospecting by a farmer', setup: s => put(s, W.farmer, T.mountains1), order: { kind: 'startProspecting', nationId: N1, workerId: W.farmer, tileId: T.mountains1 }, expected: 'wrong-worker-type' },
  { name: 'FR-004 prospecting a tile the worker is not on', order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'invalid-target' },
  { name: 'FR-004 prospecting an already discovered resource', setup: s => setTile(put(s, W.prospector, T.mountains1), T.mountains1, { resource: { type: ResourceType.IronOre, level: 0, discovered: true } }), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'invalid-target' },
  { name: 'FR-004 prospecting farmland', setup: s => put(s, W.prospector, T.farm1), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.farm1 }, expected: 'invalid-site' },
  { name: 'FR-004 prospecting a tile already being prospected', setup: s => setTile(put(s, W.prospector, T.mountains1), T.mountains1, { prospecting: { startedOnTurn: 1, workerId: 'other' } }), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'tile-occupied' },
  { name: 'FR-006 prospecting with a worker that moved this turn', setup: s => put(s, W.prospector, T.mountains1, moved), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'worker-moved' },
  { name: 'FR-006 prospecting with a working worker', setup: prospecting, order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'worker-busy' },
  { name: 'FR-004 prospecting without money', setup: s => setTreasury(put(s, W.prospector, T.mountains1), N1, PROSPECT_COST - 1), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'insufficient-funds' },

  // startDevelopment
  { name: 'FR-004 developing a farm with a farmer is ok', setup: s => put(s, W.farmer, T.farm1), order: { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-004 developing with a prospector', setup: s => put(s, W.prospector, T.farm1), order: { kind: 'startDevelopment', nationId: N1, workerId: W.prospector, tileId: T.farm1 }, expected: 'wrong-worker-type' },
  { name: 'FR-004 developing with an engineer', setup: s => put(s, W.engineer, T.farm1), order: { kind: 'startDevelopment', nationId: N1, workerId: W.engineer, tileId: T.farm1 }, expected: 'wrong-worker-type' },
  { name: 'FR-004 a farmer developing ranch land', setup: s => put(s, W.farmer, T.range1), order: { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.range1 }, expected: 'invalid-site' },
  { name: 'FR-004 a miner developing an undiscovered mineral', setup: s => put(s, W.miner, T.mountains1), order: { kind: 'startDevelopment', nationId: N1, workerId: W.miner, tileId: T.mountains1 }, expected: 'invalid-target' },
  { name: 'FR-004 developing a resource already at level 3', setup: s => setTile(put(s, W.farmer, T.farm1), T.farm1, { resource: { type: ResourceType.Grain, level: 3 } }), order: { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 }, expected: 'invalid-target' },
  { name: 'FR-004 developing to level 2 without its price', setup: s => setTreasury(setTile(put(s, W.farmer, T.farm1), T.farm1, { resource: { type: ResourceType.Grain, level: 1 } }), N1, DEVELOPMENT_COST[2] - 1), order: { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 }, expected: 'insufficient-funds' },
  { name: 'FR-006 developing with a farmer that moved this turn', setup: s => put(s, W.farmer, T.farm1, moved), order: { kind: 'startDevelopment', nationId: N1, workerId: W.farmer, tileId: T.farm1 }, expected: 'worker-moved' },

  // startConstruction
  { name: 'FR-004 FR-030 a depot two tiles from the capital is ok', setup: s => put(s, W.engineer, T.orchard1), order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.orchard1, structure: 'depot' }, expected: 'ok' },
  { name: 'FR-009 a port next to the ocean is ok', setup: s => put(s, W.engineer, T.coastFarm1), order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.coastFarm1, structure: 'port' }, expected: 'ok' },
  { name: 'FR-009 a port on a river tile is ok', setup: s => put(setTile(s, T.dryPlains1, { hasRiver: true }), W.engineer, T.dryPlains1), order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.dryPlains1, structure: 'port' }, expected: 'ok' },
  { name: 'FR-009 a port inland without a river', setup: s => put(s, W.engineer, T.dryPlains1), order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.dryPlains1, structure: 'port' }, expected: 'invalid-site' },
  { name: 'FR-004 building over an unfinished construction job', setup: s => setTile(s, T.capital1, { constructionJob: { workerId: 'other', kind: 'fort', startedOnTurn: 1, durationTurns: 4 } }), order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.capital1, structure: 'depot' }, expected: 'tile-occupied' },
  { name: 'FR-004 construction by a farmer', order: { kind: 'startConstruction', nationId: N1, workerId: W.farmer, tileId: T.capital1, structure: 'depot' }, expected: 'wrong-worker-type' },
  { name: 'FR-004 a port without its price', setup: s => put(setTreasury(s, N1, CONSTRUCTION_COST.port - 1), W.engineer, T.coastFarm1), order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.coastFarm1, structure: 'port' }, expected: 'insufficient-funds' },
  { name: 'FR-006 construction with a working engineer', setup: engineerBuildingAtCapital, order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.capital1, structure: 'fort' }, expected: 'worker-busy' },

  // FR-026: orders from a replay log or an AI player are untrusted JSON, so a structure name
  // that only exists on Object.prototype is refused instead of being priced as NaN.
  { name: 'FR-026 construction of an inherited name (toString)', order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.capital1, structure: 'toString' as ConstructionKind }, expected: 'invalid-target' },
  { name: 'FR-026 construction of an inherited name (constructor)', order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.capital1, structure: 'constructor' as ConstructionKind }, expected: 'invalid-target' },
  { name: 'FR-026 construction of __proto__', order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.capital1, structure: '__proto__' as ConstructionKind }, expected: 'invalid-target' },
  { name: 'FR-026 move-and-build an inherited name (toString)', order: { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.farm1, structure: 'toString' as ConstructionKind }, expected: 'invalid-target' },

  // moveAndStartProspecting
  { name: 'FR-007 move-and-prospect is ok', order: { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 }, expected: 'ok' },
  { name: 'FR-007 move-and-prospect without money', setup: s => setTreasury(s, N1, PROSPECT_COST - 1), order: { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 }, expected: 'insufficient-funds' },
  { name: 'FR-006 move-and-prospect with a working prospector', setup: prospecting, order: { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: barrenHills1 }, expected: 'worker-busy' },
  { name: 'FR-006 move-and-prospect with a prospector that already moved', setup: s => put(s, W.prospector, T.farm1, moved), order: { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 }, expected: 'worker-moved' },
  { name: 'FR-007 move-and-prospect onto farmland', order: { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.farm1 }, expected: 'invalid-site' },
  { name: 'FR-007 move-and-prospect onto a foreign tile', order: { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.farm2 }, expected: 'not-owner' },
  { name: 'FR-007 move-and-prospect on the tile it already stands on acts as start', setup: s => put(s, W.prospector, T.mountains1), order: { kind: 'moveAndStartProspecting', nationId: N1, workerId: W.prospector, toTileId: T.mountains1 }, expected: 'ok' },

  // moveAndStartDevelopment
  { name: 'FR-007 move-and-develop is ok', order: { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-007 move-and-develop without money', setup: s => setTreasury(s, N1, DEVELOPMENT_COST[1] - 1), order: { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }, expected: 'insufficient-funds' },
  { name: 'FR-007 move-and-develop an undiscovered mineral', order: { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.miner, toTileId: T.mountains1 }, expected: 'invalid-target' },
  { name: 'FR-006 move-and-develop with a farmer that already moved', setup: s => put(s, W.farmer, T.range1, moved), order: { kind: 'moveAndStartDevelopment', nationId: N1, workerId: W.farmer, toTileId: T.farm1 }, expected: 'worker-moved' },

  // moveAndStartConstruction
  { name: 'FR-007 FR-009 move-and-build a port by the ocean is ok', order: { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.coastFarm1, structure: 'port' }, expected: 'ok' },
  { name: 'FR-007 move-and-build a port without its price', setup: s => setTreasury(s, N1, CONSTRUCTION_COST.port - 1), order: { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.coastFarm1, structure: 'port' }, expected: 'insufficient-funds' },
  { name: 'FR-009 move-and-build a port inland', order: { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.dryPlains1, structure: 'port' }, expected: 'invalid-site' },
  { name: 'FR-006 move-and-build with a working engineer', setup: engineerBuildingAtCapital, order: { kind: 'moveAndStartConstruction', nationId: N1, workerId: W.engineer, toTileId: T.farm1, structure: 'depot' }, expected: 'worker-busy' },

  // cancelWorkerAction
  { name: 'FR-004 cancelling this turn\'s move is ok', setup: s => put(s, W.farmer, T.farm1, moved), order: { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-004 cancelling a job is ok', setup: developing, order: { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.farm1 }, expected: 'ok' },
  { name: 'FR-004 cancelling with nothing to cancel', order: { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.capital1 }, expected: 'invalid-target' },
  { name: 'FR-004 cancelling on a tile the worker is not on', setup: developing, order: { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer, tileId: T.capital1 }, expected: 'invalid-target' },
  { name: 'FR-004 cancelling another nation\'s worker', order: { kind: 'cancelWorkerAction', nationId: N1, workerId: W.farmer2, tileId: T.capital2 }, expected: 'not-owner' },

  // setTransportAllocations
  { name: 'FR-010 setting transport allocations is ok', order: { kind: 'setTransportAllocations', nationId: N1, allocations: { grain: 3, timber: 0 } }, expected: 'ok' },
  { name: 'FR-010 a negative allocation', order: { kind: 'setTransportAllocations', nationId: N1, allocations: { grain: -1 } }, expected: 'invalid-amount' },
  { name: 'FR-010 a NaN allocation', order: { kind: 'setTransportAllocations', nationId: N1, allocations: { grain: Number.NaN } }, expected: 'invalid-amount' },
  { name: 'FR-010 allocations for an unknown nation', order: { kind: 'setTransportAllocations', nationId: 'nation-9', allocations: { grain: 1 } }, expected: 'unknown-nation' },

  // changeTransportCapacity
  { name: 'FR-039 ordering cars with enough lumber, steel and labour is ok', setup: s => setWarehouse(s, N1, { lumber: 2, steel: 2 }), order: { kind: 'changeTransportCapacity', nationId: N1, delta: 2 }, expected: 'ok' },
  { name: 'FR-039 ordering more cars than the steel allows', setup: s => setWarehouse(s, N1, { lumber: 2, steel: 1 }), order: { kind: 'changeTransportCapacity', nationId: N1, delta: 2 }, expected: 'insufficient-resources' },
  { name: 'FR-039 reducing a queued order is ok', setup: s => ({ ...s, nations: s.nations.map(n => (n.id === N1 ? { ...n, transportCapacityPendingIncrease: 2 } : n)) }), order: { kind: 'changeTransportCapacity', nationId: N1, delta: -1 }, expected: 'ok' },
  { name: 'FR-039 reducing more than was queued', setup: s => ({ ...s, nations: s.nations.map(n => (n.id === N1 ? { ...n, transportCapacityPendingIncrease: 1 } : n)) }), order: { kind: 'changeTransportCapacity', nationId: N1, delta: -2 }, expected: 'invalid-amount' },
  { name: 'FR-039 a zero change', order: { kind: 'changeTransportCapacity', nationId: N1, delta: 0 }, expected: 'invalid-amount' },
  { name: 'FR-039 a fractional change', setup: s => setWarehouse(s, N1, { lumber: 2, steel: 2 }), order: { kind: 'changeTransportCapacity', nationId: N1, delta: 1.5 }, expected: 'invalid-amount' },

  // industry orders (more rows in industry.test.ts)
  { name: 'FR-036 a production order the stock and labour allow is ok', setup: s => setWarehouse(s, N1, { timber: 4 }), order: { kind: 'setProduction', nationId: N1, building: 'lumberMill', amount: 2 }, expected: 'ok' },
  { name: 'FR-038 expanding a mill with lumber and steel is ok', setup: s => setWarehouse(s, N1, { lumber: 2, steel: 2 }), order: { kind: 'expandBuilding', nationId: N1, building: 'textileMill' }, expected: 'ok' },
  { name: 'FR-041 training a worker with cash and paper is ok', setup: s => setWarehouse(s, N1, { paper: 1 }), order: { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 }, expected: 'ok' },
  { name: 'FR-042 recruiting a migrant with the three goods is ok', setup: s => setWarehouse(s, N1, { cannedFood: 1, clothing: 1, furniture: 1 }), order: { kind: 'recruitWorkers', nationId: N1, delta: 1 }, expected: 'ok' },
  { name: 'FR-036 production for an unknown nation', order: { kind: 'setProduction', nationId: 'nation-9', building: 'lumberMill', amount: 1 }, expected: 'unknown-nation' },
];

describe('validateOrder', () => {
  it.each(cases.map(c => [c.name, c] as const))('%s', (_name, c) => {
    const state = deepFreeze(c.setup ? c.setup(game()) : game());
    const snapshot = structuredClone(state);

    const result = validateOrder(state, c.order);

    expect(result).toEqual(c.expected === 'ok' ? { ok: true } : { ok: false, reason: c.expected });
    expect(state).toEqual(snapshot);
  });

  it('FR-003 every order kind has an accepted example above', () => {
    const accepted = new Set(cases.filter(c => c.expected === 'ok').map(c => c.order.kind));
    expect([...accepted].sort()).toEqual([...ORDER_KINDS].sort());
  });

  it('FR-003 every order names its nation and, for worker orders, the worker and a tile', () => {
    for (const { order } of cases) {
      expect(order.nationId).toEqual(expect.any(String));
      if ('workerId' in order) {
        expect(order.workerId).toEqual(expect.any(String));
        expect('tileId' in order || 'toTileId' in order).toBe(true);
      }
    }
  });
});
