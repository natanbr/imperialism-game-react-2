
import { MINERAL_RESOURCES } from '@/definisions/resourceDefinitions';
import { DRILLING_TERRAINS, FARMING_TERRAINS, FORESTRY_TERRAINS, MINING_TERRAINS, PROSPECTABLE_TERRAIN_TYPES, RANCHING_TERRAINS } from '@/definisions/terrainDefinitions';
import { EngineerBuildDurationsTurns, WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import { GameState } from "@/types/GameState";
import { ResourceType } from "@/types/Resource";
import { TerrainType } from "@/types/Tile";
import { Worker, WorkerType } from "@/types/Workers";
import { isAdjacentToOcean } from "./mapHelpers";
import { PROSPECT_COST, DEVELOPMENT_COST, CONSTRUCTION_COST } from "@/definisions/workPrices";

export const moveSelectedWorkerToTileHelper = (
  state: GameState,
  targetTileId: string,
  selectedWorkerId: string
): GameState => {
  if (!selectedWorkerId) return state;

  const map = state.map;

  // Find current tile containing the worker
  let fromX = -1,
    fromY = -1,
    worker: Worker | undefined;
  outer: for (let y = 0; y < map.config.rows; y++) {
    for (let x = 0; x < map.config.cols; x++) {
      const t = map.tiles[y][x];
      const w = t.workers.find((w: Worker) => w.id === selectedWorkerId);
      if (w) {
        fromX = x;
        fromY = y;
        worker = w;
        break outer;
      }
    }
  }
  if (!worker) return state;


  // If this worker has an active job on its current tile, block movement
  const fromTile = map.tiles[fromY]?.[fromX];
  if (!fromTile) return state;
  const working =
    fromTile.prospecting?.workerId === selectedWorkerId ||
    (fromTile.developmentJob &&
      fromTile.developmentJob.workerId === selectedWorkerId &&
      !fromTile.developmentJob.completed) ||
    (fromTile.constructionJob &&
      fromTile.constructionJob.workerId === selectedWorkerId &&
      !fromTile.constructionJob.completed);
  if (working) return state; // cannot move while job is in progress

  // Locate target tile
  const [tx, ty] = targetTileId.split("-").map(Number);
  if (Number.isNaN(tx) || Number.isNaN(ty)) return state;

  // If worker is already on the target tile, do nothing
  if (fromX === tx && fromY === ty) return state;

  const target = map.tiles[ty]?.[tx];
  if (!target) return state;

  // Must be land (not water/river) and owned by same nation
  const isLand = target.terrain !== TerrainType.Water && target.terrain !== TerrainType.River;
  const sameNation = target.ownerNationId === worker.nationId;
  if (!isLand || !sameNation) return state;

  // Update tiles immutably
  const newTiles = map.tiles.map((row, y) =>
    row.map((t, x) => {
      if (x === fromX && y === fromY) {
        return { ...t, workers: t.workers.filter((w) => w.id !== selectedWorkerId) };
      }
      if (x === tx && y === ty) {
        return { ...t, workers: [...t.workers, { ...worker!, assignedTileId: `${tx}-${ty}` }] };
      }
      return t;
    })
  );

  return { ...state, map: { ...map, tiles: newTiles } };
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
  const terrainAllowed = PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain);
  const alreadyProspecting = !!tile.prospecting;
  const alreadyDiscovered = tile.resource?.discovered === true;

  if (!worker || !terrainAllowed || alreadyProspecting || alreadyDiscovered) return state;

  // Check funds before starting
  const nation = state.nations.find(n => n.id === worker.nationId);
  const cost = PROSPECT_COST;
  if (!nation || (nation.treasury ?? 0) < cost) return state; // insufficient funds

  const newRow = [...state.map.tiles[ty]];
  newRow[tx] = { ...tile, prospecting: { startedOnTurn: state.turn, workerId } };
  const newTiles = [...state.map.tiles];
  newTiles[ty] = newRow;

  // Deduct immediate work price for prospector job
  const newNations = state.nations.map((n) =>
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

  // Validate worker is on tile and of given type
  const worker = tile.workers.find((w) => w.id === workerId);
  const workerOnTile = !!worker && worker.type === workerType;
  // Allow starting a new development if any existing development job is already completed
  if (!workerOnTile || (tile.developmentJob && !tile.developmentJob.completed)) return state;

  // Validate terrain per workerType
  const terrainValid =
    (workerType === WorkerType.Farmer && FARMING_TERRAINS.includes(tile.terrain)) ||
    (workerType === WorkerType.Rancher && RANCHING_TERRAINS.includes(tile.terrain)) ||
    (workerType === WorkerType.Forester && FORESTRY_TERRAINS.includes(tile.terrain)) ||
    (workerType === WorkerType.Miner && MINING_TERRAINS.includes(tile.terrain)) ||
    (workerType === WorkerType.Driller && DRILLING_TERRAINS.includes(tile.terrain));
  if (!terrainValid) return state;

  // Gating: Miner requires discovered mineral; Driller requires discovered oil + tech
  if (workerType === WorkerType.Miner) {
    const isMineral = tile.resource && MINERAL_RESOURCES.includes(tile.resource.type);
    if (!isMineral || !tile.resource?.discovered) return state;
  }
  if (workerType === WorkerType.Driller) {
    const isOil = tile.resource?.type === ResourceType.Oil;
    const hasTech = state.technologyState.oilDrillingTechUnlocked === true;
    if (!isOil || !tile.resource?.discovered || !hasTech) return state;
  }

  // Sequential development gating: must complete L1 -> L2 -> L3 in order
  const currentLevel = tile.resource?.level ?? 0;
  if (targetLevel !== currentLevel + 1) return state; // only allow next level

  // Get duration from table; fallback to 1
  const duration = WorkerLevelDurationsTurns[workerType]?.[targetLevel] ?? 1;

  // Check funds before starting
  const levelCost = DEVELOPMENT_COST[targetLevel];
  const nation = state.nations.find(n => n.id === (worker!.nationId));
  if (!nation || (nation.treasury ?? 0) < levelCost) return state; // insufficient funds

  const newRow = [...state.map.tiles[ty]];
  newRow[tx] = {
    ...tile,
    developmentJob: { workerId, workerType, targetLevel, startedOnTurn: state.turn, durationTurns: duration },
  };
  const newTiles = [...state.map.tiles];
  newTiles[ty] = newRow;

  // Deduct immediate work price based on target level
  const newNations = state.nations.map((n) =>
    n.id === (worker!.nationId) ? { ...n, treasury: (n.treasury ?? 0) - levelCost } : n
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
  if (!engineer || tile.constructionJob) return state;

  // Rule: Port can be started only if tile has river OR is adjacent to ocean/coast
  if (kind === "port") {
    const canBuildPort = tile.hasRiver === true || isAdjacentToOcean(state.map, tx, ty);
    if (!canBuildPort) return state;
  }

  const duration = EngineerBuildDurationsTurns[kind] ?? 1;

  // Check funds before starting
  const cost = CONSTRUCTION_COST[kind];
  const nation = state.nations.find(n => n.id === engineer.nationId);
  if (!nation || (nation.treasury ?? 0) < cost) return state; // insufficient funds

  const newRow = [...state.map.tiles[ty]];
  newRow[tx] = { ...tile, constructionJob: { workerId, kind, startedOnTurn: state.turn, durationTurns: duration } };
  const newTiles = [...state.map.tiles];
  newTiles[ty] = newRow;

  // Deduct immediate construction cost
  const newNations = state.nations.map((n) =>
    n.id === engineer.nationId ? { ...n, treasury: (n.treasury ?? 0) - cost } : n
  );

  return { ...state, map: { ...state.map, tiles: newTiles }, nations: newNations };
};
