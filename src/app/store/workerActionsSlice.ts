import { StateCreator } from 'zustand';
import { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import {
  cancelActionHelper,
  moveAndStartConstructionHelper,
  moveAndStartDevelopmentHelper,
  moveAndStartProspectingHelper,
  moveSelectedWorkerToTileHelper,
  startConstructionHelper,
  startDevelopmentHelper,
  startProspectingHelper,
} from './helpers/workerHelpers';

export interface WorkerActionsSlice {
  moveSelectedWorkerToTile: (targetTileId: string, selectedWorkerId: string) => void;
  startProspecting: (tileId: string, workerId: string) => void;
  startDevelopment: (
    tileId: string,
    workerId: string,
    workerType: WorkerType,
    targetLevel: 1 | 2 | 3
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
    set((state) => moveSelectedWorkerToTileHelper(state, targetTileId, selectedWorkerId)),

  startProspecting: (tileId, workerId) =>
    set((state) => startProspectingHelper(state, tileId, workerId)),

  startDevelopment: (tileId, workerId, workerType, targetLevel) =>
    set((state) => startDevelopmentHelper(state, tileId, workerId, workerType, targetLevel)),

  startConstruction: (tileId, workerId, kind) =>
    set((state) => startConstructionHelper(state, tileId, workerId, kind)),

  cancelAction: (tileId, workerId) =>
    set((state) => cancelActionHelper(state, tileId, workerId)),

  moveAndStartProspecting: (targetTileId, workerId) =>
    set((state) => moveAndStartProspectingHelper(state, targetTileId, workerId)),

  moveAndStartDevelopment: (targetTileId, workerId, workerType, targetLevel) =>
    set((state) => moveAndStartDevelopmentHelper(state, targetTileId, workerId, workerType, targetLevel)),

  moveAndStartConstruction: (targetTileId, workerId, kind) =>
    set((state) => moveAndStartConstructionHelper(state, targetTileId, workerId, kind)),
});