import { describe, it, expect } from 'vitest';
import { validateOrder } from '@/engine/orders/validate';
import { ORDER_KINDS, Order, RejectReason } from '@/engine/orders/Order';
import { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { CONSTRUCTION_COST, DEVELOPMENT_COST, PROSPECT_COST } from '@/definisions/workPrices';
import type { ConstructionKind } from '@/types/jobs/ConstructionJob';
import { createTileId } from '@/utils/tileIdUtils';
import { newGame } from '@/engine/newGame';
import { applyOrder } from '@/engine/orders/apply';
import { transferProvince } from '@/engine/world/provinces';
import { deepFreeze, game, N1, N2, put, setIndustry, setPair, setTile, setTreasury, setWarehouse, T, workerId } from './fixtures';
import { ARVELIA_P, continent as armyContinent, idOf, NE1, NW1, relocate, SW1, SW2 } from './armyFixtures';

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

/** The continent's start regiments (FR-203), named for the army order rows. */
const ARMY = (() => {
  const s = armyContinent();
  return {
    regulars1: idOf(s, N1, '1st Regulars'),
    regulars2: idOf(s, N1, '2nd Regulars'),
    artillery1: idOf(s, N1, '1st Artillery'),
    minutemen9: idOf(s, N1, '9th Minutemen'),
    valdoria1: idOf(s, N2, '1st Regulars'),
  };
})();
const marchOrder = (regimentIds: string[], fromProvinceId = SW1, toProvinceId = NW1): Order => ({ kind: 'moveArmy', nationId: N1, fromProvinceId, regimentIds, toProvinceId });

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
  { name: 'FR-008 FR-113 rail-on-move onto a tile with an unfinished construction job', setup: s => setTile(s, T.farm1, { constructionJob: { workerId: 'other', kind: 'depot', startedOnTurn: 1, durationTurns: 2 } }), order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'tile-has-job' },
  { name: 'FR-006 FR-008 rail-on-move with a working engineer', setup: engineerBuildingAtCapital, order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'worker-busy' },
  { name: 'FR-006 FR-008 rail-on-move with an engineer that already moved', setup: s => put(s, W.engineer, T.capital1, moved), order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'worker-moved' },
  { name: 'FR-008 rail-on-move without money for the rail', setup: s => setTreasury(s, N1, CONSTRUCTION_COST.rail - 1), order: { kind: 'moveAndBuildRail', nationId: N1, workerId: W.engineer, toTileId: T.farm1 }, expected: 'insufficient-funds' },

  // startProspecting
  { name: 'FR-004 prospecting a hidden resource is ok', setup: s => put(s, W.prospector, T.mountains1), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'ok' },
  { name: 'FR-004 prospecting by a farmer', setup: s => put(s, W.farmer, T.mountains1), order: { kind: 'startProspecting', nationId: N1, workerId: W.farmer, tileId: T.mountains1 }, expected: 'wrong-worker-type' },
  { name: 'FR-004 prospecting a tile the worker is not on', order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'invalid-target' },
  { name: 'FR-004 prospecting an already discovered resource', setup: s => setTile(put(s, W.prospector, T.mountains1), T.mountains1, { resource: { type: ResourceType.IronOre, level: 0, discovered: true } }), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'invalid-target' },
  { name: 'FR-004 prospecting farmland', setup: s => put(s, W.prospector, T.farm1), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.farm1 }, expected: 'invalid-site' },
  { name: 'FR-004 FR-113 prospecting a tile already being prospected', setup: s => setTile(put(s, W.prospector, T.mountains1), T.mountains1, { prospecting: { startedOnTurn: 1, workerId: 'other' } }), order: { kind: 'startProspecting', nationId: N1, workerId: W.prospector, tileId: T.mountains1 }, expected: 'tile-has-job' },
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
  { name: 'FR-004 FR-113 building over an unfinished construction job', setup: s => setTile(s, T.capital1, { constructionJob: { workerId: 'other', kind: 'fort', startedOnTurn: 1, durationTurns: 4 } }), order: { kind: 'startConstruction', nationId: N1, workerId: W.engineer, tileId: T.capital1, structure: 'depot' }, expected: 'tile-has-job' },
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

  // trade orders (more rows in market.test.ts)
  { name: 'FR-061 offering timber on the world market is ok', order: { kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Timber, amount: 2 }, expected: 'ok' },
  { name: 'FR-062 bidding for coal on the world market is ok', order: { kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 }, expected: 'ok' },

  // diplomacy orders (FR-161; the refusals of FR-162 are in the describe block below, on the continent)
  { name: 'FR-161 an alliance with the other Great Power is ok', order: { kind: 'proposeOverture', nationId: N1, overture: 'alliance', targetId: N2 }, expected: 'ok' },
  { name: 'FR-161 a grant to the other Great Power (embassies both ways at the start) is ok', order: { kind: 'giveGrant', nationId: N1, targetId: N2, amount: 1000, locked: false }, expected: 'ok' },
  { name: 'FR-161 a 10% subsidy toward the other Great Power (consulates both ways) is ok', order: { kind: 'setTradePolicy', nationId: N1, targetId: N2, subsidyPercent: 10, boycott: false }, expected: 'ok' },
  { name: 'FR-161 withdrawing this turn\'s alliance proposal is ok', setup: s => ({ ...s, intents: [{ id: 'intent-1-1', kind: 'alliance', nationId: N1, turn: 1, targetId: N2, cost: 0 } as GameState['intents'][number]] }), order: { kind: 'withdrawOverture', nationId: N1, overture: 'alliance', targetId: N2 }, expected: 'ok' },
  // army orders (FR-200, FR-205, FR-207; their refusals are in the describe block below, on the continent)
  { name: 'FR-200 setRecruitment of 1 Regulars with an armament on the continent is ok', setup: () => setWarehouse(armyContinent(), N1, { armaments: 1 }), order: { kind: 'setRecruitment', nationId: N1, regiment: 'regulars', count: 1 }, expected: 'ok' },
  { name: 'FR-205 moveArmy of the 1st Regulars to a bordering own province is ok', setup: () => armyContinent(), order: marchOrder([ARMY.regulars1]), expected: 'ok' },
  { name: 'FR-205 cancelArmyMove of a regiment ordered to march is ok', setup: () => applyOrder(armyContinent(), marchOrder([ARMY.regulars1])), order: { kind: 'cancelArmyMove', nationId: N1, regimentIds: [ARMY.regulars1] }, expected: 'ok' },
  { name: 'FR-207 disbandRegiments of the 1st Artillery is ok', setup: () => armyContinent(), order: { kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [ARMY.artillery1] }, expected: 'ok' },
  { name: 'FR-207 cancelDisband of a regiment ordered to disband is ok (review F4)', setup: () => applyOrder(armyContinent(), { kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [ARMY.artillery1] }), order: { kind: 'cancelDisband', nationId: N1, regimentIds: [ARMY.artillery1] }, expected: 'ok' },
  { name: 'FR-161 answering a proposal made to the nation last turn is ok', setup: s => ({ ...s, turn: 2, proposals: [{ id: 'proposal-1-1', fromId: N2, toId: N1, kind: 'alliance', turn: 1 }] }), order: { kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: true }, expected: 'ok' },
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

describe('FR-149 minor land is closed: orders onto a minor tile are refused as onto another Great Power\'s tile', () => {
  // The continent: Arvelia's 10-4 (coal hills) and 10-3 (forest) touch Testland's 9-4 and 9-3.
  const C = {
    prospector: 'worker-nation-1-1',
    forester: 'worker-nation-1-4',
    engineer: 'worker-nation-1-7',
  };
  const continent = () => put(put(newGame({ seed: 1, world: 'continent' }), C.engineer, '9-4'), C.forester, '9-3');
  /** The same state with the minor tile handed to Valdoria, as a Great Power tile next to Testland would be. */
  const asGreatPowerTile = (s: GameState, tileId: string) => setTile(s, tileId, { ownerNationId: N2 });
  const orders: { name: string; tileId: string; order: Order; setup?: Setup }[] = [
    { name: 'a civilian move', tileId: '10-4', order: { kind: 'moveWorker', nationId: N1, workerId: C.forester, toTileId: '10-4' } },
    { name: 'a rail-on-move', tileId: '10-4', order: { kind: 'moveAndBuildRail', nationId: N1, workerId: C.engineer, toTileId: '10-4' } },
    { name: 'a move to prospect', tileId: '10-4', order: { kind: 'moveAndStartProspecting', nationId: N1, workerId: C.prospector, toTileId: '10-4' } },
    { name: 'a move to develop', tileId: '10-3', order: { kind: 'moveAndStartDevelopment', nationId: N1, workerId: C.forester, toTileId: '10-3' } },
    { name: 'a move to build a depot', tileId: '10-4', order: { kind: 'moveAndStartConstruction', nationId: N1, workerId: C.engineer, toTileId: '10-4', structure: 'depot' } },
    { name: 'a rail section from 9-4', tileId: '10-4', order: { kind: 'moveAndStartConstruction', nationId: N1, workerId: C.engineer, toTileId: '10-4', structure: 'rail', fromTileId: '9-4' } },
    { name: 'a job on the minor tile the forester stands on', tileId: '10-3', order: { kind: 'startDevelopment', nationId: N1, workerId: C.forester, tileId: '10-3' }, setup: s => put(s, C.forester, '10-3') },
  ];

  it.each(orders.map(o => [o.name, o] as const))('FR-149 %s', (_name, { tileId, order, setup }) => {
    const s = deepFreeze((setup ?? (x => x))(continent()));
    const minor = validateOrder(s, order);
    const greatPower = validateOrder(asGreatPowerTile(s, tileId), order);

    expect(minor).toEqual({ ok: false, reason: 'not-owner' });
    expect(minor).toEqual(greatPower);
  });
});

describe('FR-162 overture refusals, on the continent (one row per refusal)', () => {
  const ARVELIA = 'minor-1';
  const continent = () => newGame({ seed: 1, world: 'continent' });
  const consulate = (s: GameState, other = ARVELIA) => setPair(s, N1, other, { consulates: [N1] });
  const embassy = (s: GameState, other = ARVELIA) => setPair(s, N1, other, { consulates: [N1], embassies: [N1] });
  const war = (s: GameState, other: string) => setPair(s, N1, other, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [] });
  const ordered = (order: Order): Setup => s => applyOrder(s, order);
  const propose = (overture: 'consulate' | 'embassy' | 'pact' | 'alliance' | 'war' | 'peace', targetId = ARVELIA): Order => ({ kind: 'proposeOverture', nationId: N1, overture, targetId });
  const grant = (amount: number, targetId = ARVELIA): Order => ({ kind: 'giveGrant', nationId: N1, targetId, amount: amount as 1000, locked: false });
  const policy = (subsidyPercent: number, boycott = false, targetId = ARVELIA): Order => ({ kind: 'setTradePolicy', nationId: N1, targetId, subsidyPercent: subsidyPercent as 10, boycott });
  const proposal = (patch: Partial<{ toId: string; turn: number }>): Setup => s => ({ ...s, turn: 3, proposals: [{ id: 'proposal-2-1', fromId: N2, toId: N1, kind: 'peace', turn: 2, ...patch }] });
  const answer = (proposalId: string, accept = true): Order => ({ kind: 'answerProposal', nationId: N1, proposalId, accept });

  const rows: Case[] = [
    { name: 'an unknown target', order: propose('consulate', 'minor-9'), expected: 'invalid-target' },
    { name: 'the nation itself', order: propose('alliance', N1), expected: 'invalid-target' },
    { name: 'a grant to an unknown target', setup: embassy, order: grant(1000, 'minor-9'), expected: 'invalid-target' },
    { name: 'a trade policy toward the nation itself', order: policy(0, true, N1), expected: 'invalid-target' },
    { name: 'a consulate already held', setup: consulate, order: propose('consulate'), expected: 'already-in-place' },
    { name: 'a consulate already ordered this turn', setup: ordered(propose('consulate')), order: propose('consulate'), expected: 'already-in-place' },
    { name: 'a consulate with a Great Power that holds one (the start)', order: propose('consulate', N2), expected: 'already-in-place' },
    { name: 'an embassy without a consulate', order: propose('embassy'), expected: 'needs-consulate' },
    { name: 'an embassy with a consulate ordered only this turn', setup: ordered(propose('consulate')), order: propose('embassy'), expected: 'needs-consulate' },
    { name: 'an embassy already held', setup: embassy, order: propose('embassy'), expected: 'already-in-place' },
    { name: 'a pact without an embassy', setup: consulate, order: propose('pact'), expected: 'needs-embassy' },
    { name: 'a grant without an embassy', setup: consulate, order: grant(1000), expected: 'needs-embassy' },
    { name: 'a pact already signed', setup: s => setPair(embassy(s), N1, ARVELIA, { pact: true }), order: propose('pact'), expected: 'already-in-place' },
    { name: 'a pact with a Great Power', order: propose('pact', N2), expected: 'invalid-target' },
    { name: 'an alliance with a minor', setup: embassy, order: propose('alliance'), expected: 'invalid-target' },
    { name: 'an alliance already signed', setup: s => setPair(s, N1, N2, { alliance: true }), order: propose('alliance', N2), expected: 'already-in-place' },
    { name: 'a consulate while at war', setup: s => war(s, ARVELIA), order: propose('consulate'), expected: 'at-war' },
    { name: 'an embassy while at war', setup: s => war(s, ARVELIA), order: propose('embassy'), expected: 'at-war' },
    { name: 'a pact while at war', setup: s => war(s, ARVELIA), order: propose('pact'), expected: 'at-war' },
    { name: 'an alliance while at war', setup: s => war(s, N2), order: propose('alliance', N2), expected: 'at-war' },
    { name: 'a grant while at war', setup: s => war(s, N2), order: grant(1000, N2), expected: 'at-war' },
    { name: 'a subsidy while at war', setup: s => war(s, N2), order: policy(10, false, N2), expected: 'at-war' },
    { name: 'war while at war', setup: s => war(s, ARVELIA), order: propose('war'), expected: 'already-in-place' },
    { name: 'war already declared this turn', setup: ordered(propose('war')), order: propose('war'), expected: 'already-in-place' },
    { name: 'peace while not at war', order: propose('peace'), expected: 'not-at-war' },
    { name: 'peace already proposed this turn', setup: s => applyOrder(war(s, ARVELIA), propose('peace')), order: propose('peace'), expected: 'already-in-place' },
    { name: 'a grant of $2,000', setup: embassy, order: grant(2000), expected: 'invalid-amount' },
    { name: 'a subsidy of 15%', setup: consulate, order: policy(15), expected: 'invalid-amount' },
    { name: 'a subsidy without a consulate', order: policy(10), expected: 'needs-consulate' },
    { name: 'a subsidy with a consulate ordered only this turn', setup: ordered(propose('consulate')), order: policy(10), expected: 'needs-consulate' },
    { name: 'a consulate costing more than the treasury', setup: s => setTreasury(s, N1, 499), order: propose('consulate'), expected: 'insufficient-funds' },
    { name: 'an embassy costing more than the treasury', setup: s => setTreasury(consulate(s), N1, 4999), order: propose('embassy'), expected: 'insufficient-funds' },
    { name: 'a grant costing more than the treasury', setup: s => setTreasury(embassy(s), N1, 9999), order: grant(10000), expected: 'insufficient-funds' },
    { name: 'an answer to a proposal made to another nation', setup: proposal({ toId: N2 }), order: answer('proposal-2-1'), expected: 'invalid-target' },
    { name: 'an answer to an expired proposal', setup: proposal({ turn: 1 }), order: answer('proposal-2-1'), expected: 'invalid-target' },
    { name: 'an answer to an unknown proposal', setup: proposal({}), order: answer('proposal-9-9'), expected: 'invalid-target' },
    { name: 'a withdrawal with nothing to withdraw', order: { kind: 'withdrawOverture', nationId: N1, overture: 'consulate', targetId: ARVELIA }, expected: 'invalid-target' },
    { name: 'a "grant" withdrawal with no grant this turn and no locked grant', setup: embassy, order: { kind: 'withdrawOverture', nationId: N1, overture: 'grant', targetId: ARVELIA }, expected: 'invalid-target' },
    // Allowed (FR-171, FR-162): a boycott needs no consulate; a subsidy step with a consulate; 0 removes.
    { name: 'a boycott without a consulate is ok', order: policy(0, true), expected: 'ok' },
    { name: 'a 75% subsidy with a consulate is ok', setup: consulate, order: policy(75), expected: 'ok' },
    { name: 'removing a subsidy (0) while at war is ok', setup: s => war(s, N2), order: policy(0, false, N2), expected: 'ok' },
    { name: 'answering a proposal made last turn is ok', setup: proposal({}), order: answer('proposal-2-1', false), expected: 'ok' },
    { name: 'war on a pact partner is ok (it breaks the pact, FR-168)', setup: s => setPair(embassy(s), N1, ARVELIA, { pact: true }), order: propose('war'), expected: 'ok' },
  ];

  it.each(rows.map(r => [r.name, r] as const))('FR-162 %s', (_name, r) => {
    const state = deepFreeze(r.setup ? r.setup(continent()) : continent());
    const snapshot = structuredClone(state);

    expect(validateOrder(state, r.order)).toEqual(r.expected === 'ok' ? { ok: true } : { ok: false, reason: r.expected });
    expect(state).toEqual(snapshot);
  });

  it('FR-162 the five new reasons each have a row', () => {
    const reasons = new Set(rows.map(r => r.expected));
    for (const reason of ['needs-consulate', 'needs-embassy', 'already-in-place', 'at-war', 'not-at-war'] as const) expect(reasons.has(reason)).toBe(true);
  });
});

describe('FR-200 FR-205 FR-207 army order refusals, on the continent (one row per refusal)', () => {
  const recruit = (regiment: string, count: number): Order => ({ kind: 'setRecruitment', nationId: N1, regiment: regiment as 'regulars', count });
  const armed = (s: GameState) => setWarehouse(s, N1, { armaments: 2 });
  const cancel = (regimentIds: string[]): Order => ({ kind: 'cancelArmyMove', nationId: N1, regimentIds });
  const cancelDisband = (regimentIds: string[]): Order => ({ kind: 'cancelDisband', nationId: N1, regimentIds });
  const disband = (regimentIds: string[], provinceId = SW1): Order => ({ kind: 'disbandRegiments', nationId: N1, provinceId, regimentIds });
  /** The 1st Regulars stand in Testland North-East, which borders Arvelia. */
  const atBorder = (s: GameState) => relocate(s, [ARMY.regulars1], NE1);
  const warWithArvelia = (since: number) => (s: GameState) =>
    setPair(atBorder(s), N1, 'minor-1', { war: { aggressors: [N1], since }, consulates: [], embassies: [] });

  const rows: Case[] = [
    // setRecruitment (FR-200)
    { name: 'a recruit on a world without provinces (two-islands)', setup: () => armed(newGame({ seed: 1, world: 'two-islands' })), order: recruit('regulars', 1), expected: 'invalid-target' },
    { name: 'a recruit of militia (Minutemen)', setup: armed, order: recruit('minutemen', 1), expected: 'invalid-target' },
    { name: 'a recruit of Sappers (Q31)', setup: armed, order: recruit('sappers', 1), expected: 'invalid-target' },
    { name: 'a recruit of an unknown type', setup: armed, order: recruit('dragoons', 1), expected: 'invalid-target' },
    { name: 'a recruit count below 0', setup: armed, order: recruit('regulars', -1), expected: 'invalid-amount' },
    { name: 'a recruit count that is not whole', setup: armed, order: recruit('regulars', 1.5), expected: 'invalid-amount' },
    { name: 'a recruit count that is not a number', setup: armed, order: recruit('regulars', Number.NaN), expected: 'invalid-amount' },
    { name: 'a recruit costing more than the treasury', setup: s => setTreasury(armed(s), N1, 499), order: recruit('regulars', 1), expected: 'insufficient-funds' },
    { name: 'a recruit without an armament', order: recruit('regulars', 1), expected: 'insufficient-resources' },
    { name: 'a recruit of Hussars without a horse', setup: s => setWarehouse(armed(s), N1, { horses: 0 }), order: recruit('hussars', 1), expected: 'insufficient-resources' },
    { name: 'a recruit of Grenadiers with every trained worker sick', setup: s => setIndustry(armed(s), N1, { sick: { untrained: 0, trained: 2, expert: 0 } }), order: recruit('grenadiers', 1), expected: 'insufficient-labour' },
    // review R4, E4: recruits join in the capital province (FR-201)
    { name: 'a recruit while another country holds the capital province', setup: s => transferProvince(armed(s), SW1, N2), order: recruit('regulars', 1), expected: 'invalid-target' },
    // moveArmy (FR-205)
    { name: "a march of another country's regiment", order: { kind: 'moveArmy', nationId: N1, fromProvinceId: SW2, regimentIds: [ARMY.valdoria1], toProvinceId: 'province-nation-2-nw' }, expected: 'not-owner' },
    { name: 'a march of a regiment that is not in the army of the province named', order: marchOrder([ARMY.regulars1], NW1, SW1), expected: 'invalid-target' },
    { name: 'a march of an unknown regiment', order: marchOrder(['regiment-999']), expected: 'invalid-target' },
    { name: 'a march of a militia regiment', order: marchOrder([ARMY.minutemen9]), expected: 'invalid-target' },
    { name: 'a march with no regiment', order: marchOrder([]), expected: 'invalid-amount' },
    { name: 'a march naming a regiment twice', order: marchOrder([ARMY.regulars1, ARMY.regulars1]), expected: 'invalid-amount' },
    { name: 'a march from an unknown province', order: marchOrder([ARMY.regulars1], 'province-nowhere'), expected: 'invalid-target' },
    { name: 'a march to an unknown province', order: marchOrder([ARMY.regulars1], SW1, 'province-nowhere'), expected: 'invalid-target' },
    { name: "a march to a province that does not border the army's", order: marchOrder([ARMY.regulars1], SW1, ARVELIA_P), expected: 'not-adjacent' },
    { name: 'a march to the province it is in', order: marchOrder([ARMY.regulars1], SW1, SW1), expected: 'not-adjacent' },
    { name: 'a march across the sea', order: marchOrder([ARMY.regulars1], SW1, SW2), expected: 'not-adjacent' },
    { name: "a march into another country's province without a war", setup: atBorder, order: marchOrder([ARMY.regulars1], NE1, ARVELIA_P), expected: 'not-at-war' },
    { name: 'a march into a country whose war starts next turn (FR-167)', setup: warWithArvelia(2), order: marchOrder([ARMY.regulars1], NE1, ARVELIA_P), expected: 'not-at-war' },
    // FR-216 (M9): a march into a country at war is an attack; M8 refused it with attack-not-available (review R7, F5)
    { name: 'FR-216 a march into a country at war (war active) is an attack and is ok', setup: warWithArvelia(1), order: marchOrder([ARMY.regulars1], NE1, ARVELIA_P), expected: 'ok' },
    // cancelArmyMove (FR-205)
    { name: 'a cancel with no regiment', order: cancel([]), expected: 'invalid-amount' },
    { name: 'a cancel of a regiment with no march ordered', order: cancel([ARMY.regulars1]), expected: 'invalid-target' },
    { name: 'a cancel of a march for a regiment whose disband is ordered', setup: s => applyOrder(s, disband([ARMY.regulars1])), order: cancel([ARMY.regulars1]), expected: 'invalid-target' },
    { name: 'a cancel of an unknown regiment', order: cancel(['regiment-999']), expected: 'invalid-target' },
    { name: "a cancel of another country's regiment", order: cancel([ARMY.valdoria1]), expected: 'not-owner' },
    // cancelDisband (FR-207, review F4)
    { name: 'a cancelDisband with no regiment', order: cancelDisband([]), expected: 'invalid-amount' },
    { name: 'a cancelDisband of a regiment with no disband ordered', order: cancelDisband([ARMY.regulars1]), expected: 'invalid-target' },
    { name: 'a cancelDisband of a regiment ordered to march', setup: s => applyOrder(s, marchOrder([ARMY.regulars1])), order: cancelDisband([ARMY.regulars1]), expected: 'invalid-target' },
    { name: 'a cancelDisband of an unknown regiment', order: cancelDisband(['regiment-999']), expected: 'invalid-target' },
    { name: "a cancelDisband of another country's regiment", order: cancelDisband([ARMY.valdoria1]), expected: 'not-owner' },
    { name: 'a cancelDisband naming a regiment twice', setup: s => applyOrder(s, disband([ARMY.regulars1])), order: cancelDisband([ARMY.regulars1, ARMY.regulars1]), expected: 'invalid-amount' },
    // disbandRegiments (FR-207)
    { name: 'a disband of a militia regiment', order: disband([ARMY.minutemen9]), expected: 'invalid-target' },
    { name: 'a disband of a regiment that is not in the province named', order: disband([ARMY.regulars1], NW1), expected: 'invalid-target' },
    { name: 'a disband of an unknown regiment', order: disband(['regiment-999']), expected: 'invalid-target' },
    { name: "a disband of another country's regiment", order: disband([ARMY.valdoria1], SW2), expected: 'not-owner' },
    { name: 'a disband with no regiment', order: disband([]), expected: 'invalid-amount' },
    { name: 'a disband naming a regiment twice', order: disband([ARMY.regulars2, ARMY.regulars2]), expected: 'invalid-amount' },
  ];

  it.each(rows.map(r => [r.name, r] as const))('FR-200 FR-205 FR-207 %s', (_name, r) => {
    const state = deepFreeze(r.setup ? r.setup(armyContinent()) : armyContinent());
    const snapshot = structuredClone(state);

    expect(validateOrder(state, r.order)).toEqual(r.expected === 'ok' ? { ok: true } : { ok: false, reason: r.expected });
    expect(state).toEqual(snapshot);
  });

  it('FR-205 the new reason not-adjacent has a row; FR-216 an attack into a country at war has an accepted row', () => {
    expect(rows.some(r => r.expected === 'not-adjacent')).toBe(true);
    expect(rows.some(r => r.name.startsWith('FR-216') && r.expected === 'ok')).toBe(true);
  });
});
