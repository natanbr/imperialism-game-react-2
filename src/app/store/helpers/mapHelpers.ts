// The pure map rules moved to the engine in M1; this file keeps the old import path for the
// UI (part B moves the imports) and the pixel helper, which is view code.
import { GameMap } from "@/types/Map";
import { Tile, TerrainType } from "@/types/Tile";
import { getNeighborCoords } from "@/engine/map/mapHelpers";

export {
  getNeighborCoords,
  getAdjacentTiles,
  isAdjacentToOcean,
  areTilesAdjacent,
  canBuildRailAt,
} from "@/engine/map/mapHelpers";

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
