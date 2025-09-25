import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { ResourceType } from "@/types/Resource";
import { TerrainType } from "@/types/Tile";

export const logisticsSystem = (state: GameState): GameState => {
  const allocations = state.transportAllocationsByNation ?? {};

  const updatedNations = state.nations.map((nation) => {
    const collected = computeLogisticsTransport(state.map, nation.id);

    // Apply player-chosen allocation if present; otherwise default to greedy fill
    const plan = allocations[nation.id];
    const chosen: Record<string, number> = {};
    if (plan) {
      // Clamp to available per resource and total capacity
      const cap = Math.max(0, nation.transportCapacity ?? 0);
      let used = 0;
      for (const [res, requested] of Object.entries(plan)) {
        if (used >= cap) break;
        const available = collected[res] ?? 0;
        const remaining = cap - used;
        const take = Math.max(0, Math.min(Math.floor(requested) || 0, available, remaining));
        if (take > 0) {
          chosen[res] = take;
          used += take;
        }
      }
      // If capacity remains, greedily fill from any unplanned resources (stable order)
      if (used < cap) {
        for (const [res, amt] of Object.entries(collected)) {
          if (used >= cap) break;
          const already = chosen[res] ?? 0;
          const remainingFromRes = Math.max(0, amt - already);
          if (remainingFromRes <= 0) continue;
          const remainingCap = cap - used;
          const take = Math.min(remainingFromRes, remainingCap);
          if (take > 0) {
            chosen[res] = already + take;
            used += take;
          }
        }
      }
    } else {
      // Default: greedily take from collected until capacity
      const cap = Math.max(0, nation.transportCapacity ?? 0);
      let used = 0;
      for (const [res, amt] of Object.entries(collected)) {
        if (used >= cap) break;
        const remaining = cap - used;
        const take = Math.min(amt, remaining);
        if (take > 0) {
          chosen[res] = take;
          used += take;
        }
      }
    }

    // Convert gold/gems directly to cash per roadmap; others to warehouse
    const newWarehouse = { ...nation.warehouse };
    let treasury = nation.treasury;
    const goldUnits = chosen[ResourceType.Gold] ?? 0;
    const gemsUnits = chosen[ResourceType.Gems] ?? 0;
    // gold = $100/unit, gems = $1000/unit
    if (goldUnits > 0) treasury += goldUnits * 100;
    if (gemsUnits > 0) treasury += gemsUnits * 1000;

    Object.entries(chosen).forEach(([key, amt]) => {
      if (key === ResourceType.Gold || key === ResourceType.Gems) return;
      newWarehouse[key] = (newWarehouse[key] ?? 0) + amt;
    });

    return { ...nation, warehouse: newWarehouse, treasury };
  });

  return { ...state, nations: updatedNations };
};

export const computeLogisticsTransport = (map: GameMap, nationId: string): Record<string, number> => {
  const cols = map.config.cols;
  const rows = map.config.rows;
  const flatTiles = map.tiles.flat();

  const isOwned = (t: typeof flatTiles[number]) => t.ownerNationId === nationId;

  const hubSet = new Set<string>();
  flatTiles.forEach((t) => {
    if (!isOwned(t)) return;
    const isActiveHub = (t.depot && t.activeDepot) || (t.port && t.activePort) || (t.terrain === TerrainType.Capital);
    if (isActiveHub) hubSet.add(`${t.x},${t.y}`);
  });

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

  const isAdjacentToAnyHub = (t: typeof flatTiles[number]) => {
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


