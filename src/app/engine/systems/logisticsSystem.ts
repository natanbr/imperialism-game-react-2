import { GEMS_CASH_PER_UNIT, GOLD_CASH_PER_UNIT } from "@/definisions/cashValues";
import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Nation } from "@/types/Nation";
import { GoodsType, MaterialType, ResourceType } from "@/types/Resource";
import { RailroadNetwork } from "@/types/Transport";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import type { TurnSystem } from "../turn/context";
import { getAdjacentTiles, isOcean } from "../map/mapHelpers";
import { hubOf, hubsOf, type CollectingHub } from "../map/collectingHubs";
import { nextTownSettlements, settledTownOutput } from "./townDevelopmentSystem";
import { hasTownFactoryCapacity, townOutput, townsOf, type TownCommodity, type TownFacts } from "../world/towns";
export type { CollectingHub } from "../map/collectingHubs";

/**
 * What the logistics phase ships of what the hubs collected (FR-389, card Q80): the plan holds per commodity either a
 * set amount or nothing (automatic). A set commodity ships at most its set amount (0 ships nothing), set ones first in
 * plan order. Automatics share the rest in `collectionOrder`: town offers by province and chain, then ordinary tile and
 * Fish supply (FR-628).
 */
export const transportShipments = (
  capacity: number,
  collected: Record<string, number>,
  plan: Record<string, number> = {},
  collectionOrder = Object.entries(collected)
): Record<string, number> => {
  const chosen: Record<string, number> = {};
  let used = 0;
  const ship = (res: string, wanted: number) => {
    const reserved = chosen[res] ?? 0;
    const take = Math.max(0, Math.min(wanted, (collected[res] ?? 0) - reserved, capacity - used));
    if (take <= 0) return;
    chosen[res] = reserved + take;
    used += take;
  };
  for (const [res, requested] of Object.entries(plan)) ship(res, Math.floor(requested) || 0);
  for (const [res, amount] of collectionOrder) if (!Object.hasOwn(plan, res)) ship(res, amount);
  return chosen;
};

const warehouseCommodities = new Set<string>([
  ...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType),
]);

export const updateNationStateWithTransportedResources = (
  nation: Nation,
  transportedResources: Record<string, number>
): { warehouse: Record<string, number>; treasury: number } => {
  const newWarehouse: Record<string, number> = { ...nation.warehouse };
  let treasury = nation.treasury;

  const goldUnits = transportedResources[ResourceType.Gold] ?? 0;
  const gemsUnits = transportedResources[ResourceType.Gems] ?? 0;
  if (goldUnits > 0) treasury += goldUnits * GOLD_CASH_PER_UNIT;
  if (gemsUnits > 0) treasury += gemsUnits * GEMS_CASH_PER_UNIT;

  for (const [key, amt] of Object.entries(transportedResources)) {
    if (key === ResourceType.Gold || key === ResourceType.Gems) continue;
    if (warehouseCommodities.has(key)) newWarehouse[key] = (newWarehouse[key] ?? 0) + amt;
  }

  return { warehouse: newWarehouse, treasury };
};

interface FreightSupply {
  collected: Record<string, number>;
  collectionOrder?: [string, number][];
  offers: { provinceId: string; seatTileId: string; units: [TownCommodity, number][] }[];
}

export function rawFreightSupply(state: GameState, owner: string): Record<string, number> {
  return computeLogisticsTransport(state.map, owner, state.transportNetwork.railroadNetworks?.[owner]);
}

function freightSupply(state: GameState, owner: string, timing: "projected" | "settled", knownMap = state.map): FreightSupply {
  const collected = rawFreightSupply(state, owner);
  const supply: FreightSupply = { collected, offers: [] };
  if (!state.provinces.length || !hasTownFactoryCapacity(state, owner)) return supply;
  const raw = Object.entries(collected);
  const towns: [string, number][] = [];
  const add = (town: TownFacts, bundle: ReturnType<typeof townOutput>) => {
    const units = Object.entries(bundle) as [TownCommodity, number][];
    if (!units.length) return;
    // Preserve where each town's units enter the queue even when its commodity already has an aggregate total.
    towns.push(...units);
    supply.offers.push({ provinceId: town.provinceId, seatTileId: town.seatTileId, units });
    for (const [commodity, amount] of units) collected[commodity] = (collected[commodity] ?? 0) + amount;
  };
  if (timing === "projected") {
    for (const { town, progress } of nextTownSettlements(state, owner, knownMap)) {
      if (town.connected) add(town, townOutput(town.supported, progress.matured));
    }
  } else if (state.townProgress) {
    for (const town of townsOf(state, owner)) add(town, settledTownOutput(state, owner, town));
  }
  // FR-628: towns load before automatic tile and Fish freight, so a car shortage falls on raw supply.
  if (towns.length) supply.collectionOrder = [...towns, ...raw];
  return supply;
}

/** Next settlement at the supplied network and installed capacities. Forecasts can retain the survey knowledge
 * that was available before simulating unfinished jobs. This query never advances the live town clock. */
export function projectedFreightSupply(state: GameState, owner: string, knownMap: GameMap = state.map): Record<string, number> {
  return forecastFreight(state, owner, knownMap).collected;
}

export function forecastFreight(state: GameState, owner: string, knownMap: GameMap = state.map) {
  return freightSupply(state, owner, "projected", knownMap);
}

/** The schedule for the next settlement under this owner's explicit allocations and available cars. */
export function projectedFreightPlan(
  state: GameState, owner: string, capacity: number,
  plan = state.transportAllocationsByNation?.[owner], knownMap: GameMap = state.map
) {
  const { collected, collectionOrder } = freightSupply(state, owner, "projected", knownMap);
  return { collected, shipments: transportShipments(capacity, collected, plan, collectionOrder) };
}

export const logisticsSystem: TurnSystem = (state, ctx) => {
  const allocations = state.transportAllocationsByNation ?? {};

  const updatedNations = state.nations.map((nation) => {
    const { collected, collectionOrder, offers } = freightSupply(state, nation.id, "settled");
    const capacity = Math.max(0, nation.transportCapacity ?? 0);
    const plan = allocations[nation.id];

    const transported = transportShipments(capacity, collected, plan, collectionOrder);
    const { warehouse, treasury } = updateNationStateWithTransportedResources(nation, transported);

    // Town commodities can be shared by multiple provinces. Attribute the already-shipped total once.
    const remaining = { ...transported };
    for (const { provinceId, seatTileId, units } of offers) {
      const lines = units.map(([commodity, offered]) => {
        const left = remaining[commodity] ?? 0;
        const delivered = Math.min(left, offered);
        remaining[commodity] = left - delivered;
        return { commodity, offered, delivered };
      });
      ctx.emit({ type: "town-receipt", turn: ctx.turn, nationId: nation.id, provinceId, seatTileId, lines });
    }

    return { ...nation, warehouse, treasury };
  });

  return { ...state, nations: updatedNations };
};

/**
 * Who collects the tile for the nation's warehouse (FR-391, the logistics phase's own rule): its hub's tile id and kind,
 * or undefined when the tile is not the nation's or no connected capital, depot or port is on it or next to it.
 */
export function collectingHub(state: GameState, nationId: string, tileId: string): CollectingHub | undefined {
  const [x, y] = parseTileIdToArray(tileId);
  const tile = state.map.tiles[y]?.[x];
  if (!tile || tile.id !== tileId) return undefined;
  return hubOf(state.map, nationId, hubsOf(state.transportNetwork.railroadNetworks?.[nationId]), tile);
}

/** A shared fishing hex supplies one unit per nation, even when two ports can reach it. */
function fishingGrounds(map: GameMap, nationId: string, hubs: readonly CollectingHub[], closedPorts: readonly string[] = []): Map<string, CollectingHub> {
  const grounds = new Map<string, CollectingHub>();
  for (const hub of hubs) {
    if (hub.kind === "depot" || closedPorts.includes(hub.tileId)) continue;
    const [x, y] = parseTileIdToArray(hub.tileId);
    const site = map.tiles[y][x];
    // Custom maps can name a Fish resource directly, including on the port tile itself.
    if (site.ownerNationId === nationId && site.resource?.type === ResourceType.Fish && !grounds.has(site.id)) grounds.set(site.id, hub);
    for (const tile of getAdjacentTiles(map, x, y)) {
      const inland = tile.ownerNationId === nationId && (tile.hasRiver || tile.resource?.type === ResourceType.Fish);
      if ((isOcean(tile) || inland) && !grounds.has(tile.id)) grounds.set(tile.id, hub);
    }
  }
  return grounds;
}

export function fishingGroundsOf(map: GameMap, nationId: string, network?: RailroadNetwork): ReadonlyMap<string, CollectingHub> {
  return fishingGrounds(map, nationId, hubsOf(network), network?.closedFishingPorts);
}

export function collectingFishHub(state: GameState, nationId: string, tileId: string): CollectingHub | undefined {
  return fishingGroundsOf(state.map, nationId, state.transportNetwork.railroadNetworks?.[nationId]).get(tileId);
}

export const computeLogisticsTransport = (
  map: GameMap,
  nationId: string,
  network?: RailroadNetwork
): Record<string, number> => {
  const hubs = hubsOf(network);
  const transported: Record<string, number> = {};
  const fish = fishingGrounds(map, nationId, hubs, network?.closedFishingPorts);
  for (const t of map.tiles.flat()) {
    if (!hubOf(map, nationId, hubs, t)) continue;
    const res = t.resource;
    if (!res || res.type === ResourceType.Fish) continue;
    const amount = ResourceDevelopmentTable[res.type]?.[res.level] ?? 0;
    if (amount <= 0) continue;
    transported[res.type] = (transported[res.type] ?? 0) + amount;
  }
  if (fish.size) transported[ResourceType.Fish] = fish.size;
  return transported;
};
