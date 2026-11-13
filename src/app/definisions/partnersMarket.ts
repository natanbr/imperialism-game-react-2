// The numbers of nation-to-nation trade (M7, FR-183 to FR-191). Source: docs/rules/06 sections 2, 5 and 7;
// the minors' offers and demand are hidden in Imp1 (gaps A2, C5): remake defaults, decision card Q27.
import { GoodsType, MaterialType, ResourceType } from "../types/Resource";
import type { TradeAmounts, TradeCommodity } from "../types/Market";
import { TRADE_COMMODITIES } from "./marketPrices";

/** The Imp1 Board of Trade rows, top to bottom, 1815 to 1855 (rules 06 section 7.1, [06:W30]). */
const IMP1_BOARD: readonly TradeCommodity[] = [
  GoodsType.Clothing,
  GoodsType.Furniture,
  GoodsType.Hardware,
  GoodsType.Armaments,
  MaterialType.CannedFood,
  MaterialType.Fabric,
  MaterialType.Lumber,
  MaterialType.Paper,
  MaterialType.Steel,
  ResourceType.Cotton,
  ResourceType.Wool,
  ResourceType.Timber,
  ResourceType.Coal,
  ResourceType.IronOre,
  ResourceType.Horses,
];

/**
 * The order the trade phase settles the commodities in, and the Board of Trade lists them (FR-186): the
 * Imp1 board, then any other tradeable commodity in `TRADE_COMMODITIES` order (fuel, oil). Holds are spent
 * top-down, so the order decides who gets scarce holds first.
 */
export const BOARD_ORDER: readonly TradeCommodity[] = [...IMP1_BOARD, ...TRADE_COMMODITIES.filter((c) => !IMP1_BOARD.includes(c))];

/** FR-183 (Q27): a minor offers one unit a turn per tile holding the resource, at most this many. */
export const MINOR_OFFER_CAP = 6;

/** FR-184 (Q27): what each minor bids for every turn, and always pays for ("endless money", [07:W8]). */
export const MINOR_DEMAND: Readonly<TradeAmounts> = {
  [GoodsType.Clothing]: 2,
  [GoodsType.Furniture]: 2,
  [GoodsType.Hardware]: 2,
};

/** FR-191 (Q24): relation points a pair gains per commodity type it dealt in this turn. */
export const TRADE_RELATION_POINTS = 1;
