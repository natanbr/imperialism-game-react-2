import { MINERAL_RESOURCES } from '@/definisions/resourceDefinitions';
import { DRILLING_TERRAINS, FARMING_TERRAINS, FORESTRY_TERRAINS, MINING_TERRAINS, PROSPECTABLE_TERRAIN_TYPES, RANCHING_TERRAINS } from '@/definisions/terrainDefinitions';
import { EngineerBuildDurationsTurns, WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import { GameState } from "@/types/GameState";
import { ResourceType } from "@/types/Resource";
import { Tile, TerrainType } from "@/types/Tile";
import { Worker, WorkerStatus, WorkerType } from "@/types/Workers";
import { isAdjacentToOcean } from "./mapHelpers";
import { PROSPECT_COST, DEVELOPMENT_COST, CONSTRUCTION_COST } from "@/definisions/workPrices";

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

export const moveSelectedWorkerToTileHelper = (
  state: GameState,
  targetTileId: string,
  selectedWorkerId: string
): GameState => {
  if (!selectedWorkerId) return state;

  const workerInfo = findWorkerAndTile(state, selectedWorkerId);
  if (!workerInfo) return state;

  const { worker, tile: fromTile, x: fromX, y: fromY } = workerInfo;

  if (worker.justMoved) return state;

  const working =
    fromTile.prospecting?.workerId === selectedWorkerId ||
    (fromTile.developmentJob && !fromTile.developmentJob.completed && fromTile.developmentJob.workerId === selectedWorkerId) ||
    (fromTile.constructionJob && !fromTile.constructionJob.completed && fromTile.constructionJob.workerId === selectedWorkerId);
  if (working) return state;

  const [tx, ty] = targetTileId.split("-").map(Number);
  if (Number.isNaN(tx) || Number.isNaN(ty)) return state;

  if (fromX === tx && fromY === ty) return state;

  const targetTile = state.map.tiles[ty]?.[tx];
  if (!targetTile) return state;

  const isLand = targetTile.terrain !== TerrainType.Water && targetTile.terrain !== TerrainType.River;
  const sameNation = targetTile.ownerNationId === worker.nationId;
  if (!isLand || !sameNation) return state;

  const newTiles = state.map.tiles.map((row, y) => {
    if (y !== fromY && y !== ty) return row;
    return row.map((tile, x) => {
      if (x === fromX && y === fromY) {
        return { ...tile, workers: tile.workers.filter(w => w.id !== selectedWorkerId) };
      }
      if (x === tx && y === ty) {
        const movedWorker: Worker = {
          ...worker,
          assignedTileId: `${tx}-${ty}`,
          justMoved: true,
          status: WorkerStatus.Moved,
          jobDescription: "Moved",
          previousTileId: fromTile.id,
        };
        return { ...tile, workers: [...tile.workers, movedWorker] };
      }
      return tile;
    });
  });

  return { ...state, map: { ...state.map, tiles: newTiles } };
};

export const startProspectingHelper = (
  state: GameState,
  tileId: string,
  workerId: string
): GameState => {
  const [tx, ty] = tileId.split("-").map(Number);
  const tile = state.map.tiles[ty]?.[tx];
  if (!tile) return state;

  const worker = tile.workers.find((w) => w.id === workerId && w.type === WorkerType.Prospector);
  if (!worker || worker.justMoved) return state;

  const terrainAllowed = PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain);
  const alreadyProspecting = !!tile.prospecting;
  const alreadyDiscovered = tile.resource?.discovered === true;

  if (!terrainAllowed || alreadyProspecting || alreadyDiscovered) return state;

  const nation = state.nations.find(n => n.id === worker.nationId);
  const cost = PROSPECT_COST;
  if (!nation || (nation.treasury ?? 0) < cost) return state;

  const newTiles = state.map.tiles.map((row, y) => {
    if (y !== ty) return row;
    return row.map((t, x) => {
      if (x !== tx) return t;
      return {
        ...t,
        prospecting: { startedOnTurn: state.turn, workerId },
        workers: t.workers.map(w =>
          w.id === workerId ? { ...w, status: WorkerStatus.Working, jobDescription: "Prospecting" } : w
        ),
      };
    });
  });

  const newNations = state.nations.map(n =>
    n.id === worker.nationId ? { ...n, treasury: (n.treasury ?? 0) - cost } : n
  );

  return { ...state, map: { ...state.map, tiles: newTiles }, nations: newNations };
};

export const startDevelopmentHelper = (
  state: GameState,
  tileId: string,
  workerId: string,
  workerType: WorkerType,
  targetLevel: 1 | 2 | 3
): GameState => {
    const [tx, ty] = tileId.split("-").map(Number);
    const tile = state.map.tiles[ty]?.[tx];
    if (!tile) return state;

    const worker = tile.workers.find((w) => w.id === workerId);
    if (!worker || worker.justMoved || worker.type !== workerType) return state;
    if (tile.developmentJob && !tile.developmentJob.completed) return state;

    const terrainValid =
    (workerType === WorkerType.Farmer && FARMING_TERRAINS.includes(tile.terrain)) ||
    (workerType === WorkerType.Rancher && RANCHING_TERRAINS.includes(tile.terrain)) ||
    (workerType === WorkerType.Forester && FORESTRY_TERRAINS.includes(tile.terrain)) ||
    (workerType === WorkerType.Miner && MINING_TERRAINS.includes(tile.terrain)) ||
    (workerType === WorkerType.Driller && DRILLING_TERRAINS.includes(tile.terrain));
    if (!terrainValid) return state;

    if (workerType === WorkerType.Miner) {
        const isMineral = tile.resource && MINERAL_RESOURCES.includes(tile.resource.type);
        if (!isMineral || !tile.resource?.discovered) return state;
    }
    if (workerType === WorkerType.Driller) {
        const isOil = tile.resource?.type === ResourceType.Oil;
        const hasTech = state.technologyState.oilDrillingTechUnlocked === true;
        if (!isOil || !tile.resource?.discovered || !hasTech) return state;
    }

    const currentLevel = tile.resource?.level ?? 0;
    if (targetLevel !== currentLevel + 1) return state;

    const duration = WorkerLevelDurationsTurns[workerType]?.[targetLevel] ?? 1;
    const levelCost = DEVELOPMENT_COST[targetLevel];
    const nation = state.nations.find(n => n.id === worker.nationId);
    if (!nation || (nation.treasury ?? 0) < levelCost) return state;

    const jobDescription = `Developing ${workerType} L${targetLevel}`;
    const newTiles = state.map.tiles.map((row, y) => {
        if (y !== ty) return row;
        return row.map((t, x) => {
            if (x !== tx) return t;
            return {
                ...t,
                developmentJob: { workerId, workerType, targetLevel, startedOnTurn: state.turn, durationTurns: duration },
                workers: t.workers.map(w =>
                    w.id === workerId ? { ...w, status: WorkerStatus.Working, jobDescription } : w
                ),
            };
        });
    });

    const newNations = state.nations.map(n =>
        n.id === worker.nationId ? { ...n, treasury: (n.treasury ?? 0) - levelCost } : n
    );

    return { ...state, map: { ...state.map, tiles: newTiles }, nations: newNations };
};

export const startConstructionHelper = (
  state: GameState,
  tileId: string,
  workerId: string,
  kind: "depot" | "port" | "fort" | "rail"
): GameState => {
    const [tx, ty] = tileId.split("-").map(Number);
    const tile = state.map.tiles[ty]?.[tx];
    if (!tile) return state;

    const engineer = tile.workers.find((w) => w.id === workerId && w.type === WorkerType.Engineer);
    if (!engineer || engineer.justMoved || tile.constructionJob) return state;

    if (kind === "port") {
        const canBuildPort = tile.hasRiver === true || isAdjacentToOcean(state.map, tx, ty);
        if (!canBuildPort) return state;
    }

    const duration = EngineerBuildDurationsTurns[kind] ?? 1;
    const cost = CONSTRUCTION_COST[kind];
    const nation = state.nations.find(n => n.id === engineer.nationId);
    if (!nation || (nation.treasury ?? 0) < cost) return state;

    const jobDescription = `Constructing ${kind}`;
    const newTiles = state.map.tiles.map((row, y) => {
        if (y !== ty) return row;
        return row.map((t, x) => {
            if (x !== tx) return t;
            return {
                ...t,
                constructionJob: { workerId, kind, startedOnTurn: state.turn, durationTurns: duration },
                workers: t.workers.map(w =>
                    w.id === workerId ? { ...w, status: WorkerStatus.Working, jobDescription } : w
                ),
            };
        });
    });

    const newNations = state.nations.map(n =>
        n.id === engineer.nationId ? { ...n, treasury: (n.treasury ?? 0) - cost } : n
    );

    return { ...state, map: { ...state.map, tiles: newTiles }, nations: newNations };
};

export const cancelActionHelper = (state: GameState, tileId: string, workerId: string): GameState => {
    const [tx, ty] = tileId.split("-").map(Number);
    if (isNaN(tx) || isNaN(ty)) return state;

    const tile = state.map.tiles[ty]?.[tx];
    if (!tile) return state;

    const worker = tile.workers.find((w: Worker) => w.id === workerId);
    if (!worker) return state;

    if (worker.status === WorkerStatus.Moved && worker.previousTileId) {
        const [px, py] = worker.previousTileId.split("-").map(Number);
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

export const moveAndStartProspectingHelper = (
    state: GameState,
    targetTileId: string,
    workerId: string,
): GameState => {
    const workerInfo = findWorkerAndTile(state, workerId);
    if (!workerInfo) return state;

    const { worker, tile: fromTile, x: fromX, y: fromY } = workerInfo;
    if (worker.justMoved || worker.status === WorkerStatus.Working) return state;

    const [tx, ty] = targetTileId.split("-").map(Number);
    const targetTile = state.map.tiles[ty]?.[tx];
    if (!targetTile) return state;

    const terrainAllowed = PROSPECTABLE_TERRAIN_TYPES.includes(targetTile.terrain);
    const alreadyProspecting = !!targetTile.prospecting;
    const alreadyDiscovered = targetTile.resource?.discovered === true;
    if (!terrainAllowed || alreadyProspecting || alreadyDiscovered) return state;

    const nation = state.nations.find(n => n.id === worker.nationId);
    const cost = PROSPECT_COST;
    if (!nation || (nation.treasury ?? 0) < cost) return state;

    const newTiles = state.map.tiles.map((row, y) => row.map((tile, x) => {
        if (x === fromX && y === fromY) {
            return { ...tile, workers: tile.workers.filter(w => w.id !== workerId) };
        }
        if (x === tx && y === ty) {
            const movedWorker = {
                ...worker,
                status: WorkerStatus.Working,
                jobDescription: "Prospecting",
                assignedTileId: targetTileId,
                justMoved: true,
            };
            return {
                ...tile,
                workers: [...tile.workers, movedWorker],
                prospecting: { startedOnTurn: state.turn, workerId },
            };
        }
        return tile;
    }));

    const newNations = state.nations.map(n =>
        n.id === worker.nationId ? { ...n, treasury: (n.treasury ?? 0) - cost } : n
    );

    return { ...state, map: { ...state.map, tiles: newTiles }, nations: newNations };
}

export const moveAndStartDevelopmentHelper = (
    state: GameState,
    targetTileId: string,
    workerId: string,
    workerType: WorkerType,
    targetLevel: 1 | 2 | 3
): GameState => {
    const workerInfo = findWorkerAndTile(state, workerId);
    if (!workerInfo) return state;

    const { worker, tile: fromTile, x: fromX, y: fromY } = workerInfo;
    if (worker.justMoved || worker.type !== workerType || worker.status === WorkerStatus.Working) return state;

    const [tx, ty] = targetTileId.split("-").map(Number);
    const targetTile = state.map.tiles[ty]?.[tx];
    if (!targetTile || (targetTile.developmentJob && !targetTile.developmentJob.completed)) return state;

    const terrainValid =
    (workerType === WorkerType.Farmer && FARMING_TERRAINS.includes(targetTile.terrain)) ||
    (workerType === WorkerType.Rancher && RANCHING_TERRAINS.includes(targetTile.terrain)) ||
    (workerType === WorkerType.Forester && FORESTRY_TERRAINS.includes(targetTile.terrain)) ||
    (workerType === WorkerType.Miner && MINING_TERRAINS.includes(targetTile.terrain)) ||
    (workerType === WorkerType.Driller && DRILLING_TERRAINS.includes(targetTile.terrain));
    if (!terrainValid) return state;

    const currentLevel = targetTile.resource?.level ?? 0;
    if (targetLevel !== currentLevel + 1) return state;

    const duration = WorkerLevelDurationsTurns[workerType]?.[targetLevel] ?? 1;
    const levelCost = DEVELOPMENT_COST[targetLevel];
    const nation = state.nations.find(n => n.id === worker.nationId);
    if (!nation || (nation.treasury ?? 0) < levelCost) return state;

    const jobDescription = `Developing ${workerType} L${targetLevel}`;
    const newTiles = state.map.tiles.map((row, y) => row.map((tile, x) => {
        if (x === fromX && y === fromY) {
            return { ...tile, workers: tile.workers.filter(w => w.id !== workerId) };
        }
        if (x === tx && y === ty) {
            const movedWorker = {
                ...worker,
                status: WorkerStatus.Working,
                jobDescription,
                assignedTileId: targetTileId,
                justMoved: true,
            };
            return {
                ...tile,
                workers: [...tile.workers, movedWorker],
                developmentJob: { workerId, workerType, targetLevel, startedOnTurn: state.turn, durationTurns: duration },
            };
        }
        return tile;
    }));

    const newNations = state.nations.map(n =>
        n.id === worker.nationId ? { ...n, treasury: (n.treasury ?? 0) - levelCost } : n
    );

    return { ...state, map: { ...state.map, tiles: newTiles }, nations: newNations };
}

export const moveAndStartConstructionHelper = (
    state: GameState,
    targetTileId: string,
    workerId: string,
    kind: "depot" | "port" | "fort" | "rail"
): GameState => {
    const workerInfo = findWorkerAndTile(state, workerId);
    if (!workerInfo) return state;

    const { worker, tile: fromTile, x: fromX, y: fromY } = workerInfo;
    if (worker.justMoved || worker.type !== WorkerType.Engineer || worker.status === WorkerStatus.Working) return state;

    const [tx, ty] = targetTileId.split("-").map(Number);
    const targetTile = state.map.tiles[ty]?.[tx];
    if (!targetTile || targetTile.constructionJob) return state;

    if (kind === "port") {
        const canBuildPort = targetTile.hasRiver === true || isAdjacentToOcean(state.map, tx, ty);
        if (!canBuildPort) return state;
    }

    const duration = EngineerBuildDurationsTurns[kind] ?? 1;
    const cost = CONSTRUCTION_COST[kind];
    const nation = state.nations.find(n => n.id === worker.nationId);
    if (!nation || (nation.treasury ?? 0) < cost) return state;

    const jobDescription = `Constructing ${kind}`;
    const newTiles = state.map.tiles.map((row, y) => row.map((tile, x) => {
        if (x === fromX && y === fromY) {
            return { ...tile, workers: tile.workers.filter(w => w.id !== workerId) };
        }
        if (x === tx && y === ty) {
            const movedWorker = {
                ...worker,
                status: WorkerStatus.Working,
                jobDescription,
                assignedTileId: targetTileId,
                justMoved: true,
            };
            return {
                ...tile,
                workers: [...tile.workers, movedWorker],
                constructionJob: { workerId, kind, startedOnTurn: state.turn, durationTurns: duration },
            };
        }
        return tile;
    }));

    const newNations = state.nations.map(n =>
        n.id === worker.nationId ? { ...n, treasury: (n.treasury ?? 0) - cost } : n
    );

    return { ...state, map: { ...state.map, tiles: newTiles }, nations: newNations };
}