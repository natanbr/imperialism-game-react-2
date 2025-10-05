import { StateCreator } from 'zustand';
import { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import {
  cancelActionHelper,
  moveSelectedWorkerToTileHelper,
  startProspectingHelper,
  startDevelopmentHelper,
  startConstructionHelper,
  startDeveloperWork,
  startEngineerWork,
  startProspectorWork,
  moveWorker,
  moveAndStartWorkerJob,
} from './helpers/workerHelpers';

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
    workerId: string
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
    set((state) => moveSelectedWorkerToTileHelper(state, targetTileId, selectedWorkerId)),

  startProspecting: (tileId, workerId) =>
    set((state) => startProspectingHelper(state, tileId, workerId)),

  startDevelopment: (tileId, workerId, workerType) =>
    set((state) => startDevelopmentHelper(state, tileId, workerId, workerType)),

  startConstruction: (tileId, workerId) =>
    set((state) => startConstructionHelper(state, tileId, workerId)),

  cancelAction: (tileId, workerId) =>
    set((state) => cancelActionHelper(state, tileId, workerId)),

  moveAndStartProspecting: (targetTileId, workerId) =>
    set((state) => moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startProspectorWork)),

  moveAndStartDevelopment: (targetTileId, workerId) =>
    set((state) => moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startDeveloperWork)),

  moveAndStartConstruction: (targetTileId, workerId) =>
    set((state) => moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startEngineerWork)),
});