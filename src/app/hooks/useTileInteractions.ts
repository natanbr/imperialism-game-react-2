

import { Tile } from '@/types/Tile';
import { Worker, WorkerType } from '@/types/Workers';
import { useWorkerActions } from './useWorkerActions';
import { useGameStore } from '../store/rootStore';

/**
 * Encapsulates tile click handling logic, using worker actions and game state.
 */

export function useTileInteractions(tile: Tile, selectedWorker: Worker | null) {
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const selectTile = useGameStore((s) => s.selectTile);
  const selectWorker = useGameStore((s) => s.selectWorker);
  const moveSelectedWorkerToTile = useGameStore((s) => s.moveSelectedWorkerToTile);
  const workerActions = useWorkerActions(tile);

  // Define a type for possibleAction to avoid property errors
  type PossibleAction =
    | { type: 'prospect' }
    | { type: 'develop'; workerType: WorkerType; level: 1 | 2 | 3 }
    | { type: 'construct'; kind: 'depot' | 'port' | 'fort' | 'rail' }
    | { type: 'open-construct-modal' };

  // Stub for getPossibleAction
  function getPossibleAction(): PossibleAction | null {
    // TODO: Implement or import real logic
    // For testing, return a dummy action (replace with real logic)
    return null;
  }

  function handleTileClick() {
    let workerForAction = selectedWorker;
    if (selectedWorker) {
      const tileWorker = tile.workers.find(w => w.id === selectedWorker.id);
      if (tileWorker) workerForAction = tileWorker;
    }
  const possibleAction = getPossibleAction();
    if (selectedWorker && possibleAction) {
      const isSameTile = selectedWorker.assignedTileId === tile.id;
      switch (possibleAction.type) {
        case 'prospect':
          if (isSameTile) {
            workerActions.startProspecting(selectedWorker.id);
          } else {
            workerActions.moveAndStartProspecting(selectedWorker.id);
          }
          break;
        case 'develop':
          if (isSameTile) {
            workerActions.startDevelopment(selectedWorker.id, possibleAction.workerType);
          } else {
            workerActions.moveAndStartDevelopment(selectedWorker.id, possibleAction.workerType, possibleAction.level);
          }
          break;
        case 'construct':
          if (isSameTile) {
            workerActions.startConstruction(selectedWorker.id);
          } else {
            workerActions.moveAndStartConstruction(selectedWorker.id, possibleAction.kind);
          }
          break;
        case 'open-construct-modal':
          if (isSameTile) {
            workerActions.openConstructionModal(selectedWorker.id);
          } else {
            workerActions.moveSelectedWorkerToTile(selectedWorker.id);
          }
          return;
      }
      selectWorker(undefined);
  selectTile(tile.id);
    } else if (selectedWorkerId) {
      moveSelectedWorkerToTile(tile.id, selectedWorkerId);
  selectTile(tile.id);
    } else {
  selectTile(tile.id);
    }
  }

  return { handleTileClick };
}
