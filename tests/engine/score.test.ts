// FR-067: the score, a pure query over the state.
import { describe, it, expect } from 'vitest';
import { scoreOf, scoreTable } from '@/engine/score/score';
import { SCORE_WEIGHTS } from '@/definisions/scoreWeights';
import { ResourceType } from '@/types/Resource';
import { deepFreeze, game, N1, N2, setBuilding, setTile, setTreasury, T } from './fixtures';

// The two-nation fixture: each nation has the six mills and factories (mills 2, factories 1:
// 9 capacity points) and three level-1 tiles (an orchard next to the capital, another orchard and
// the dry plains); nation-1 has $10,000 and nation-2 $8,000.

describe('FR-067 score', () => {
  it('FR-067 weights: 1 point per $100, 10 per capacity point, 10 per resource level', () => {
    expect(SCORE_WEIGHTS).toEqual({ dollarsPerPoint: 100, pointsPerCapacity: 10, pointsPerLevel: 10 });
  });

  it('FR-067 a fixture nation at the start scores 100 + 90 + 30 = 220, with the parts', () => {
    const state = deepFreeze(game());
    const snapshot = structuredClone(state);

    expect(scoreOf(state, N1)).toEqual({
      nationId: N1,
      treasury: 10000,
      capacity: 9,
      developedLevels: 3,
      points: { treasury: 100, industry: 90, development: 30 },
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
      nationId: 'nation-9', treasury: 0, capacity: 0, developedLevels: 0,
      points: { treasury: 0, industry: 0, development: 0 }, total: 0,
    });
  });

  it('FR-067 the score table ranks every nation by total, ties in nation order', () => {
    expect(scoreTable(game()).map(s => [s.nationId, s.total])).toEqual([[N1, 220], [N2, 200]]);
    expect(scoreTable(setTreasury(game(), N2, 10000)).map(s => [s.nationId, s.total])).toEqual([[N1, 220], [N2, 220]]);
    expect(scoreTable(setTreasury(game(), N2, 20000)).map(s => [s.nationId, s.total])).toEqual([[N2, 320], [N1, 220]]);
  });
});
