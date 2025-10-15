import { describe, it, expect } from 'vitest';
import { startDevelopmentHelper, moveAndStartDevelopmentHelper } from '@/store/helpers/workerHelpers';
import { initWorld } from '@/testing/worldInit';
import { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { parseTileIdToArray } from '@/utils/tileIdUtils';
import { ResourceType } from '@/types/Resource';
import { startMinerWork } from '@/workers/MinerWorker';
import { getMinerActions } from '@/workers/MinerWorker';

describe('Miner Worker Functionality', () => {
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

  describe('Resource Discovery Validation', () => {
    it('should NOT allow miner to start development on undiscovered resource', () => {
      const state = { ...baseState };

      // Find a mountains/barren hills tile with undiscovered resource
      const mineralTile = state.map.tiles.flat().find(
        t => (t.terrain === TerrainType.BarrenHills || t.terrain === TerrainType.Mountains) &&
             t.resource?.discovered === false
      )!;
      expect(mineralTile).toBeDefined();
      expect(mineralTile.resource?.discovered).toBe(false);

      const [mx, my] = parseTileIdToArray(mineralTile.id);

      // Place a miner on this tile
      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: mineralTile.id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...mineralTile,
        workers: [miner],
      };

      // Try to start development - should return unchanged state
      const result = startDevelopmentHelper(state, mineralTile.id, miner.id, WorkerType.Miner);

      // State should be unchanged (no development job created)
      expect(result).toBe(state);
      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob).toBeUndefined();
    });

    it('should allow miner to start development on discovered resource', () => {
      const state = { ...baseState };

      // Find a mountains/barren hills tile
      const mineralTile = state.map.tiles.flat().find(
        t => (t.terrain === TerrainType.BarrenHills || t.terrain === TerrainType.Mountains)
      )!;
      expect(mineralTile).toBeDefined();

      const [mx, my] = parseTileIdToArray(mineralTile.id);

      // Set resource as discovered
      state.map.tiles[my][mx] = {
        ...mineralTile,
        resource: {
          type: ResourceType.Coal,
          level: 0,
          discovered: true, // Resource has been prospected
        },
      };

      // Place a miner on this tile
      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      // Start development - should succeed
      const result = startDevelopmentHelper(state, state.map.tiles[my][mx].id, miner.id, WorkerType.Miner);

      // Development job should be created
      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob).toBeDefined();
      expect(resultTile.developmentJob?.workerId).toBe(miner.id);
      expect(resultTile.developmentJob?.workerType).toBe(WorkerType.Miner);
      expect(resultTile.developmentJob?.targetLevel).toBe(1);

      // Worker should be marked as Working
      const resultWorker = resultTile.workers.find(w => w.id === miner.id)!;
      expect(resultWorker.status).toBe(WorkerStatus.Working);
      expect(resultWorker.jobDescription).toContain('Mining');
    });

    it('should NOT allow miner to start on tile without resource', () => {
      const state = { ...baseState };

      // Find a mountains tile and remove its resource
      const mineralTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.BarrenHills
      )!;
      const [mx, my] = parseTileIdToArray(mineralTile.id);

      state.map.tiles[my][mx] = {
        ...mineralTile,
        resource: undefined, // No resource at all
      };

      // Place a miner on this tile
      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      // Try to start development - should fail
      const result = startDevelopmentHelper(state, state.map.tiles[my][mx].id, miner.id, WorkerType.Miner);

      // State should be unchanged
      expect(result).toBe(state);
    });
  });

  describe('Sequential Level Development (1, 2, 3)', () => {
    it('should develop mine from level 0 to level 1', () => {
      const state = { ...baseState };

      const mineralTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains
      )!;
      const [mx, my] = parseTileIdToArray(mineralTile.id);

      state.map.tiles[my][mx] = {
        ...mineralTile,
        resource: { type: ResourceType.IronOre, level: 0, discovered: true },
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      const result = startDevelopmentHelper(state, state.map.tiles[my][mx].id, miner.id, WorkerType.Miner);

      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob?.targetLevel).toBe(1);
    });

    it('should develop mine from level 1 to level 2', () => {
      const state = { ...baseState };

      const mineralTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains
      )!;
      const [mx, my] = parseTileIdToArray(mineralTile.id);

      state.map.tiles[my][mx] = {
        ...mineralTile,
        resource: { type: ResourceType.IronOre, level: 1, discovered: true },
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      const result = startDevelopmentHelper(state, state.map.tiles[my][mx].id, miner.id, WorkerType.Miner);

      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob?.targetLevel).toBe(2);
    });

    it('should develop mine from level 2 to level 3', () => {
      const state = { ...baseState };

      const mineralTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains
      )!;
      const [mx, my] = parseTileIdToArray(mineralTile.id);

      state.map.tiles[my][mx] = {
        ...mineralTile,
        resource: { type: ResourceType.IronOre, level: 2, discovered: true },
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      const result = startDevelopmentHelper(state, state.map.tiles[my][mx].id, miner.id, WorkerType.Miner);

      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob?.targetLevel).toBe(3);
    });

    it('should NOT allow development beyond level 3', () => {
      const state = { ...baseState };

      const mineralTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains
      )!;
      const [mx, my] = parseTileIdToArray(mineralTile.id);

      state.map.tiles[my][mx] = {
        ...mineralTile,
        resource: { type: ResourceType.IronOre, level: 3, discovered: true },
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      const result = startDevelopmentHelper(state, state.map.tiles[my][mx].id, miner.id, WorkerType.Miner);

      // State should be unchanged
      expect(result).toBe(state);
      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob).toBeUndefined();
    });
  });

  describe('Move and Start Functionality', () => {
    it('should move miner to discovered resource tile and start mining', () => {
      const state = { ...baseState };

      // Find capital tile where miner starts
      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const miner = capitalTile.workers.find(w => w.type === WorkerType.Miner)!;
      expect(miner).toBeDefined();

      // Find a nearby mountains tile with discovered resource
      const mineralTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains && t.id !== capitalTile.id
      )!;
      const [mx, my] = parseTileIdToArray(mineralTile.id);

      // Set resource as discovered
      state.map.tiles[my][mx] = {
        ...mineralTile,
        resource: { type: ResourceType.Coal, level: 0, discovered: true },
      };

      // Move and start development
      const result = moveAndStartDevelopmentHelper(state, mineralTile.id, miner.id, WorkerType.Miner);

      // Check that miner moved to target tile
      const resultTile = result.map.tiles[my][mx];
      const movedMiner = resultTile.workers.find(w => w.id === miner.id);
      expect(movedMiner).toBeDefined();

      // Check that development job was created
      expect(resultTile.developmentJob).toBeDefined();
      // The development job is created by the first available miner on the tile
      // which is the miner we just moved
      expect(resultTile.developmentJob?.workerType).toBe(WorkerType.Miner);
      expect(resultTile.developmentJob?.targetLevel).toBe(1);

      // Check that a worker with Working status exists
      const workingMiner = resultTile.workers.find(w => w.status === WorkerStatus.Working);
      expect(workingMiner).toBeDefined();
      expect(workingMiner?.type).toBe(WorkerType.Miner);
    });

    it('should NOT start mining when moving to undiscovered resource tile', () => {
      const state = { ...baseState };

      const capitalTile = state.map.tiles.flat().find(t => t.terrain === TerrainType.Capital)!;
      const miner = capitalTile.workers.find(w => w.type === WorkerType.Miner)!;

      // Find a mountains tile with undiscovered resource
      const mineralTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains && t.resource?.discovered === false
      )!;
      expect(mineralTile.resource?.discovered).toBe(false);

      // Try to move and start development
      const result = moveAndStartDevelopmentHelper(state, mineralTile.id, miner.id, WorkerType.Miner);

      const [mx, my] = parseTileIdToArray(mineralTile.id);
      const resultTile = result.map.tiles[my][mx];

      // Miner should have moved but NOT started working
      const movedMiner = resultTile.workers.find(w => w.id === miner.id);
      expect(movedMiner).toBeDefined();

      // No development job should be created
      expect(resultTile.developmentJob).toBeUndefined();

      // Worker should be Available (not Working)
      expect(movedMiner?.status).toBe(WorkerStatus.Available);
    });
  });

  describe('startMinerWork Factory Function', () => {
    it('should use startMinerWork to create development job', () => {
      const state = { ...baseState };

      const mineralTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.BarrenHills
      )!;
      const [mx, my] = parseTileIdToArray(mineralTile.id);

      state.map.tiles[my][mx] = {
        ...mineralTile,
        resource: { type: ResourceType.Coal, level: 0, discovered: true },
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      // Use the factory function directly
      const result = startMinerWork(state);

      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob).toBeDefined();
      expect(resultTile.developmentJob?.workerType).toBe(WorkerType.Miner);
      expect(resultTile.developmentJob?.targetLevel).toBe(1);

      const resultWorker = resultTile.workers.find(w => w.id === miner.id)!;
      expect(resultWorker.status).toBe(WorkerStatus.Working);
      expect(resultWorker.jobDescription).toBe('Mining to level 1');
    });
  });

  describe('getMinerActions for UI', () => {
    it('should return develop action for discovered resource', () => {
      const mineralTile = map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains
      )!;

      const tileWithDiscoveredResource = {
        ...mineralTile,
        resource: { type: ResourceType.IronOre, level: 0, discovered: true },
        ownerNationId: 'nation-1',
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: tileWithDiscoveredResource.id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      const action = getMinerActions(tileWithDiscoveredResource, map, miner);

      expect(action).not.toBeNull();
      expect(action?.type).toBe('develop');
      if (action?.type === 'develop') {
        expect(action.workerType).toBe(WorkerType.Miner);
        expect(action.level).toBe(1);
      }
    });

    it('should return null for undiscovered resource', () => {
      const mineralTile = map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains && t.resource?.discovered === false
      )!;

      const tileWithUndiscoveredResource = {
        ...mineralTile,
        ownerNationId: 'nation-1',
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: tileWithUndiscoveredResource.id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      const action = getMinerActions(tileWithUndiscoveredResource, map, miner);

      expect(action).toBeNull();
    });

    it('should return null when worker is not Available', () => {
      const mineralTile = map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains
      )!;

      const tileWithDiscoveredResource = {
        ...mineralTile,
        resource: { type: ResourceType.Coal, level: 0, discovered: true },
        ownerNationId: 'nation-1',
      };

      const workingMiner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: tileWithDiscoveredResource.id,
        efficiency: 100,
        status: WorkerStatus.Working,
        justMoved: false,
      };

      const action = getMinerActions(tileWithDiscoveredResource, map, workingMiner);

      expect(action).toBeNull();
    });
  });

  describe('Miner Terrain Restrictions', () => {
    it('should work on BarrenHills terrain', () => {
      const state = { ...baseState };

      const barrenHillsTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.BarrenHills
      )!;
      expect(barrenHillsTile).toBeDefined();

      const [mx, my] = parseTileIdToArray(barrenHillsTile.id);
      state.map.tiles[my][mx] = {
        ...barrenHillsTile,
        resource: { type: ResourceType.Coal, level: 0, discovered: true },
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      const result = startDevelopmentHelper(state, state.map.tiles[my][mx].id, miner.id, WorkerType.Miner);

      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob).toBeDefined();
    });

    it('should work on Mountains terrain', () => {
      const state = { ...baseState };

      const mountainsTile = state.map.tiles.flat().find(
        t => t.terrain === TerrainType.Mountains
      )!;
      expect(mountainsTile).toBeDefined();

      const [mx, my] = parseTileIdToArray(mountainsTile.id);
      state.map.tiles[my][mx] = {
        ...mountainsTile,
        resource: { type: ResourceType.IronOre, level: 0, discovered: true },
      };

      const miner = {
        id: 'test-miner-1',
        type: WorkerType.Miner,
        nationId: 'nation-1',
        assignedTileId: state.map.tiles[my][mx].id,
        efficiency: 100,
        status: WorkerStatus.Available,
        justMoved: false,
      };

      state.map.tiles[my][mx] = {
        ...state.map.tiles[my][mx],
        workers: [miner],
      };

      const result = startDevelopmentHelper(state, state.map.tiles[my][mx].id, miner.id, WorkerType.Miner);

      const resultTile = result.map.tiles[my][mx];
      expect(resultTile.developmentJob).toBeDefined();
    });
  });
});
