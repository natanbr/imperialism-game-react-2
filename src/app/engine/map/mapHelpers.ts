// Shared map helpers
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";

export function getNeighborCoords(map: GameMap, x: number, y: number): [number, number][] {
  const { cols, rows } = map.config;
  const inBounds = (cx: number, cy: number) => cx >= 0 && cx < cols && cy >= 0 && cy < rows;
  const isOddRow = y % 2 === 1;
  const coords: [number, number][] = [
    ...(isOddRow
      ? ([ [x, y - 1] as [number, number], [x + 1, y - 1] as [number, number] ])
      : ([ [x - 1, y - 1] as [number, number], [x, y - 1] as [number, number] ])),
    [x - 1, y] as [number, number],
    [x + 1, y] as [number, number],
    ...(isOddRow
      ? ([ [x, y + 1] as [number, number], [x + 1, y + 1] as [number, number] ])
      : ([ [x - 1, y + 1] as [number, number], [x, y + 1] as [number, number] ])),
  ].filter(([nx, ny]) => inBounds(nx, ny));
  return coords;
}

// Brick pattern adjacency: every odd row is visually shifted right
// Returns neighboring Tile instances (up to 6)
export function getAdjacentTiles(map: GameMap, x: number, y: number): Tile[] {
  const neighborCoords = getNeighborCoords(map, x, y);
  return neighborCoords.map(([nx, ny]) => map.tiles[ny][nx]);
}

// Returns true if any adjacent tile is Coast or Water
export function isAdjacentToOcean(map: GameMap, x: number, y: number): boolean {
  const neighbors = getAdjacentTiles(map, x, y);
  return neighbors.some((n) => n.terrain === TerrainType.Coast || n.terrain === TerrainType.Water);
}

// Edge-case support for rail building UI rules
const isLandTile = (t: Tile) => ![TerrainType.Water, TerrainType.River].includes(t.terrain);
const hasRailStartingPoint = (t: Tile) => !!(t.connected || t.terrain === TerrainType.Capital || t.depot || t.port);

// Check if two tiles are adjacent to each other
export function areTilesAdjacent(map: GameMap, x1: number, y1: number, x2: number, y2: number): boolean {
  const neighborCoords = getNeighborCoords(map, x1, y1);
  return neighborCoords.some(([nx, ny]) => nx === x2 && ny === y2);
}

// Can build rail on (x,y) if:
// - Tile is land and owned by nationId
// - There exists an adjacent tile of the same nation with a rail starting point
export function canBuildRailAt(map: GameMap, x: number, y: number, nationId: string | undefined): boolean {
  if (!nationId) return false;
  const tile = map.tiles[y]?.[x];
  if (!tile) return false;
  if (!isLandTile(tile)) return false;
  if (tile.ownerNationId !== nationId) return false;
  if (tile.connected) return false; // already has rail

  const neighbors = getAdjacentTiles(map, x, y);
  return neighbors.some((n) => n.ownerNationId === nationId && isLandTile(n) && hasRailStartingPoint(n));
}
