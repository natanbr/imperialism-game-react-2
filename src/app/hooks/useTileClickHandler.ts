import { useCallback } from 'react';
import { Tile } from '@/types/Tile';
import { Worker } from '@/types/Workers';
import { PossibleAction } from '@/types/actions';
import { useGameStore } from '@/store/rootStore';
import { moveOrders, submitFirstAccepted, tileClickOrders } from './tileClickOrders';

/**
 * Click handler for a tile. A tile of another nation is only selected for viewing (FR-108). With a
 * worker selected, the click becomes orders (see tileClickOrders) sent through the store's
 * submitOrder; otherwise it selects the tile.
 *
 * @param tile - The tile being clicked
 * @param selectedWorker - The currently selected worker (if any)
 * @param possibleAction - The action the selected worker can perform on this tile
 */
export function useTileClickHandler(
  tile: Tile,
  selectedWorker: Worker | null,
  possibleAction: PossibleAction
) {
  return useCallback(() => {
    const {
      game,
      activeNationId,
      submitOrder,
      selectedWorkerId,
      openConstructionModal,
      selectWorker,
      selectTile,
    } = useGameStore.getState();

    // Another nation's tile is only viewed (FR-108): no order, so no refusal in the news
    if (tile.ownerNationId && tile.ownerNationId !== activeNationId) {
      selectTile(tile.id);
      return;
    }

    if (selectedWorker && possibleAction) {
      if (possibleAction.type === 'open-construct-modal' && selectedWorker.assignedTileId === tile.id) {
        openConstructionModal(tile.id, selectedWorker.id);
      } else {
        submitFirstAccepted(submitOrder, tileClickOrders(game, activeNationId, selectedWorker.id, tile.id, possibleAction));
      }
      selectWorker(undefined);
      selectTile(tile.id);
    } else if (selectedWorkerId) {
      submitFirstAccepted(submitOrder, moveOrders(game, activeNationId, selectedWorkerId, tile.id));
      selectTile(tile.id);
    } else {
      selectTile(tile.id);
    }
  }, [tile, selectedWorker, possibleAction]);
}
