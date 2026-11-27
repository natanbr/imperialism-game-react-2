// M18j (FR-638, FR-640): the scripted Great Power's Developer, and its Miner and Driller on the land it holds. Pure reads
// of what its own human could see (FR-497): its embassies and relation points, its cash and civilians, the public map
// with resources and holdings, the board prices and the turn limit. Never another nation's intents, workers or cash.
import { requiredDevelopmentTechnology } from "@/definisions/developmentTechnology";
import { FIXED_OUTPUT_TERRAINS } from "@/definisions/terrainDefinitions";
import { WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import { DEVELOPMENT_COST } from "@/definisions/workPrices";
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { MinorNation } from "@/types/MinorNation";
import type { Tile } from "@/types/Tile";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";
import { yieldAtLevel, yieldOf } from "../map/mapHelpers";
import { diplomacyAfterThisTurn } from "../market/partners";
import type { Order } from "../orders/Order";
import { DEVELOPMENT_TERRAINS, owns, treasuryOf, workersOf, type WorkerLocation } from "../orders/queries";
import { heldTilesOf, landPrice, landSiteRefusal, minorLandOf, overseasBarrier } from "../overseas/holdings";
import { overseasAmount, overseasShare, overseasUnits, overseasUnitValue, type OverseasCommodity } from "../overseas/profit";
import { cashReserve, turnsAfter } from "./economy";
import { upkeepReserve } from "./scriptedArmy";
import { embassySaving, grantSaving } from "./scriptedInfluence";

/** The improvers that may open a held seam or well; the others never go overseas (FR-638). */
const OVERSEAS_IMPROVERS: readonly WorkerType[] = [WorkerType.Miner, WorkerType.Driller];

/** The worker type can raise this tile to `level` under the home rules: its terrain, and the technology the level needs. */
function canRaise(state: GameState, nationId: NationId, type: WorkerType, tile: Tile, level: number): boolean {
  if (!OVERSEAS_IMPROVERS.includes(type) || !DEVELOPMENT_TERRAINS[type]?.includes(tile.terrain)) return false;
  if (FIXED_OUTPUT_TERRAINS.includes(tile.terrain)) return false;
  const techId = requiredDevelopmentTechnology(tile, level);
  return !techId || owns(state, nationId, techId);
}

/**
 * The trade phases up to the turn limit that pay when the first paid one is `delay` End Turns after this turn's. A
 * purchase settles just before this End Turn's trade phase (delay 0). A job ordered on turn T with duration D finishes
 * on the End Turn of T + D - 1, whose development phase comes before its trade phase: delay D - 1, or D for the level-1
 * job a bought seam gets on the next turn.
 */
const paidPhases = (state: GameState, delay: number): number => Math.max(0, turnsAfter(state) + 1 - delay);

/**
 * FR-636, FR-638: the share this End Turn's trade phase will pay the holder as far as it knows: on the record its own
 * diplomacy of this turn leaves (`diplomacyAfterThisTurn`), so a war it declares now pays nothing (its conquest would end
 * the holding too) and a grant that moves the relation level counts.
 */
const projectedShare = (state: GameState, nationId: NationId, minor: MinorNation): number | undefined =>
  overseasShare(diplomacyAfterThisTurn(state, nationId), nationId, minor);

/**
 * FR-636, FR-638: what `added` units on one of the nation's tiles in `minor` add to one trade phase. The phase pays the
 * holder's units there on that commodity together, rounded down once, so this is the rounded total with them less the
 * rounded total without them.
 */
function addedProfit(state: GameState, nationId: NationId, minor: MinorNation, commodity: OverseasCommodity, added: number, share: number): number {
  const unit = overseasUnitValue(state, commodity);
  const held = overseasUnits(state, nationId, minor.id, commodity);
  return overseasAmount(held + added, unit, share) - overseasAmount(held, unit, share);
}

/**
 * FR-638: an improver of `type` raising the held tile to its next level pays back: the units the level adds
 * (`addedProfit` at the `projectedShare`), from the End Turn the job finishes to the turn limit, cover its price (the
 * FR-028 durations; FR-634's home rules are checked by validation).
 */
function raisingPays(state: GameState, nationId: NationId, type: WorkerType, tile: Tile): boolean {
  const minor = minorLandOf(state, tile);
  const level = (tile.resource?.level ?? 0) + 1;
  const cost = DEVELOPMENT_COST[level as 1 | 2 | 3];
  if (!minor || cost === undefined || tile.developmentJob || !canRaise(state, nationId, type, tile, level)) return false;
  const share = projectedShare(state, nationId, minor);
  if (share === undefined) return false;
  const perPhase = addedProfit(state, nationId, minor, tile.resource!.type as OverseasCommodity, yieldAtLevel(tile, level) - yieldOf(tile), share);
  return perPhase * paidPhases(state, WorkerLevelDurationsTurns[type]![level as 1 | 2 | 3] - 1) >= cost;
}

/** A tile the Developer could buy, with what it would return before the turn limit (FR-638). */
export interface LandCandidate {
  tile: Tile;
  /** 20 x the board price, or the cash value of gold and gems (FR-632). */
  price: number;
  /** The level-1 job a seam or well needs before it yields ($100), else 0. */
  jobCost: number;
  /** What the tile adds to one trade phase at the projected share (`addedProfit`, FR-636). */
  perPhase: number;
  /** End Turns from now to the first paid trade phase. */
  delay: number;
  /** End Turns from now until the profit covers the price and the job. */
  payback: number;
}

/**
 * FR-638 (inferred): what the nation keeps before a purchase: its cash reserve (FR-454) or the upkeep reserve of its
 * garrison (FR-213), and either the embassy it saves for (FR-542) or the grants its influence plan will still give before
 * the next Council meeting (FR-490, `grantSaving`); never both, as a grant needs the embassy that one is saved for. This
 * turn's grant and war plans were made before the Developer plans.
 */
export const purchaseReserve = (state: GameState, nationId: NationId): number =>
  Math.max(cashReserve(state, nationId), upkeepReserve(state, nationId)) + Math.max(embassySaving(state, nationId), grantSaving(state, nationId));

/** The nation's idle improvers: Available, at no job this turn. The Developer plans after them (scriptedPlayer). */
const idleImprovers = (state: GameState, nationId: NationId): Worker[] =>
  workersOf(state, nationId).map(({ worker }) => worker).filter((w) => w.status === WorkerStatus.Available && OVERSEAS_IMPROVERS.includes(w.type));

/** A held tile that yields nothing yet and has no job: it waits for one of the idle improvers. */
const waitsForImprover = (tile: Tile): boolean => yieldOf(tile) === 0 && !tile.developmentJob;

/**
 * FR-638: the idle improvers left for a new seam or well. Each held tile still waiting for one keeps the first idle
 * improver whose job there pays (`raisingPays`); a held tile none would work, as under a war or a boycott, keeps none.
 */
function freeImprovers(state: GameState, nationId: NationId): Worker[] {
  const free = idleImprovers(state, nationId);
  for (const tile of heldTilesOf(state, nationId).filter(waitsForImprover)) {
    const kept = free.findIndex((w) => raisingPays(state, nationId, w.type, tile));
    if (kept >= 0) free.splice(kept, 1);
  }
  return free;
}

/**
 * FR-638: every tile the nation could buy now whose expected profit before the turn limit covers its price and any
 * level-1 job it needs, shortest payback first (then map order). A seam or well (yield 0 at level 0) needs one of the
 * `freeImprovers` able to open it (inferred). The profit is what the tile adds (`addedProfit`) at the `projectedShare`.
 * Reads the settled diplomacy record with its own diplomacy of this turn, the public holdings and the board prices,
 * never another nation's purchase of this turn.
 */
export function landCandidates(state: GameState, nationId: NationId): LandCandidate[] {
  const open = new Set(state.minorNations.filter((m) => overseasBarrier(state, nationId, m) === undefined).map((m) => m.id));
  if (open.size === 0) return [];
  const free = freeImprovers(state, nationId);
  const candidates: LandCandidate[] = [];
  for (const tile of state.map.tiles.flat()) {
    if (!tile.resource) continue;
    const minor = minorLandOf(state, tile);
    if (!minor || !open.has(minor.id) || landSiteRefusal(state, nationId, tile)) continue;
    const price = landPrice(state, tile);
    const share = projectedShare(state, nationId, minor);
    if (price === undefined || share === undefined) continue;
    const opened = yieldAtLevel(tile, 0) === 0;
    const improver = opened ? free.find((w) => canRaise(state, nationId, w.type, tile, 1)) : undefined;
    if (opened && !improver) continue;
    const perPhase = addedProfit(state, nationId, minor, tile.resource!.type as OverseasCommodity, yieldAtLevel(tile, opened ? 1 : 0), share);
    const delay = improver ? WorkerLevelDurationsTurns[improver.type]![1] : 0;
    const jobCost = improver ? DEVELOPMENT_COST[1] : 0;
    if (perPhase <= 0 || perPhase * paidPhases(state, delay) < price + jobCost) continue;
    candidates.push({ tile, price, jobCost, perPhase, delay, payback: delay + Math.ceil((price + jobCost) / perPhase) });
  }
  // The sort is stable: equal paybacks keep the map order.
  return candidates.sort((a, b) => a.payback - b.payback);
}

/**
 * FR-638: the Developer's Orders, best first: `buyLand` for each `landCandidates` tile the treasury pays while keeping
 * `purchaseReserve`. Never a development job (FR-630). Validation takes the first that is allowed.
 */
export function developerOrders(state: GameState, nationId: NationId, { worker }: WorkerLocation): Order[] {
  if (worker.type !== WorkerType.Developer) return [];
  const spare = treasuryOf(state, nationId) - purchaseReserve(state, nationId);
  return landCandidates(state, nationId)
    .filter((c) => c.price <= spare)
    .map((c): Order => ({ kind: "buyLand", nationId, workerId: worker.id, tileId: c.tile.id }));
}

/**
 * FR-638: a Miner's or Driller's jobs on the nation's held tiles, after its home candidates: the next level of each held
 * tile it can raise, in map order, when the job pays back (`raisingPays`).
 */
export function heldTileOrders(state: GameState, nationId: NationId, { worker, tile: standingOn }: WorkerLocation): Order[] {
  if (!OVERSEAS_IMPROVERS.includes(worker.type)) return [];
  return heldTilesOf(state, nationId).flatMap((tile): Order[] => {
    if (!raisingPays(state, nationId, worker.type, tile)) return [];
    return [tile.id === standingOn.id
      ? { kind: "startDevelopment", nationId, workerId: worker.id, tileId: tile.id }
      : { kind: "moveAndStartDevelopment", nationId, workerId: worker.id, toTileId: tile.id }];
  });
}
