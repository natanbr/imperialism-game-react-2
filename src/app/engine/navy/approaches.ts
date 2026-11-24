import type { GameState } from "@/types/GameState";
import type { GameMap } from "@/types/Map";
import type { Approach } from "@/types/Navy";
import { TerrainType, type Tile } from "@/types/Tile";
import { getAdjacentTiles, isOcean } from "../map/mapHelpers";

const rowThenColumn = (a: Tile, b: Tile) => a.y - b.y || a.x - b.x;
const seasByMap = new WeakMap<GameMap, Map<string, string>>();

/** Flood ocean hexes only. Each component takes its first row-major tile as its stable save-game id. */
function seasOf(map: GameMap): Map<string, string> {
  const cached = seasByMap.get(map);
  if (cached) return cached;
  const seas = new Map<string, string>();
  for (const first of map.tiles.flat()) {
    if (!isOcean(first) || seas.has(first.id)) continue;
    const queue = [first];
    seas.set(first.id, first.id);
    for (let i = 0; i < queue.length; i++) {
      for (const next of getAdjacentTiles(map, queue[i].x, queue[i].y)) {
        if (isOcean(next) && !seas.has(next.id)) {
          seas.set(next.id, first.id);
          queue.push(next);
        }
      }
    }
  }
  seasByMap.set(map, seas);
  return seas;
}

function outlet(state: GameState, provinceId: string, ocean: Tile | undefined): Approach | undefined {
  if (!ocean) return undefined;
  return { provinceId, seaId: seasOf(state.map).get(ocean.id)! };
}

export function approachesOf(state: GameState, provinceId: string): Approach[] {
  const seas = new Set<string>();
  for (const tile of state.map.tiles.flat()) {
    if (tile.provinceId !== provinceId) continue;
    for (const water of getAdjacentTiles(state.map, tile.x, tile.y).filter(isOcean)) {
      seas.add(seasOf(state.map).get(water.id)!);
    }
  }
  return [...seas].map(seaId => ({ provinceId, seaId }));
}

/** A physical port binds to one outlet, even when two disconnected seas border its tile. */
export function portApproach(state: GameState, tile: Tile): Approach | undefined {
  if (!tile.provinceId) return undefined;
  const water = getAdjacentTiles(state.map, tile.x, tile.y).filter(isOcean).sort(rowThenColumn);
  return outlet(state, tile.provinceId, water[0]);
}

/** A capital can be inland. Walk its own province shoreward in increasing hex distance. */
export function homeApproach(state: GameState, nationId: string): Approach | undefined {
  const cityId = state.nations.find(n => n.id === nationId)?.cities[0];
  if (!cityId) return undefined;
  const capital = state.map.tiles.flat().find(t => t.cityId === cityId && t.ownerNationId === nationId);
  if (!capital?.provinceId) return undefined;
  const visited = new Set([capital.id]);
  let ring = [capital];
  while (ring.length) {
    const water: Tile[] = [];
    const next: Tile[] = [];
    for (const tile of ring) {
      for (const n of getAdjacentTiles(state.map, tile.x, tile.y)) {
        if (isOcean(n)) water.push(n);
        else if (n.provinceId === capital.provinceId && n.terrain !== TerrainType.River && !visited.has(n.id)) {
          visited.add(n.id);
          next.push(n);
        }
      }
    }
    if (water.length) return outlet(state, capital.provinceId, water.sort(rowThenColumn)[0]);
    ring = next;
  }
  return undefined;
}
