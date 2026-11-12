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

/** Two neighbouring tiles joined by a rail section in a nation's rail graph. */
export interface RailLink {
  nationId: string;
  from: RailroadNode;
  to: RailroadNode;
}

const before = (a: RailroadNode, b: RailroadNode): boolean => a.y < b.y || (a.y === b.y && a.x < b.x);

/** True when a section joins the two tiles in the nation's rail graph (FR-136). */
export function isRailLinked(network: RailroadNetwork | undefined, a: RailroadNode, b: RailroadNode): boolean {
  return !!network?.graph[key(a.x, a.y)]?.some((n) => n.x === b.x && n.y === b.y);
}

/** True when at least one section ends on the tile. */
export function hasRailLink(network: RailroadNetwork | undefined, { x, y }: RailroadNode): boolean {
  return (network?.graph[key(x, y)]?.length ?? 0) > 0;
}

/**
 * Every rail section of every nation, once (FR-079, FR-136). The map draws exactly these, so the
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

/**
 * The start network of a map: a node for every capital, depot, port and rail tile. A map stores no
 * sections, so rail placed on a map before play (hand-made test maps) is linked to every neighbouring
 * node; `newGame()` places none, so a nation starts with its capital alone (FR-136).
 */
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

/** Adds (x, y) to the copied graph if it is not there yet, with no link. */
const addNode = (network: RailroadNetwork, { x, y }: RailroadNode): void => {
  network.graph[key(x, y)] ??= [];
};

/** Joins two tiles in the copied graph, both ways: one rail section (FR-136). */
const linkSection = (network: RailroadNetwork, a: RailroadNode, b: RailroadNode): void => {
  addNode(network, a);
  addNode(network, b);
  if (!isRailLinked(network, a, b)) network.graph[key(a.x, a.y)].push({ x: b.x, y: b.y });
  if (!isRailLinked(network, b, a)) network.graph[key(b.x, b.y)].push({ x: a.x, y: a.y });
};

/** The first neighbour of the tile, in map neighbour order, that is a node of the graph. */
const firstNeighbourNode = (map: GameMap, network: RailroadNetwork, { x, y }: RailroadNode): RailroadNode | undefined => {
  const found = getNeighborCoords(map, x, y).find(([nx, ny]) => network.graph[key(nx, ny)]);
  return found && { x: found[0], y: found[1] };
};

const withNetwork = (state: GameState, nationId: string, network: RailroadNetwork): GameState => ({
  ...state,
  transportNetwork: {
    ...state.transportNetwork,
    railroadNetworks: { ...(state.transportNetwork.railroadNetworks ?? {}), [nationId]: network },
  },
});

/**
 * Rail laid on `node` by a section from `from` (FR-136): the tile gets rail and joins the graph linked
 * to `from` only, never to its other rail neighbours. Without `from` (a hand-made job), the section
 * starts from the tile's first neighbouring node.
 */
export const addRailroad = (
  state: GameState,
  nationId: string,
  node: RailroadNode,
  from?: RailroadNode
): GameState => {
  const original = state.transportNetwork.railroadNetworks?.[nationId];
  if (!original) return state;

  const network = cloneNetwork(original);
  const start = from ?? firstNeighbourNode(state.map, network, node);
  if (start) linkSection(network, node, start);
  else addNode(network, node);

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

/** A finished depot joins the graph with no link: a section built into or out of it joins it (FR-136). */
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
  addNode(network, node);

  return withNetwork(state, nationId, network);
};

/** A finished port joins the graph with no link, like a depot (FR-136). */
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
  addNode(network, node);

  return withNetwork(state, nationId, network);
};
