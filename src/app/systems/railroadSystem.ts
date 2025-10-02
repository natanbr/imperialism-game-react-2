import { GameState } from "@/types/GameState";
import {
  RailroadNetwork,
  RailroadNode,
  RailroadNetworks,
} from "@/types/Transport";
import { TerrainType } from "@/types/Tile";
import { GameMap } from "@/types/Map";
import { Nation } from "@/types/Nation";
import { getNeighborCoords } from "../store/helpers/mapHelpers";

const key = (x: number, y: number) => `${x},${y}`;

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
        if (tile.connected) {
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

      if (nationId && networks[nationId] && tile.connected) {
        const network = networks[nationId];
        const k = key(x, y);
        const neighbors = getNeighborCoords(map, x, y);
        for (const [nx, ny] of neighbors) {
          const neighborTile = map.tiles[ny][nx];
          if (
            neighborTile.ownerNationId === nationId &&
            neighborTile.connected
          ) {
            network.graph[k].push({ x: nx, y: ny });
          }
        }
      }
    }
  }
};

export const initializeRailroadNetworks = (map: GameMap, nations: Nation[]): RailroadNetworks => {
  const networks = initializeEmptyNetworks(nations);
  populateNodesFromMap(map, networks);
  buildInitialGraph(map, networks);
  return networks;
};

export const addRailroad = (
  state: GameState,
  nationId: string,
  node: RailroadNode
): GameState => {
  const networks = state.transportNetwork.railroadNetworks ?? {};
  const network = networks[nationId];
  if (!network) return state;

  const { x, y } = node;
  const k = key(x, y);
  if (!network.graph[k]) {
    network.graph[k] = [];
  }

  const neighbors = getNeighborCoords(state.map, x, y);
  for (const [nx, ny] of neighbors) {
    const neighborKey = key(nx, ny);
    if (network.graph[neighborKey]) {
      if (!network.graph[k].some((n) => n.x === nx && n.y === ny)) {
        network.graph[k].push({ x: nx, y: ny });
      }
      if (!network.graph[neighborKey].some((n) => n.x === x && n.y === y)) {
        network.graph[neighborKey].push({ x, y });
      }
    }
  }

  const newNetworks = { ...networks, [nationId]: network };

  const newTiles = state.map.tiles.map((row, rY) => {
    if (rY !== y) return row;
    return row.map((tile, tX) => {
      if (tX !== x) return tile;
      return { ...tile, connected: true };
    });
  });

  return {
    ...state,
    map: { ...state.map, tiles: newTiles },
    transportNetwork: {
      ...state.transportNetwork,
      railroadNetworks: newNetworks,
    },
  };
};