import { developmentSystem } from '@/systems/developmentSystem';
import { initWorld } from '@/testing/worldInit';
import { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { describe, expect, it } from 'vitest';

// Deterministic RNG stub
const rng = { next: () => 0 }; // always pick first option

describe('developmentSystem', () => {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });

  const baseState: GameState = {
    turn: 1,
    year: 1900,
    activeNationId: 'nation-1',
    nations,
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
    industry: { buildings: [], labour: { untrained: 0, trained: 0, expert: 0, availableThisTurn: 0 }, power: 0 },
    technologyState: { technologies: [], oilDrillingTechUnlocked: false },
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
    // deterministic rng picks first from [Coal, Iron, Gold, Gems] => Coal
    expect(t2.resource?.type).toBe('coal');
    expect(t2.resource?.discovered).toBe(true);
  });

  it('marks construction job complete and applies effect', () => {
    const capital = baseState.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
    const [cx, cy] = [capital.x, capital.y];
    capital.constructionJob = { kind: 'rail', startedOnTurn: baseState.turn, durationTurns: 1, completed: false };

    const s2 = developmentSystem(baseState, rng);
    const t2 = s2.map.tiles[cy][cx];
    expect(t2.constructionJob?.completed).toBe(true);
    expect(t2.connected).toBe(true);
  });
});