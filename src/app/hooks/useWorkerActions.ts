
import { Tile } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import { useGameStore } from '../store/rootStore';

/**
 * Encapsulates worker-related actions for a tile.
 * Returns a set of action functions for the selected worker and tile.
 */

type ConstructionKind = 'depot' | 'port' | 'fort' | 'rail';

export function useWorkerActions(tile: Tile) {
  const {
    startProspecting,
    moveAndStartProspecting,
    moveSelectedWorkerToTile,
    startDevelopment,
    moveAndStartDevelopment,
    startConstruction,
    moveAndStartConstruction,
    openConstructionModal,
  } = useGameStore();

  return {
    startProspecting: (workerId: string) => startProspecting(tile.id, workerId),
    moveAndStartProspecting: (workerId: string) => moveAndStartProspecting(tile.id, workerId),
    moveSelectedWorkerToTile: (workerId: string) => moveSelectedWorkerToTile(tile.id, workerId),
    startDevelopment: (workerId: string, workerType: WorkerType) => startDevelopment(tile.id, workerId, workerType),
  moveAndStartDevelopment: (workerId: string, workerType: WorkerType, level: 1 | 2 | 3) => moveAndStartDevelopment(tile.id, workerId, workerType, level),
    startConstruction: (workerId: string) => startConstruction(tile.id, workerId),
    moveAndStartConstruction: (workerId: string, kind: ConstructionKind) => moveAndStartConstruction(tile.id, workerId, kind),
    openConstructionModal: (workerId: string) => openConstructionModal(tile.id, workerId),
  };
}
