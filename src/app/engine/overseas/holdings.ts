// M18j (FR-631 to FR-634): the Developer's land purchases in Minor Nations and the holdings they leave. Pure reads for
// validation, the views and the planner, and the settlement phase that runs right after the development phase.
// Validation reads the settled diplomacy record and the public holdings only, never another nation's intents (FR-640).
import { GEMS_CASH_PER_UNIT, GOLD_CASH_PER_UNIT } from "@/definisions/cashValues";
import { BUYABLE_LAND_RESOURCES, BUYABLE_LAND_TERRAINS, LAND_PRICE_MULTIPLE } from "@/definisions/developerRules";
import type { NationId, TileId } from "@/types/Common";
import type { GameState, OverseasHolding } from "@/types/GameState";
import type { BuyLandIntent, Intent } from "@/types/Intent";
import type { MinorNation } from "@/types/MinorNation";
import { ResourceType } from "@/types/Resource";
import type { Tile } from "@/types/Tile";
import { WorkerStatus, WorkerType, type Worker } from "@/types/Workers";
import type { TurnSystem } from "../turn/context";
import { byIntentOrder } from "../turn/intents";
import { relationOf } from "../diplomacy/relations";
import { isTradeCommodity, marketOf, priceOf } from "../market/market";
import { partnerRanking } from "../market/partners";
import { minorNationAt } from "../world/countries";
import { DEVELOPMENT_WORKER_TYPES, tileById } from "../orders/queries";

export const isBuyLandIntent = (intent: Intent): intent is BuyLandIntent => intent.kind === "buy-land";

/** The Great Power that holds the tile (FR-634), or undefined. */
export const holderOf = (state: GameState, tileId: TileId): NationId | undefined => state.overseasLand?.[tileId]?.holderId;

/** The Minor Nation whose land the tile is: in one of its provinces and owned by no Great Power (FR-149). */
export const minorLandOf = (state: GameState, tile: Tile): MinorNation | undefined =>
  tile.ownerNationId === undefined ? minorNationAt(state, tile) : undefined;

/** Why a Great Power's Developer may not enter a Minor Nation, or buy there, now (FR-631). */
export type OverseasBarrier = "colony" | "at-war" | "boycott" | "needs-embassy";

/**
 * FR-631, FR-633: the Developer may enter and buy in an independent Minor Nation where its nation holds an embassy in
 * the settled record, while no war between the two has begun at `turn` and neither boycotts the other; and in its own
 * colony whose land is still the Minor Nation's, which needs no embassy (overtures to a colony are refused). A war
 * declared on turn T begins on T + 1 (FR-167), so the End Turn of T still sells.
 */
export function overseasBarrier(state: GameState, nationId: NationId, minor: MinorNation, turn = state.turn): OverseasBarrier | undefined {
  if (minor.colonyOf !== undefined) return minor.colonyOf === nationId ? undefined : "colony";
  const entry = relationOf(state, nationId, minor.id);
  if (entry?.war && turn >= entry.war.since) return "at-war";
  if (entry && entry.boycotts.length > 0) return "boycott";
  return entry?.embassies.includes(nationId) ? undefined : "needs-embassy";
}

/**
 * FR-631, FR-634: why a civilian may not stand on a tile that is not its nation's own land; undefined when it may. The
 * Developer may enter an open Minor Nation; the holder's improvers only their nation's held tiles; no one else enters.
 */
export function overseasEntryRefusal(state: GameState, worker: Worker, tile: Tile): "not-owner" | OverseasBarrier | undefined {
  const minor = minorLandOf(state, tile);
  if (!minor) return "not-owner";
  if (worker.type === WorkerType.Developer) return overseasBarrier(state, worker.nationId, minor);
  return DEVELOPMENT_WORKER_TYPES.includes(worker.type) && holderOf(state, tile.id) === worker.nationId ? undefined : "not-owner";
}

/**
 * FR-632: 20 x the commodity's board price at order time (`priceOf`: last turn's world price, else START_PRICES); gold
 * and gems, which have no market price, 20 x their cash value (inferred). Undefined for a tile with nothing to buy.
 */
export function landPrice(state: GameState, tile: Tile): number | undefined {
  const type = tile.resource?.type;
  if (type === ResourceType.Gold) return LAND_PRICE_MULTIPLE * GOLD_CASH_PER_UNIT;
  if (type === ResourceType.Gems) return LAND_PRICE_MULTIPLE * GEMS_CASH_PER_UNIT;
  return isTradeCommodity(type) ? LAND_PRICE_MULTIPLE * priceOf(marketOf(state), type) : undefined;
}

/**
 * FR-631: why the nation may not buy the tile, its price aside; undefined when it may. Another Great Power's land and
 * the nation's own are not for sale, nor the Minor Nation's capital, a held tile, a tile with no discovered resource,
 * food, horses, or any terrain outside BUYABLE_LAND_TERRAINS.
 */
export function landSiteRefusal(state: GameState, nationId: NationId, tile: Tile): "not-owner" | OverseasBarrier | "invalid-site" | "already-owned" | "invalid-target" | undefined {
  const minor = minorLandOf(state, tile);
  if (!minor) return "not-owner";
  const barrier = overseasBarrier(state, nationId, minor);
  if (barrier) return barrier;
  if (tile.id === minor.capitalTileId) return "invalid-site";
  if (holderOf(state, tile.id)) return "already-owned";
  const resource = tile.resource;
  if (!resource || resource.discovered === false) return "invalid-target";
  return BUYABLE_LAND_TERRAINS.includes(tile.terrain) && BUYABLE_LAND_RESOURCES.includes(resource.type) ? undefined : "invalid-site";
}

/** Why the settlement refused a purchase (FR-633): its sale conditions failed, or another buyer ranked first. */
export type LandRefusal = "not-owner" | "already-owned" | OverseasBarrier | "outbid";

function settlementRefusal(state: GameState, bid: BuyLandIntent, turn: number): LandRefusal | undefined {
  const tile = tileById(state, bid.tileId);
  const minor = tile && minorLandOf(state, tile);
  if (!minor || minor.id !== bid.targetId) return "not-owner";
  if (holderOf(state, bid.tileId)) return "already-owned";
  return overseasBarrier(state, bid.nationId, minor, turn);
}

/**
 * FR-633: right after the development phase, every purchase of the turn settles together. A tile passes to its buyer
 * when the sale conditions still hold, and to the first of several buyers in the Minor Nation's `partnerRanking`
 * (points plus half the subsidy, ties in the FR-401 seed order; no random draw). Every other purchase is refunded in
 * full and reported to its buyer with the reason. The tile drops to level 0 (inferred) and its holding is recorded;
 * each buying Developer stays where it stands, Available. Returns its input when nothing was bought.
 */
export const landPurchaseSystem: TurnSystem = (state, ctx) => {
  const bids = byIntentOrder(state, ctx.turn, state.intents.filter(isBuyLandIntent));
  if (bids.length === 0) return state;

  const refusals = new Map<BuyLandIntent, LandRefusal>();
  const winners = new Map<TileId, BuyLandIntent>();
  for (const bid of bids) {
    const refusal = settlementRefusal(state, bid, ctx.turn);
    if (refusal) {
      refusals.set(bid, refusal);
      continue;
    }
    const rival = winners.get(bid.tileId);
    if (!rival) {
      winners.set(bid.tileId, bid);
      continue;
    }
    const ranking = partnerRanking(state, bid.targetId);
    const bidFirst = ranking.indexOf(bid.nationId) < ranking.indexOf(rival.nationId);
    winners.set(bid.tileId, bidFirst ? bid : rival);
    refusals.set(bidFirst ? rival : bid, "outbid");
  }

  const refunds = new Map<NationId, number>();
  for (const bid of refusals.keys()) refunds.set(bid.nationId, (refunds.get(bid.nationId) ?? 0) + bid.cost);
  const buyers = new Set(bids.map((bid) => bid.workerId));
  const bidTiles = new Set(bids.map((bid) => bid.tileId));
  const tiles = state.map.tiles.map((row) => (row.some((t) => bidTiles.has(t.id))
    ? row.map((tile) => {
      if (!bidTiles.has(tile.id)) return tile;
      const workers = tile.workers.map((w) => (buyers.has(w.id) && w.status === WorkerStatus.Working ? { ...w, status: WorkerStatus.Available } : w));
      const sold = winners.has(tile.id) && tile.resource;
      return { ...tile, workers, ...(sold && { resource: { ...sold, level: 0 } }) };
    })
    : row));
  const holdings: Record<TileId, OverseasHolding> = { ...state.overseasLand };
  for (const [tileId, bid] of winners) holdings[tileId] = { tileId, holderId: bid.nationId, minorId: bid.targetId, turn: ctx.turn, price: bid.cost };

  for (const bid of bids) {
    const report = { nationId: bid.nationId, workerId: bid.workerId, tileId: bid.tileId, minorId: bid.targetId, cost: bid.cost };
    const reason = refusals.get(bid);
    ctx.emit(reason ? { type: "land-purchase-refused", ...report, reason } : { type: "land-purchased", ...report });
  }

  return {
    ...state,
    nations: refunds.size === 0 ? state.nations : state.nations.map((n) => (refunds.has(n.id) ? { ...n, treasury: (n.treasury ?? 0) + refunds.get(n.id)! } : n)),
    map: { ...state.map, tiles },
    ...(Object.keys(holdings).length > 0 && { overseasLand: holdings }),
  };
};
