import { describe, it, expect } from 'vitest';
import { startConstructionHelper } from '@/store/helpers/workerHelpers';
import { initWorld } from '@/testing/worldInit';
import { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { parseTileIdToArray } from '@/utils/tileIdUtils';

describe('workerHelpers - Engineer Construction', () => {
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
    transportNetwork: { shippingLanes: [], capacity: 0 },
    tradeRoutes: [],
    technologyState: { oilDrillingTechUnlocked: false, technologies: [] },
    newsLog: [],
    turnOrder: { phases: ['diplomacy', 'trade', 'production', 'combat', 'interceptions', 'logistics'] },
    difficulty: 'normal',
  };

  describe('startConstructionHelper', () => {
    it('should start depot construction when kind is depot', () => {
      const state = { ...baseState };

      // Find capital tile with engineer
      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'depot');

      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const updatedTile = result.map.tiles[cy][cx];

      expect(updatedTile.constructionJob).toBeDefined();
      expect(updatedTile.constructionJob?.kind).toBe('depot');
      expect(updatedTile.constructionJob?.workerId).toBe(engineer.id);
      expect(updatedTile.constructionJob?.startedOnTurn).toBe(1);
      expect(updatedTile.constructionJob?.durationTurns).toBeGreaterThan(0);

      const updatedWorker = updatedTile.workers.find(w => w.id === engineer.id)!;
      expect(updatedWorker.status).toBe(WorkerStatus.Working);
      expect(updatedWorker.jobDescription).toBe('Constructing depot');
    });

    it('should start port construction when kind is port', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'port');

      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const updatedTile = result.map.tiles[cy][cx];

      expect(updatedTile.constructionJob).toBeDefined();
      expect(updatedTile.constructionJob?.kind).toBe('port');
      expect(updatedTile.constructionJob?.workerId).toBe(engineer.id);

      const updatedWorker = updatedTile.workers.find(w => w.id === engineer.id)!;
      expect(updatedWorker.status).toBe(WorkerStatus.Working);
      expect(updatedWorker.jobDescription).toBe('Constructing port');
    });

    it('should start fort construction when kind is fort', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'fort');

      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const updatedTile = result.map.tiles[cy][cx];

      expect(updatedTile.constructionJob).toBeDefined();
      expect(updatedTile.constructionJob?.kind).toBe('fort');
      expect(updatedTile.constructionJob?.workerId).toBe(engineer.id);

      const updatedWorker = updatedTile.workers.find(w => w.id === engineer.id)!;
      expect(updatedWorker.status).toBe(WorkerStatus.Working);
      expect(updatedWorker.jobDescription).toBe('Constructing fort');
    });

    it('should start rail construction when kind is rail', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'rail');

      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const updatedTile = result.map.tiles[cy][cx];

      expect(updatedTile.constructionJob).toBeDefined();
      expect(updatedTile.constructionJob?.kind).toBe('rail');
      expect(updatedTile.constructionJob?.workerId).toBe(engineer.id);

      const updatedWorker = updatedTile.workers.find(w => w.id === engineer.id)!;
      expect(updatedWorker.status).toBe(WorkerStatus.Working);
      expect(updatedWorker.jobDescription).toBe('Constructing rail');
    });

    it('should return unchanged state if tile does not exist', () => {
      const state = { ...baseState };

      const result = startConstructionHelper(state, 'invalid-tile-id', 'worker-1', 'depot');

      expect(result).toBe(state);
    });

    it('should return unchanged state if worker does not exist on tile', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;

      const result = startConstructionHelper(state, capitalTile.id, 'non-existent-worker', 'depot');

      expect(result).toBe(state);
    });

    it('should return unchanged state if worker is not an engineer', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const prospector = capitalTile.workers.find(w => w.type === WorkerType.Prospector)!;

      const result = startConstructionHelper(state, capitalTile.id, prospector.id, 'depot');

      expect(result).toBe(state);
    });

    it('should return unchanged state if worker status is not Available', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      // Set engineer status to Moved
      state.map.tiles[cy][cx] = {
        ...capitalTile,
        workers: capitalTile.workers.map(w =>
          w.id === engineer.id ? { ...w, status: WorkerStatus.Moved } : w
        ),
      };

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'depot');

      expect(result).toBe(state);
    });

    it('should return unchanged state if worker status is Working', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      // Set engineer status to Working
      state.map.tiles[cy][cx] = {
        ...capitalTile,
        workers: capitalTile.workers.map(w =>
          w.id === engineer.id ? { ...w, status: WorkerStatus.Working } : w
        ),
      };

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'depot');

      expect(result).toBe(state);
    });

    it('should create construction job with correct turn number', () => {
      // Create a fresh copy of the state with a different turn number
      const { map: freshMap, nations: freshNations } = initWorld({ cols: 5, rows: 5 });
      const state: GameState = {
        ...baseState,
        turn: 10,
        map: freshMap,
        nations: freshNations,
      };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'depot');

      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const updatedTile = result.map.tiles[cy][cx];

      expect(updatedTile.constructionJob?.startedOnTurn).toBe(10);
    });

    it('should only update the specific tile with the engineer', () => {
      // Create a fresh copy to avoid state mutation issues
      const { map: freshMap, nations: freshNations } = initWorld({ cols: 5, rows: 5 });
      const state: GameState = {
        ...baseState,
        map: freshMap,
        nations: freshNations,
      };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'depot');

      // Check that other tiles remain unchanged
      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      result.map.tiles.forEach((row, y) => {
        row.forEach((tile, x) => {
          if (x === cx && y === cy) {
            // This is the updated tile, should have construction job
            expect(tile.constructionJob).toBeDefined();
          } else {
            // Other tiles should not have construction jobs from this action
            const originalTile = state.map.tiles[y][x];
            expect(tile.constructionJob).toEqual(originalTile.constructionJob);
          }
        });
      });
    });

    it('should maintain other tile properties when adding construction job', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'depot');

      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const updatedTile = result.map.tiles[cy][cx];

      // Check that original properties are preserved
      expect(updatedTile.id).toBe(capitalTile.id);
      expect(updatedTile.x).toBe(capitalTile.x);
      expect(updatedTile.y).toBe(capitalTile.y);
      expect(updatedTile.terrain).toBe(capitalTile.terrain);
      expect(updatedTile.resource).toEqual(capitalTile.resource);
      expect(updatedTile.ownerNationId).toBe(capitalTile.ownerNationId);
    });

    it('should maintain other workers unchanged when one starts construction', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const engineer = capitalTile.workers.find(w => w.type === WorkerType.Engineer)!;
      const prospector = capitalTile.workers.find(w => w.type === WorkerType.Prospector)!;

      const result = startConstructionHelper(state, capitalTile.id, engineer.id, 'depot');

      const [cx, cy] = parseTileIdToArray(capitalTile.id);
      const updatedTile = result.map.tiles[cy][cx];

      const updatedProspector = updatedTile.workers.find(w => w.id === prospector.id)!;

      // Prospector should remain unchanged
      expect(updatedProspector.status).toBe(prospector.status);
      expect(updatedProspector.jobDescription).toBe(prospector.jobDescription);
    });
  });
});
