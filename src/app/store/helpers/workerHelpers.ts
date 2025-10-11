import { EngineerBuildDurationsTurns } from "@/definisions/workerDurations";
import { GameState } from "@/types/GameState";
import { TerrainType, Tile } from "@/types/Tile";
import { Worker, WorkerStatus, WorkerType } from "@/types/Workers";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { startDeveloperWork } from '../../workers/DeveloperWorker';
import { startEngineerWork } from '../../workers/EngineerWorker';
import { moveWorker } from '../../workers/moveWorker';
import { startProspectorWork } from '../../workers/ProspectorWorker';

export { moveWorker, startDeveloperWork, startEngineerWork, startProspectorWork };

export function moveAndStartWorkerJob(
  state: GameState,
  targetTileId: string,
  workerId: string,
  moveFn: (state: GameState, fromTile: Tile, toTile: Tile, worker: Worker) => GameState,
  startJobFn: (state: GameState) => GameState
): GameState {
  const workerInfo = findWorkerAndTile(state, workerId);
  if (!workerInfo) return state;
  const { worker, tile: fromTile } = workerInfo;
  const [tx, ty] = parseTileIdToArray(targetTileId);
  const toTile = state.map.tiles[ty]?.[tx];
  if (!toTile) return state;
  let movedState = moveFn(state, fromTile, toTile, worker);
  movedState = {
    ...movedState,
    map: {
      ...movedState.map,
      tiles: movedState.map.tiles.map((row, y) =>
        row.map((t, x) => {
          if (x === tx && y === ty) {
            return {
              ...t,
              workers: t.workers.map(w =>
                w.id === workerId ? { ...w, status: WorkerStatus.Available, justMoved: false } : w
              ),
            };
          }
          return t;
        })
      ),
    },
  };
  return startJobFn(movedState);
}

const findWorkerAndTile = (state: GameState, workerId: string): { worker: Worker, tile: Tile, x: number, y: number } | null => {
    for (let y = 0; y < state.map.config.rows; y++) {
        for (let x = 0; x < state.map.config.cols; x++) {
            const tile = state.map.tiles[y][x];
            const worker = tile.workers.find((w: Worker) => w.id === workerId);
            if (worker) {
                return { worker, tile, x, y };
            }
        }
    }
    return null;
}

/**
 * Generic helper for moving a worker to a target tile.
 * Handles validation and basic movement logic for all worker types.
 * Worker-specific behavior should be handled by the caller.
 */
export const moveSelectedWorkerToTileHelper = (
  state: GameState,
  targetTileId: string,
  selectedWorkerId: string
): GameState => {
  if (!selectedWorkerId) return state;

  const workerInfo = findWorkerAndTile(state, selectedWorkerId);
  if (!workerInfo) return state;

  const { worker, tile: fromTile, x: fromX, y: fromY } = workerInfo;

  // Don't allow movement if worker already moved this turn
  if (worker.justMoved) return state;

  // Don't allow movement if worker is currently working on a job
  const working =
    fromTile.prospecting?.workerId === selectedWorkerId ||
    (fromTile.developmentJob && !fromTile.developmentJob.completed && fromTile.developmentJob.workerId === selectedWorkerId) ||
    (fromTile.constructionJob && !fromTile.constructionJob.completed && fromTile.constructionJob.workerId === selectedWorkerId);
  if (working) return state;

  const [tx, ty] = parseTileIdToArray(targetTileId);
  if (Number.isNaN(tx) || Number.isNaN(ty)) return state;

  // Don't allow movement to same tile
  if (fromX === tx && fromY === ty) return state;

  const targetTile = state.map.tiles[ty]?.[tx];
  if (!targetTile) return state;

  // Validate target tile is land and owned by same nation
  const isLand = targetTile.terrain !== TerrainType.Water && targetTile.terrain !== TerrainType.River;
  const sameNation = targetTile.ownerNationId === worker.nationId;
  if (!isLand || !sameNation) return state;

  // Use pure moveWorker utility for movement
  return moveWorker(state, fromTile, targetTile, worker);
};

export function startProspectingHelper(state: GameState, tileId: string, workerId: string): GameState {
  const [tx, ty] = parseTileIdToArray(tileId);
  const tile = state.map.tiles[ty]?.[tx];
  if (!tile) return state;
  const worker = tile.workers.find((w: Worker) => w.id === workerId && w.type === WorkerType.Prospector);
  if (!worker) return state;
  return startProspectorWork(state);
}

export function startDevelopmentHelper(state: GameState, tileId: string, workerId: string, workerType: WorkerType): GameState {
  const [tx, ty] = parseTileIdToArray(tileId);
  const tile = state.map.tiles[ty]?.[tx];
  if (!tile) return state;
  const worker = tile.workers.find((w: Worker) => w.id === workerId && w.type === workerType);
  if (!worker) return state;
  return startDeveloperWork(state);
}


export function startConstructionHelper(state: GameState, tileId: string, workerId: string, kind: 'depot' | 'port' | 'fort' | 'rail'): GameState {
  const [tx, ty] = parseTileIdToArray(tileId);
  const tile = state.map.tiles[ty]?.[tx];
  if (!tile) return state;
  const worker = tile.workers.find((w: Worker) => w.id === workerId && w.type === WorkerType.Engineer);
  if (!worker) return state;
  if (worker.status !== WorkerStatus.Available) return state;

  // Build the specified construction
  const durationTurns = EngineerBuildDurationsTurns[kind] || 1;
  const startedOnTurn = state.turn;

  const newTiles = state.map.tiles.map((row, y) =>
    row.map((t, x) => {
      if (x === tx && y === ty) {
        return {
          ...t,
          constructionJob: { workerId: worker.id, kind, startedOnTurn, durationTurns },
          workers: t.workers.map(w =>
            w.id === worker.id
              ? { ...w, status: WorkerStatus.Working, jobDescription: `Constructing ${kind}` }
              : w
          ),
        };
      }
      return t;
    })
  );

  return { ...state, map: { ...state.map, tiles: newTiles } };
}

export const cancelActionHelper = (state: GameState, tileId: string, workerId: string): GameState => {
    const [tx, ty] = parseTileIdToArray(tileId);
    if (isNaN(tx) || isNaN(ty)) return state;

    const tile = state.map.tiles[ty]?.[tx];
    if (!tile) return state;

    const worker = tile.workers.find((w: Worker) => w.id === workerId);
    if (!worker) return state;

    if (worker.status === WorkerStatus.Moved && worker.previousTileId) {
        const [px, py] = parseTileIdToArray(worker.previousTileId);
        if (isNaN(px) || isNaN(py)) return state;

        const newTiles = state.map.tiles.map((row, y) => {
            if (y !== ty && y !== py) return row;
            return row.map((t, x) => {
                if (x === tx && y === ty) {
                    return { ...t, workers: t.workers.filter(w => w.id !== workerId) };
                }
                if (x === px && y === py) {
                    const returnedWorker: Worker = {
                        ...worker,
                        status: WorkerStatus.Available,
                        justMoved: false,
                        jobDescription: undefined,
                        previousTileId: undefined,
                        assignedTileId: worker.previousTileId,
                    };
                    return { ...t, workers: [...t.workers, returnedWorker] };
                }
                return t;
            });
        });
        return { ...state, map: { ...state.map, tiles: newTiles } };
    }

    if (worker.status === WorkerStatus.Working) {
        const newTiles = state.map.tiles.map((row, y) => {
            if (y !== ty) return row;
            return row.map((t, x) => {
                if (x !== tx) return t;

                const newTile = { ...t };
                if (newTile.prospecting?.workerId === workerId) newTile.prospecting = undefined;
                if (newTile.developmentJob?.workerId === workerId) newTile.developmentJob = undefined;
                if (newTile.constructionJob?.workerId === workerId) newTile.constructionJob = undefined;

                newTile.workers = newTile.workers.map(w =>
                    w.id === workerId ? { ...w, status: WorkerStatus.Available, justMoved: false, jobDescription: undefined } : w
                );
                return newTile;
            });
        });
        return { ...state, map: { ...state.map, tiles: newTiles } };
    }

    return state;
};

export function moveAndStartProspectingHelper(state: GameState, targetTileId: string, workerId: string): GameState {
  return moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startProspectorWork);
}

export function moveAndStartDevelopmentHelper(state: GameState, targetTileId: string, workerId: string): GameState {
  return moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startDeveloperWork);
}

export function moveAndStartConstructionHelper(state: GameState, targetTileId: string, workerId: string): GameState {
  return moveAndStartWorkerJob(state, targetTileId, workerId, moveWorker, startEngineerWork);
}