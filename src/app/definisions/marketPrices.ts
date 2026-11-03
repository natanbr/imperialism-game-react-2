// World market rule table (FR-060, FR-062, FR-065). Source: docs/rules/06 sections 2 to 4.
import { GoodsType, MaterialType, ResourceType } from "../types/Resource";
import type { TradeCommodity } from "../types/Market";

/**
 * Every tradeable commodity in a fixed order: the price drift draws one random number per
 * commodity in this order, and the market lists them so. Goods first (the Board of Trade lists
 * clothing first, rules 06 section 2), then materials, then resources.
 */
export const TRADE_COMMODITIES: readonly TradeCommodity[] = [
  GoodsType.Clothing,
  GoodsType.Furniture,
  GoodsType.Hardware,
  GoodsType.Armaments,
  MaterialType.CannedFood,
  MaterialType.Fabric,
  MaterialType.Paper,
  MaterialType.Lumber,
  MaterialType.Steel,
  MaterialType.Fuel,
  ResourceType.Cotton,
  ResourceType.Wool,
  ResourceType.Horses,
  ResourceType.Timber,
  ResourceType.Coal,
  ResourceType.IronOre,
  ResourceType.Oil,
];

/**
 * Start prices in dollars (rules 06 section 4, "rule of thumb": resources about $100, materials
 * $300, goods $900, horses $300; canned food was seen at $94). [NEEDS CLARIFICATION] gaps.md A1,
 * decision Q13: the original start prices are not documented per commodity.
 */
export const START_PRICES: Readonly<Record<TradeCommodity, number>> = {
  [GoodsType.Clothing]: 900,
  [GoodsType.Furniture]: 900,
  [GoodsType.Hardware]: 900,
  [GoodsType.Armaments]: 900,
  [MaterialType.CannedFood]: 100,
  [MaterialType.Fabric]: 300,
  [MaterialType.Paper]: 300,
  [MaterialType.Lumber]: 300,
  [MaterialType.Steel]: 300,
  [MaterialType.Fuel]: 300,
  [ResourceType.Cotton]: 100,
  [ResourceType.Wool]: 100,
  [ResourceType.Horses]: 300,
  [ResourceType.Timber]: 100,
  [ResourceType.Coal]: 100,
  [ResourceType.IronOre]: 100,
  [ResourceType.Oil]: 100,
};

/**
 * The price step after each turn's deals (FR-065): a random drift of at most PRICE_DRIFT either
 * way, plus PRICE_PUSH_PER_UNIT per unit bought (minus per unit sold) by all nations, the push at
 * most PRICE_PUSH_CAP either way; the price stays between PRICE_FLOOR and PRICE_CEILING times its
 * start price. [NEEDS CLARIFICATION] gaps.md A1 (its fallback: drift 3% a turn, clamp 50%-250%).
 */
export const PRICE_DRIFT = 0.03;
export const PRICE_PUSH_PER_UNIT = 0.005;
export const PRICE_PUSH_CAP = 0.03;
export const PRICE_FLOOR = 0.5;
export const PRICE_CEILING = 2.5;

/** A nation bids for at most 4 commodities a turn (rules 06 section 2). */
export const MAX_BUY_BIDS = 4;
