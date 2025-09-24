import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";
import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import { ResourceType } from "@/types/Resource";

export const logisticsSystem = (state: GameState): GameState => {
  const updatedNations = state.nations.map((nation) => {
    const collected = computeLogisticsTransport(state.map, nation.id);

    // Enforce per-nation transport capacity cap
    const cap = Math.max(0, nation.transportCapacity ?? 0);
    let used = 0;
    const capped: Record<string, number> = {};
    for (const [res, amt] of Object.entries(collected)) {
      if (used >= cap) break;
      const remaining = cap - used;
      const take = Math.min(amt, remaining);
      if (take > 0) {
        capped[res] = take;
        used += take;
      }
    }

    // Convert gold/gems directly to cash per manual; others to warehouse
    const newWarehouse = { ...nation.warehouse };
    let treasury = nation.treasury;
    const goldUnits = capped[ResourceType.Gold] ?? 0;
    const gemsUnits = capped[ResourceType.Gems] ?? 0;
    if (goldUnits > 0) treasury += goldUnits * 200;
    if (gemsUnits > 0) treasury += gemsUnits * 500;

    Object.entries(capped).forEach(([key, amt]) => {
      if (key === ResourceType.Gold || key === ResourceType.Gems) return;
      newWarehouse[key] = (newWarehouse[key] ?? 0) + amt;
    });

    return { ...nation, warehouse: newWarehouse, treasury };
  });

  return { ...state, nations: updatedNations };
};

const computeLogisticsTransport = (map: GameMap, nationId: string): Record<string, number> => {
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


