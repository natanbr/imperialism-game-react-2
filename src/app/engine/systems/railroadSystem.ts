import { GameState } from "@/types/GameState";
import {
  RailroadNetwork,
  RailroadNode,
  RailroadNetworks,
} from "@/types/Transport";
import { TerrainType } from "@/types/Tile";
import { GameMap } from "@/types/Map";
import { Nation } from "@/types/Nation";
import { getNeighborCoords } from "../map/mapHelpers";

const key = (x: number, y: number) => `${x},${y}`;

// The builders below mutate only the fresh networks they create themselves.
const initializeEmptyNetworks = (nations: Nation[]): RailroadNetworks => {
  const networks: RailroadNetworks = {};
  for (const nation of nations) {
    networks[nation.id] = {
      graph: {},
      ports: [],
      depots: [],
    };
  }
  return networks;
};

const populateNodesFromMap = (map: GameMap, networks: RailroadNetworks): void => {
  for (let y = 0; y < map.config.rows; y++) {
    for (let x = 0; x < map.config.cols; x++) {
      const tile = map.tiles[y][x];
      const nationId = tile.ownerNationId;

      if (nationId && networks[nationId]) {
        const network = networks[nationId];
        if (tile.terrain === TerrainType.Capital) {
          network.capital = { x, y };
        }
        if (tile.port) {
          network.ports.push({ x, y, isActive: false });
        }
        if (tile.depot) {
          network.depots.push({ x, y, isActive: false });
        }
        // Add tiles to graph if they have rail, are depot, port, or capital
        if (tile.connected || tile.depot || tile.port || tile.terrain === TerrainType.Capital) {
          const k = key(x, y);
          if (!network.graph[k]) {
            network.graph[k] = [];
          }
        }
      }
    }
  }
};

const buildInitialGraph = (map: GameMap, networks: RailroadNetworks): void => {
  for (let y = 0; y < map.config.rows; y++) {
    for (let x = 0; x < map.config.cols; x++) {
      const tile = map.tiles[y][x];
      const nationId = tile.ownerNationId;

      // Include tiles with rail, depot, port, or capital in the graph
      const isGraphNode = tile.connected || tile.depot || tile.port || tile.terrain === TerrainType.Capital;

      if (nationId && networks[nationId] && isGraphNode) {
        const network = networks[nationId];
        const k = key(x, y);
        const neighbors = getNeighborCoords(map, x, y);
        for (const [nx, ny] of neighbors) {
          const neighborTile = map.tiles[ny][nx];
          const neighborIsGraphNode =
            neighborTile.connected ||
            neighborTile.depot ||
            neighborTile.port ||
            neighborTile.terrain === TerrainType.Capital;

          if (
            neighborTile.ownerNationId === nationId &&
            neighborIsGraphNode
          ) {
            network.graph[k].push({ x: nx, y: ny });
          }
        }
      }
    }
  }
};

/** Two neighbouring tiles joined in a nation's rail graph. */
export interface RailLink {
  nationId: string;
  from: RailroadNode;
  to: RailroadNode;
}

const before = (a: RailroadNode, b: RailroadNode): boolean => a.y < b.y || (a.y === b.y && a.x < b.x);

/**
 * Every link of every nation's rail graph, once (FR-079). The map draws exactly these, so the
 * line on the map is the graph `transportConnectivitySystem` lights the depots from.
 */
export function railLinksOf({ transportNetwork }: Pick<GameState, "transportNetwork">): RailLink[] {
  const links: RailLink[] = [];
  for (const [nationId, network] of Object.entries(transportNetwork.railroadNetworks ?? {})) {
    const seen = new Set<string>();
    for (const [k, neighbours] of Object.entries(network.graph)) {
      const [x, y] = k.split(",").map(Number);
      for (const n of neighbours) {
        const [from, to] = before({ x, y }, n) ? [{ x, y }, { x: n.x, y: n.y }] : [{ x: n.x, y: n.y }, { x, y }];
        const id = `${key(from.x, from.y)}|${key(to.x, to.y)}`;
        if (seen.has(id)) continue;
        seen.add(id);
        links.push({ nationId, from, to });
      }
    }
  }
  return links;
}

export const initializeRailroadNetworks = (map: GameMap, nations: Nation[]): RailroadNetworks => {
  const networks = initializeEmptyNetworks(nations);
  populateNodesFromMap(map, networks);
  buildInitialGraph(map, networks);
  return networks;
};

/** A copy of the network whose graph lists and node arrays can be changed safely. */
const cloneNetwork = (network: RailroadNetwork): RailroadNetwork => ({
  ...network,
  graph: Object.fromEntries(Object.entries(network.graph).map(([k, nodes]) => [k, nodes.map(n => ({ ...n }))])),
  ports: network.ports.map(p => ({ ...p })),
  depots: network.depots.map(d => ({ ...d })),
});

/** Adds (x, y) to the copied graph and links it both ways to every neighbouring graph node. */
const linkNode = (map: GameMap, network: RailroadNetwork, { x, y }: RailroadNode): void => {
  const k = key(x, y);
  if (!network.graph[k]) {
    network.graph[k] = [];
  }
  for (const [nx, ny] of getNeighborCoords(map, x, y)) {
    const neighborKey = key(nx, ny);
    if (!network.graph[neighborKey]) continue;
    if (!network.graph[k].some((n) => n.x === nx && n.y === ny)) {
      network.graph[k].push({ x: nx, y: ny });
    }
    if (!network.graph[neighborKey].some((n) => n.x === x && n.y === y)) {
      network.graph[neighborKey].push({ x, y });
    }
  }
};

const withNetwork = (state: GameState, nationId: string, network: RailroadNetwork): GameState => ({
  ...state,
  transportNetwork: {
    ...state.transportNetwork,
    railroadNetworks: { ...(state.transportNetwork.railroadNetworks ?? {}), [nationId]: network },
  },
});

export const addRailroad = (
  state: GameState,
  nationId: string,
  node: RailroadNode
): GameState => {
  const original = state.transportNetwork.railroadNetworks?.[nationId];
  if (!original) return state;

  const network = cloneNetwork(original);
  linkNode(state.map, network, node);

  const { x, y } = node;
  const newTiles = state.map.tiles.map((row, rY) => {
    if (rY !== y) return row;
    return row.map((tile, tX) => {
      if (tX !== x) return tile;
      return { ...tile, connected: true };
    });
  });

  return { ...withNetwork(state, nationId, network), map: { ...state.map, tiles: newTiles } };
};

export const addDepot = (
  state: GameState,
  nationId: string,
  node: RailroadNode
): GameState => {
  const original = state.transportNetwork.railroadNetworks?.[nationId];
  if (!original) return state;

  const network = cloneNetwork(original);
  const { x, y } = node;
  if (!network.depots.some((d) => d.x === x && d.y === y)) {
    network.depots.push({ x, y, isActive: false });
  }
  linkNode(state.map, network, node);

  return withNetwork(state, nationId, network);
};

export const addPort = (
  state: GameState,
  nationId: string,
  node: RailroadNode
): GameState => {
  const original = state.transportNetwork.railroadNetworks?.[nationId];
  if (!original) return state;

  const network = cloneNetwork(original);
  const { x, y } = node;
  if (!network.ports.some((p) => p.x === x && p.y === y)) {
    network.ports.push({ x, y, isActive: false });
  }
  linkNode(state.map, network, node);

  return withNetwork(state, nationId, network);
};
