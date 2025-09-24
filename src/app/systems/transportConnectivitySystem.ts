import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";

export const transportConnectivitySystem = (state: GameState): GameState => {
  const newMap = runTransportationConnectivity(state.map);
  return { ...state, map: newMap };
};

const runTransportationConnectivity = (map: GameMap): GameMap => {
  const cols = map.config.cols;
  const rows = map.config.rows;
  const tiles = map.tiles.map(row => row.map(t => ({ ...t, activeDepot: false, activePort: false })));

  const key = (x: number, y: number) => `${x},${y}`;
  const inBounds = (x: number, y: number) => x >= 0 && x < cols && y >= 0 && y < rows;
  const neighbors = (x: number, y: number) => {
    const isOddRow = y % 2 === 1;
    const top: [number, number][] = isOddRow ? [[x, y - 1], [x + 1, y - 1]] : [[x - 1, y - 1], [x, y - 1]];
    const bottom: [number, number][] = isOddRow ? [[x, y + 1], [x + 1, y + 1]] : [[x - 1, y + 1], [x, y + 1]];
    const side: [number, number][] = [[x - 1, y], [x + 1, y]];
    return [...top, ...side, ...bottom].filter(([nx, ny]) => inBounds(nx, ny));
  };

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

  const isOcean = (t: Tile) => t.terrain === TerrainType.Coast || t.terrain === TerrainType.Water;
  const isAdjacentToOcean = (x: number, y: number) => neighbors(x, y).some(([nx, ny]) => isOcean(tiles[ny][nx]));

  capitalsByNation.forEach((capitalNode, nation) => {
    const reachableFromCapital = bfs(nation, [capitalNode]);
    const candidatePorts = (portsByNation.get(nation) ?? []).filter(p => isAdjacentToOcean(p.x, p.y));
    const reachableFromPorts = candidatePorts.length ? bfs(nation, candidatePorts) : new Set<string>();
    const allReachable = new Set<string>([...reachableFromCapital, ...reachableFromPorts]);
    for (const d of (depotsByNation.get(nation) ?? [])) {
      const k = key(d.x, d.y);
      if (allReachable.has(k)) tiles[d.y][d.x].activeDepot = true;
    }
    for (const p of (portsByNation.get(nation) ?? [])) {
      const k = key(p.x, p.y);
      if (allReachable.has(k) && isAdjacentToOcean(p.x, p.y)) tiles[p.y][p.x].activePort = true;
    }
  });

  return { ...map, tiles };
};


