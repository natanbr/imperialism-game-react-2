// M18j (FR-636): the overseas profit a Great Power earns from the land it holds in Minor Nations. The Minor Nation sells
// the developed units (FR-635) and pays the holder a share of their value, whoever buys them. Pure reads of the board
// the trade phase starts from: its prices, the settled relations and the public holdings. No random draw.
import { GEMS_CASH_PER_UNIT, GOLD_CASH_PER_UNIT } from "@/definisions/cashValues";
import { COLONY_OVERSEAS_SHARE, OVERSEAS_SHARE_BY_LEVEL } from "@/definisions/developerRules";
import { BOARD_ORDER } from "@/definisions/partnersMarket";
import type { MinorNationId, NationId } from "@/types/Common";
import type { GameState, OverseasHolding } from "@/types/GameState";
import type { TradeCommodity } from "@/types/Market";
import type { MinorNation } from "@/types/MinorNation";
import { ResourceType } from "@/types/Resource";
import { levelOfPoints, relationOf } from "../diplomacy/relations";
import { yieldOf } from "../map/mapHelpers";
import { isTradeCommodity, marketOf, priceOf } from "../market/market";
import { tileById } from "../orders/queries";
import { minorLandOf } from "./holdings";

/** What a held tile can produce for profit: a trade commodity, or gold and gems, which never reach the Board. */
export type OverseasCommodity = TradeCommodity | ResourceType.Gold | ResourceType.Gems;

/** FR-636: one holder's profit from one Minor Nation on one commodity in a trade phase. */
export interface OverseasProfit {
  nationId: NationId;
  minorId: MinorNationId;
  commodity: OverseasCommodity;
  /** The developed units of the holder's tiles there (`yieldOf` at the held level). */
  units: number;
  /** The value of one unit: the board price, or the cash value of gold and gems. */
  price: number;
  sharePercent: number;
  /** floor(units x price x sharePercent / 100) (`overseasAmount`). */
  amount: number;
}

const COMMODITY_ORDER: readonly OverseasCommodity[] = [...BOARD_ORDER, ResourceType.Gold, ResourceType.Gems];
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const isOverseasCommodity = (type: ResourceType): type is ResourceType & OverseasCommodity =>
  type === ResourceType.Gold || type === ResourceType.Gems || isTradeCommodity(type);

/** FR-636: a developed unit's value: the board price (`priceOf`), or the cash value of gold and gems (inferred). */
export function overseasUnitValue(state: GameState, commodity: OverseasCommodity): number {
  if (commodity === ResourceType.Gold) return GOLD_CASH_PER_UNIT;
  if (commodity === ResourceType.Gems) return GEMS_CASH_PER_UNIT;
  return priceOf(marketOf(state), commodity);
}

/** FR-636: what `units` developed units worth `unitValue` each pay at `sharePercent`, rounded down once. */
export const overseasAmount = (units: number, unitValue: number, sharePercent: number): number =>
  Math.floor((units * unitValue * sharePercent) / 100);

/**
 * FR-636: the percent the holder receives from the Minor Nation, or undefined while none is paid: nothing while the two
 * are at war or either boycotts the other, also in its own colony; otherwise 100 in its own colony and by its relation
 * level elsewhere (OVERSEAS_SHARE_BY_LEVEL). As in the trade phase (FR-185, FR-246), a war declared this turn already
 * counts.
 */
export function overseasShare(state: GameState, holderId: NationId, minor: MinorNation): number | undefined {
  const entry = relationOf(state, holderId, minor.id);
  if (entry?.war || (entry && entry.boycotts.length > 0)) return undefined;
  if (minor.colonyOf === holderId) return COLONY_OVERSEAS_SHARE;
  return entry && OVERSEAS_SHARE_BY_LEVEL[levelOfPoints(entry.points)];
}

/** FR-636: the developed units a holding pays on: its tile still that Minor Nation's land, with a commodity and units. */
function paidUnits(state: GameState, holding: OverseasHolding): { minor: MinorNation; commodity: OverseasCommodity; units: number } | undefined {
  const tile = tileById(state, holding.tileId);
  const minor = tile && minorLandOf(state, tile);
  const type = tile?.resource?.type;
  if (!minor || minor.id !== holding.minorId || !type || !isOverseasCommodity(type)) return undefined;
  const units = yieldOf(tile);
  return units > 0 ? { minor, commodity: type, units } : undefined;
}

/** FR-636, FR-638: the units the trade phase pays the holder together in the Minor Nation on the commodity. */
export function overseasUnits(state: GameState, holderId: NationId, minorId: MinorNationId, commodity: OverseasCommodity): number {
  let units = 0;
  for (const holding of Object.values(state.overseasLand ?? {})) {
    if (holding.holderId !== holderId || holding.minorId !== minorId) continue;
    const paid = paidUnits(state, holding);
    if (paid?.commodity === commodity) units += paid.units;
  }
  return units;
}

/**
 * FR-636: what every holder earns this trade phase, per Minor Nation and commodity: the developed units of its holdings
 * that are still that Minor Nation's land, valued at `overseasUnitValue` and times its share, rounded down once. Paid on
 * every unit, sold or not (inferred), and with no merchant ship. In Minor Nation id order, then BOARD_ORDER with gold and
 * gems last, then holder id; no entry without units or money.
 */
export function overseasProfits(state: GameState): OverseasProfit[] {
  const holdings = Object.values(state.overseasLand ?? {});
  if (holdings.length === 0) return [];
  const units = new Map<string, { nationId: NationId; minor: MinorNation; commodity: OverseasCommodity; units: number }>();
  for (const holding of holdings) {
    const paid = paidUnits(state, holding);
    if (!paid) continue;
    const key = `${paid.minor.id}|${COMMODITY_ORDER.indexOf(paid.commodity)}|${holding.holderId}`;
    const entry = units.get(key) ?? { nationId: holding.holderId, minor: paid.minor, commodity: paid.commodity, units: 0 };
    units.set(key, { ...entry, units: entry.units + paid.units });
  }
  const order = (a: { nationId: NationId; minor: MinorNation; commodity: OverseasCommodity }, b: typeof a) =>
    compare(a.minor.id, b.minor.id) || COMMODITY_ORDER.indexOf(a.commodity) - COMMODITY_ORDER.indexOf(b.commodity) || compare(a.nationId, b.nationId);
  return [...units.values()].sort(order).flatMap((entry): OverseasProfit[] => {
    const sharePercent = overseasShare(state, entry.nationId, entry.minor);
    if (sharePercent === undefined) return [];
    const price = overseasUnitValue(state, entry.commodity);
    const amount = overseasAmount(entry.units, price, sharePercent);
    return amount > 0 ? [{ nationId: entry.nationId, minorId: entry.minor.id, commodity: entry.commodity, units: entry.units, price, sharePercent, amount }] : [];
  });
}
