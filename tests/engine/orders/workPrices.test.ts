import { describe, it, expect } from 'vitest';
import { initWorld } from '@/testing/worldInit';
import { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { ResourceType } from '@/types/Resource';
import { Worker, WorkerType, WorkerStatus } from '@/types/Workers';
import { startProspecting, startDevelopment, startConstruction } from './singleNationOrders';
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
    seed: 0,
    nations: nationsWithIndustry,
    cities: [],
    armies: [],
    fleets: [],
    minorNations: [],
    provinces: [],
    diplomacy: {},
    intents: [],
    map,
    transportNetwork: { shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { technologies: [], oilDrillingTechUnlocked: false },
    difficulty: 'normal',
  } as GameState;
}

describe('work prices - immediate treasury deduction on job start', () => {
  it('deducts prospecting cost when starting prospecting', () => {
    const state = makeBaseState();
    const mountains = state.map.tiles.flat().find(t => t.terrain === TerrainType.Mountains)!;

    // Place a prospector on the mountains tile
    const prospector: Worker = { id: 'w-pros', type: WorkerType.Prospector, nationId: 'nation-1', assignedTileId: mountains.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false };
    const [mx, my] = [mountains.x, mountains.y];
    state.map.tiles[my][mx] = { ...mountains, workers: [...mountains.workers, prospector] };

    const before = state.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;

    const s2 = startProspecting(state, mountains.id, prospector.id);

    const after = s2.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;
    expect(after).toBe(before - PROSPECT_COST);
    const t2 = s2.map.tiles[my][mx];
    expect(t2.prospecting?.workerId).toBe(prospector.id);
  });

  it('deducts development cost when starting Level 1 development', () => {
    const state = makeBaseState();
    const farm = state.map.tiles.flat().find(t => t.terrain === TerrainType.Farm)!;

    // Place a farmer on the farm tile
    const farmer: Worker = { id: 'w-farmer', type: WorkerType.Farmer, nationId: 'nation-1', assignedTileId: farm.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false };
    const [fx, fy] = [farm.x, farm.y];
    state.map.tiles[fy][fx] = { ...farm, workers: [...farm.workers, farmer] };

    const before = state.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;

    const s2 = startDevelopment(state, farm.id, farmer.id);

    const after = s2.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;
    expect(after).toBe(before - DEVELOPMENT_COST[1]);
    const t2 = s2.map.tiles[fy][fx];
    expect(t2.developmentJob?.workerId).toBe(farmer.id);
    expect(t2.developmentJob?.targetLevel).toBe(1);
  });

  it('FR-029 FR-030 deducts construction cost when starting a depot construction', () => {
    const state = makeBaseState();
    // A depot site (FR-030): the dry plains are not next to the capital.
    const land = state.map.tiles.flat().find(t => t.terrain === TerrainType.DryPlains)!;

    // Place an engineer on the land tile
    const engineer: Worker = { id: 'w-eng', type: WorkerType.Engineer, nationId: 'nation-1', assignedTileId: land.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false };
    const [lx, ly] = [land.x, land.y];
    state.map.tiles[ly][lx] = { ...land, workers: [...land.workers, engineer] };

    const before = state.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;

    const s2 = startConstruction(state, land.id, engineer.id, 'depot');

    const after = s2.nations.find(n => n.id === 'nation-1')!.treasury ?? 0;
    expect(after).toBe(before - CONSTRUCTION_COST.depot);
    const t2 = s2.map.tiles[ly][lx];
    expect(t2.constructionJob?.workerId).toBe(engineer.id);
    expect(t2.constructionJob?.kind).toBe('depot');
  });
});

describe('work prices - every worker type that costs money', () => {
  const developmentCases: { type: WorkerType; terrain: TerrainType; resource: ResourceType }[] = [
    { type: WorkerType.Farmer, terrain: TerrainType.Farm, resource: ResourceType.Grain },
    { type: WorkerType.Rancher, terrain: TerrainType.OpenRange, resource: ResourceType.Livestock },
    { type: WorkerType.Forester, terrain: TerrainType.HardwoodForest, resource: ResourceType.Timber },
    { type: WorkerType.Miner, terrain: TerrainType.Mountains, resource: ResourceType.IronOre },
    { type: WorkerType.Driller, terrain: TerrainType.Desert, resource: ResourceType.Oil },
    { type: WorkerType.Developer, terrain: TerrainType.Farm, resource: ResourceType.Grain },
  ];

  function place(state: GameState, tile: { x: number; y: number }, worker: Worker) {
    const t = state.map.tiles[tile.y][tile.x];
    state.map.tiles[tile.y][tile.x] = { ...t, workers: [...t.workers, worker] };
  }

  it.each(developmentCases)('deducts level 1 cost for $type', ({ type, terrain, resource }) => {
    const state = makeBaseState();
    state.technologyState = { ...state.technologyState, oilDrillingTechUnlocked: true };
    const base = state.map.tiles.flat().find(t => t.terrain !== TerrainType.Water && t.terrain !== TerrainType.River)!;
    state.map.tiles[base.y][base.x] = { ...base, terrain, resource: { type: resource, level: 0, discovered: true }, workers: [] };
    const worker: Worker = { id: 'w', type, nationId: 'nation-1', assignedTileId: base.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false };
    place(state, base, worker);
    const before = state.nations.find(n => n.id === 'nation-1')!.treasury;

    const s2 = startDevelopment(state, base.id, worker.id);

    expect(s2.map.tiles[base.y][base.x].developmentJob?.workerId).toBe('w');
    expect(s2.nations.find(n => n.id === 'nation-1')!.treasury).toBe(before - DEVELOPMENT_COST[1]);
  });

  it('does not start work or change the treasury when the nation cannot afford it', () => {
    const state = makeBaseState();
    state.nations = state.nations.map(n => ({ ...n, treasury: PROSPECT_COST - 1 }));
    const mountains = state.map.tiles.flat().find(t => t.terrain === TerrainType.Mountains)!;
    const prospector: Worker = { id: 'w-pros', type: WorkerType.Prospector, nationId: 'nation-1', assignedTileId: mountains.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false };
    place(state, mountains, prospector);

    const s2 = startProspecting(state, mountains.id, prospector.id);

    expect(s2.map.tiles[mountains.y][mountains.x].prospecting).toBeUndefined();
    expect(s2.nations.find(n => n.id === 'nation-1')!.treasury).toBe(PROSPECT_COST - 1);
  });

  it('does not start construction when the nation cannot afford it', () => {
    const state = makeBaseState();
    state.nations = state.nations.map(n => ({ ...n, treasury: CONSTRUCTION_COST.depot - 1 }));
    const land = state.map.tiles.flat().find(t => t.terrain !== TerrainType.Water && t.terrain !== TerrainType.River)!;
    const engineer: Worker = { id: 'w-eng', type: WorkerType.Engineer, nationId: 'nation-1', assignedTileId: land.id, efficiency: 100, status: WorkerStatus.Available, justMoved: false };
    place(state, land, engineer);

    const s2 = startConstruction(state, land.id, engineer.id, 'depot');

    expect(s2.map.tiles[land.y][land.x].constructionJob).toBeUndefined();
    expect(s2.nations.find(n => n.id === 'nation-1')!.treasury).toBe(CONSTRUCTION_COST.depot - 1);
  });
});
