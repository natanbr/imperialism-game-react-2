import { yieldOf } from "@/engine/map/mapHelpers";
import { fishingGroundsOf } from "@/engine/systems/logisticsSystem";
import { acceptsProductionInputs } from "@/engine/industry/productionPlan";
import { isTradeCommodity, worldMarketSupplies } from "@/engine/market/market";
import { bidSellersOf, marketModeOf, tradeBarrier } from "@/engine/market/partners";
import { isGreatPower } from "@/engine/world/countries";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";

export const GOODS_WITH_SOURCE_NOTES: readonly WarehouseCommodities[] = [
  ResourceType.Wool, ResourceType.Fish, ResourceType.Oil, MaterialType.Fuel, ResourceType.Horses,
];

/** Public trade opportunities are independent of a nation's stock, cash and free holds. */
function publicSupplier(state: GameState, nation: Nation, good: WarehouseCommodities) {
  if (!isTradeCommodity(good)) return undefined;
  if (marketModeOf(state) === "world") {
    return worldMarketSupplies(nation, good) ? { confirmed: true, text: "World market sells this" } : undefined;
  }
  const sellers = bidSellersOf(state, nation.id, good);
  if (!sellers.length) return undefined;
  const open = sellers.find(id => !tradeBarrier(state, nation.id, id));
  if (!open) return { confirmed: false, text: "Trade with potential suppliers is blocked" };
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
