import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { WorkerStatus, type Worker } from "@/types/Workers";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import { DEVELOPMENT_COST, PROSPECT_COST, constructionCost } from "@/definisions/workPrices";
import { EngineerBuildDurationsTurns, WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import type { CancelWorkerActionOrder, ChangeTransportCapacityOrder, Order, ValidationResult } from "./Order";
import { validateOrder } from "./validate";
import { findWorker, holdsJob, nextResourceLevel, tileById, type WorkerLocation } from "./queries";

/**
 * Validates the order and, if it is valid, performs its immediate effects (FR-005). A refused
 * order returns the very same state object, so callers can compare by reference.
 */
export function tryApplyOrder(state: GameState, order: Order): { state: GameState; result: ValidationResult } {
  const result = validateOrder(state, order);
  if (!result.ok) return { state, result };
  return { state: applyValidOrder(state, order), result };
}

export function applyOrder(state: GameState, order: Order): GameState {
  return tryApplyOrder(state, order).state;
}

function applyValidOrder(state: GameState, order: Order): GameState {
  switch (order.kind) {
    case "moveWorker":
      return relocate(state, findWorker(state, order.workerId)!, tileById(state, order.toTileId)!);
    case "moveAndBuildRail":
      return moveThenStart(state, order.workerId, order.toTileId, construction("rail"));
    case "startProspecting":
      return startProspecting(state, order.workerId, order.tileId);
    case "startDevelopment":
      return startDevelopment(state, order.workerId, order.tileId);
    case "startConstruction":
      return construction(order.structure)(state, order.workerId, order.tileId);
    case "moveAndStartProspecting":
      return moveThenStart(state, order.workerId, order.toTileId, startProspecting);
    case "moveAndStartDevelopment":
      return moveThenStart(state, order.workerId, order.toTileId, startDevelopment);
    case "moveAndStartConstruction":
      return moveThenStart(state, order.workerId, order.toTileId, construction(order.structure));
    case "cancelWorkerAction":
      return cancel(state, order);
    case "setTransportAllocations":
      return {
        ...state,
        transportAllocationsByNation: {
          ...(state.transportAllocationsByNation ?? {}),
          [order.nationId]: { ...order.allocations },
        },
      };
    case "changeTransportCapacity":
      return changeCapacity(state, order);
  }
}

// --- state updates (each returns a new state and never touches its input) -------------------

function mapTiles(state: GameState, fn: (tile: Tile) => Tile): GameState {
  return {
    ...state,
    map: { ...state.map, tiles: state.map.tiles.map((row) => row.map(fn)) },
  };
}

function updateTile(state: GameState, tileId: string, fn: (tile: Tile) => Tile): GameState {
  return mapTiles(state, (t) => (t.id === tileId ? fn(t) : t));
}

const updateWorker = (tile: Tile, workerId: string, patch: Partial<Worker>): Tile => ({
  ...tile,
  workers: tile.workers.map((w) => (w.id === workerId ? { ...w, ...patch } : w)),
});

function charge(state: GameState, nationId: string, cost: number): GameState {
  return {
    ...state,
    nations: state.nations.map((n) => (n.id === nationId ? { ...n, treasury: (n.treasury ?? 0) - cost } : n)),
  };
}

/** Takes the worker off its tile and puts it last on `to`, marked as moved this turn. */
function relocate(state: GameState, { worker, tile: from }: WorkerLocation, to: Tile): GameState {
  const moved: Worker = {
    ...worker,
    assignedTileId: to.id,
    justMoved: true,
    status: WorkerStatus.Moved,
    previousTileId: from.id,
  };
  return mapTiles(state, (t) => {
    if (t.id === from.id) return { ...t, workers: t.workers.filter((w) => w.id !== worker.id) };
    if (t.id === to.id) return { ...t, workers: [...t.workers, moved] };
    return t;
  });
}

type StartJob = (state: GameState, workerId: string, tileId: string) => GameState;

function moveThenStart(state: GameState, workerId: string, toTileId: string, start: StartJob): GameState {
  const loc = findWorker(state, workerId)!;
  if (loc.tile.id === toTileId) return start(state, workerId, toTileId);
  return start(relocate(state, loc, tileById(state, toTileId)!), workerId, toTileId);
}

const startProspecting: StartJob = (state, workerId, tileId) => {
  const { worker } = findWorker(state, workerId)!;
  return updateTile(charge(state, worker.nationId, PROSPECT_COST), tileId, (t) => ({
    ...updateWorker(t, workerId, { status: WorkerStatus.Working }),
    prospecting: { startedOnTurn: state.turn, workerId },
  }));
};

const startDevelopment: StartJob = (state, workerId, tileId) => {
  const { worker, tile } = findWorker(state, workerId)!;
  const targetLevel = nextResourceLevel(tile) as 1 | 2 | 3;
  const durationTurns = WorkerLevelDurationsTurns[worker.type]?.[targetLevel] || 1;
  return updateTile(charge(state, worker.nationId, DEVELOPMENT_COST[targetLevel]), tileId, (t) => ({
    ...updateWorker(t, workerId, { status: WorkerStatus.Working }),
    developmentJob: { workerId, workerType: worker.type, targetLevel, startedOnTurn: state.turn, durationTurns },
  }));
};

const construction = (kind: ConstructionKind): StartJob => (state, workerId, tileId) => {
  const { worker } = findWorker(state, workerId)!;
  const durationTurns = EngineerBuildDurationsTurns[kind] || 1;
  const cost = constructionCost(kind, tileById(state, tileId)!.terrain);
  return updateTile(charge(state, worker.nationId, cost), tileId, (t) => ({
    ...updateWorker(t, workerId, { status: WorkerStatus.Working }),
    constructionJob: { workerId, kind, startedOnTurn: state.turn, durationTurns },
  }));
};

/**
 * Stops the worker's job (no refund), or undoes this turn's move. A worker that moved this
 * turn stays marked as moved after its job is cancelled, so it cannot move a second time; a
 * second cancel then sends it back.
 */
function cancel(state: GameState, order: CancelWorkerActionOrder): GameState {
  const { worker, tile } = findWorker(state, order.workerId)!;

  if (worker.status === WorkerStatus.Working || holdsJob(tile, worker.id)) {
    const movedThisTurn = worker.justMoved && !!worker.previousTileId;
    return updateTile(state, tile.id, (t) => ({
      ...updateWorker(t, worker.id, { status: movedThisTurn ? WorkerStatus.Moved : WorkerStatus.Available }),
      prospecting: t.prospecting?.workerId === worker.id ? undefined : t.prospecting,
      developmentJob: t.developmentJob?.workerId === worker.id ? undefined : t.developmentJob,
      constructionJob: t.constructionJob?.workerId === worker.id ? undefined : t.constructionJob,
    }));
  }

  const homeId = worker.previousTileId!;
  const returned: Worker = {
    ...worker,
    status: WorkerStatus.Available,
    justMoved: false,
    previousTileId: undefined,
    assignedTileId: homeId,
  };
  return mapTiles(state, (t) => {
    if (t.id === tile.id) return { ...t, workers: t.workers.filter((w) => w.id !== worker.id) };
    if (t.id === homeId) return { ...t, workers: [...t.workers, returned] };
    return t;
  });
}

function changeCapacity(state: GameState, order: ChangeTransportCapacityOrder): GameState {
  const { delta } = order;
  return {
    ...state,
    nations: state.nations.map((n) => {
      if (n.id !== order.nationId) return n;
      const pending = Math.max(0, Math.floor(n.transportCapacityPendingIncrease ?? 0));
      const warehouse = { ...n.warehouse };
      // One coal and one iron ore per unit; a negative delta gives them back.
      warehouse[ResourceType.Coal] = (warehouse[ResourceType.Coal] ?? 0) - delta;
      warehouse[ResourceType.IronOre] = (warehouse[ResourceType.IronOre] ?? 0) - delta;
      return { ...n, warehouse, transportCapacityPendingIncrease: pending + delta };
    }),
  };
}
