import type { GameMap } from "@/types/Map";
import type { Tile } from "@/types/Tile";
import type { RailroadNetwork } from "@/types/Transport";
import { createTileId } from "@/utils/tileIdUtils";
import { getNeighborCoords } from "./mapHelpers";

export interface CollectingHub {
  tileId: string;
  kind: "capital" | "depot" | "port";
}

/** Active land-freight hubs in collection order. A closed port can still carry land freight by rail. */
export function hubsOf(network: RailroadNetwork | undefined): CollectingHub[] {
  if (!network) return [];
  const hubs: CollectingHub[] = [];
  if (network.capital) hubs.push({ tileId: createTileId(network.capital.x, network.capital.y), kind: "capital" });
  for (const depot of network.depots) {
    if (depot.isActive) hubs.push({ tileId: createTileId(depot.x, depot.y), kind: "depot" });
  }
  for (const port of network.ports) {
    if (port.isActive) hubs.push({ tileId: createTileId(port.x, port.y), kind: "port" });
  }
  return hubs;
}

/** A hub on the owned tile takes precedence over the first eligible neighbouring hub (FR-391). */
export function hubOf(map: GameMap, nationId: string, hubs: readonly CollectingHub[], tile: Tile): CollectingHub | undefined {
  if (tile.ownerNationId !== nationId || hubs.length === 0) return undefined;
  const here = createTileId(tile.x, tile.y);
  const own = hubs.find(hub => hub.tileId === here);
  if (own) return own;
  const around = new Set(getNeighborCoords(map, tile.x, tile.y).map(([x, y]) => createTileId(x, y)));
  return hubs.find(hub => around.has(hub.tileId));
}
