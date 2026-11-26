import { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { RailroadNode, RailroadNetworks, RailroadNetwork } from "@/types/Transport";
import { getAdjacentTiles, isAdjacentToOcean, isRailLand } from "../map/mapHelpers";
import { homeApproach, isPortClosed, portApproach } from "../navy/fleets";
import type { TurnSystem } from "../turn/context";

const key = (x: number, y: number) => `${x},${y}`;

const initializeBfsQueue = (
  graph: Record<string, RailroadNode[]>,
  starts: RailroadNode[]
): { queue: RailroadNode[]; visited: Set<string> } => {
  const visited = new Set<string>();
  const queue: RailroadNode[] = [];

  starts.forEach((s) => {
    const k = key(s.x, s.y);
    if (graph[k]) {
      visited.add(k);
      queue.push(s);
    }
  });

  return { queue, visited };
};

const executeBfs = (
  graph: Record<string, RailroadNode[]>,
  queue: RailroadNode[],
  visited: Set<string>
): void => {
  while (queue.length) {
    const cur = queue.shift()!;
    const k = key(cur.x, cur.y);
    const nbrs = graph[k] ?? [];
    for (const n of nbrs) {
      const nk = key(n.x, n.y);
      if (!visited.has(nk)) {
        visited.add(nk);
        queue.push(n);
      }
    }
  }
};

const bfs = (
  graph: Record<string, RailroadNode[]>,
  starts: RailroadNode[]
): Set<string> => {
  const { queue, visited } = initializeBfsQueue(graph, starts);
  executeBfs(graph, queue, visited);
  return visited;
};

/** A coastal port binds to its own shore. Inland ports can use any open mouth on their owned river. */
function portWaterRoute(state: GameState, nationId: string, site: Tile, fleetsAtSea: boolean): "open" | "closed" | "no-site" {
  if (site.ownerNationId !== nationId || !isRailLand(site)) return "no-site";
  const shoreIsOpen = (tile: Tile) => {
    const shore = fleetsAtSea && portApproach(state, tile);
    return !shore || !isPortClosed(state, nationId, shore.provinceId, shore.seaId);
  };
  if (isAdjacentToOcean(state.map, site.x, site.y)) return shoreIsOpen(site) ? "open" : "closed";
  if (!site.hasRiver) return "no-site";

  const visited = new Set([site.id]);
  const queue = [site];
  for (let i = 0; i < queue.length; i++) {
    const bank = queue[i];
    for (const next of getAdjacentTiles(state.map, bank.x, bank.y)) {
      if (!next.hasRiver || next.ownerNationId !== nationId || !isRailLand(next) || visited.has(next.id)) continue;
      if (isAdjacentToOcean(state.map, next.x, next.y) && shoreIsOpen(next)) return "open";
      visited.add(next.id);
      queue.push(next);
    }
  }
  return "closed";
}

function updateNetworkConnectivity(network: RailroadNetwork, state: GameState, nationId: string, fleetsAtSea: boolean): void {
  const { graph, capital, ports, depots } = network;
  const starts: RailroadNode[] = capital ? [capital] : [];
  const closedFishingPorts: string[] = [];
  if (capital && fleetsAtSea) {
    const home = homeApproach(state, nationId);
    if (home && isPortClosed(state, nationId, home.provinceId, home.seaId)) {
      closedFishingPorts.push(state.map.tiles[capital.y][capital.x].id);
    }
  }

  const routes = ports.map(port => {
    const route = portWaterRoute(state, nationId, state.map.tiles[port.y][port.x], fleetsAtSea);
    if (route === "open") starts.push(port);
    return route;
  });
  const reachable = bfs(graph, starts);
  for (const depot of depots) depot.isActive = reachable.has(key(depot.x, depot.y));
  ports.forEach((port, i) => {
    port.isActive = routes[i] !== "no-site" && reachable.has(key(port.x, port.y));
    if (port.isActive && routes[i] === "closed") closedFishingPorts.push(state.map.tiles[port.y][port.x].id);
  });
  if (closedFishingPorts.length) network.closedFishingPorts = closedFishingPorts;
  else delete network.closedFishingPorts;
}

export const transportConnectivitySystem: TurnSystem = (state: GameState): GameState => {
  const originalNetworks = state.transportNetwork.railroadNetworks;
  if (!originalNetworks) {
    return state;
  }

  const newNetworks: RailroadNetworks = JSON.parse(JSON.stringify(originalNetworks));

  const fleetsAtSea = state.fleets.some(fleet => fleet.approach);
  for (const nationId in newNetworks) updateNetworkConnectivity(newNetworks[nationId], state, nationId, fleetsAtSea);

  return {
    ...state,
    transportNetwork: {
      ...state.transportNetwork,
      railroadNetworks: newNetworks,
    },
  };
};
