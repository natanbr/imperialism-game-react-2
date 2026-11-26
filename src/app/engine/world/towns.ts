import type { NationId, ProvinceId, TileId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Province } from "@/types/Province";
import { GoodsType, MaterialType, ResourceType } from "@/types/Resource";
import { buildingOf } from "../industry/industryState";
import { hubOf, hubsOf } from "../map/collectingHubs";
import { nationById, tileById } from "../orders/queries";
import { provincesOf } from "./provinces";

const chains = [
  ["textile", MaterialType.Fabric, GoodsType.Clothing],
  ["wood", MaterialType.Lumber, GoodsType.Furniture],
  ["metal", MaterialType.Steel, GoodsType.Hardware],
] as const;

export type TownTiers = Record<(typeof chains)[number][0], number>;
type TownCommodity = (typeof chains)[number][1 | 2];
type TownResource = ResourceType.Cotton | ResourceType.Wool | ResourceType.Timber | ResourceType.Coal | ResourceType.IronOre;

export interface TownFacts {
  provinceId: ProvinceId;
  seatTileId: TileId;
  connected: boolean;
  resources: Record<TownResource, number>;
  supported: TownTiers;
}

function knownResources(state: GameState, province: Province): Record<TownResource, number> {
  const counts = { cotton: 0, wool: 0, timber: 0, coal: 0, ironOre: 0 };
  for (const tileId of new Set(province.tileIds)) {
    const resource = tileById(state, tileId)?.resource;
    if (!resource || resource.discovered === false) continue;
    switch (resource.type) {
      case ResourceType.Cotton:
      case ResourceType.Wool:
      case ResourceType.Timber:
      case ResourceType.Coal:
      case ResourceType.IronOre:
        counts[resource.type]++;
    }
  }
  return counts;
}

function supportedTier(tiles: number, installedCapacity: number): number {
  return Math.min(4, Math.floor(tiles / 2), Math.floor(installedCapacity / 4));
}

/** Owner-visible prerequisites in province order, using the network after its connectivity check. */
export function townsOf(state: GameState, owner: NationId): TownFacts[] {
  const nation = nationById(state, owner);
  if (!nation) return [];
  const network = state.transportNetwork.railroadNetworks?.[owner];
  const hubs = hubsOf(network).filter(hub => hub.kind !== "port" || !network?.closedFishingPorts?.includes(hub.tileId));
  const clothing = buildingOf(nation, "clothingFactory").capacity;
  const furniture = buildingOf(nation, "furnitureFactory").capacity;
  const metalWorks = buildingOf(nation, "metalWorks").capacity;

  return provincesOf(state, owner).map(province => {
    const seat = tileById(state, province.seatTileId);
    const resources = knownResources(state, province);
    return {
      provinceId: province.id,
      seatTileId: province.seatTileId,
      connected: !!(seat && hubOf(state.map, owner, hubs, seat)),
      resources,
      supported: {
        textile: supportedTier(resources.cotton + resources.wool, clothing),
        wood: supportedTier(resources.timber, furniture),
        metal: supportedTier(Math.min(resources.coal, resources.ironOre), metalWorks),
      },
    };
  });
}

/** Offered units before freight, in textile, wood and metal order, material before good. */
export function townOutput(supported: TownTiers, matured: TownTiers): Partial<Record<TownCommodity, number>> {
  const output: Partial<Record<TownCommodity, number>> = {};
  for (const [chain, material, good] of chains) {
    const tier = Math.min(supported[chain], matured[chain]);
    if (tier > 0) output[material] = tier;
    if (tier >= 2) output[good] = Math.floor(tier / 2);
  }
  return output;
}
