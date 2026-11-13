import type { CountryId, NationId, ProvinceId, RegimentId, TileId } from "@/types/Common";
import type { GrantAmount, Overture, SubsidyPercent, WithdrawableOverture } from "@/types/Diplomacy";
import type { ConstructionKind } from "@/types/jobs/ConstructionJob";
import type { BuildingType, ProductionOutput, WorkerGrade } from "@/types/Industry";
import type { TradeCommodity } from "@/types/Market";
import type { RegimentType } from "@/types/Unit";

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

/**
 * Engineer moves onto an adjacent tile without rail and builds the rail section from the tile he
 * leaves, when that is a rail node (the map's rail-on-move); else from the target's first rail
 * neighbour (FR-137).
 */
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
  /**
   * Rail only: the neighbouring rail node the section starts from; the tile may then already have
   * rail (FR-137). Without it, the tile's first rail neighbour, onto a tile without rail.
   */
  fromTileId?: TileId;
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
  /** Rail only: as on `startConstruction` (FR-137). */
  fromTileId?: TileId;
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

/**
 * Diplomacy (FR-161, decision 5): each of these stores an intent that the diplomacy phase resolves at End
 * Turn; nothing of the target changes when it is applied. A consulate ($500), an embassy ($5,000) and a
 * grant are paid when ordered; every one can be taken back until End Turn (`withdrawOverture`).
 */
export interface ProposeOvertureOrder extends OrderBase {
  kind: "proposeOverture";
  overture: Overture;
  targetId: CountryId;
}

/** A grant of one of the four Imp1 sizes, once or locked (repeated each turn, FR-170). A second one this turn for the target replaces it. */
export interface GiveGrantOrder extends OrderBase {
  kind: "giveGrant";
  targetId: CountryId;
  amount: GrantAmount;
  locked: boolean;
}

/** The nation's subsidy toward the target (0 removes it) and whether it boycotts it (FR-171). A second one this turn replaces it. */
export interface SetTradePolicyOrder extends OrderBase {
  kind: "setTradePolicy";
  targetId: CountryId;
  subsidyPercent: 0 | SubsidyPercent;
  boycott: boolean;
}

/** Takes back this turn's overture, grant or trade policy with its cost; "grant" with none this turn ends a standing locked grant. */
export interface WithdrawOvertureOrder extends OrderBase {
  kind: "withdrawOverture";
  overture: WithdrawableOverture;
  targetId: CountryId;
}

/** Answers a proposal made to the nation last turn (FR-166, FR-175); a second answer this turn replaces the first. */
export interface AnswerProposalOrder extends OrderBase {
  kind: "answerProposal";
  proposalId: string;
  accept: boolean;
}

/**
 * How many regiments of the type the nation recruits this turn (FR-200), like `setProduction`: raising it takes the
 * difference's cash, armaments, horses and workers (one of the regiment's grade each) at once, lowering it gives them
 * back. The regiments join the army in the capital province at End Turn (FR-201).
 */
export interface SetRecruitmentOrder extends OrderBase {
  kind: "setRecruitment";
  regiment: RegimentType;
  count: number;
}

/**
 * Marches regiments of the nation's army in `fromProvinceId` into a bordering province (FR-205): stores a move intent
 * that the combat phase resolves (FR-206). A later order for a regiment replaces its earlier one.
 */
export interface MoveArmyOrder extends OrderBase {
  kind: "moveArmy";
  fromProvinceId: ProvinceId;
  regimentIds: RegimentId[];
  toProvinceId: ProvinceId;
}

/** Takes the regiments out of this turn's move intents (FR-205). */
export interface CancelArmyMoveOrder extends OrderBase {
  kind: "cancelArmyMove";
  regimentIds: RegimentId[];
}

/** Disbands regiments of the nation's army in the province at End Turn, before the upkeep step; nothing comes back (FR-207). */
export interface DisbandRegimentsOrder extends OrderBase {
  kind: "disbandRegiments";
  provinceId: ProvinceId;
  regimentIds: RegimentId[];
}

/** Takes the regiments out of this turn's disband intents, so they stay (FR-207; M8 review F4). */
export interface CancelDisbandOrder extends OrderBase {
  kind: "cancelDisband";
  regimentIds: RegimentId[];
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
  | BuyCommodityOrder
  | ProposeOvertureOrder
  | GiveGrantOrder
  | SetTradePolicyOrder
  | WithdrawOvertureOrder
  | AnswerProposalOrder
  | SetRecruitmentOrder
  | MoveArmyOrder
  | CancelArmyMoveOrder
  | DisbandRegimentsOrder
  | CancelDisbandOrder;

export type OrderKind = Order["kind"];

/** The diplomacy orders (FR-161). */
export type DiplomacyOrder = ProposeOvertureOrder | GiveGrantOrder | SetTradePolicyOrder | WithdrawOvertureOrder | AnswerProposalOrder;

/** The army orders (FR-200, FR-205, FR-207). */
export type ArmyOrder = SetRecruitmentOrder | MoveArmyOrder | CancelArmyMoveOrder | DisbandRegimentsOrder | CancelDisbandOrder;

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
  "proposeOverture",
  "giveGrant",
  "setTradePolicy",
  "withdrawOverture",
  "answerProposal",
  "setRecruitment",
  "moveArmy",
  "cancelArmyMove",
  "disbandRegiments",
  "cancelDisband",
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
  /** The tile already has a job (prospecting, development or construction): one job per tile (FR-113). */
  | "tile-has-job"
  | "invalid-site"
  | "insufficient-funds"
  | "insufficient-resources"
  | "insufficient-labour"
  | "limit-reached"
  | "invalid-amount"
  /** The last turn has resolved; nothing more can be ordered (FR-069). */
  | "game-over"
  /** Diplomacy (FR-162): an embassy or a subsidy needs a consulate established before this turn. */
  | "needs-consulate"
  /** Diplomacy (FR-162): a pact or a grant needs an embassy. */
  | "needs-embassy"
  /** Diplomacy (FR-162): held already, or already ordered this turn. */
  | "already-in-place"
  /** Diplomacy (FR-162): not while at war with the target. */
  | "at-war"
  /** Diplomacy (FR-162): peace while not at war. */
  | "not-at-war"
  /** "Partners" market (FR-252): no minor nation offers the commodity this turn. */
  | "no-seller"
  /** "Partners" market (FR-252): every minor that offers it is barred to the nation (no consulate, war, boycott). */
  | "sellers-barred"
  /** "Partners" market (FR-253): no minor nation wants it and no other Great Power can bid for it this turn. */
  | "no-buyer"
  /** "Partners" market (FR-253): every country that could buy it is barred to the nation. */
  | "buyers-barred"
  /** Armies (FR-205): the province does not border the army's province. */
  | "not-adjacent"
  /** Armies (FR-205, M8): a march into a country at war with the nation is an attack, which M9 builds (FR-216). */
  | "attack-not-available";

export type ValidationResult = { ok: true } | { ok: false; reason: RejectReason };
