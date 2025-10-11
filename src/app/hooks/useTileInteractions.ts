

import { Tile } from '@/types/Tile';
import { Worker, WorkerType } from '@/types/Workers';
import { useWorkerActions } from './useWorkerActions';
import { useGameStore } from '../store/rootStore';
import { useTileActions } from './useTileActions';

/**
 * Encapsulates tile click handling logic, using worker actions and game state.
 */

export function useTileInteractions(tile: Tile, selectedWorker: Worker | null) {
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const selectTile = useGameStore((s) => s.selectTile);
  const selectWorker = useGameStore((s) => s.selectWorker);
  const moveSelectedWorkerToTile = useGameStore((s) => s.moveSelectedWorkerToTile);
  const map = useGameStore((s) => s.map);
  const workerActions = useWorkerActions(tile);

  // Use the proper tile actions hook to get possible actions for the selected worker
  const possibleAction = useTileActions(tile, selectedWorker, map);

  function handleTileClick() {
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
            workerActions.startConstruction(selectedWorker.id, possibleAction.kind);
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
