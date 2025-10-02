import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Nation } from "@/types/Nation";
import { ResourceType } from "@/types/Resource";
import { TerrainType, Tile } from "@/types/Tile";
import { RailroadNetwork } from "@/types/Transport";

const getAllocatedResources = (
  capacity: number,
  collected: Record<string, number>,
  plan?: Record<string, number>
): Record<string, number> => {
  const chosen: Record<string, number> = {};
  let used = 0;

  if (plan) {
    // Apply player-chosen allocation first
    for (const [res, requested] of Object.entries(plan)) {
      if (used >= capacity) break;
      const available = collected[res] ?? 0;
      const remaining = capacity - used;
      const take = Math.max(0, Math.min(Math.floor(requested) || 0, available, remaining));
      if (take > 0) {
        chosen[res] = take;
        used += take;
      }
    }
  }

  // If capacity remains, or if there was no plan, greedily fill from any unplanned resources
  if (used < capacity) {
    for (const [res, amt] of Object.entries(collected)) {
      if (used >= capacity) break;
      const already = chosen[res] ?? 0;
      const remainingFromRes = Math.max(0, amt - already);
      if (remainingFromRes <= 0) continue;
      const remainingCap = capacity - used;
      const take = Math.min(remainingFromRes, remainingCap);
      if (take > 0) {
        chosen[res] = (chosen[res] ?? 0) + take;
        used += take;
      }
    }
  }

  return chosen;
};

const updateNationStateWithTransportedResources = (
  nation: Nation,
  transportedResources: Record<string, number>
): { warehouse: Record<string, number>; treasury: number } => {
  const newWarehouse = { ...nation.warehouse };
  let treasury = nation.treasury;

  const goldUnits = transportedResources[ResourceType.Gold] ?? 0;
  const gemsUnits = transportedResources[ResourceType.Gems] ?? 0;
  // gold = $100/unit, gems = $1000/unit
  if (goldUnits > 0) treasury += goldUnits * 100;
  if (gemsUnits > 0) treasury += gemsUnits * 1000;

  for (const [key, amt] of Object.entries(transportedResources)) {
    if (key === ResourceType.Gold || key === ResourceType.Gems) continue;
    if (key in newWarehouse) {
      newWarehouse[key as keyof typeof newWarehouse] = (newWarehouse[key as keyof typeof newWarehouse] ?? 0) + amt;
    }
  }

  return { warehouse: newWarehouse, treasury };
};

export const logisticsSystem = (state: GameState): GameState => {
  const allocations = state.transportAllocationsByNation ?? {};
  const railroadNetworks = state.transportNetwork.railroadNetworks;

  const updatedNations = state.nations.map((nation) => {
    const nationNetwork = railroadNetworks ? railroadNetworks[nation.id] : undefined;
    const collected = computeLogisticsTransport(state.map, nation.id, nationNetwork);
    const capacity = Math.max(0, nation.transportCapacity ?? 0);
    const plan = allocations[nation.id];

    const transported = getAllocatedResources(capacity, collected, plan);
    const { warehouse, treasury } = updateNationStateWithTransportedResources(nation, transported);

    return { ...nation, warehouse, treasury };
  });

  return { ...state, nations: updatedNations };
};

export const computeLogisticsTransport = (
  map: GameMap,
  nationId: string,
  network?: RailroadNetwork
): Record<string, number> => {
  const cols = map.config.cols;
  const rows = map.config.rows;
  const flatTiles = map.tiles.flat();

  const isOwned = (t: Tile) => t.ownerNationId === nationId;

  const hubSet = new Set<string>();
  if (network) {
    if (network.capital) {
      hubSet.add(`${network.capital.x},${network.capital.y}`);
    }
    network.depots.forEach((d) => {
      if (d.isActive) {
        hubSet.add(`${d.x},${d.y}`);
      }
    });
    network.ports.forEach((p) => {
      if (p.isActive) {
        hubSet.add(`${p.x},${p.y}`);
      }
    });
  }

  const inBounds = (x: number, y: number) => x >= 0 && x < cols && y >= 0 && y < rows;
  const neighbors = (x: number, y: number) => {
    const isOddRow = y % 2 === 1;
    const top: [number, number][] = isOddRow ? [[x, y - 1], [x + 1, y - 1]] : [[x - 1, y - 1], [x, y - 1]];
    const bottom: [number, number][] = isOddRow ? [[x, y + 1], [x + 1, y + 1]] : [[x - 1, y + 1], [x, y + 1]];
    const side: [number, number][] = [[x - 1, y], [x + 1, y]];
    return [...top, ...side, ...bottom]
      .filter(([nx, ny]) => inBounds(nx, ny))
      .map(([nx, ny]) => `${nx},${ny}`);
  };

  const isAdjacentToAnyHub = (t: Tile) => {
    const here = `${t.x},${t.y}`;
    if (hubSet.has(here)) return true;
    const adj = neighbors(t.x, t.y);
    return adj.some((key) => hubSet.has(key));
  };

  const transported: Record<string, number> = {};
  flatTiles.forEach((t) => {
    if (!isOwned(t)) return;
    const qualifies = isAdjacentToAnyHub(t);
    if (!qualifies) return;
    const res = t.resource;
    if (!res) return;
    const amount = ResourceDevelopmentTable[res.type]?.[res.level] ?? 0;
    if (amount <= 0) return;
    transported[res.type] = (transported[res.type] ?? 0) + amount;
  });

  return transported;
};