import { describe, it, expect } from 'vitest';
import { initWorld } from '@/testing/worldInit';
import { GameState } from '@/types/GameState';
import { TerrainType, Tile } from '@/types/Tile';
import { Worker, WorkerType, WorkerStatus } from '@/types/Workers';
import {
  startProspecting,
  startDevelopment,
  startConstruction,
  moveAndStartProspecting,
  moveAndStartDevelopment,
  moveAndStartConstruction,
  moveAndBuildRail,
} from './singleNationOrders';
import { PROSPECT_COST, DEVELOPMENT_COST, CONSTRUCTION_COST } from '@/definisions/workPrices';

const NATION = 'nation-1';

/** 5x5 world with every worker removed, so each test places exactly the workers it needs. */
function makeState(treasury: number): GameState {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  const tiles = map.tiles.map(row => row.map(t => ({ ...t, workers: [] as Worker[] })));
  return {
    turn: 1,
    year: 1900,
    seed: 0,
    nations: nations.map(n => ({ ...n, treasury })),
    cities: [],
    armies: [],
    fleets: [],
    minorNations: [],
    provinces: [],
    diplomacy: {},
    intents: [],
    map: { ...map, tiles },
    transportNetwork: { shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { technologies: [], oilDrillingTechUnlocked: false },
    difficulty: 'normal',
  } as GameState;
}

function tilesOf(state: GameState, terrain: TerrainType): Tile[] {
  return state.map.tiles.flat().filter(t => t.terrain === terrain);
}

function capital(state: GameState): Tile {
  return tilesOf(state, TerrainType.Capital)[0];
}

function makeWorker(id: string, type: WorkerType, tile: Tile, status: WorkerStatus = WorkerStatus.Available): Worker {
  return { id, type, nationId: NATION, assignedTileId: tile.id, efficiency: 100, status, justMoved: false };
}

function place(state: GameState, tile: Tile, worker: Worker): void {
  const current = state.map.tiles[tile.y][tile.x];
  state.map.tiles[tile.y][tile.x] = { ...current, workers: [...current.workers, worker] };
}

function tileAt(state: GameState, tile: Tile): Tile {
  return state.map.tiles[tile.y][tile.x];
}

function findWorker(state: GameState, workerId: string): { worker: Worker; tile: Tile } | undefined {
  for (const t of state.map.tiles.flat()) {
    const worker = t.workers.find(w => w.id === workerId);
    if (worker) return { worker, tile: t };
  }
  return undefined;
}

function treasuryOf(state: GameState): number {
  return state.nations.find(n => n.id === NATION)!.treasury ?? 0;
}

function snapshot(state: GameState): GameState {
  return structuredClone(state);
}

// ---------------------------------------------------------------------------
// 1. Starting one job must start only the clicked worker, not every Available worker on the map
// ---------------------------------------------------------------------------
describe('starting a job starts only the clicked worker', () => {
  describe('prospecting', () => {
    function twoProspectors(treasury: number) {
      const state = makeState(treasury);
      const [tileA, tileB] = tilesOf(state, TerrainType.Mountains);
      place(state, tileA, makeWorker('pros-a', WorkerType.Prospector, tileA));
      place(state, tileB, makeWorker('pros-b', WorkerType.Prospector, tileB));
      return { state, tileA, tileB };
    }

    it('with money for one job, clicking the second prospector starts only the second', () => {
      const { state, tileA, tileB } = twoProspectors(PROSPECT_COST);

      const s2 = startProspecting(state, tileB.id, 'pros-b');

      expect(tileAt(s2, tileB).prospecting?.workerId).toBe('pros-b');
      expect(tileAt(s2, tileA).prospecting).toBeUndefined();
      expect(findWorker(s2, 'pros-a')!.worker.status).toBe(WorkerStatus.Available);
      expect(findWorker(s2, 'pros-b')!.worker.status).toBe(WorkerStatus.Working);
      expect(treasuryOf(s2)).toBe(0);
    });

    it('with plenty of money, one click starts one prospector and charges exactly one job', () => {
      const { state, tileA, tileB } = twoProspectors(1000);

      const s2 = startProspecting(state, tileA.id, 'pros-a');

      expect(tileAt(s2, tileA).prospecting?.workerId).toBe('pros-a');
      expect(tileAt(s2, tileB).prospecting).toBeUndefined();
      expect(findWorker(s2, 'pros-b')!.worker.status).toBe(WorkerStatus.Available);
      expect(treasuryOf(s2)).toBe(1000 - PROSPECT_COST);
    });
  });

  describe('development', () => {
    function twoFarmers(treasury: number) {
      const state = makeState(treasury);
      const [tileA, tileB] = tilesOf(state, TerrainType.Farm);
      place(state, tileA, makeWorker('farm-a', WorkerType.Farmer, tileA));
      place(state, tileB, makeWorker('farm-b', WorkerType.Farmer, tileB));
      return { state, tileA, tileB };
    }

    it('with money for one job, clicking the second farmer starts only the second', () => {
      const { state, tileA, tileB } = twoFarmers(DEVELOPMENT_COST[1]);

      const s2 = startDevelopment(state, tileB.id, 'farm-b');

      expect(tileAt(s2, tileB).developmentJob?.workerId).toBe('farm-b');
      expect(tileAt(s2, tileA).developmentJob).toBeUndefined();
      expect(findWorker(s2, 'farm-a')!.worker.status).toBe(WorkerStatus.Available);
      expect(findWorker(s2, 'farm-b')!.worker.status).toBe(WorkerStatus.Working);
      expect(treasuryOf(s2)).toBe(0);
    });

    it('with plenty of money, one click starts one farmer and charges exactly one job', () => {
      const { state, tileA, tileB } = twoFarmers(1000);

      const s2 = startDevelopment(state, tileA.id, 'farm-a');

      expect(tileAt(s2, tileA).developmentJob?.workerId).toBe('farm-a');
      expect(tileAt(s2, tileB).developmentJob).toBeUndefined();
      expect(findWorker(s2, 'farm-b')!.worker.status).toBe(WorkerStatus.Available);
      expect(treasuryOf(s2)).toBe(1000 - DEVELOPMENT_COST[1]);
    });

    it('developer: one click starts only the clicked developer', () => {
      const state = makeState(1000);
      const [tileA, tileB] = tilesOf(state, TerrainType.Farm);
      place(state, tileA, makeWorker('dev-a', WorkerType.Developer, tileA));
      place(state, tileB, makeWorker('dev-b', WorkerType.Developer, tileB));

      const s2 = startDevelopment(state, tileB.id, 'dev-b');

      expect(tileAt(s2, tileB).developmentJob?.workerId).toBe('dev-b');
      expect(tileAt(s2, tileA).developmentJob).toBeUndefined();
      expect(findWorker(s2, 'dev-a')!.worker.status).toBe(WorkerStatus.Available);
      expect(treasuryOf(s2)).toBe(1000 - DEVELOPMENT_COST[1]);
    });
  });

  describe('construction (move and build a depot)', () => {
    function twoEngineers(treasury: number) {
      const state = makeState(treasury);
      const home = capital(state);
      // targetB (the idle engineer) comes first in map scan order, targetA (the clicked target) later.
      const targetA = tilesOf(state, TerrainType.DryPlains)[0]; // a depot site (FR-030): not next to the capital
      const targetB = tilesOf(state, TerrainType.Farm)[0];
      place(state, home, makeWorker('eng-a', WorkerType.Engineer, home));
      place(state, targetB, makeWorker('eng-b', WorkerType.Engineer, targetB));
      return { state, home, targetA, targetB };
    }

    it('with money for one job, moving one engineer starts only that engineer', () => {
      const { state, home, targetA, targetB } = twoEngineers(CONSTRUCTION_COST.depot);

      // eng-a (on the capital) is the clicked worker; eng-b sits idle on targetB.
      const s2 = moveAndStartConstruction(state, targetA.id, 'eng-a', 'depot');

      expect(tileAt(s2, targetA).constructionJob?.workerId).toBe('eng-a');
      expect(tileAt(s2, targetA).constructionJob?.kind).toBe('depot');
      expect(tileAt(s2, targetB).constructionJob).toBeUndefined();
      expect(tileAt(s2, home).constructionJob).toBeUndefined();
      expect(findWorker(s2, 'eng-b')!.worker.status).toBe(WorkerStatus.Available);
      expect(treasuryOf(s2)).toBe(0);
    });

    it('with plenty of money, one click charges exactly one depot', () => {
      const { state, targetA, targetB } = twoEngineers(2000);

      const s2 = moveAndStartConstruction(state, targetA.id, 'eng-a', 'depot');

      expect(tileAt(s2, targetA).constructionJob?.workerId).toBe('eng-a');
      expect(tileAt(s2, targetB).constructionJob).toBeUndefined();
      expect(findWorker(s2, 'eng-b')!.worker.status).toBe(WorkerStatus.Available);
      expect(treasuryOf(s2)).toBe(2000 - CONSTRUCTION_COST.depot);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. move-and-start must be all-or-nothing
// ---------------------------------------------------------------------------
describe('move-and-start is refused as a whole when the job is unaffordable', () => {
  it('prospecting: worker is not moved and the treasury is unchanged', () => {
    const state = makeState(PROSPECT_COST - 1);
    const home = capital(state);
    const target = tilesOf(state, TerrainType.Mountains)[0];
    place(state, home, makeWorker('pros', WorkerType.Prospector, home));
    const before = snapshot(state);

    const s2 = moveAndStartProspecting(state, target.id, 'pros');

    expect(s2).toEqual(before);
    expect(findWorker(s2, 'pros')!.tile.id).toBe(home.id);
  });

  it('development: worker is not moved and the treasury is unchanged', () => {
    const state = makeState(DEVELOPMENT_COST[1] - 1);
    const home = capital(state);
    const target = tilesOf(state, TerrainType.Farm)[0];
    place(state, home, makeWorker('farmer', WorkerType.Farmer, home));
    const before = snapshot(state);

    const s2 = moveAndStartDevelopment(state, target.id, 'farmer');

    expect(s2).toEqual(before);
    expect(findWorker(s2, 'farmer')!.tile.id).toBe(home.id);
  });

  it('construction: worker is not moved and the treasury is unchanged', () => {
    const state = makeState(CONSTRUCTION_COST.depot - 1);
    const home = capital(state);
    const target = tilesOf(state, TerrainType.DryPlains)[0];
    place(state, home, makeWorker('eng', WorkerType.Engineer, home));
    const before = snapshot(state);

    const s2 = moveAndStartConstruction(state, target.id, 'eng', 'depot');

    expect(s2).toEqual(before);
    expect(findWorker(s2, 'eng')!.tile.id).toBe(home.id);
  });
});

describe('move-and-start when affordable', () => {
  it('prospecting: moves the worker, starts the job on the target for that worker only, charges exactly once', () => {
    const state = makeState(1000);
    const home = capital(state);
    const [target, other] = tilesOf(state, TerrainType.Mountains);
    place(state, home, makeWorker('pros', WorkerType.Prospector, home));
    place(state, other, makeWorker('pros-idle', WorkerType.Prospector, other));

    const s2 = moveAndStartProspecting(state, target.id, 'pros');

    const found = findWorker(s2, 'pros')!;
    expect(found.tile.id).toBe(target.id);
    expect(found.worker.status).toBe(WorkerStatus.Working);
    expect(tileAt(s2, target).prospecting?.workerId).toBe('pros');
    expect(tileAt(s2, other).prospecting).toBeUndefined();
    expect(findWorker(s2, 'pros-idle')!.worker.status).toBe(WorkerStatus.Available);
    expect(treasuryOf(s2)).toBe(1000 - PROSPECT_COST);
  });

  it('development: moves the worker, starts the job on the target for that worker only, charges exactly once', () => {
    const state = makeState(1000);
    const home = capital(state);
    const [target, other] = tilesOf(state, TerrainType.Farm);
    place(state, home, makeWorker('farmer', WorkerType.Farmer, home));
    place(state, other, makeWorker('farmer-idle', WorkerType.Farmer, other));

    const s2 = moveAndStartDevelopment(state, target.id, 'farmer');

    const found = findWorker(s2, 'farmer')!;
    expect(found.tile.id).toBe(target.id);
    expect(found.worker.status).toBe(WorkerStatus.Working);
    expect(tileAt(s2, target).developmentJob?.workerId).toBe('farmer');
    expect(tileAt(s2, other).developmentJob).toBeUndefined();
    expect(findWorker(s2, 'farmer-idle')!.worker.status).toBe(WorkerStatus.Available);
    expect(treasuryOf(s2)).toBe(1000 - DEVELOPMENT_COST[1]);
  });

  it('construction: moves the engineer, builds a depot on the target for that worker only, charges exactly once', () => {
    const state = makeState(2000);
    const home = capital(state);
    const [target, other] = tilesOf(state, TerrainType.DryPlains).concat(tilesOf(state, TerrainType.Plantation));
    place(state, home, makeWorker('eng', WorkerType.Engineer, home));
    place(state, other, makeWorker('eng-idle', WorkerType.Engineer, other));

    const s2 = moveAndStartConstruction(state, target.id, 'eng', 'depot');

    const found = findWorker(s2, 'eng')!;
    expect(found.tile.id).toBe(target.id);
    expect(found.worker.status).toBe(WorkerStatus.Working);
    expect(tileAt(s2, target).constructionJob?.workerId).toBe('eng');
    expect(tileAt(s2, target).constructionJob?.kind).toBe('depot');
    expect(tileAt(s2, other).constructionJob).toBeUndefined();
    expect(findWorker(s2, 'eng-idle')!.worker.status).toBe(WorkerStatus.Available);
    expect(treasuryOf(s2)).toBe(2000 - CONSTRUCTION_COST.depot);
  });
});

// ---------------------------------------------------------------------------
// 3. The chosen construction kind must be honoured by move-and-construct
// ---------------------------------------------------------------------------
describe('moveAndStartConstruction honours the chosen kind', () => {
  // Town (2,3) touches the Coast tile (3,3); the capital tile has a river.
  function portSite(state: GameState, how: 'ocean' | 'river'): Tile {
    if (how === 'ocean') return tilesOf(state, TerrainType.Town)[0];
    const site = tilesOf(state, TerrainType.DryPlains)[0];
    state.map.tiles[site.y][site.x] = { ...site, hasRiver: true };
    return state.map.tiles[site.y][site.x];
  }

  it.each(['ocean', 'river'] as const)('FR-029 builds a port (%s site) and charges the port price, not the depot price', how => {
    const state = makeState(5000);
    const home = capital(state);
    const target = portSite(state, how);
    place(state, home, makeWorker('eng', WorkerType.Engineer, home));

    const s2 = moveAndStartConstruction(state, target.id, 'eng', 'port');

    expect(tileAt(s2, target).constructionJob?.kind).toBe('port');
    expect(tileAt(s2, target).constructionJob?.workerId).toBe('eng');
    expect(treasuryOf(s2)).toBe(5000 - CONSTRUCTION_COST.port);
  });

  it('FR-029 refuses a port the nation can afford only as a depot (2,500: depot 2,000, port 3,000), leaving state unchanged', () => {
    const state = makeState(2500);
    const home = capital(state);
    const target = portSite(state, 'ocean');
    place(state, home, makeWorker('eng', WorkerType.Engineer, home));
    const before = snapshot(state);

    const s2 = moveAndStartConstruction(state, target.id, 'eng', 'port');

    expect(s2).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// 4. Rail started by moving an engineer must cost money
// ---------------------------------------------------------------------------
describe('rail-on-move (moveAndBuildRail) construction', () => {
  // Capital (0,0) is a rail starting point; Farm (1,0) is its owned, unconnected neighbour.
  function railScenario(treasury: number) {
    const state = makeState(treasury);
    const from = capital(state);
    const to = state.map.tiles[0][1];
    place(state, from, makeWorker('eng', WorkerType.Engineer, from));
    const fromTile = tileAt(state, from);
    const worker = fromTile.workers[0];
    return { state, fromTile, toTile: tileAt(state, to), worker };
  }

  it('charges the rail price when the rail job starts', () => {
    const { state, toTile, worker } = railScenario(1000);

    const s2 = moveAndBuildRail(state, toTile.id, worker.id);

    expect(tileAt(s2, toTile).constructionJob?.kind).toBe('rail');
    expect(tileAt(s2, toTile).constructionJob?.workerId).toBe('eng');
    expect(treasuryOf(s2)).toBe(1000 - CONSTRUCTION_COST.rail);
  });

  it('refuses a free rail when the nation cannot afford it', () => {
    const { state, toTile, worker } = railScenario(CONSTRUCTION_COST.rail - 1);
    const before = snapshot(state);

    const s2 = moveAndBuildRail(state, toTile.id, worker.id);

    // Refused as a whole: the unchanged state.
    expect(s2).toEqual(before);
    expect(tileAt(s2, toTile).constructionJob).toBeUndefined();
    expect(state).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// 5. startConstruction guards
// ---------------------------------------------------------------------------
describe('startConstruction guards', () => {
  it('does not overwrite a tile that already has a construction job (no charge)', () => {
    const state = makeState(2000);
    const tile = tilesOf(state, TerrainType.DryPlains)[0];
    place(state, tile, makeWorker('eng-1', WorkerType.Engineer, tile, WorkerStatus.Working));
    place(state, tile, makeWorker('eng-2', WorkerType.Engineer, tile));
    state.map.tiles[tile.y][tile.x] = {
      ...state.map.tiles[tile.y][tile.x],
      constructionJob: { workerId: 'eng-1', kind: 'depot', startedOnTurn: 1, durationTurns: 2 },
    };
    const before = snapshot(state);

    const s2 = startConstruction(state, tile.id, 'eng-2', 'depot');

    expect(s2).toEqual(before);
  });

  it('refuses a port on an inland tile without a river (no charge)', () => {
    const state = makeState(2000);
    const inland = tilesOf(state, TerrainType.DryPlains)[0];
    place(state, inland, makeWorker('eng', WorkerType.Engineer, inland));
    const before = snapshot(state);

    const s2 = startConstruction(state, inland.id, 'eng', 'port');

    expect(s2).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// 6. The construction modal calls move-and-construct for an engineer already on the target tile
// ---------------------------------------------------------------------------
describe('move-and-construct when the engineer is already on the target tile', () => {
  it('builds the chosen kind there, charges once, and keeps the engineer on the map', () => {
    const state = makeState(2000);
    const site = tilesOf(state, TerrainType.DryPlains)[0];
    place(state, site, makeWorker('eng', WorkerType.Engineer, site));

    const s2 = moveAndStartConstruction(state, site.id, 'eng', 'depot');

    const found = findWorker(s2, 'eng');
    expect(found?.tile.id).toBe(site.id);
    expect(found?.worker.status).toBe(WorkerStatus.Working);
    expect(tileAt(s2, site).constructionJob?.kind).toBe('depot');
    expect(tileAt(s2, site).constructionJob?.workerId).toBe('eng');
    expect(treasuryOf(s2)).toBe(2000 - CONSTRUCTION_COST.depot);
  });
});

// ---------------------------------------------------------------------------
// Guards that already hold (should stay green)
// ---------------------------------------------------------------------------
describe('unaffordable jobs (already refused today)', () => {
  it('startDevelopment leaves the state unchanged when the nation cannot afford it', () => {
    const state = makeState(DEVELOPMENT_COST[1] - 1);
    const farm = tilesOf(state, TerrainType.Farm)[0];
    place(state, farm, makeWorker('farmer', WorkerType.Farmer, farm));
    const before = snapshot(state);

    const s2 = startDevelopment(state, farm.id, 'farmer');

    expect(s2).toEqual(before);
  });

  it('startConstruction leaves the state unchanged when the nation cannot afford it', () => {
    const state = makeState(CONSTRUCTION_COST.depot - 1);
    const land = tilesOf(state, TerrainType.DryPlains)[0];
    place(state, land, makeWorker('eng', WorkerType.Engineer, land));
    const before = snapshot(state);

    const s2 = startConstruction(state, land.id, 'eng', 'depot');

    expect(s2).toEqual(before);
  });
});
