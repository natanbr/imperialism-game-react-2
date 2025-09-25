import { describe, it, expect } from 'vitest';
import { initWorld } from '@/testing/worldInit';
import { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { Worker, WorkerType } from '@/types/Workers';
import { startProspectingHelper, startDevelopmentHelper, startConstructionHelper } from '@/store/helpers/workerHelpers';
import { PROSPECT_COST, DEVELOPMENT_COST, CONSTRUCTION_COST } from '@/definisions/workPrices';

function makeBaseState(): GameState {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  // Set industry on each nation
  const nationsWithIndustry = nations.map(n => ({
    ...n,
  }));

  return {
    turn: 1,
    year: 1900,
    activeNationId: 'nation-1',
    nations: nationsWithIndustry,
    cities: [],
    armies: [],
    fleets: [],
    relations: [],
    treaties: [],
    tradePolicies: [],
    grants: [],
    map,
    transportNetwork: { railroads: [], shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { technologies: [], oilDrillingTechUnlocked: false },
    newsLog: [],
    turnOrder: { phases: ['diplomacy','trade','production','combat','interceptions','logistics'] },
    difficulty: 'normal',
  } as GameState;
}

describe('work prices - immediate treasury deduction on job start', () => {
  it('deducts prospecting cost when starting prospecting', () => {
    const state = makeBaseState();
    const mountains = state.map.tiles.flat().find(t => t.terrain === TerrainType.Mountains)!;

    // Place a prospector on the mountains tile
    const prospector: Worker = { id: 'w-pros', type: WorkerType.Prospector, nationId: 'nation-1', assignedTileId: mountains.id, efficiency: 100 };
    const [mx, my] = [mountains.x, mountains.y];
    state.map.tiles[my][mx] = { ...mountains, workers: [...mountains.workers, prospector] };

    const before = state.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;

    const s2 = startProspectingHelper(state, mountains.id, prospector.id);

    const after = s2.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;
    expect(after).toBe(before - PROSPECT_COST);
    const t2 = s2.map.tiles[my][mx];
    expect(t2.prospecting?.workerId).toBe(prospector.id);
  });

  it('deducts development cost when starting Level 1 development', () => {
    const state = makeBaseState();
    const farm = state.map.tiles.flat().find(t => t.terrain === TerrainType.Farm)!;

    // Place a farmer on the farm tile
    const farmer: Worker = { id: 'w-farmer', type: WorkerType.Farmer, nationId: 'nation-1', assignedTileId: farm.id, efficiency: 100 };
    const [fx, fy] = [farm.x, farm.y];
    state.map.tiles[fy][fx] = { ...farm, workers: [...farm.workers, farmer] };

    const before = state.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;

    const s2 = startDevelopmentHelper(state, farm.id, farmer.id, farmer.type, 1);

    const after = s2.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;
    expect(after).toBe(before - DEVELOPMENT_COST[1]);
    const t2 = s2.map.tiles[fy][fx];
    expect(t2.developmentJob?.workerId).toBe(farmer.id);
    expect(t2.developmentJob?.targetLevel).toBe(1);
  });

  it('deducts construction cost when starting a depot construction', () => {
    const state = makeBaseState();
    // Pick any land tile (avoid Water/River). Capital is fine.
    const land = state.map.tiles.flat().find(t => t.terrain !== TerrainType.Water && t.terrain !== TerrainType.River)!;

    // Place an engineer on the land tile
    const engineer: Worker = { id: 'w-eng', type: WorkerType.Engineer, nationId: 'nation-1', assignedTileId: land.id, efficiency: 100 };
    const [lx, ly] = [land.x, land.y];
    state.map.tiles[ly][lx] = { ...land, workers: [...land.workers, engineer] };

    const before = state.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;

    const s2 = startConstructionHelper(state, land.id, engineer.id, 'depot');

    const after = s2.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;
    expect(after).toBe(before - CONSTRUCTION_COST.depot);
    const t2 = s2.map.tiles[ly][lx];
    expect(t2.constructionJob?.workerId).toBe(engineer.id);
    expect(t2.constructionJob?.kind).toBe('depot');
  });
});