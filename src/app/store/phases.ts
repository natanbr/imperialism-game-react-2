// Turn phases orchestration and per-phase logic
import { GameState } from "@/types/GameState";
import { Nation } from "@/types/Nation";
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import { ResourceDevelopmentTable } from "@/definisions/ResourceDevelopment";
import { ProspectorDiscoveryDurationTurns } from "@/definisions/workerDurations";

// Orchestrate all phases and return a new GameState (map + nations updated)
export const runTurnPhases = (state: GameState, nextTurn: number): GameState => {
  // 1) Development, Diplomacy, Trade, Production, Combat, Interceptions act on the map
  const afterDev = runNationDevelopmentPhase(state.map, nextTurn);
  const updatedNations = runLogisticsForNations(afterDev, state.nations);
  const afterDip = runDiplomacyPhase(afterDev);
  const afterTrade = runTradePhase(afterDip);
  const afterCombat = runCombatPhase(afterTrade);
  const afterConnectivity = runTransportationConnectivity(afterCombat);
  const afterProd = runProductionPhase(afterConnectivity);
  const afterInter = runInterceptionsPhase(afterProd);
  const finalMap = runLogisticsPhase(afterInter);


  // Return updated state (turn/year handled by caller)
  return { ...state, map: finalMap, nations: updatedNations };
};

// Nation Development Phase: prospecting, development, construction, and cleanup
export const runNationDevelopmentPhase = (map: GameMap, nextTurn: number): GameMap => {
  const tiles: Tile[][] = map.tiles.map(row => row.map(tile => {
    let t: Tile = { ...tile };
    t = resolveProspectingOnTile(t, nextTurn);
    t = resolveDevelopmentJobOnTile(t, nextTurn);
    t = resolveConstructionJobOnTile(t, nextTurn);
    t = clearCompletionIndicators(t, nextTurn);
    return t;
  }));
  return { ...map, tiles };
};

// Resolves prospecting completion for a single tile
const resolveProspectingOnTile = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (t.prospecting && (nextTurn - t.prospecting.startedOnTurn) >= ProspectorDiscoveryDurationTurns) {
    let discoveredType: ResourceType | undefined;
    if (t.terrain === TerrainType.BarrenHills || t.terrain === TerrainType.Mountains) {
      const options = [ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems];
      discoveredType = options[Math.floor(Math.random() * options.length)];
    } else if (t.terrain === TerrainType.Swamp || t.terrain === TerrainType.Desert || t.terrain === TerrainType.Tundra) {
      discoveredType = ResourceType.Oil;
    }
    const newResource = discoveredType ? { type: discoveredType, level: 0, discovered: true } : t.resource;
    t = { ...t, resource: newResource, prospecting: undefined };
  }
  return t;
};

// Resolves development job completion for a single tile
const resolveDevelopmentJobOnTile = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (t.developmentJob && !t.developmentJob.completed) {
    const elapsed = nextTurn - t.developmentJob.startedOnTurn;
    if (elapsed >= t.developmentJob.durationTurns) {
      let newResource = t.resource;
      if (newResource) {
        const target = Math.max(newResource.level, t.developmentJob.targetLevel);
        newResource = { ...newResource, level: target };
      }
      t = { ...t, resource: newResource, developmentJob: { ...t.developmentJob, completed: true, completedOnTurn: nextTurn } };
    }
  }
  return t;
};

// Resolves construction job completion for a single tile
const resolveConstructionJobOnTile = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (t.constructionJob && !t.constructionJob.completed) {
    const elapsed = nextTurn - t.constructionJob.startedOnTurn;
    if (elapsed >= t.constructionJob.durationTurns) {
      const update: Partial<Tile> = {};
      switch (t.constructionJob.kind) {
        case "depot": update.depot = true; break;
        case "port": update.port = true; break;
        case "fort": update.fortLevel = Math.max(1, t.fortLevel || 0); break;
        case "rail": update.connected = true; break;
      }
      t = { ...t, ...update, constructionJob: { ...t.constructionJob, completed: true, completedOnTurn: nextTurn } };
    }
  }
  return t;
};

// Clears completion indicators one turn after completion (UI pulse)
const clearCompletionIndicators = (tile: Tile, nextTurn: number): Tile => {
  let t: Tile = { ...tile };
  if (t.developmentJob?.completed && t.developmentJob.completedOnTurn && nextTurn > t.developmentJob.completedOnTurn) {
    t = { ...t, developmentJob: undefined };
  }
  if (t.constructionJob?.completed && t.constructionJob.completedOnTurn && nextTurn > t.constructionJob.completedOnTurn) {
    t = { ...t, constructionJob: undefined };
  }
  return t;
};

// Placeholders for remaining phases (extend as systems are implemented)
export const runDiplomacyPhase = (map: GameMap): GameMap => map;
export const runTradePhase = (map: GameMap): GameMap => map;
export const runProductionPhase = (map: GameMap): GameMap => map;
export const runCombatPhase = (map: GameMap): GameMap => map;
export const runInterceptionsPhase = (map: GameMap): GameMap => map;

// New step: transportation-connectivity (compute active depots and ports based on connectivity rules)
export const runTransportationConnectivity = (map: GameMap): GameMap => {
  const cols = map.config.cols;
  const rows = map.config.rows;
  const tiles = map.tiles.map(row => row.map(t => ({ ...t, activeDepot: false, activePort: false })));

  // Utility helpers
  const key = (x: number, y: number) => `${x},${y}`;
  const inBounds = (x: number, y: number) => x >= 0 && x < cols && y >= 0 && y < rows;
  const neighbors = (x: number, y: number) => {
    const isOddRow = y % 2 === 1;
    const top: [number, number][] = isOddRow ? [[x, y - 1], [x + 1, y - 1]] : [[x - 1, y - 1], [x, y - 1]];
    const bottom: [number, number][] = isOddRow ? [[x, y + 1], [x + 1, y + 1]] : [[x - 1, y + 1], [x, y + 1]];
    const side: [number, number][] = [[x - 1, y], [x + 1, y]];
    return [...top, ...side, ...bottom].filter(([nx, ny]) => inBounds(nx, ny));
  };

  // Build rail graph per nation: land tiles with connected=true and same owner
  type Node = { x: number; y: number };
  const railGraphByNation = new Map<string, Map<string, Node[]>>();
  const capitalsByNation = new Map<string, Node>();
  const portsByNation: Map<string, Node[]> = new Map();
  const depotsByNation: Map<string, Node[]> = new Map();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = tiles[y][x];
      if (!t.ownerNationId) continue;
      const nation = t.ownerNationId;
      if (t.terrain === TerrainType.Capital) capitalsByNation.set(nation, { x, y });
      if (t.port) {
        const arr = portsByNation.get(nation) ?? [];
        arr.push({ x, y });
        portsByNation.set(nation, arr);
      }
      if (t.depot) {
        const arr = depotsByNation.get(nation) ?? [];
        arr.push({ x, y });
        depotsByNation.set(nation, arr);
      }
      // Rail nodes: land only, owned, and connected flag true
      const isLand = ![TerrainType.Water, TerrainType.Coast, TerrainType.River].includes(t.terrain);
      if (isLand && t.connected) {
        const g = railGraphByNation.get(nation) ?? new Map<string, Node[]>();
        const k = key(x, y);
        const adj: Node[] = [];
        for (const [nx, ny] of neighbors(x, y)) {
          const n = tiles[ny][nx];
          const nIsLand = ![TerrainType.Water, TerrainType.Coast, TerrainType.River].includes(n.terrain);
          if (nIsLand && n.connected && n.ownerNationId === nation) {
            adj.push({ x: nx, y: ny });
          }
        }
        g.set(k, adj);
        railGraphByNation.set(nation, g);
      }
    }
  }

  // BFS utility within a nation's rail graph
  const bfs = (nation: string, starts: Node[]): Set<string> => {
    const g = railGraphByNation.get(nation) ?? new Map<string, Node[]>();
    const visited = new Set<string>();
    const queue: Node[] = [];
    starts.forEach(s => {
      const k = key(s.x, s.y);
      if (g.has(k)) {
        visited.add(k);
        queue.push(s);
      }
    });
    while (queue.length) {
      const cur = queue.shift()!;
      const k = key(cur.x, cur.y);
      const nbrs = g.get(k) ?? [];
      for (const n of nbrs) {
        const nk = key(n.x, n.y);
        if (!visited.has(nk)) {
          visited.add(nk);
          queue.push(n);
        }
      }
    }
    return visited;
  };

  // For each nation: active if connected to capital OR to any active port (port connected to ocean)
  const isOcean = (t: Tile) => t.terrain === TerrainType.Coast || t.terrain === TerrainType.Water;
  const isAdjacentToOcean = (x: number, y: number) => {
    return neighbors(x, y).some(([nx, ny]) => isOcean(tiles[ny][nx]));
  };

  capitalsByNation.forEach((capitalNode, nation) => {
    const reachableFromCapital = bfs(nation, [capitalNode]);

    // Ports that are on land, owned, and adjacent to ocean are considered valid rail endpoints
    const candidatePorts = (portsByNation.get(nation) ?? []).filter(p => isAdjacentToOcean(p.x, p.y));
    const reachableFromPorts = candidatePorts.length ? bfs(nation, candidatePorts) : new Set<string>();

    const allReachable = new Set<string>([...reachableFromCapital, ...reachableFromPorts]);

    // Mark active depot/port if their tile is in reachable set
    for (const d of (depotsByNation.get(nation) ?? [])) {
      const k = key(d.x, d.y);
      if (allReachable.has(k)) tiles[d.y][d.x].activeDepot = true;
    }
    for (const p of (portsByNation.get(nation) ?? [])) {
      const k = key(p.x, p.y);
      // Port must also be adjacent to ocean
      if (allReachable.has(k) && isAdjacentToOcean(p.x, p.y)) tiles[p.y][p.x].activePort = true;
    }
  });

  return { ...map, tiles };
};

// Logistics Phase: compute per-tile production and return a map unchanged (warehouse updates are handled in phases via returned totals)
export const runLogisticsPhase = (map: GameMap): GameMap => map;

export const runLogisticsForNations = (map: GameMap, nations: Nation[]): Nation[] => {
  return nations.map((nation) => {
    const transported = computeLogisticsTransport(map, nation.id);

    // Enforce per-nation transport capacity cap
    const cap = Math.max(0, nation.transportCapacity ?? 0);
    let used = 0;
    const capped: Record<string, number> = {};
    for (const [res, amt] of Object.entries(transported)) {
      if (used >= cap) break;
      const remaining = cap - used;
      const take = Math.min(amt, remaining);
      if (take > 0) {
        capped[res] = take;
        used += take;
      }
    }

    const newWarehouse = { ...nation.warehouse };
    Object.entries(capped).forEach(([key, amt]) => {
      newWarehouse[key] = (newWarehouse[key] ?? 0) + amt;
    });

    return { ...nation, warehouse: newWarehouse };
  });
}
// Compute resources to collect to warehouse for the active nation given the latest map
// - Tiles owned by the nation
// - Tile is a hub (capital/depot/port) or adjacent (orthogonal) to any hub
// Returns a map of ResourceType (string key) to total amount
export const computeLogisticsTransport = (map: GameMap, activeNationId: string): Record<string, number> => {
  const cols = map.config.cols;
  const rows = map.config.rows;
  const flatTiles = map.tiles.flat();

  const isOwnedByActive = (t: typeof flatTiles[number]) => t.ownerNationId === activeNationId;

  const capital = flatTiles.find((t) => t.terrain === TerrainType.Capital && isOwnedByActive(t));
  const capitalPos = capital ? { x: capital.x, y: capital.y } : undefined;

  const hubSet = new Set<string>();
  flatTiles.forEach((t) => {
    if (!isOwnedByActive(t)) return;
    // Only active depots/ports qualify, capital always qualifies
    const isActiveHub = (t.depot && t.activeDepot) || (t.port && t.activePort) || (t.terrain === TerrainType.Capital);
    if (isActiveHub) {
      hubSet.add(`${t.x},${t.y}`);
    }
  });

  const inBounds = (x: number, y: number) => x >= 0 && x < cols && y >= 0 && y < rows;
  // Brick pattern adjacency: two above, two sides, two below
  const neighbors = (x: number, y: number) => {
    const isOddRow = y % 2 === 1; // odd rows are shifted right visually
    const top: [number, number][] = isOddRow
      ? [[x, y - 1], [x + 1, y - 1]]
      : [[x - 1, y - 1], [x, y - 1]];
    const bottom: [number, number][] = isOddRow
      ? [[x, y + 1], [x + 1, y + 1]]
      : [[x - 1, y + 1], [x, y + 1]];
    const side: [number, number][] = [[x - 1, y], [x + 1, y]];
    return [...top, ...side, ...bottom]
      .filter(([nx, ny]) => inBounds(nx, ny))
      .map(([nx, ny]) => `${nx},${ny}`);
  };

  const isAdjacentToAnyHub = (t: typeof flatTiles[number]) => {
    const here = `${t.x},${t.y}`;
    if (hubSet.has(here)) return true; // tile with hub itself
    const adj = neighbors(t.x, t.y);
    return adj.some((key) => hubSet.has(key));
  };

  const isAdjacentToCapital = (t: typeof flatTiles[number]) => {
    if (!capitalPos) return false;
    const dx = Math.abs(t.x - capitalPos.x);
    const dy = Math.abs(t.y - capitalPos.y);
    return (dx + dy === 1) || (dx === 0 && dy === 0);
  };

  const transported: Record<string, number> = {};
  flatTiles.forEach((t) => {
    if (!isOwnedByActive(t)) return;
    const qualifies = isAdjacentToAnyHub(t) || isAdjacentToCapital(t);
    if (!qualifies) return;
    const res = t.resource;
    if (!res) return;
    const amount = ResourceDevelopmentTable[res.type]?.[res.level] ?? 0;
    if (amount <= 0) return;
    transported[res.type] = (transported[res.type] ?? 0) + amount;
  });

  return transported;
};

// Apply transported resources to the active nation's warehouse
export const applyTransportToNations = (
  nations: Nation[],
  activeNationId: string,
  transported: Record<string, number>
): Nation[] => {
  return nations.map((n) => {
    if (n.id !== activeNationId) return n;
    const newWarehouse = { ...n.warehouse };
    Object.entries(transported).forEach(([key, amt]) => {
      newWarehouse[key] = (newWarehouse[key] ?? 0) + amt;
    });
    return { ...n, warehouse: newWarehouse };
  });
};