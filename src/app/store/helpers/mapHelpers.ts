// Shared map helpers
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";

// Brick pattern adjacency: every odd row is visually shifted right
// Returns neighboring Tile instances (up to 6)
export function getAdjacentTiles(map: GameMap, x: number, y: number): Tile[] {
  const cols = map.config.cols;
  const rows = map.config.rows;
  const inBounds = (cx: number, cy: number) => cx >= 0 && cx < cols && cy >= 0 && cy < rows;
  const isOddRow = y % 2 === 1;
  const neighborCoords: [number, number][] = [
    ...(isOddRow ? [[x, y - 1], [x + 1, y - 1]] : [[x - 1, y - 1], [x, y - 1]]),
    [x - 1, y],
    [x + 1, y],
    ...(isOddRow ? [[x, y + 1], [x + 1, y + 1]] : [[x - 1, y + 1], [x, y + 1]]),
  ].filter(([nx, ny]) => inBounds(nx, ny));

  return neighborCoords.map(([nx, ny]) => map.tiles[ny][nx]);
}

// Returns true if any adjacent tile is Coast or Water
export function isAdjacentToOcean(map: GameMap, x: number, y: number): boolean {
  const neighbors = getAdjacentTiles(map, x, y);
  return neighbors.some((n) => n.terrain === TerrainType.Coast || n.terrain === TerrainType.Water);
}