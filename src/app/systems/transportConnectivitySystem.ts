import { GameState } from "@/types/GameState";
import { GameMap } from "@/types/Map";
import { RailroadNode, RailroadNetworks, RailroadNetwork } from "@/types/Transport";
import { isAdjacentToOcean } from "../store/helpers/mapHelpers";

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

const updateNetworkConnectivity = (
  network: RailroadNetwork,
  map: GameMap
): void => {
  const { graph, capital, ports, depots } = network;

  ports.forEach((p) => (p.isActive = false));
  depots.forEach((d) => (d.isActive = false));

  const starts: RailroadNode[] = capital ? [capital] : [];
  const reachableFromCapital = bfs(graph, starts);

  const candidatePorts = ports.filter((p) => isAdjacentToOcean(map, p.x, p.y));
  const reachableFromPorts = candidatePorts.length
    ? bfs(graph, candidatePorts)
    : new Set<string>();

  const allReachable = new Set<string>([
    ...reachableFromCapital,
    ...reachableFromPorts,
  ]);

  depots.forEach((d) => {
    if (allReachable.has(key(d.x, d.y))) {
      d.isActive = true;
    }
  });

  ports.forEach((p) => {
    if (allReachable.has(key(p.x, p.y)) && isAdjacentToOcean(map, p.x, p.y)) {
      p.isActive = true;
    }
  });
};

export const transportConnectivitySystem = (state: GameState): GameState => {
  const originalNetworks = state.transportNetwork.railroadNetworks;
  if (!originalNetworks) {
    return state;
  }

  const newNetworks: RailroadNetworks = JSON.parse(JSON.stringify(originalNetworks));

  for (const nationId in newNetworks) {
    const network = newNetworks[nationId];
    updateNetworkConnectivity(network, state.map);
  }

  return {
    ...state,
    transportNetwork: {
      ...state.transportNetwork,
      railroadNetworks: newNetworks,
    },
  };
};