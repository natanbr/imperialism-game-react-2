import { StateCreator } from 'zustand';
import { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import {
  cancelActionHelper,
  moveSelectedWorkerToTileHelper,
  startProspectingHelper,
  startDevelopmentHelper,
  startConstructionHelper,
  startEngineerWork,
  startProspectorWork,
  moveWorker,
  moveAndStartWorkerJob,
  getStartDevelopmentFunction,
} from './helpers/workerHelpers';
import { handleEngineerMovement } from '@/workers/EngineerWorker';
import { parseTileIdToArray } from '@/utils/tileIdUtils';

export interface WorkerActionsSlice {
  moveSelectedWorkerToTile: (targetTileId: string, selectedWorkerId: string) => void;
  startProspecting: (tileId: string, workerId: string) => void;
  startDevelopment: (
    tileId: string,
    workerId: string,
    workerType: WorkerType
  ) => void;
  startConstruction: (
    tileId: string,
    workerId: string,
    kind: 'depot' | 'port' | 'fort' | 'rail'
  ) => void;
  cancelAction: (tileId: string, workerId: string) => void;
  moveAndStartProspecting: (targetTileId: string, workerId: string) => void,
  moveAndStartDevelopment: (
    targetTileId: string,
    workerId: string,
    workerType: WorkerType,
    targetLevel: 1 | 2 | 3
  ) => void,
  moveAndStartConstruction: (
    targetTileId: string,
    workerId: string,
    kind: 'depot' | 'port' | 'fort' | 'rail'
  ) => void,
}

export const createWorkerActionsSlice: StateCreator<GameState, [], [], WorkerActionsSlice> = (set) => ({
  moveSelectedWorkerToTile: (targetTileId, selectedWorkerId) =>
    set((state) => {
      // Find the worker to check its type
      let worker = null;
      let fromTile = null;
      for (let y = 0; y < state.map.config.rows; y++) {
        for (let x = 0; x < state.map.config.cols; x++) {
          const tile = state.map.tiles[y][x];
          const w = tile.workers.find((w) => w.id === selectedWorkerId);
          if (w) {
            worker = w;
            fromTile = tile;
            break;
          }
        }
        if (worker) break;
      }

      // If it's an engineer, try engineer-specific movement first
      if (worker && worker.type === WorkerType.Engineer && fromTile) {
        const [tx, ty] = parseTileIdToArray(targetTileId);
        const targetTile = state.map.tiles[ty]?.[tx];
        if (targetTile) {
          const engineerResult = handleEngineerMovement(state, fromTile, targetTile, worker);
          if (engineerResult) {
            return engineerResult;
          }
        }
      }

      // Fall back to generic movement for all other cases
      return moveSelectedWorkerToTileHelper(state, targetTileId, selectedWorkerId);
    }),

  startProspecting: (tileId, workerId) =>
    set((state) => startProspectingHelper(state, tileId, workerId)),

  startDevelopment: (tileId, workerId, workerType) =>
    set((state) => startDevelopmentHelper(state, tileId, workerId, workerType)),

  startConstruction: (tileId, workerId, kind) =>
    set((state) => startConstructionHelper(state, tileId, workerId, kind)),

  cancelAction: (tileId, workerId) =>
    set((state) => cancelActionHelper(state, tileId, workerId)),

  moveAndStartProspecting: (targetTileId, workerId) =>
    set((state) => moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startProspectorWork)),

  moveAndStartDevelopment: (targetTileId, workerId, workerType) => {
    // Find the worker to get their type if not provided
    let type = workerType;
    if (!type) {
      for (let y = 0; y < state.map.config.rows; y++) {
        for (let x = 0; x < state.map.config.cols; x++) {
          const tile = state.map.tiles[y][x];
          const worker = tile.workers.find((w) => w.id === workerId);
          if (worker) {
            type = worker.type;
            break;
          }
        }
        if (type) break;
      }
    }

    set((state) => {
      // Get worker type if not already determined
      let finalType = type;
      if (!finalType) {
        for (let y = 0; y < state.map.config.rows; y++) {
          for (let x = 0; x < state.map.config.cols; x++) {
            const tile = state.map.tiles[y][x];
            const worker = tile.workers.find((w) => w.id === workerId);
            if (worker) {
              finalType = worker.type;
              break;
            }
          }
          if (finalType) break;
        }
      }

      if (!finalType) return state;

      const startFunction = getStartDevelopmentFunction(finalType);
      return moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startFunction);
    });
  },

  moveAndStartConstruction: (targetTileId, workerId) =>
    set((state) => moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startEngineerWork)),
});