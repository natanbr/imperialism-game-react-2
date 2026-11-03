import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { newGame } from '@/engine/newGame';
import { labourOf } from '@/engine/industry/labour';
import { WorkerType } from '@/types/Workers';
import { TerrainType } from '@/types/Tile';
import { ResourceType } from '@/types/Resource';
import { hasTechnology, isDepotSite, railTerrainAllowed } from '@/engine/orders/queries';
import { getAdjacentTiles } from '@/engine/map/mapHelpers';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { START_TECHNOLOGIES } from '@/engine/world/startWorld';
import { createTwoNationGame } from '@/testing/mockNation';

const ENGINE_DIR = join(__dirname, '../../src/app/engine');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('FR-080 FR-081 the engine owns the start of a game', () => {
  it('FR-080 no engine file imports the test fixtures in src/app/testing', () => {
    const offenders = sourceFiles(ENGINE_DIR).filter(file => /from\s+["'](@\/testing|\.\.?\/.*testing)\//.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('FR-081 a new game: one nation with $10,000, 4/2/1 workers, 15 freight cars, the six mills and factories, a start warehouse', () => {
    const g = newGame({ seed: 7 });
    expect(g.nations).toHaveLength(1);
    const n = g.nations[0];

    expect(n.treasury).toBe(10000);
    expect(n.transportCapacity).toBe(15);
    expect(n.industry.workers).toEqual({ untrained: 4, trained: 2, expert: 1 });
    expect(labourOf(n)).toEqual({ total: 12, committed: 0, free: 12 });
    const capacities = Object.fromEntries(Object.entries(n.industry.buildings).map(([k, b]) => [k, b!.capacity]));
    expect(capacities).toEqual({
      textileMill: 2, lumberMill: 2, steelMill: 2, clothingFactory: 1, furnitureFactory: 1, metalWorks: 1, refinery: 0, foodProcessing: 0,
    });
    expect(n.warehouse).toMatchObject({
      grain: 20, fruit: 10, livestock: 10, timber: 10, cotton: 10, wool: 10, coal: 10, ironOre: 10, lumber: 10, steel: 10, cannedFood: 10,
      fish: 0, horses: 0, oil: 0, gold: 0, gems: 0, fabric: 0, paper: 0, fuel: 0, clothing: 0, furniture: 0, hardware: 0, armaments: 0,
    });
  });

  it('FR-080 FR-081 the 24x16 two-island map with the seven civilians on the capital and the rail network built', () => {
    const g = newGame({ seed: 7 });
    expect(g.map.config).toMatchObject({ cols: 24, rows: 16 });
    const capital = g.map.tiles.flat().find(t => t.cityId === 'capital-1')!;
    expect(capital.workers.map(w => w.type).sort()).toEqual([
      WorkerType.Driller, WorkerType.Engineer, WorkerType.Farmer, WorkerType.Forester, WorkerType.Miner, WorkerType.Prospector, WorkerType.Rancher,
    ].sort());
    expect(g.transportNetwork.railroadNetworks?.['nation-1']).toBeDefined();
    expect(g.seed).toBe(7);
  });
});

describe('FR-059 start technologies: the rules\' own two and the decision Q8 default for rough terrain', () => {
  const RULES_START = ['highPressureSteamEngine', 'seedDrill'];
  const ROUGH = ['compoundSteamEngine', 'ironRailroadBridge', 'dynamite'];
  const ALL_START = [...RULES_START, ...ROUGH];

  it('FR-059 a new game holds High Pressure Steam Engine and Seed Drill (rules 01), and Compound Steam Engine, Iron Railroad Bridge and Dynamite (Q8), as purchased', () => {
    const g = newGame({ seed: 7 });
    for (const id of ALL_START) expect({ id, has: hasTechnology(g, id) }).toEqual({ id, has: true });
    expect(g.technologyState.technologies.map(t => t.id).sort()).toEqual([...ALL_START].sort());
    const names = Object.fromEntries(g.technologyState.technologies.map(t => [t.id, t.name]));
    expect(names).toMatchObject({ highPressureSteamEngine: 'High Pressure Steam Engine', seedDrill: 'Seed Drill' });
  });

  // The two-island map has hills but no swamp or mountains (FR-080), so those two are a hills tile
  // of the new game with its terrain swapped: the rule reads only the terrain and the technologies.
  it('FR-059 FR-030 rail and depots are allowed on hills, swamp and mountains in a new game', () => {
    const g = newGame({ seed: 7 });
    const tiles = g.map.tiles.flat();
    const hillsTile = tiles.find(t => t.terrain === TerrainType.BarrenHills)!;
    for (const terrain of [TerrainType.BarrenHills, TerrainType.Swamp, TerrainType.Mountains]) {
      const tile = { ...hillsTile, terrain };
      expect({ terrain, allowed: railTerrainAllowed(g, tile) }).toEqual({ terrain, allowed: true });
    }
    const hills = tiles.find(t => t.terrain === TerrainType.BarrenHills && !getAdjacentTiles(g.map, t.x, t.y).some(n => n.depot || n.port))!;
    expect(isDepotSite(g, hills)).toBe(true);
  });

  it('FR-059 the list is start-state data: START_TECHNOLOGIES, and the test fixtures start with none', () => {
    expect(START_TECHNOLOGIES.map(t => t.id).sort()).toEqual([...ALL_START].sort());
    expect(START_TECHNOLOGIES.every(t => t.purchased)).toBe(true);
    expect(createTwoNationGame(1).technologyState.technologies).toEqual([]);
  });
});

describe('FR-052 the new game feeds its workers', () => {
  it('FR-052 the capital has an orchard next to it, and the first meal leaves nobody sick or starving', () => {
    const g = newGame({ seed: 7 });
    const capital = g.map.tiles.flat().find(t => t.cityId === 'capital-1')!;
    const orchards = getAdjacentTiles(g.map, capital.x, capital.y).filter(t => t.resource?.type === ResourceType.Fruit && t.resource.level >= 1);
    expect(orchards.length).toBeGreaterThan(0);

    const { state, events } = resolveTurn(g, {}, g.seed);
    expect(events).toContainEqual({ type: 'workers-fed', nationId: 'nation-1', fed: 7, sick: 0, starved: 0 });
    expect((state.nations[0].warehouse as Record<string, number>).fruit).toBeGreaterThan(10);
  });
});
