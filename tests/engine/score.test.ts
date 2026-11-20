// FR-067: the score, a pure query over the state.
import { describe, it, expect } from 'vitest';
import { scoreOf, scoreTable } from '@/engine/score/score';
import { transferProvince } from '@/engine/world/provinces';
import { newGame } from '@/engine/newGame';
import { applyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { SCORE_WEIGHTS } from '@/definisions/scoreWeights';
import { DEVELOPMENT_COST } from '@/definisions/workPrices';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import type { GameState } from '@/types/GameState';
import { deepFreeze, game, N1, N2, put, setBuilding, setTile, setTreasury, T, workerId } from './fixtures';

// The two-nation fixture: each nation has the six mills and factories (mills 2, factories 1:
// 9 capacity points) and three level-1 tiles (an orchard next to the capital, another orchard and
// the dry plains); nation-1 has $10,000 and nation-2 $8,000.

describe('FR-067 score', () => {
  it('FR-067 weights: 1 point per $100, 10 per capacity point, 10 per resource level', () => {
    // M12 FR-403: the score reads `levelPoints`; `pointsPerLevel` stays for the scripted player's FR-131 rule
    expect(SCORE_WEIGHTS).toEqual({ dollarsPerPoint: 100, pointsPerCapacity: 10, pointsPerLevel: 10, levelPoints: [10, 10, 50] });
  });

  it('FR-067 a fixture nation at the start scores 100 + 90 + 30 = 220, with the parts', () => {
    const state = deepFreeze(game());
    const snapshot = structuredClone(state);

    expect(scoreOf(state, N1)).toEqual({
      nationId: N1,
      treasury: 10000,
      capacity: 9,
      developedLevels: 3,
      // M12 FR-402: no job in the fixture, so no work in progress
      jobsPaid: 0,
      points: { treasury: 100, industry: 90, development: 30, workInProgress: 0 },
      total: 220,
    });
    expect(scoreOf(state, N2).total).toBe(200);
    expect(state).toEqual(snapshot);
  });

  it('FR-067 treasury points round down', () => {
    expect(scoreOf(setTreasury(game(), N1, 199), N1).points.treasury).toBe(1);
    expect(scoreOf(setTreasury(game(), N1, 0), N1).points.treasury).toBe(0);
  });

  it('FR-067 capacity ordered this turn counts from the next turn; the refinery counts; food processing does not', () => {
    expect(scoreOf(setBuilding(game(), N1, 'steelMill', { capacity: 2, pendingCapacity: 2 }), N1).capacity).toBe(9);
    expect(scoreOf(setBuilding(game(), N1, 'steelMill', { capacity: 4, pendingCapacity: 0 }), N1).capacity).toBe(11);
    expect(scoreOf(setBuilding(game(), N1, 'refinery', { capacity: 2 }), N1).capacity).toBe(11);
    expect(scoreOf(setBuilding(game(), N1, 'foodProcessing', { capacity: 50 }), N1).capacity).toBe(9);
  });

  it('FR-067 a tile counts its resource level; level 0 and undiscovered resources give nothing', () => {
    const farm2 = setTile(game(), T.farm1, { resource: { type: ResourceType.Grain, level: 2 } });
    expect(scoreOf(farm2, N1)).toMatchObject({ developedLevels: 5, points: { development: 50 } });

    const hidden = setTile(game(), T.mountains1, { resource: { type: ResourceType.Coal, level: 1, discovered: false } });
    expect(scoreOf(hidden, N1).developedLevels).toBe(3);
  });

  it('FR-067 only the nation\'s own tiles count', () => {
    const s = setTile(game(), T.farm2, { resource: { type: ResourceType.Grain, level: 3 } });
    expect(scoreOf(s, N1).developedLevels).toBe(3);
    expect(scoreOf(s, N2).developedLevels).toBe(6);
  });

  it('FR-067 an unknown nation scores 0', () => {
    expect(scoreOf(game(), 'nation-9')).toEqual({
      nationId: 'nation-9', treasury: 0, capacity: 0, developedLevels: 0, jobsPaid: 0,
      points: { treasury: 0, industry: 0, development: 0, workInProgress: 0 }, total: 0,
    });
  });

  it('FR-067 the score table ranks every nation by total, ties in nation order', () => {
    expect(scoreTable(game()).map(s => [s.nationId, s.total])).toEqual([[N1, 220], [N2, 200]]);
    expect(scoreTable(setTreasury(game(), N2, 10000)).map(s => [s.nationId, s.total])).toEqual([[N1, 220], [N2, 220]]);
    expect(scoreTable(setTreasury(game(), N2, 20000)).map(s => [s.nationId, s.total])).toEqual([[N2, 320], [N1, 220]]);
  });
});

describe('M12 FR-403 a level is worth its price (replaces FR-067\'s 10 per resource level)', () => {
  it('FR-403 10 points for level 1, 10 more for level 2, 50 more for level 3: a level-3 tile is worth 70', () => {
    expect(SCORE_WEIGHTS.levelPoints).toEqual([10, 10, 50]);
    const at = (level: number) => scoreOf(setTile(game(), T.farm1, { resource: { type: ResourceType.Grain, level } }), N1);
    // the fixture's three level-1 tiles give 30; farm1 adds 0, 10, 20, 70
    expect([0, 1, 2, 3].map(level => at(level).points.development)).toEqual([30, 40, 50, 100]);
    expect(at(3).developedLevels).toBe(6);
  });

  it('FR-403 no finished level is worth less than its price / 100 ($100, $1,000, $5,000)', () => {
    let points = 0;
    for (const level of [1, 2, 3] as const) {
      points += SCORE_WEIGHTS.levelPoints[level - 1];
      expect({ level, worth: points >= DEVELOPMENT_COST[level] / SCORE_WEIGHTS.dollarsPerPoint }).toEqual({ level, worth: true });
    }
  });
});

describe('M12 FR-402 ordering a job does not lower the score (work in progress)', () => {
  const FARMER = 'worker-nation-1-2';
  const ENGINEER = 'worker-nation-1-7';

  it('FR-402 example: a $1,000 development order on turn 1 leaves the score at 240', () => {
    const s = newGame({ seed: 1 });
    expect(scoreOf(s, N1).total).toBe(240);
    const after = applyOrder(s, { kind: 'moveAndStartDevelopment', nationId: N1, workerId: FARMER, toTileId: '2-8' });
    expect(scoreOf(after, N1)).toMatchObject({
      treasury: 9000,
      jobsPaid: 1000,
      points: { treasury: 90, industry: 90, development: 50, workInProgress: 10 },
      total: 240,
    });
  });

  it('FR-402 each job counts floor(price / 100) until it finishes; then its level replaces it', () => {
    let s = applyOrder(newGame({ seed: 1 }), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: FARMER, toTileId: '2-8' });
    // a depot ($2,000) on the empty orchard 3-7 (3-8 has no depot site on seed 1)
    s = applyOrder(s, { kind: 'moveAndStartConstruction', nationId: N1, workerId: ENGINEER, toTileId: '3-7', structure: 'depot' });
    expect(scoreOf(s, N1)).toMatchObject({ jobsPaid: 3000, points: { workInProgress: 30 } });
    expect(scoreOf(s, N2).points.workInProgress).toBe(0);
    // run the turns until the development has finished: its 10 points of work become level 2's 10
    let turns = 0;
    while (s.map.tiles.flat().some(t => t.developmentJob?.workerId === FARMER) && turns < 10) {
      s = resolveTurn(s, {}, s.seed).state;
      turns++;
    }
    const farm = s.map.tiles.flat().find(t => t.id === '2-8')!;
    expect(farm.resource?.level).toBe(2);
    expect(scoreOf(s, N1).points.development).toBe(60);
    // M12 review (F5): read from the depot itself, not from the job the score reads: 20 points while the depot is not
    // built, none once it stands (a finished structure has no points of its own: the drop is an open decision)
    const depotBuilt = (g: GameState) => g.map.tiles.flat().find(t => t.id === '3-7')!.depot === true;
    expect(scoreOf(s, N1).points.workInProgress).toBe(depotBuilt(s) ? 0 : 20);
    while (!depotBuilt(s) && turns < 10) {
      expect(scoreOf(s, N1).points.workInProgress).toBe(20);
      s = resolveTurn(s, {}, s.seed).state;
      turns++;
    }
    expect(depotBuilt(s)).toBe(true);
    expect(scoreOf(s, N1).points.workInProgress).toBe(0);
  });

  it('FR-402 a rail job counts its terrain price: $150 is 1 point, $300 is 3', () => {
    const engineer = workerId(N1, WorkerType.Engineer);
    const rail = (terrain: TerrainType) => {
      const s = setTile(put(game(), engineer, T.farm1), T.farm1, { terrain, constructionJob: { workerId: engineer, kind: 'rail', startedOnTurn: 1, durationTurns: 1 } });
      return scoreOf(s, N1).points.workInProgress;
    };
    expect(rail(TerrainType.Tundra)).toBe(1);
    expect(rail(TerrainType.Swamp)).toBe(3);
  });
});


describe('FR-505 development in conquered provinces', () => {
  const start = newGame({ seed: 1, world: 'continent' });
  const taken = transferProvince(start, 'province-minor-1', N1);
  const home = scoreOf(start, N1);

  it('FR-505 Arvelia adds no development until its new owner collects it, including after loading a version-1 province', () => {
    const legacy = { ...taken, provinces: taken.provinces.map(({ id, name, seatTileId, ownerId, tileIds }) =>
      ({ id, name, seatTileId, ownerId, tileIds })) };
    expect(scoreOf(deepFreeze(legacy), N1)).toMatchObject({
      // FR-517: 11 -> 10 uncollected levels. Arvelia's cotton at 10-5 became an undeveloped ranch.
      developedLevels: home.developedLevels, points: { development: home.points.development }, uncollectedConqueredLevels: 10,
    });
  });

  it('FR-505 a collecting depot or port restores only the levels it reaches, and only while active', () => {
    for (const kind of ['depots', 'ports'] as const) {
      for (const isActive of [true, false]) {
        const network = { graph: {}, depots: [], ports: [], [kind]: [{ x: 11, y: 4, isActive }] };
        const connected = { ...taken, transportNetwork: { ...taken.transportNetwork, railroadNetworks: { [N1]: network } } };
        expect(scoreOf(connected, N1)).toMatchObject({
          // FR-517: 6 -> 5 levels (60 -> 50 points) next to this hub; 11 -> 10 when disconnected.
          developedLevels: home.developedLevels + (isActive ? 5 : 0),
          points: { development: home.points.development + (isActive ? 50 : 0) },
          uncollectedConqueredLevels: isActive ? 5 : 10,
        });
      }
    }
  });

  it('FR-505 recapturing home land restores its original score even without a collector', () => {
    const lost = transferProvince(start, 'province-nation-1-ne', N2);
    const restored = transferProvince(lost, 'province-nation-1-ne', N1);
    expect(scoreOf(restored, N1)).toEqual(home);
  });
});
