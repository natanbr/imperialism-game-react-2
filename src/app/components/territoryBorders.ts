// View helper for the map's territory borders (FR-087): pixel geometry, not game rules.
import type { GameMap } from "@/types/Map";
import type { Nation } from "@/types/Nation";
import { nationColor, TILE_PX } from "@/styles/theme";

export interface BorderSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** The owned tile this side belongs to. */
  tileId: string;
  nationId: string;
  color: string;
  /** The tile across the side, or null at the map's edge. */
  neighbour: { x: number; y: number } | null;
}

/**
 * The sides of each owned tile that face another owner, no owner or the map's edge. Rows are a brick
 * pattern (odd rows shifted half a tile right), so a tile's six neighbours are its six sides: left,
 * right, and the left and right halves of its top and bottom. The same neighbours as
 * `getNeighborCoords` in engine/map/mapHelpers.ts.
 */
export function territoryBorderSegments(map: GameMap, nations: readonly Nation[], tilePx = TILE_PX): BorderSegment[] {
  const { cols, rows } = map.config;
  const half = tilePx / 2;
  const ownerAt = (x: number, y: number) => map.tiles[y]?.[x]?.ownerNationId;
  const inside = (x: number, y: number) => x >= 0 && x < cols && y >= 0 && y < rows;
  const segments: BorderSegment[] = [];

  for (const row of map.tiles) {
    for (const tile of row) {
      const owner = tile.ownerNationId;
      if (!owner) continue;
      const odd = tile.y % 2 === 1;
      const left = tile.x * tilePx + (odd ? half : 0);
      const top = tile.y * tilePx;
      const right = left + tilePx;
      const bottom = top + tilePx;
      const mid = left + half;
      // Above and below: on an odd row the left half meets column x, on an even row column x - 1.
      const l = odd ? tile.x : tile.x - 1;
      const r = l + 1;
      const sides: [number, number, number, number, number, number][] = [
        [tile.x - 1, tile.y, left, top, left, bottom],
        [tile.x + 1, tile.y, right, top, right, bottom],
        [l, tile.y - 1, left, top, mid, top],
        [r, tile.y - 1, mid, top, right, top],
        [l, tile.y + 1, left, bottom, mid, bottom],
        [r, tile.y + 1, mid, bottom, right, bottom],
      ];
      const color = nationColor(nations.findIndex((n) => n.id === owner));
      for (const [nx, ny, x1, y1, x2, y2] of sides) {
        const onMap = inside(nx, ny);
        if (onMap && ownerAt(nx, ny) === owner) continue;
        segments.push({ x1, y1, x2, y2, tileId: tile.id, nationId: owner, color, neighbour: onMap ? { x: nx, y: ny } : null });
      }
    }
  }
  return segments;
}

/** One SVG path per nation: "M x1 y1 L x2 y2" for each of its border sides. */
export function borderPaths(segments: readonly BorderSegment[]): { nationId: string; color: string; d: string }[] {
  const byNation = new Map<string, { color: string; parts: string[] }>();
  for (const s of segments) {
    const entry = byNation.get(s.nationId) ?? { color: s.color, parts: [] };
    entry.parts.push(`M${s.x1} ${s.y1}L${s.x2} ${s.y2}`);
    byNation.set(s.nationId, entry);
  }
  return [...byNation].map(([nationId, { color, parts }]) => ({ nationId, color, d: parts.join("") }));
}
