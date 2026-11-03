import type { NationId, TileId } from "@/types/Common";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import type { BuildingType, ProductionOutput, WorkerGrade } from "@/types/Industry";
import type { TradeCommodity } from "@/types/Market";

/**
 * Everything a player (human UI or AI) can do is an Order. Each order names its nation and the
 * exact worker and tile it acts on, so no order can touch more than one worker (FR-003).
 */
interface OrderBase {
  nationId: NationId;
}

/** Plain move to any owned land tile. */
export interface MoveWorkerOrder extends OrderBase {
  kind: "moveWorker";
  workerId: string;
  toTileId: TileId;
}

/** Engineer moves onto an adjacent tile and starts a rail there (the map's rail-on-move). */
export interface MoveAndBuildRailOrder extends OrderBase {
  kind: "moveAndBuildRail";
  workerId: string;
  toTileId: TileId;
}

/** Prospector starts prospecting the tile it stands on. */
export interface StartProspectingOrder extends OrderBase {
  kind: "startProspecting";
  workerId: string;
  tileId: TileId;
}

/** Farmer, rancher, forester, miner, driller or developer raises the tile's resource one level. */
export interface StartDevelopmentOrder extends OrderBase {
  kind: "startDevelopment";
  workerId: string;
  tileId: TileId;
}

/** Engineer builds the named structure on the tile it stands on. */
export interface StartConstructionOrder extends OrderBase {
  kind: "startConstruction";
  workerId: string;
  tileId: TileId;
  structure: ConstructionKind;
}

/** Move, then start prospecting on the target; all or nothing (FR-007). */
export interface MoveAndStartProspectingOrder extends OrderBase {
  kind: "moveAndStartProspecting";
  workerId: string;
  toTileId: TileId;
}

/** Move, then start development on the target; all or nothing (FR-007). */
export interface MoveAndStartDevelopmentOrder extends OrderBase {
  kind: "moveAndStartDevelopment";
  workerId: string;
  toTileId: TileId;
}

/** Move, then build the named structure on the target; all or nothing (FR-007). */
export interface MoveAndStartConstructionOrder extends OrderBase {
  kind: "moveAndStartConstruction";
  workerId: string;
  toTileId: TileId;
  structure: ConstructionKind;
}

/** Undo this turn's move, or stop the worker's job, for the worker on `tileId`. */
export interface CancelWorkerActionOrder extends OrderBase {
  kind: "cancelWorkerAction";
  workerId: string;
  tileId: TileId;
}

/** Replace the nation's per-commodity transport plan for the coming turns. */
export interface SetTransportAllocationsOrder extends OrderBase {
  kind: "setTransportAllocations";
  allocations: Record<string, number>;
}

/**
 * Order (`delta` > 0) freight cars in the railyard: 1 lumber + 1 steel each now, 2 labour each in
 * the production phase. A negative `delta` gives back part of this turn's order for a refund (FR-039).
 */
export interface ChangeTransportCapacityOrder extends OrderBase {
  kind: "changeTransportCapacity";
  delta: number;
}

/** Set a building's standing production order for one of its outputs (FR-036). */
export interface SetProductionOrder extends OrderBase {
  kind: "setProduction";
  building: BuildingType;
  /** Defaults to the building's first output (lumber, hardware). */
  output?: ProductionOutput;
  amount: number;
}

/**
 * Raise a capped building `delta` capacity steps (default 1), paid with lumber and steel now
 * (FR-038). A negative delta cancels that many of this turn's steps, the last first, with a
 * refund (FR-057).
 */
export interface ExpandBuildingOrder extends OrderBase {
  kind: "expandBuilding";
  building: BuildingType;
  delta?: number;
}

/** Train `delta` workers one grade up this turn; a negative delta cancels with a refund (FR-041). */
export interface TrainWorkersOrder extends OrderBase {
  kind: "trainWorkers";
  from: WorkerGrade;
  delta: number;
}

/** Recruit `delta` migrants for canned food, clothing and furniture (FR-042). */
export interface RecruitWorkersOrder extends OrderBase {
  kind: "recruitWorkers";
  delta: number;
}

/**
 * Set this turn's world-market offer of a commodity to `amount` units: they leave the warehouse
 * now and are paid in the trade phase; a lower amount gives the difference back (FR-061).
 */
export interface SellCommodityOrder extends OrderBase {
  kind: "sellCommodity";
  commodity: TradeCommodity;
  amount: number;
}

/**
 * Set this turn's world-market bid for a commodity to `amount` units, paid now at the world price;
 * they reach the warehouse at the end of the turn. A lower amount is refunded (FR-062).
 */
export interface BuyCommodityOrder extends OrderBase {
  kind: "buyCommodity";
  commodity: TradeCommodity;
  amount: number;
}

export type Order =
  | MoveWorkerOrder
  | MoveAndBuildRailOrder
  | StartProspectingOrder
  | StartDevelopmentOrder
  | StartConstructionOrder
  | MoveAndStartProspectingOrder
  | MoveAndStartDevelopmentOrder
  | MoveAndStartConstructionOrder
  | CancelWorkerActionOrder
  | SetTransportAllocationsOrder
  | ChangeTransportCapacityOrder
  | SetProductionOrder
  | ExpandBuildingOrder
  | TrainWorkersOrder
  | RecruitWorkersOrder
  | SellCommodityOrder
  | BuyCommodityOrder;

export type OrderKind = Order["kind"];

export const ORDER_KINDS = [
  "moveWorker",
  "moveAndBuildRail",
  "startProspecting",
  "startDevelopment",
  "startConstruction",
  "moveAndStartProspecting",
  "moveAndStartDevelopment",
  "moveAndStartConstruction",
  "cancelWorkerAction",
  "setTransportAllocations",
  "changeTransportCapacity",
  "setProduction",
  "expandBuilding",
  "trainWorkers",
  "recruitWorkers",
  "sellCommodity",
  "buyCommodity",
] as const satisfies readonly OrderKind[];

/** Why an order was refused. A fixed list so UIs and AI players can switch on it (FR-004). */
export type RejectReason =
  | "unknown-nation"
  | "unknown-worker"
  | "not-owner"
  | "wrong-worker-type"
  | "worker-busy"
  | "worker-moved"
  | "invalid-target"
  | "tile-occupied"
  | "invalid-site"
  | "insufficient-funds"
  | "insufficient-resources"
  | "insufficient-labour"
  | "limit-reached"
  | "invalid-amount";

export type ValidationResult = { ok: true } | { ok: false; reason: RejectReason };
