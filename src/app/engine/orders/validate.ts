import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import { PROSPECTABLE_TERRAIN_TYPES } from "@/definisions/terrainDefinitions";
import { CONSTRUCTION_COST, DEVELOPMENT_COST, PROSPECT_COST } from "@/definisions/workPrices";
import { ResourceType } from "@/types/Resource";
import { areTilesAdjacent, canBuildRailAt } from "../map/mapHelpers";
import type {
  CancelWorkerActionOrder,
  ChangeTransportCapacityOrder,
  MoveAndBuildRailOrder,
  Order,
  RejectReason,
  SetTransportAllocationsOrder,
  ValidationResult,
} from "./Order";
import {
  DEVELOPMENT_TERRAINS,
  DEVELOPMENT_WORKER_TYPES,
  findWorker,
  hasMovedThisTurn,
  holdsJob,
  isLand,
  isPortSite,
  isWorkerBusy,
  nationById,
  nextResourceLevel,
  tileById,
  treasuryOf,
  type WorkerLocation,
} from "./queries";

export type { RejectReason, ValidationResult } from "./Order";

const OK: ValidationResult = { ok: true };
const reject = (reason: RejectReason): ValidationResult => ({ ok: false, reason });

type Checked<T> = { ok: true; value: T } | { ok: false; reason: RejectReason };

/**
 * Says whether `order` may be applied to `state` now, and if not, why (FR-004). Pure: the
 * state is only read. A rule here is the single source of truth for what the UI may offer and
 * what an AI may do.
 */
export function validateOrder(state: GameState, order: Order): ValidationResult {
  if (!nationById(state, order.nationId)) return reject("unknown-nation");

  switch (order.kind) {
    case "moveWorker":
      return validateMove(state, order.nationId, order.workerId, order.toTileId);
    case "moveAndBuildRail":
      return validateMoveAndBuildRail(state, order);
    case "startProspecting":
      return validateStart(state, order.nationId, order.workerId, order.tileId, checkProspecting);
    case "startDevelopment":
      return validateStart(state, order.nationId, order.workerId, order.tileId, checkDevelopment);
    case "startConstruction":
      return validateStart(state, order.nationId, order.workerId, order.tileId, constructionCheck(order.structure));
    case "moveAndStartProspecting":
      return validateMoveAndStart(state, order.nationId, order.workerId, order.toTileId, checkProspecting);
    case "moveAndStartDevelopment":
      return validateMoveAndStart(state, order.nationId, order.workerId, order.toTileId, checkDevelopment);
    case "moveAndStartConstruction":
      return validateMoveAndStart(state, order.nationId, order.workerId, order.toTileId, constructionCheck(order.structure));
    case "cancelWorkerAction":
      return validateCancel(state, order);
    case "setTransportAllocations":
      return validateAllocations(order);
    case "changeTransportCapacity":
      return validateCapacityChange(state, order);
    default: {
      const unknown: never = order;
      void unknown;
      return reject("invalid-target");
    }
  }
}

// --- workers -------------------------------------------------------------------------------

/** The worker exists, belongs to the nation, is not working and has not moved this turn (FR-006). */
function checkActor(state: GameState, nationId: string, workerId: string): Checked<WorkerLocation> {
  const loc = findWorker(state, workerId);
  if (!loc) return { ok: false, reason: "unknown-worker" };
  if (loc.worker.nationId !== nationId) return { ok: false, reason: "not-owner" };
  if (isWorkerBusy(loc.tile, loc.worker)) return { ok: false, reason: "worker-busy" };
  if (hasMovedThisTurn(loc.worker)) return { ok: false, reason: "worker-moved" };
  return { ok: true, value: loc };
}

function checkMoveTarget(state: GameState, nationId: string, from: Tile, toTileId: string): Checked<Tile> {
  const to = tileById(state, toTileId);
  if (!to || to.id === from.id || !isLand(to)) return { ok: false, reason: "invalid-target" };
  if (to.ownerNationId !== nationId) return { ok: false, reason: "not-owner" };
  return { ok: true, value: to };
}

function validateMove(state: GameState, nationId: string, workerId: string, toTileId: string): ValidationResult {
  const actor = checkActor(state, nationId, workerId);
  if (!actor.ok) return actor;
  const target = checkMoveTarget(state, nationId, actor.value.tile, toTileId);
  return target.ok ? OK : target;
}

function validateMoveAndBuildRail(state: GameState, order: MoveAndBuildRailOrder): ValidationResult {
  const actor = checkActor(state, order.nationId, order.workerId);
  if (!actor.ok) return actor;
  const { worker, tile: from } = actor.value;
  if (worker.type !== WorkerType.Engineer) return reject("wrong-worker-type");
  const target = checkMoveTarget(state, order.nationId, from, order.toTileId);
  if (!target.ok) return target;
  const to = target.value;
  if (!areTilesAdjacent(state.map, from.x, from.y, to.x, to.y)) return reject("invalid-target");
  if (to.constructionJob && !to.constructionJob.completed) return reject("tile-occupied");
  if (!canBuildRailAt(state.map, to.x, to.y, order.nationId)) return reject("invalid-site");
  if (treasuryOf(state, order.nationId) < CONSTRUCTION_COST.rail) return reject("insufficient-funds");
  return OK;
}

/** Job rules for a worker standing on `tile` (the actor checks are done by the caller). */
type JobCheck = (state: GameState, worker: Worker, tile: Tile) => ValidationResult;

function validateStart(state: GameState, nationId: string, workerId: string, tileId: string, check: JobCheck): ValidationResult {
  const actor = checkActor(state, nationId, workerId);
  if (!actor.ok) return actor;
  if (actor.value.tile.id !== tileId) return reject("invalid-target");
  return check(state, actor.value.worker, actor.value.tile);
}

/** All or nothing: the move must be legal and the job must be startable on the target (FR-007). */
function validateMoveAndStart(state: GameState, nationId: string, workerId: string, toTileId: string, check: JobCheck): ValidationResult {
  const actor = checkActor(state, nationId, workerId);
  if (!actor.ok) return actor;
  const { worker, tile: from } = actor.value;
  // Already on the target (the construction modal does this): it is a plain start.
  if (toTileId === from.id) return check(state, worker, from);
  const target = checkMoveTarget(state, nationId, from, toTileId);
  if (!target.ok) return target;
  return check(state, worker, target.value);
}

const checkProspecting: JobCheck = (state, worker, tile) => {
  if (worker.type !== WorkerType.Prospector) return reject("wrong-worker-type");
  if (tile.ownerNationId !== worker.nationId) return reject("not-owner");
  if (!PROSPECTABLE_TERRAIN_TYPES.includes(tile.terrain)) return reject("invalid-site");
  if (!tile.resource || tile.resource.discovered) return reject("invalid-target");
  if (tile.prospecting) return reject("tile-occupied");
  if (treasuryOf(state, worker.nationId) < PROSPECT_COST) return reject("insufficient-funds");
  return OK;
};

const checkDevelopment: JobCheck = (state, worker, tile) => {
  if (!DEVELOPMENT_WORKER_TYPES.includes(worker.type)) return reject("wrong-worker-type");
  if (tile.ownerNationId !== worker.nationId) return reject("not-owner");
  const terrains = DEVELOPMENT_TERRAINS[worker.type];
  if (terrains && !terrains.includes(tile.terrain)) return reject("invalid-site");
  if (!tile.resource || tile.resource.discovered === false) return reject("invalid-target");
  const level = nextResourceLevel(tile);
  if (level > 3) return reject("invalid-target");
  // A finished job stays on the tile until the next turn and blocks a new one until then.
  if (tile.developmentJob) return reject("tile-occupied");
  if (treasuryOf(state, worker.nationId) < DEVELOPMENT_COST[level as 1 | 2 | 3]) return reject("insufficient-funds");
  return OK;
};

const constructionCheck = (structure: ConstructionKind): JobCheck => (state, worker, tile) => {
  if (worker.type !== WorkerType.Engineer) return reject("wrong-worker-type");
  if (tile.ownerNationId !== worker.nationId) return reject("not-owner");
  if (!Object.hasOwn(CONSTRUCTION_COST, structure)) return reject("invalid-target");
  if (tile.constructionJob && !tile.constructionJob.completed) return reject("tile-occupied");
  if (structure === "port" && !isPortSite(state, tile)) return reject("invalid-site");
  if (treasuryOf(state, worker.nationId) < CONSTRUCTION_COST[structure]) return reject("insufficient-funds");
  return OK;
};

function validateCancel(state: GameState, order: CancelWorkerActionOrder): ValidationResult {
  const loc = findWorker(state, order.workerId);
  if (!loc) return reject("unknown-worker");
  if (loc.worker.nationId !== order.nationId) return reject("not-owner");
  if (loc.tile.id !== order.tileId) return reject("invalid-target");
  if (loc.worker.status === WorkerStatus.Working || holdsJob(loc.tile, loc.worker.id)) return OK;
  if (loc.worker.status === WorkerStatus.Moved && loc.worker.previousTileId && tileById(state, loc.worker.previousTileId)) return OK;
  return reject("invalid-target");
}

// --- transport -----------------------------------------------------------------------------

const isAmount = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

function validateAllocations(order: SetTransportAllocationsOrder): ValidationResult {
  if (!order.allocations || typeof order.allocations !== "object") return reject("invalid-amount");
  return Object.values(order.allocations).every(isAmount) ? OK : reject("invalid-amount");
}

function validateCapacityChange(state: GameState, order: ChangeTransportCapacityOrder): ValidationResult {
  const { delta } = order;
  if (!Number.isInteger(delta) || delta === 0) return reject("invalid-amount");
  const nation = nationById(state, order.nationId)!;
  if (delta > 0) {
    const coal = nation.warehouse[ResourceType.Coal] ?? 0;
    const iron = nation.warehouse[ResourceType.IronOre] ?? 0;
    return coal >= delta && iron >= delta ? OK : reject("insufficient-resources");
  }
  const pending = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));
  return pending >= -delta ? OK : reject("invalid-amount");
}
