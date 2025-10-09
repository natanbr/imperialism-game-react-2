import { useCallback } from 'react';
import { Tile } from '@/types/Tile';
import { Worker } from '@/types/Workers';
import { PossibleAction } from '@/types/actions';
import { useGameStore } from '@/store/rootStore';

/**
 * Hook to create a click handler for a tile
 *
 * @param tile - The tile being clicked
 * @param selectedWorker - The currently selected worker (if any)
 * @param possibleAction - The possible action the worker can perform
 * @returns Click handler function
 */
export function useTileClickHandler(
  tile: Tile,
  selectedWorker: Worker | null,
  possibleAction: PossibleAction
) {
  const selectTile = useGameStore((s) => s.selectTile);
  const selectWorker = useGameStore((s) => s.selectWorker);
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const moveSelectedWorkerToTile = useGameStore((s) => s.moveSelectedWorkerToTile);

  return useCallback(() => {
    if (selectedWorker && possibleAction) {
      const isSameTile = selectedWorker.assignedTileId === tile.id;
      const {
        startProspecting,
        moveAndStartProspecting,
        moveSelectedWorkerToTile,
        startDevelopment,
        moveAndStartDevelopment,
        startConstruction,
        moveAndStartConstruction,
        openConstructionModal,
        selectWorker,
      } = useGameStore.getState();

      switch (possibleAction.type) {
        case 'prospect':
          if (isSameTile) {
            startProspecting(tile.id, selectedWorker.id);
          } else {
            moveAndStartProspecting(tile.id, selectedWorker.id);
          }
          break;
        case 'develop':
          if (isSameTile) {
            startDevelopment(tile.id, selectedWorker.id, possibleAction.workerType);
          } else {
            moveAndStartDevelopment(
              tile.id,
              selectedWorker.id,
              possibleAction.workerType,
              possibleAction.level
            );
          }
          break;
        case 'construct':
          if (isSameTile) {
            startConstruction(tile.id, selectedWorker.id);
          } else {
            moveAndStartConstruction(tile.id, selectedWorker.id, possibleAction.kind);
          }
          break;
        case 'open-construct-modal':
          if (isSameTile) {
            openConstructionModal(tile.id, selectedWorker.id);
          } else {
            moveSelectedWorkerToTile(tile.id, selectedWorker.id);
          }
          selectWorker(undefined);
          selectTile(tile.id);
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
  }, [tile, selectedWorker, possibleAction, selectedWorkerId, selectTile, selectWorker, moveSelectedWorkerToTile]);
}
