import { Nation } from '@/types/Nation';
import { Tile } from '@/types/Tile';
import { Worker } from '@/types/Workers';
import { createSelector } from 'reselect';
import { completedTileIds } from '@/components/gameText';
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
