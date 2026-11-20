import { Nation } from '@/types/Nation';
import { Tile } from '@/types/Tile';
import { Worker } from '@/types/Workers';
import { createSelector } from 'reselect';
import { completedTileIds } from '@/components/gameText';
import { attackArrows, marchArrows, markersBySeat } from '@/components/army/armyView';
import { foodForecast, scoreOf, scoreTable, upkeepForecast } from '@/engine';
import { clickCursors } from '@/hooks/tileClickOrders';
import { GameStore } from './rootStore';

const selectNations = (state: GameStore) => state.game.nations;
const selectActiveNationId = (state: GameStore) => state.activeNationId;

/**
 * Every tile's cursor while a civilian is selected (FR-379, FR-380): worked out once for the whole map when the game, the
 * player or the selection changes, not per tile on every store change (the camera moves the store on every scroll).
 */
export const selectClickCursors = createSelector(
  [(state: GameStore) => state.game, selectActiveNationId, (state: GameStore) => state.selectedWorkerId],
  (game, nationId, workerId) => clickCursors(game, nationId, workerId)
);

export const selectActiveNation = createSelector(
  [selectNations, selectActiveNationId],
  (nations, activeNationId) => nations.find((n: Nation) => n.id === activeNationId)
);

/** Tiles where a job finished in the last resolved turn: the map's "done" mark (FR-032). */
export const selectTilesCompletedLastTurn = createSelector(
  [(state: GameStore) => state.eventLog],
  (eventLog) => completedTileIds(eventLog.at(-1)?.events ?? [])
);

/** The meal the active nation's workers would get at the end of this turn (FR-049). */
export const selectFoodForecast = createSelector(
  [(state: GameStore) => state.game, selectActiveNationId],
  (game, activeNationId) => foodForecast(game, activeNationId)
);

/** Recorded scores after game over, live scores during play. Both tables are already ranked (FR-106, FR-544). */
export const selectScoreTable = createSelector(
  [(state: GameStore) => state.game],
  (game) => game.gameOver?.scores ?? scoreTable(game)
);

/** The active nation's row in the same ranking shown in the Nation panel (FR-075). */
export const selectActiveScore = createSelector(
  [selectScoreTable, selectActiveNationId, (state: GameStore) => state.game],
  (scores, activeNationId, game) => scores.find(score => score.nationId === activeNationId) ?? scoreOf(game, activeNationId)
);

/** The active nation's army upkeep at End Turn and the cash it will find (FR-261). */
export const selectUpkeepForecast = createSelector(
  [(state: GameStore) => state.game, selectActiveNationId],
  (game, activeNationId) => upkeepForecast(game, activeNationId)
);

/** The army markers of each seat tile, the province's owner first, ours as buttons (FR-210), with our selection (FR-230). */
export const selectArmyMarkersBySeat = createSelector(
  [(state: GameStore) => state.game, selectActiveNationId, (state: GameStore) => state.armySelection],
  (game, activeNationId, selection) => markersBySeat(game, activeNationId, selection)
);

/** The player's march orders of this turn as arrows on the map (FR-263). */
export const selectMarchArrows = createSelector([(state: GameStore) => state.game, selectActiveNationId], (game, activeNationId) =>
  marchArrows(game, activeNationId)
);

/** The player's attack orders of this turn as the art pack's red arrows on the map (FR-273). */
export const selectAttackArrows = createSelector([(state: GameStore) => state.game, selectActiveNationId], (game, activeNationId) =>
  attackArrows(game, activeNationId)
);

export const selectActiveNationCapacity = createSelector(
    [selectActiveNation],
    (activeNation) => activeNation?.transportCapacity ?? 0
);

// Efficient selector for selected worker and its tile
export const selectSelectedWorkerAndTile = createSelector(
  [(state: GameStore) => state.selectedWorkerId, (state: GameStore) => state.game.map.tiles],
  (selectedWorkerId, tiles): { worker: Worker | null, tile: Tile | null } => {
    if (!selectedWorkerId) return { worker: null, tile: null };
    for (const row of tiles) {
      for (const tile of row) {
        const worker = tile.workers.find(w => w.id === selectedWorkerId);
        if (worker) return { worker, tile };
      }
    }
    return { worker: null, tile: null };
  }
);
