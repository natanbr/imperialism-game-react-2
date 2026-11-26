import { GEMS_CASH_PER_UNIT, GOLD_CASH_PER_UNIT } from "@/definisions/cashValues";
import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Nation } from "@/types/Nation";
import { ResourceType } from "@/types/Resource";
import { Tile } from "@/types/Tile";
import { RailroadNetwork } from "@/types/Transport";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import type { TurnSystem } from "../turn/context";
import { getAdjacentTiles, isOcean } from "../map/mapHelpers";

/**
 * What the logistics phase ships of what the hubs collected (FR-389, card Q80): the plan holds per commodity either a
 * set amount or nothing (automatic). A set commodity ships at most its set amount (0 ships nothing), set ones first in
 * plan order; the capacity left goes to the automatic commodities only, in tile order (the order `collected` lists
 * them). With no plan every commodity is automatic. The popup reads the same numbers (FR-390).
 */
export const transportShipments = (
  capacity: number,
  collected: Record<string, number>,
  plan: Record<string, number> = {}
): Record<string, number> => {
  const chosen: Record<string, number> = {};
  let used = 0;
  const ship = (res: string, wanted: number) => {
    const take = Math.max(0, Math.min(wanted, collected[res] ?? 0, capacity - used));
    if (take <= 0) return;
    chosen[res] = take;
    used += take;
  };
  for (const [res, requested] of Object.entries(plan)) ship(res, Math.floor(requested) || 0);
  for (const [res, amount] of Object.entries(collected)) if (!Object.hasOwn(plan, res)) ship(res, amount);
  return chosen;
};

export const updateNationStateWithTransportedResources = (
  nation: Nation,
  transportedResources: Record<string, number>
): { warehouse: Record<string, number>; treasury: number } => {
  const newWarehouse = { ...nation.warehouse };
  let treasury = nation.treasury;

  const goldUnits = transportedResources[ResourceType.Gold] ?? 0;
  const gemsUnits = transportedResources[ResourceType.Gems] ?? 0;
  if (goldUnits > 0) treasury += goldUnits * GOLD_CASH_PER_UNIT;
  if (gemsUnits > 0) treasury += gemsUnits * GEMS_CASH_PER_UNIT;

  for (const [key, amt] of Object.entries(transportedResources)) {
    if (key === ResourceType.Gold || key === ResourceType.Gems) continue;
    if (Object.hasOwn(newWarehouse, key)) {
      newWarehouse[key as keyof typeof newWarehouse] = (newWarehouse[key as keyof typeof newWarehouse] ?? 0) + amt;
    }
  }

  return { warehouse: newWarehouse, treasury };
};

export const logisticsSystem: TurnSystem = (state: GameState): GameState => {
  const allocations = state.transportAllocationsByNation ?? {};
  const railroadNetworks = state.transportNetwork.railroadNetworks;

  const updatedNations = state.nations.map((nation) => {
    const nationNetwork = railroadNetworks ? railroadNetworks[nation.id] : undefined;
    const collected = computeLogisticsTransport(state.map, nation.id, nationNetwork);
    const capacity = Math.max(0, nation.transportCapacity ?? 0);
    const plan = allocations[nation.id];

    const transported = transportShipments(capacity, collected, plan);
    const { warehouse, treasury } = updateNationStateWithTransportedResources(nation, transported);

    return { ...nation, warehouse, treasury };
  });

  return { ...state, nations: updatedNations };
};

/** The hub that collects a tile's resource (FR-391): the capital, an active depot or an active port, by its tile id. */
export interface CollectingHub {
  tileId: string;
  kind: "capital" | "depot" | "port";
}

/** The network's hubs in the order a tile asks them: the capital, then the active depots, then the active ports. */
function hubsOf(network: RailroadNetwork | undefined): CollectingHub[] {
  if (!network) return [];
  const id = (n: { x: number; y: number }) => `${n.x}-${n.y}`;
  return [
    ...(network.capital ? [{ tileId: id(network.capital), kind: "capital" as const }] : []),
    ...network.depots.filter((d) => d.isActive).map((d) => ({ tileId: id(d), kind: "depot" as const })),
    ...network.ports.filter((p) => p.isActive).map((p) => ({ tileId: id(p), kind: "port" as const })),
  ];
}

/** The tile ids of the tile's hex neighbours inside the map (odd rows shifted half a tile right). */
function neighbourIds(map: GameMap, x: number, y: number): string[] {
  const { cols, rows } = map.config;
  const isOddRow = y % 2 === 1;
  const top: [number, number][] = isOddRow ? [[x, y - 1], [x + 1, y - 1]] : [[x - 1, y - 1], [x, y - 1]];
  const bottom: [number, number][] = isOddRow ? [[x, y + 1], [x + 1, y + 1]] : [[x - 1, y + 1], [x, y + 1]];
  const side: [number, number][] = [[x - 1, y], [x + 1, y]];
  return [...top, ...side, ...bottom].filter(([nx, ny]) => nx >= 0 && nx < cols && ny >= 0 && ny < rows).map(([nx, ny]) => `${nx}-${ny}`);
}

/**
 * The rule of the logistics phase (FR-022, FR-391): an owned tile is collected by the hub it is, else by the first hub
 * next to it (capital, depots, ports in network order); a tile of another owner or next to no hub by none.
 */
function hubOf(map: GameMap, nationId: string, hubs: readonly CollectingHub[], tile: Tile): CollectingHub | undefined {
  if (tile.ownerNationId !== nationId || hubs.length === 0) return undefined;
  const here = `${tile.x}-${tile.y}`;
  const own = hubs.find((h) => h.tileId === here);
  if (own) return own;
  const around = new Set(neighbourIds(map, tile.x, tile.y));
  return hubs.find((h) => around.has(h.tileId));
}

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
