import { describe, it, expect } from 'vitest';
import { runTurnPhases } from '@/systems/runTurnPhases';
import { GameState } from '@/types/GameState';
import { initWorld } from '@/testing/worldInit';

function createState(): GameState {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  return {
    turn: 1,
    year: 1900,
    activeNationId: 'nation-1',
    nations,
    cities: [], armies: [], fleets: [],
    relations: [], treaties: [], tradePolicies: [], grants: [],
    map,
    transportNetwork: { railroads: [], shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    industry: { buildings: [], labour: { untrained: 0, trained: 0, expert: 0, availableThisTurn: 0 }, power: 0 },
    technologyState: { technologies: [], oilDrillingTechUnlocked: false },
    newsLog: [],
    turnOrder: { phases: [ 'diplomacy','trade','production','combat','interceptions','logistics' ] },
    difficulty: 'normal',
  };
}

describe('runTurnPhases', () => {
  it('returns a new state object and preserves map structure', () => {
    const s1 = createState();
    const s2 = runTurnPhases(s1, s1.turn + 1, { seed: s1.year + 1 });
    expect(s2).not.toBe(s1);
    // verify year incremented
    expect(s2.year).toBeGreaterThanOrEqual(s1.year);
    // verify map structure preserved
    expect(s2.map.tiles.length).toBe(s1.map.tiles.length);
    expect(s2.nations.length).toBe(s1.nations.length);
  });
});