import { yieldOf } from "@/engine/map/mapHelpers";
import { fishingGroundsOf } from "@/engine/systems/logisticsSystem";
import { acceptsProductionInputs } from "@/engine/industry/productionPlan";
import { isTradeCommodity, worldMarketSupplies } from "@/engine/market/market";
import { bidSellersOf, marketModeOf, tradeBarrier } from "@/engine/market/partners";
import { countryName, isGreatPower, minorNationById } from "@/engine/world/countries";
import { OVERTURE_COST } from "@/definisions/diplomacyRules";
import type { CountryId, NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { MaterialType, ResourceType, type WarehouseCommodities } from "@/types/Resource";
import { money } from "./gameText";

export const GOODS_WITH_SOURCE_NOTES: readonly WarehouseCommodities[] = [
  ResourceType.Wool, ResourceType.Fish, ResourceType.Oil, MaterialType.Fuel, ResourceType.Horses,
];

/** "Lorran", "Lorran and Pellis", "Lorran, Pellis and Sundmark". */
const namesText = (names: readonly string[]): string =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/**
 * The sellers (or buyers) beside war or a boycott that are not partners at all (FR-185, FR-644), as " but ...": a rival's
 * colony trades only with its owner (FR-224, FR-635); any other, an independent country whose diplomatic record with us
 * is missing (the Relationships map's "No relations"), is named.
 */
function apartText(state: GameState, nationId: NationId, outside: readonly CountryId[]): string {
  const isRivalColony = (id: CountryId) => {
    const owner = minorNationById(state, id)?.colonyOf;
    return owner !== undefined && owner !== nationId;
  };
  const unrelated = outside.filter((id) => !isRivalColony(id)).map((id) => countryName(state, id) ?? id);
  const parts = [
    ...(outside.some(isRivalColony) ? ["colonies, which trade only with their owner"] : []),
    ...(unrelated.length ? [`${namesText(unrelated)}, which ${unrelated.length === 1 ? "has" : "have"} no relations with us`] : []),
  ];
  return parts.length ? ` but ${parts.join(", and ")}` : "";
}

/**
 * "We need a consulate with a seller" (FR-252, FR-253): why `nationId` may trade with none of `countryIds`, the sellers
 * (or buyers), from each one's barrier (`tradeBarrier`, the viewer's own diplomacy forecast), the consulate first. A
 * seller that is not a partner at all is named apart beside war or a boycott, so "every" stays true (FR-644).
 */
export function barredText(state: GameState, nationId: NationId, countryIds: readonly CountryId[], side: "seller" | "buyer"): string {
  const barriers = countryIds.map((id) => tradeBarrier(state, nationId, id));
  if (barriers.includes("no-consulate")) return `We need a consulate with a ${side}`;
  const war = barriers.includes("at-war");
  const boycott = barriers.includes("boycott");
  const apart = apartText(state, nationId, [...new Set(countryIds.filter((_, i) => barriers[i] === "not-a-partner"))]);
  if (war && boycott) return `War or a boycott bars every ${side}${apart}`;
  if (war) return `We are at war with every ${side}${apart}`;
  if (boycott) return `A boycott bars every ${side}${apart}`;
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
    const text = barriers.includes("no-consulate") ? `Open a consulate (${money(OVERTURE_COST.consulate)}) to buy this` : barredText(state, nation.id, sellers, "seller");
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
