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

// Visualization helper: compute rail line segments in pixel coordinates for the map
// Each segment connects centers of neighboring land tiles that are both `connected` and owned by the same nation
// Deduplicated by only emitting segments where (ny > y) or (ny === y && nx > x)
export function computeRailSegmentsPixels(
  map: GameMap,
  tileSize = 100,
  rowShift = 50
): { x1: number; y1: number; x2: number; y2: number }[] {
  const { rows } = map.config;
  const isLand = (t: Tile) => ![TerrainType.Water, TerrainType.Coast, TerrainType.River].includes(t.terrain);

  const centerPx = (x: number, y: number) => {
    const shift = y % 2 === 1 ? rowShift : 0;
    return {
      cx: x * tileSize + shift + tileSize / 2,
      cy: y * tileSize + tileSize / 2,
    };
  };

  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

  const hasRailVisual = (t: Tile) =>
    isLand(t) &&
    !!t.ownerNationId &&
    (t.connected || t.terrain === TerrainType.Capital || t.depot || t.port);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < map.config.cols; x++) {
      const t = map.tiles[y][x];
      if (!hasRailVisual(t)) continue;

      for (const [nx, ny] of getNeighborCoords(map, x, y)) {
        if (ny < y || (ny === y && nx <= x)) continue; // deduplicate
        const n = map.tiles[ny][nx];
        if (!hasRailVisual(n) || n.ownerNationId !== t.ownerNationId) continue;
        // Require at least one endpoint to have an actual rail connection flag
        if (!(t.connected || n.connected)) continue;
        const { cx, cy } = centerPx(x, y);
        const { cx: nxpx, cy: nypx } = centerPx(nx, ny);
        segments.push({ x1: cx, y1: cy, x2: nxpx, y2: nypx });
      }
    }
  }

  return segments;
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