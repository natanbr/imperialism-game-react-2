import { developmentSystem } from '@/systems/developmentSystem';
import { initializeRailroadNetworks } from '@/systems/railroadSystem';
import { initWorld } from '@/testing/worldInit';
import { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { describe, expect, it } from 'vitest';
import { Nation } from '@/types/Nation';

// Deterministic RNG stub
const rng = { next: () => 0 }; // always pick first option

describe('developmentSystem', () => {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });

  // Set industry on each nation
  const nationsWithIndustry = nations.map(n => ({
    ...n,
  }));
  
  const baseState: GameState = {
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
    transportNetwork: { shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { oilDrillingTechUnlocked: false, technologies: [] },
    newsLog: [],
    turnOrder: { phases: [
      'diplomacy','trade','production','combat','interceptions','logistics'
    ] },
    difficulty: 'normal',
  };

  it('resolves prospector discovery after required turns', () => {
    // Put prospecting job on a mountains tile
    const mountains = baseState.map.tiles.flat().find(t => t.terrain === TerrainType.Mountains)!;
    const [mx, my] = [mountains.x, mountains.y];
    mountains.prospecting = { startedOnTurn: baseState.turn, workerId: 'w1' };

    const s2 = developmentSystem({ ...baseState, map: { ...baseState.map, tiles: baseState.map.tiles } }, rng);
    // Turn increment happens in orchestrator; here developmentSystem gets nextTurn = state.turn + 1
    const t2 = s2.map.tiles[my][mx];
    expect(t2.prospecting).toBeUndefined();
    expect(t2.resource).toBeDefined();
    expect(t2.resource?.discovered).toBe(true);
  });

  it('marks construction job complete and applies effect', () => {
    const railroadNetworks = initializeRailroadNetworks(baseState.map, baseState.nations as Nation[]);
    const state = {
      ...baseState,
      transportNetwork: { ...baseState.transportNetwork, railroadNetworks }
    };

    const capital = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
    const [cx, cy] = [capital.x, capital.y];
    state.map.tiles[cy][cx].constructionJob = { workerId: 'w1', kind: 'rail', startedOnTurn: state.turn, durationTurns: 1, completed: false };

    const s2 = developmentSystem(state, rng);
    const t2 = s2.map.tiles[cy][cx];
    expect(t2.constructionJob?.completed).toBe(true);
    // check that the railroad was added to the network
    expect(s2.transportNetwork.railroadNetworks!['nation-1'].graph[`${cx},${cy}`]).toBeDefined();
  });
});