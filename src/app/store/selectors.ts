import { Nation } from '@/types/Nation';
import { Tile } from '@/types/Tile';
import { Worker } from '@/types/Workers';
import { createSelector } from 'reselect';
import { GameStore } from './rootStore';

const selectNations = (state: GameStore) => state.nations;
const selectActiveNationId = (state: GameStore) => state.activeNationId;

export const selectActiveNation = createSelector(
  [selectNations, selectActiveNationId],
  (nations, activeNationId) => nations.find((n: Nation) => n.id === activeNationId)
);

export const selectActiveNationCapacity = createSelector(
    [selectActiveNation],
    (activeNation) => activeNation?.transportCapacity ?? 0
);

// Efficient selector for selected worker and its tile
export const selectSelectedWorkerAndTile = createSelector(
  [(state: GameStore) => state.selectedWorkerId, (state: GameStore) => state.map.tiles],
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