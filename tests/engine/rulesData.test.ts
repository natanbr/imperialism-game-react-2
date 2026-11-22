import { describe, it, expect } from 'vitest';
import * as gameConstants from '@/constants/gameConstants';
import { seasonOf } from '@/engine/calendar';
import { newGame } from '@/engine/newGame';
import { applyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import {
  EngineerBuildDurationsTurns,
  ProspectorDiscoveryDurationTurns,
  WorkerLevelDurationsTurns,
} from '@/definisions/workerDurations';
import { CONSTRUCTION_COST, DEVELOPMENT_COST, PROSPECT_COST, constructionCost } from '@/definisions/workPrices';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { game, N1, put, setTechnologies, setTile, setTreasury, T, tileAt, treasury, workerId } from './fixtures';

describe('FR-027 calendar', () => {
  it('FR-027 a new game starts on turn 1 in Spring 1815', () => {
    const g = newGame({ seed: 1 });
    expect([g.turn, g.year, seasonOf(g.turn)]).toEqual([1, 1815, 'spring']);
  });

  it('FR-027 each turn is one season and the year advances after winter', () => {
    expect([1, 2, 3, 4, 5, 8, 9].map(seasonOf)).toEqual(['spring', 'summer', 'fall', 'winter', 'spring', 'winter', 'spring']);

    let s = game();
    const seen: [number, number, string][] = [];
    for (let i = 0; i < 5; i++) {
      seen.push([s.turn, s.year, seasonOf(s.turn)]);
      s = resolveTurn(s, {}, 1).state;
    }
    expect(seen).toEqual([
      [1, 1815, 'spring'],
      [2, 1815, 'summer'],
      [3, 1815, 'fall'],
      [4, 1815, 'winter'],
      [5, 1816, 'spring'],
    ]);
  });
});

describe('FR-028 job durations come from one table', () => {
  it('FR-028 prospecting 1, rail 1, depot, port and fort 3 turns', () => {
    expect(ProspectorDiscoveryDurationTurns).toBe(1);
    expect(EngineerBuildDurationsTurns).toEqual({ rail: 1, depot: 3, port: 3, fort: 3 });
  });

  it('FR-028 every development level takes 3 turns for every development worker', () => {
    for (const type of [WorkerType.Farmer, WorkerType.Rancher, WorkerType.Forester, WorkerType.Miner, WorkerType.Driller]) {
      expect({ type, levels: WorkerLevelDurationsTurns[type] }).toEqual({ type, levels: { 1: 3, 2: 3, 3: 3 } });
    }
  });

  it('FR-028 gameConstants holds no second set of durations', () => {
    const text = JSON.stringify(gameConstants);
    for (const key of ['PROSPECT_TURNS', 'DEVELOP_TURNS_BASE', 'DEPOT_BUILD_TURNS', 'PORT_BUILD_TURNS', 'FORT_BUILD_TURNS', 'RAILROAD_BUILD_TURNS']) {
      expect({ key, present: text.includes(key) }).toEqual({ key, present: false });
    }
  });

  it('FR-105 the unused DEVELOPMENT_CONFIG and CONSTRUCTION_CONFIG are gone: gameConstants holds only TIME_CONFIG', () => {
    expect(Object.keys(gameConstants)).toEqual(['TIME_CONFIG']);
  });

  it('FR-028 a farmer ordered on turn 1 to level 2 finishes when turn 4 begins', () => {
    let s = setTile(setTechnologies(game(), N1, 'steelAndIronPlows'), T.farm1, { resource: { type: ResourceType.Grain, level: 1 } });
    s = put(s, workerId(N1, WorkerType.Farmer), T.farm1);
    s = applyOrder(s, { kind: 'startDevelopment', nationId: N1, workerId: workerId(N1, WorkerType.Farmer), tileId: T.farm1 });
    expect(tileAt(s, T.farm1).developmentJob?.durationTurns).toBe(3);

    const levels: number[] = [];
    for (let i = 0; i < 3; i++) {
      s = resolveTurn(s, {}, 1).state;
      levels.push(tileAt(s, T.farm1).resource!.level);
    }
    expect(levels).toEqual([1, 1, 2]);
    expect(s.turn).toBe(4);
  });
});

describe('FR-029 job costs', () => {
  it('FR-029 development $100 / $1,000 / $5,000; depot $2,000; port $3,000; fort $5,000; prospecting $100', () => {
    expect(DEVELOPMENT_COST).toEqual({ 1: 100, 2: 1000, 3: 5000 });
    expect(CONSTRUCTION_COST).toMatchObject({ depot: 2000, port: 3000, fort: 5000 });
    expect(PROSPECT_COST).toBe(100);
  });

  it('FR-029 rail costs depend on the terrain of the tile', () => {
    const cases: [TerrainType, number][] = [
      [TerrainType.Farm, 100],
      [TerrainType.DryPlains, 100],
      [TerrainType.Desert, 100],
      [TerrainType.Orchard, 100],
      [TerrainType.Tundra, 150],
      [TerrainType.HardwoodForest, 150],
      [TerrainType.ScrubForest, 150],
      [TerrainType.BarrenHills, 200],
      [TerrainType.FertileHills, 200],
      [TerrainType.Swamp, 300],
      [TerrainType.Mountains, 300],
    ];
    expect(cases.map(([terrain]) => [terrain, constructionCost('rail', terrain)])).toEqual(cases);
    expect(constructionCost('depot', TerrainType.Swamp)).toBe(2000);
  });

  it('FR-029 rail-on-move into a hardwood forest charges $150', () => {
    // The forest at (2,0) is next to the capital (1,1) in the fixture.
    const forest = '2-0';
    expect(tileAt(game(), forest).terrain).toBe(TerrainType.HardwoodForest);

    const s = applyOrder(game(), { kind: 'moveAndBuildRail', nationId: N1, workerId: workerId(N1, WorkerType.Engineer), toTileId: forest });

    expect(tileAt(s, forest).constructionJob?.kind).toBe('rail');
    expect(treasury(game(), N1) - treasury(s, N1)).toBe(150);
  });

  it('FR-028 FR-029 a depot job lasts 3 turns and costs $2,000', () => {
    let s = put(setTreasury(game(), N1, 10000), workerId(N1, WorkerType.Engineer), T.orchard1);
    s = applyOrder(s, { kind: 'startConstruction', nationId: N1, workerId: workerId(N1, WorkerType.Engineer), tileId: T.orchard1, structure: 'depot' });

    expect(tileAt(s, T.orchard1).constructionJob).toMatchObject({ kind: 'depot', durationTurns: 3 });
    expect(treasury(s, N1)).toBe(10000 - 2000);
  });
});

it('FR-519 every catalogue entry matches the first manual year, price and prerequisites in rules 09', async () => {
  const { TECHNOLOGIES } = await import('@/definisions/technologies');
  expect(TECHNOLOGIES.map(t => [t.id, t.name, t.cost, t.firstYear, t.prerequisites])).toEqual([
    ['highPressureSteamEngine', 'High Pressure Steam Engine', 0, 1814, []],
    ['seedDrill', 'Seed Drill', 0, 1814, []],
    ['cottonGin', 'Cotton Gin', 1000, 1816, []],
    ['streamlinedHulls', 'Streamlined Hulls', 1500, 1821, []],
    ['squareSetTimbering', 'Square-Set Timbering', 1500, 1821, ['highPressureSteamEngine']],
    ['ironRailroadBridge', 'Iron Railroad Bridge', 1500, 1821, ['highPressureSteamEngine']],
    ['feedGrasses', 'Feed Grasses', 1500, 1821, []],
    ['spinningJenny', 'Spinning Jenny', 3000, 1826, ['feedGrasses', 'cottonGin']],
    ['paddlewheels', 'Paddlewheels', 3000, 1826, []],
    ['steelAndIronPlows', 'Steel and Iron Plows', 3000, 1831, ['seedDrill']],
    ['bessemerConverter', 'Bessemer Converter', 6000, 1836, []],
    ['compoundSteamEngine', 'Compound Steam Engine', 7000, 1836, ['ironRailroadBridge']],
    ['rifledArtillery', 'Rifled Artillery', 10000, 1841, []],
    ['breechLoadingRifles', 'Breech-Loading Rifles', 12000, 1841, ['bessemerConverter']],
    ['advancedIronWorking', 'Advanced Iron Working', 12000, 1846, []],
    ['powerLoom', 'Power Loom', 12000, 1846, ['spinningJenny']],
    ['mechanicalReaper', 'Mechanical Reaper', 12000, 1851, ['steelAndIronPlows']],
    ['commercialFertiliser', 'Commercial Fertiliser', 12000, 1856, ['steelAndIronPlows']],
    ['oilDrilling', 'Oil Drilling', 25000, 1856, []],
    ['barbedWire', 'Barbed Wire', 20000, 1861, ['feedGrasses']],
    ['steelArmourPlate', 'Steel Armour Plate', 40000, 1866, ['advancedIronWorking']],
    ['largeArtillery', 'Large Artillery', 40000, 1871, ['rifledArtillery']],
    ['dynamite', 'Dynamite', 40000, 1871, ['compoundSteamEngine', 'squareSetTimbering']],
    ['marineEngineering', 'Marine Engineering', 40000, 1871, ['steelArmourPlate']],
    ['machineGuns', 'Machine Guns', 100000, 1876, ['breechLoadingRifles']],
    ['chemistry', 'Chemistry', 120000, 1876, ['oilDrilling', 'barbedWire']],
    ['improvedRangeFinding', 'Improved Range-Finding', 150000, 1881, ['marineEngineering']],
    ['internalCombustion', 'Internal Combustion', 150000, 1881, ['chemistry']],
  ]);
  expect(TECHNOLOGIES.every(t => t.effect.trim().length > 0)).toBe(true);
});
