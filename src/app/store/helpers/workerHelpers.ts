// Store-side adapters from the pre-M1 worker actions to engine orders (FR-017). Every action
// goes through validateOrder/applyOrder, so the engine's rules hold in the running app.
// Part B replaces these with direct order submission and removes this file.
import { GameState } from "@/types/GameState";
import { WorkerType } from "@/types/Workers";
import { ConstructionKind } from "@/types/jobs/ConstructionJob";
import { applyOrder, tryApplyOrder } from "@/engine/orders/apply";
import {
  MoveAndStartConstructionOrder,
  MoveAndStartDevelopmentOrder,
  MoveAndStartProspectingOrder,
} from "@/engine/orders/Order";
import { findWorker } from "@/engine/orders/queries";
import { startDeveloperWork } from '../../workers/DeveloperWorker';
import { startEngineerWork } from '../../workers/EngineerWorker';
import { moveWorker } from '../../workers/moveWorker';
import { startProspectorWork } from '../../workers/ProspectorWorker';
import { startFarmerWork } from '../../workers/FarmerWorker';
import { startMinerWork } from '../../workers/MinerWorker';
import { startRancherWork } from '../../workers/RancherWorker';
import { startForesterWork } from '../../workers/ForesterWorker';
import { startDrillerWork } from '../../workers/DrillerWorker';

export { moveWorker, startDeveloperWork, startEngineerWork, startProspectorWork, startFarmerWork, startMinerWork, startRancherWork, startForesterWork, startDrillerWork };

const ownerOf = (state: GameState, workerId: string): string | undefined =>
  findWorker(state, workerId)?.worker.nationId;

type MoveAndStartOrder = MoveAndStartProspectingOrder | MoveAndStartDevelopmentOrder | MoveAndStartConstructionOrder;

/**
 * Moves the worker and starts its job, all or nothing (FR-007): an unaffordable job refuses
 * the whole action by its reason code. Kept UI behaviour until part B: when the job is refused
 * for another reason, the worker still makes the plain move, which is validated on its own.
 */
function moveAndStart(state: GameState, order: MoveAndStartOrder): GameState {
  const { state: next, result } = tryApplyOrder(state, order);
  if (result.ok || result.reason === "insufficient-funds") return next;
  return applyOrder(state, { kind: "moveWorker", nationId: order.nationId, workerId: order.workerId, toTileId: order.toTileId });
}

export const moveSelectedWorkerToTileHelper = (
  state: GameState,
  targetTileId: string,
  selectedWorkerId: string
): GameState => {
  const nationId = selectedWorkerId ? ownerOf(state, selectedWorkerId) : undefined;
  if (!nationId) return state;
  return applyOrder(state, { kind: "moveWorker", nationId, workerId: selectedWorkerId, toTileId: targetTileId });
};

export function startProspectingHelper(state: GameState, tileId: string, workerId: string): GameState {
  const nationId = ownerOf(state, workerId);
  if (!nationId) return state;
  return applyOrder(state, { kind: "startProspecting", nationId, workerId, tileId });
}

/**
 * Get the appropriate start function for a development worker type
 * Centralized mapping to avoid duplication across the codebase
 */
export function getStartDevelopmentFunction(workerType: WorkerType): (state: GameState, workerId?: string) => GameState {
  switch (workerType) {
    case WorkerType.Farmer:
      return startFarmerWork;
    case WorkerType.Miner:
      return startMinerWork;
    case WorkerType.Rancher:
      return startRancherWork;
    case WorkerType.Forester:
      return startForesterWork;
    case WorkerType.Driller:
      return startDrillerWork;
    case WorkerType.Developer:
      return startDeveloperWork;
    default:
      return startDeveloperWork; // fallback
  }
}

export function startDevelopmentHelper(state: GameState, tileId: string, workerId: string, workerType: WorkerType): GameState {
  const loc = findWorker(state, workerId);
  if (!loc || loc.worker.type !== workerType) return state;
  return applyOrder(state, { kind: "startDevelopment", nationId: loc.worker.nationId, workerId, tileId });
}

export function startConstructionHelper(state: GameState, tileId: string, workerId: string, kind: ConstructionKind): GameState {
  const nationId = ownerOf(state, workerId);
  if (!nationId) return state;
  return applyOrder(state, { kind: "startConstruction", nationId, workerId, tileId, structure: kind });
}

export const cancelActionHelper = (state: GameState, tileId: string, workerId: string): GameState => {
  const nationId = ownerOf(state, workerId);
  if (!nationId) return state;
  return applyOrder(state, { kind: "cancelWorkerAction", nationId, workerId, tileId });
};

export function moveAndStartProspectingHelper(state: GameState, targetTileId: string, workerId: string): GameState {
  const nationId = ownerOf(state, workerId);
  if (!nationId) return state;
  return moveAndStart(state, { kind: "moveAndStartProspecting", nationId, workerId, toTileId: targetTileId });
}

export function moveAndStartDevelopmentHelper(state: GameState, targetTileId: string, workerId: string, workerType: WorkerType): GameState {
  const loc = findWorker(state, workerId);
  if (!loc) return state;
  const nationId = loc.worker.nationId;
  // As before M1: a job for another worker type cannot start, so this is a plain move.
  if (loc.worker.type !== workerType) {
    return applyOrder(state, { kind: "moveWorker", nationId, workerId, toTileId: targetTileId });
  }
  return moveAndStart(state, { kind: "moveAndStartDevelopment", nationId, workerId, toTileId: targetTileId });
}

export function moveAndStartConstructionHelper(
  state: GameState,
  targetTileId: string,
  workerId: string,
  kind: ConstructionKind
): GameState {
  const nationId = ownerOf(state, workerId);
  if (!nationId) return state;
  return moveAndStart(state, { kind: "moveAndStartConstruction", nationId, workerId, toTileId: targetTileId, structure: kind });
}
