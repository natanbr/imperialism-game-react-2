import { yieldOf } from "@/engine/map/mapHelpers";
import { fishingGroundsOf } from "@/engine/systems/logisticsSystem";
import { acceptsProductionInputs } from "@/engine/industry/productionPlan";
import { isTradeCommodity, worldMarketSupplies } from "@/engine/market/market";
import { bidSellersOf, marketModeOf, tradeBarrier, type TradeBarrier } from "@/engine/market/partners";
import { isGreatPower } from "@/engine/world/countries";
import { OVERTURE_COST } from "@/definisions/diplomacyRules";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";
import { money } from "./gameText";

export const GOODS_WITH_SOURCE_NOTES: readonly WarehouseCommodities[] = [
  ResourceType.Wool, ResourceType.Fish, ResourceType.Oil, MaterialType.Fuel, ResourceType.Horses,
];

/**
 * "We need a consulate with a seller" (FR-252, FR-253): the barriers of every seller (or buyer), the consulate first.
 * A rival's colony is listed among them but trades only with its owner ("not-a-partner", FR-224, FR-635), so beside war
 * or a boycott it is named apart and "every" stays true (FR-644).
 */
export function barredText(barriers: readonly (TradeBarrier | undefined)[], side: "seller" | "buyer"): string {
  if (barriers.includes("no-consulate")) return `We need a consulate with a ${side}`;
  const war = barriers.includes("at-war");
  const boycott = barriers.includes("boycott");
  const colonies = barriers.includes("not-a-partner") ? " but colonies, which trade only with their owner" : "";
  if (war && boycott) return `War or a boycott bars every ${side}${colonies}`;
  if (war) return `We are at war with every ${side}${colonies}`;
  if (boycott) return `A boycott bars every ${side}${colonies}`;
  return `We may not trade with any ${side}`;
}

/** Public trade opportunities are independent of a nation's stock, cash and free holds. */
function publicSupplier(state: GameState, nation: Nation, good: WarehouseCommodities) {
  if (!isTradeCommodity(good)) return undefined;
  if (marketModeOf(state) === "world") {
    return worldMarketSupplies(nation, good) ? { confirmed: true, text: "World market sells this" } : undefined;
  }
  const sellers = bidSellersOf(state, nation.id, good);
  if (!sellers.length) return undefined;
  const barriers = sellers.map(id => tradeBarrier(state, nation.id, id));
  const open = sellers.find((_, i) => !barriers[i]);
  // FR-644: name the barrier; a consulate first, as the one an order removes
  if (!open) {
    const text = barriers.includes("no-consulate") ? `Open a consulate (${money(OVERTURE_COST.consulate)}) to buy this` : barredText(barriers, "seller");
    return { confirmed: false, text };
  }
  if (isGreatPower(state, open)) return { confirmed: false, text: "Another power may sell this" };
  return { confirmed: true, text: "A minor nation sells this" };
}

export function goodsSourceNotes(state: GameState, nation: Nation, screen: "warehouse" | "market") {
  const domestic = new Set<WarehouseCommodities>();
  if (fishingGroundsOf(state.map, nation.id, state.transportNetwork.railroadNetworks?.[nation.id]).size) domestic.add(ResourceType.Fish);
  for (const row of state.map.tiles) {
    for (const tile of row) {
      if (tile.ownerNationId === nation.id && tile.visible && tile.resource && yieldOf(tile) > 0) domestic.add(tile.resource.type);
    }
  }
  if ((nation.industry.buildings.refinery?.capacity ?? 0) > 0 && acceptsProductionInputs(nation, "refinery")) domestic.add(MaterialType.Fuel);

  const notes = new Map<WarehouseCommodities, string>();
  for (const good of GOODS_WITH_SOURCE_NOTES) {
    const local = domestic.has(good);
    if (local && screen === "warehouse") continue;
    const supplier = publicSupplier(state, nation, good);
    if (!local) notes.set(good, `No known local source · ${supplier?.text ?? "No known supply"}`);
    else if (!supplier?.confirmed) notes.set(good, supplier?.text ?? "No known market supplier");
  }
  return notes;
}
