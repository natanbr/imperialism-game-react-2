import { describe, it, expect } from 'vitest';
import { startConstruction } from './singleNationOrders';
import { workerJobLabel } from '@/components/gameText';
import { initWorld } from '@/testing/worldInit';
import { GameState } from '@/types/GameState';
import { Tile, TerrainType } from '@/types/Tile';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { ConstructionKind } from '@/types/jobs/ConstructionJob';

// 5x5 `initWorld` map: capital (0,0) with every worker. Valid sites away from the capital (FR-030):
// rail on the farm (1,0) next to it, depot and fort on the dry plains (2,0), port on the farm (2,4)
// next to the water at (1,4).
const SITE: Record<ConstructionKind, [number, number]> = { rail: [1, 0], depot: [2, 0], fort: [2, 0], port: [2, 4] };

function freshState(turn = 1): GameState {
  const { map, nations } = initWorld({ cols: 5, rows: 5 });
  return {
    turn,
    year: 1815,
    seed: 0,
    nations,
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
    difficulty: 'normal',
  };
}

const capitalOf = (state: GameState): Tile => state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;

/** Moves the capital's workers of these types onto (x, y) as available and unmoved (test setup). */
function workersOn(state: GameState, [x, y]: [number, number], types: WorkerType[]): GameState {
  const capital = capitalOf(state);
  const moving = capital.workers.filter(w => types.includes(w.type)).map(w => ({ ...w, assignedTileId: state.map.tiles[y][x].id }));
  const tiles = state.map.tiles.map(row => row.map(t => {
    if (t.id === capital.id) return { ...t, workers: t.workers.filter(w => !types.includes(w.type)) };
    if (t.x === x && t.y === y) return { ...t, workers: [...t.workers, ...moving] };
    return t;
  }));
  return { ...state, map: { ...state.map, tiles } };
}

function engineerAt(kind: ConstructionKind, turn = 1, others: WorkerType[] = []) {
  const state = workersOn(freshState(turn), SITE[kind], [WorkerType.Engineer, ...others]);
  const [x, y] = SITE[kind];
  const tile = state.map.tiles[y][x];
  const engineer = tile.workers.find(w => w.type === WorkerType.Engineer)!;
  return { state, tile, engineer };
}

describe('startConstruction order - Engineer Construction', () => {
  describe('startConstruction', () => {
    it.each(['depot', 'port', 'fort', 'rail'] as const)('FR-030 should start %s construction on a valid site', kind => {
      const { state, tile, engineer } = engineerAt(kind);

      const result = startConstruction(state, tile.id, engineer.id, kind);

      const updatedTile = result.map.tiles[tile.y][tile.x];
      expect(updatedTile.constructionJob).toBeDefined();
      expect(updatedTile.constructionJob?.kind).toBe(kind);
      expect(updatedTile.constructionJob?.workerId).toBe(engineer.id);
      expect(updatedTile.constructionJob?.startedOnTurn).toBe(1);
      expect(updatedTile.constructionJob?.durationTurns).toBeGreaterThan(0);

      const updatedWorker = updatedTile.workers.find(w => w.id === engineer.id)!;
      expect(updatedWorker.status).toBe(WorkerStatus.Working);
      expect(workerJobLabel(updatedTile, updatedWorker)).toBe(`Constructing ${kind}`);
    });

    it.each(['depot', 'port', 'fort', 'rail'] as const)('FR-030 should not start %s construction on the capital', kind => {
      const state = freshState();
      const capital = capitalOf(state);
      const engineer = capital.workers.find(w => w.type === WorkerType.Engineer)!;

      expect(startConstruction(state, capital.id, engineer.id, kind)).toBe(state);
    });

    it('should return unchanged state if tile does not exist', () => {
      const state = freshState();

      const result = startConstruction(state, 'invalid-tile-id', 'worker-1', 'depot');

      expect(result).toBe(state);
    });

    it('should return unchanged state if worker does not exist on tile', () => {
      const { state, tile } = engineerAt('depot');

      const result = startConstruction(state, tile.id, 'non-existent-worker', 'depot');

      expect(result).toBe(state);
    });

    it('should return unchanged state if worker is not an engineer', () => {
      const { state, tile } = engineerAt('depot', 1, [WorkerType.Prospector]);
      const prospector = tile.workers.find(w => w.type === WorkerType.Prospector)!;

      const result = startConstruction(state, tile.id, prospector.id, 'depot');

      expect(result).toBe(state);
    });

    it.each([WorkerStatus.Moved, WorkerStatus.Working])('should return unchanged state if worker status is %s', status => {
      const { state: base, tile, engineer } = engineerAt('depot');
      const state: GameState = {
        ...base,
        map: {
          ...base.map,
          tiles: base.map.tiles.map(row => row.map(t =>
            t.id === tile.id ? { ...t, workers: t.workers.map(w => (w.id === engineer.id ? { ...w, status } : w)) } : t
          )),
        },
      };

      const result = startConstruction(state, tile.id, engineer.id, 'depot');

      expect(result).toBe(state);
    });

    it('should create construction job with correct turn number', () => {
      const { state, tile, engineer } = engineerAt('depot', 10);

      const result = startConstruction(state, tile.id, engineer.id, 'depot');

      expect(result.map.tiles[tile.y][tile.x].constructionJob?.startedOnTurn).toBe(10);
    });

    it('should only update the specific tile with the engineer', () => {
      const { state, tile, engineer } = engineerAt('depot');

      const result = startConstruction(state, tile.id, engineer.id, 'depot');

      result.map.tiles.forEach((row, y) => {
        row.forEach((t, x) => {
          if (x === tile.x && y === tile.y) {
            expect(t.constructionJob).toBeDefined();
          } else {
            expect(t.constructionJob).toEqual(state.map.tiles[y][x].constructionJob);
          }
        });
      });
    });

    it('should maintain other tile properties when adding construction job', () => {
      const { state, tile, engineer } = engineerAt('depot');

      const result = startConstruction(state, tile.id, engineer.id, 'depot');

      const updatedTile = result.map.tiles[tile.y][tile.x];
      expect(updatedTile.constructionJob).toBeDefined();
      expect(updatedTile.id).toBe(tile.id);
      expect(updatedTile.x).toBe(tile.x);
      expect(updatedTile.y).toBe(tile.y);
      expect(updatedTile.terrain).toBe(tile.terrain);
      expect(updatedTile.resource).toEqual(tile.resource);
      expect(updatedTile.ownerNationId).toBe(tile.ownerNationId);
    });

    it('should maintain other workers unchanged when one starts construction', () => {
      const { state, tile, engineer } = engineerAt('depot', 1, [WorkerType.Prospector]);
      const prospector = tile.workers.find(w => w.type === WorkerType.Prospector)!;

      const result = startConstruction(state, tile.id, engineer.id, 'depot');

      const updatedTile = result.map.tiles[tile.y][tile.x];
      expect(updatedTile.constructionJob?.workerId).toBe(engineer.id);
      const updatedProspector = updatedTile.workers.find(w => w.id === prospector.id)!;
      expect(updatedProspector.status).toBe(prospector.status);
      expect(workerJobLabel(updatedTile, updatedProspector)).toBe(workerJobLabel(tile, prospector));
    });
  });
});
