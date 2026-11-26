import type { NationId, ProvinceId, TileId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { GameMap } from "@/types/Map";
import type { Nation } from "@/types/Nation";
import type { Province, TownTiers } from "@/types/Province";
import { GoodsType, MaterialType, ResourceType } from "@/types/Resource";
import { buildingOf } from "../industry/industryState";
import { hubOf, hubsOf } from "../map/collectingHubs";
import { nationById, tileById } from "../orders/queries";
import { provincesOf } from "./provinces";

export const townChains = [
  ["textile", MaterialType.Fabric, GoodsType.Clothing],
  ["wood", MaterialType.Lumber, GoodsType.Furniture],
  ["metal", MaterialType.Steel, GoodsType.Hardware],
] as const;

export type { TownTiers } from "@/types/Province";
export type TownCommodity = (typeof townChains)[number][1 | 2];
type TownResource = ResourceType.Cotton | ResourceType.Wool | ResourceType.Timber | ResourceType.Coal | ResourceType.IronOre;

export interface TownFacts {
  ownerId: NationId;
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

const CAPACITY_PER_TIER = 4;

function installedCapacity(nation: Nation): TownTiers {
  return {
    textile: buildingOf(nation, "clothingFactory").capacity,
    wood: buildingOf(nation, "furnitureFactory").capacity,
    metal: buildingOf(nation, "metalWorks").capacity,
  };
}

/** A nation without an eligible factory has no town freight, even at a captured capital. */
export function hasTownFactoryCapacity(state: GameState, owner: NationId): boolean {
  const nation = nationById(state, owner);
  if (!nation) return false;
  const capacity = installedCapacity(nation);
  return Math.max(capacity.textile, capacity.wood, capacity.metal) >= CAPACITY_PER_TIER;
}

function supportedTier(tiles: number, installedCapacity: number): number {
  return Math.min(4, Math.floor(tiles / 2), Math.floor(installedCapacity / CAPACITY_PER_TIER));
}

/** Owner-visible prerequisites in province order, using the network after its connectivity check. */
export function townsOf(state: GameState, owner: NationId, knownMap: GameMap = state.map): TownFacts[] {
  const nation = nationById(state, owner);
  if (!nation) return [];
  const network = state.transportNetwork.railroadNetworks?.[owner];
  const hubs = hubsOf(network).filter(hub => hub.kind !== "port" || !network?.closedFishingPorts?.includes(hub.tileId));
  const capacity = installedCapacity(nation);
  const knownState = knownMap === state.map ? state : { ...state, map: knownMap };

  return provincesOf(state, owner).map(province => {
    const seat = tileById(state, province.seatTileId);
    const resources = knownResources(knownState, province);
    return {
      ownerId: owner,
      provinceId: province.id,
      seatTileId: province.seatTileId,
      connected: !!(seat && hubOf(state.map, owner, hubs, seat)),
      resources,
      supported: {
        textile: supportedTier(resources.cotton + resources.wool, capacity.textile),
        wood: supportedTier(resources.timber, capacity.wood),
        metal: supportedTier(Math.min(resources.coal, resources.ironOre), capacity.metal),
      },
    };
  });
}

/** Offered units before freight, in textile, wood and metal order, material before good. */
export function townOutput(supported: TownTiers, matured: TownTiers): Partial<Record<TownCommodity, number>> {
  const output: Partial<Record<TownCommodity, number>> = {};
  for (const [chain, material, good] of townChains) {
    const tier = Math.min(supported[chain], matured[chain]);
    if (tier > 0) output[material] = tier;
    if (tier >= 2) output[good] = Math.floor(tier / 2);
  }
  return output;
}
