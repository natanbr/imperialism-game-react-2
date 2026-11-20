import { useCallback } from 'react';
import { countryOfTile } from '@/engine';
import { Tile } from '@/types/Tile';
import { Worker } from '@/types/Workers';
import { PossibleAction } from '@/types/actions';
import { useGameStore } from '@/store/rootStore';
import { attackPlanAt } from '@/components/army/attackView';
import { clickStatusText, moveOrders, notNextToText, spendAskOf, submitFirstAccepted, tileClickOrders } from './tileClickOrders';

/**
 * Click handler for a tile. A tile of another country is only selected for viewing (FR-108, FR-155). With a
 * worker selected, the click becomes orders (see tileClickOrders) sent through the store's
 * submitOrder; otherwise it selects the tile. A map click takes the map's status line away; a refused click, or
 * one whose job was refused and whose move was made, puts its own there (FR-373, FR-374). A job of $1,000 or more asks
 * first (FR-383): the civilian stays selected until the player answers, and ConfirmSpend sends it on Spend.
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
      armySelection,
      askSpend,
      clearArmySelection,
      openAttack,
      showMapStatus,
      clearMapStatus,
    } = useGameStore.getState();
    clearMapStatus();
    const say = (text: string | undefined) => {
      if (text) showMapStatus(text);
    };

    // FR-230: with regiments of ours selected, a tile of a bordering enemy province opens the Attack screen (no order
    // yet: its Attack button orders it); FR-373: another country's province they do not border is said, and the
    // selection stays; any other tile drops the selection and is clicked as usual
    if (armySelection) {
      const plan = tile.provinceId ? attackPlanAt(game, activeNationId, armySelection, tile.provinceId) : undefined;
      if (plan) {
        openAttack(plan);
        selectTile(tile.id);
        return;
      }
      const notNext = tile.provinceId ? notNextToText(game, activeNationId, armySelection, tile.provinceId) : undefined;
      if (notNext) {
        showMapStatus(notNext);
        return;
      }
      clearArmySelection();
    }

    if (selectedWorker?.pendingDisband) {
      selectWorker(undefined);
      selectTile(tile.id);
      return;
    }

    // Another country's tile, a Great Power's or a minor nation's, is only viewed (FR-108, FR-155):
    // no order, so no refusal in the news
    const country = countryOfTile(game, tile);
    if (country && country !== activeNationId) {
      selectTile(tile.id);
      return;
    }

    if (selectedWorker && possibleAction) {
      if (possibleAction.type === 'open-construct-modal' && selectedWorker.assignedTileId === tile.id) {
        openConstructionModal(tile.id, selectedWorker.id);
      } else {
        const orders = tileClickOrders(game, activeNationId, selectedWorker.id, tile.id, possibleAction);
        const ask = spendAskOf(game, orders, tile.id);
        if (ask) {
          askSpend(ask);
          return;
        }
        say(clickStatusText(game, submitFirstAccepted(submitOrder, orders)));
      }
      selectWorker(undefined);
      selectTile(tile.id);
    } else if (selectedWorkerId) {
      const outcome = submitFirstAccepted(submitOrder, moveOrders(game, activeNationId, selectedWorkerId, tile.id));
      say(clickStatusText(game, outcome));
      // FR-384: an accepted move ends the civilian selection, as after a job, so the next click only selects a tile; a
      // refused one keeps it, so the player can click elsewhere
      if (outcome?.last.ok) selectWorker(undefined);
      selectTile(tile.id);
    } else {
      selectTile(tile.id);
    }
  }, [tile, selectedWorker, possibleAction]);
}
