import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { WorkerStatus, type Worker } from "@/types/Workers";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import { DEVELOPMENT_COST, PROSPECT_COST, constructionCost } from "@/definisions/workPrices";
import { EngineerBuildDurationsTurns, WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import type { CancelWorkerActionOrder, Order, ValidationResult } from "./Order";
import { validateOrder } from "./validate";
import {
  applyCapacityChange,
  applyExpandBuilding,
  applyRecruitWorkers,
  applySetProduction,
  applyTrainWorkers,
} from "./industryOrders";
import { applyBuyCommodity, applySellCommodity } from "./tradeOrders";
import {
  findWorker,
  holdsJob,
  nextResourceLevel,
  railConstructionStart,
  railOnMoveStart,
  tileById,
  type WorkerLocation,
} from "./queries";

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
    case "moveAndBuildRail": {
      // The section starts from the tile the engineer leaves, so it is found before he moves (FR-137)
      const start = railOnMoveStart(state, order.nationId, findWorker(state, order.workerId)!.tile, tileById(state, order.toTileId)!)!;
      return moveThenStart(state, order.workerId, order.toTileId, construction("rail", start.id));
    }
    case "startProspecting":
      return startProspecting(state, order.workerId, order.tileId);
    case "startDevelopment":
      return startDevelopment(state, order.workerId, order.tileId);
    case "startConstruction":
      return construction(order.structure, railStartId(state, order.nationId, order.tileId, order.structure, order.fromTileId))(
        state,
        order.workerId,
        order.tileId
      );
    case "moveAndStartProspecting":
      return moveThenStart(state, order.workerId, order.toTileId, startProspecting);
    case "moveAndStartDevelopment":
      return moveThenStart(state, order.workerId, order.toTileId, startDevelopment);
    case "moveAndStartConstruction":
      return moveThenStart(
        state,
        order.workerId,
        order.toTileId,
        construction(order.structure, railStartId(state, order.nationId, order.toTileId, order.structure, order.fromTileId))
      );
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
      return applyCapacityChange(state, order);
    case "setProduction":
      return applySetProduction(state, order);
    case "expandBuilding":
      return applyExpandBuilding(state, order);
    case "trainWorkers":
      return applyTrainWorkers(state, order);
    case "recruitWorkers":
      return applyRecruitWorkers(state, order);
    case "sellCommodity":
      return applySellCommodity(state, order);
    case "buyCommodity":
      return applyBuyCommodity(state, order);
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

/** The id of the tile a rail construction's section starts from (FR-137); undefined for other structures. */
const railStartId = (state: GameState, nationId: string, tileId: string, kind: ConstructionKind, fromTileId?: string): string | undefined =>
  kind === "rail" ? railConstructionStart(state, nationId, tileById(state, tileId)!, fromTileId)!.id : undefined;

const construction = (kind: ConstructionKind, railFrom?: string): StartJob => (state, workerId, tileId) => {
  const { worker } = findWorker(state, workerId)!;
  const durationTurns = EngineerBuildDurationsTurns[kind] || 1;
  const cost = constructionCost(kind, tileById(state, tileId)!.terrain);
  return updateTile(charge(state, worker.nationId, cost), tileId, (t) => ({
    ...updateWorker(t, workerId, { status: WorkerStatus.Working }),
    constructionJob: { workerId, kind, startedOnTurn: state.turn, durationTurns, ...(railFrom ? { railFrom } : {}) },
  }));
};

/**
 * What the worker's job on this tile cost, if it was ordered this turn: orders can be cancelled
 * until End Turn and the cash comes back (FR-031). A job from an earlier turn refunds nothing.
 */
function refundThisTurn(state: GameState, tile: Tile, workerId: string): number {
  const now = (startedOnTurn: number) => startedOnTurn === state.turn;
  let refund = 0;
  if (tile.prospecting?.workerId === workerId && now(tile.prospecting.startedOnTurn)) refund += PROSPECT_COST;
  const dev = tile.developmentJob;
  if (dev?.workerId === workerId && now(dev.startedOnTurn)) refund += DEVELOPMENT_COST[dev.targetLevel] ?? 0;
  const con = tile.constructionJob;
  if (con?.workerId === workerId && now(con.startedOnTurn)) refund += constructionCost(con.kind, tile.terrain);
  return refund;
}

/**
 * Stops the worker's job (refunded if ordered this turn), or undoes this turn's move. A worker
 * that moved this turn stays marked as moved after its job is cancelled, so it cannot move a
 * second time; a second cancel then sends it back.
 */
function cancel(state: GameState, order: CancelWorkerActionOrder): GameState {
  const { worker, tile } = findWorker(state, order.workerId)!;

  if (worker.status === WorkerStatus.Working || holdsJob(tile, worker.id)) {
    const movedThisTurn = worker.justMoved && !!worker.previousTileId;
    const refunded = charge(state, worker.nationId, -refundThisTurn(state, tile, worker.id));
    return updateTile(refunded, tile.id, (t) => ({
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
