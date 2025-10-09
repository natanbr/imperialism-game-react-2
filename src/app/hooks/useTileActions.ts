import { useMemo } from 'react';
import { Tile } from '@/types/Tile';
import { Worker, WorkerType } from '@/types/Workers';
import { GameMap } from '@/types/Map';
import { PossibleAction } from '@/types/actions';
import { getProspectorActions } from '@/workers/ProspectorWorker';
import { getEngineerActions } from '@/workers/EngineerWorker';
import { getFarmerActions } from '@/workers/FarmerWorker';
import { getForesterActions } from '@/workers/ForesterWorker';
import { getMinerActions } from '@/workers/MinerWorker';
import { getRancherActions } from '@/workers/RancherWorker';
import { getDrillerActions } from '@/workers/DrillerWorker';

/**
 * Determine what action a worker can perform on a tile
 */
function getPossibleAction(
  tile: Tile,
  selectedWorker: Worker | null,
  map: GameMap
): PossibleAction {
  if (!selectedWorker) return null;

  switch (selectedWorker.type) {
    case WorkerType.Prospector:
      return getProspectorActions(tile, map, selectedWorker);
    case WorkerType.Engineer:
      return getEngineerActions(tile, map, selectedWorker);
    case WorkerType.Farmer:
      return getFarmerActions(tile, map, selectedWorker);
    case WorkerType.Rancher:
      return getRancherActions(tile, map, selectedWorker);
    case WorkerType.Forester:
      return getForesterActions(tile, map, selectedWorker);
    case WorkerType.Miner:
      return getMinerActions(tile, map, selectedWorker);
    case WorkerType.Driller:
      return getDrillerActions(tile, map, selectedWorker);
    default:
      return null;
  }
}

/**
 * Hook to determine what action a selected worker can perform on a tile
 *
 * @param tile - The tile to check actions for
 * @param selectedWorker - The currently selected worker
 * @param map - The game map
 * @returns The possible action the worker can perform, or null
 */
export function useTileActions(
  tile: Tile,
  selectedWorker: Worker | null,
  map: GameMap
): PossibleAction {
  return useMemo(() => {
    if (!selectedWorker) return null;

    // Use the up-to-date worker object from the current tile for action checks
    const tileWorker = tile.workers.find(w => w.id === selectedWorker.id);
    const workerForAction = tileWorker || selectedWorker;

    return getPossibleAction(tile, workerForAction, map);
  }, [tile, selectedWorker, map]);
}
