import { Nation } from '@/types/Nation';
import { Tile } from '@/types/Tile';
import { Worker } from '@/types/Workers';
import { createSelector } from 'reselect';
import { completedTileIds } from '@/components/gameText';
import { marchArrows, markersBySeat } from '@/components/army/armyView';
import { foodForecast, scoreOf, scoreTable, upkeepForecast } from '@/engine';
import { GameStore } from './rootStore';

const selectNations = (state: GameStore) => state.game.nations;
const selectActiveNationId = (state: GameStore) => state.activeNationId;

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

/** The active nation's score now (FR-075). */
export const selectActiveScore = createSelector(
  [(state: GameStore) => state.game, selectActiveNationId],
  (game, activeNationId) => scoreOf(game, activeNationId)
);

/** The active nation's army upkeep at End Turn and the cash it will find (FR-261). */
export const selectUpkeepForecast = createSelector(
  [(state: GameStore) => state.game, selectActiveNationId],
  (game, activeNationId) => upkeepForecast(game, activeNationId)
);

/** The army markers of each seat tile, the province's owner first, ours as buttons (FR-210). */
export const selectArmyMarkersBySeat = createSelector([(state: GameStore) => state.game, selectActiveNationId], (game, activeNationId) =>
  markersBySeat(game, activeNationId)
);

/** The player's march orders of this turn as arrows on the map (FR-263). */
export const selectMarchArrows = createSelector([(state: GameStore) => state.game, selectActiveNationId], (game, activeNationId) =>
  marchArrows(game, activeNationId)
);

/** Every nation's score now, highest first, ties in founding order (FR-106). */
export const selectScoreTable = createSelector([(state: GameStore) => state.game], (game) => scoreTable(game));

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
