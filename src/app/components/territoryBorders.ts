// View helpers for the map's border lines: Great Power territory (FR-087), provinces and minor nations
// (FR-153). Pixel geometry, not game rules.
import type { GameMap } from "@/types/Map";
import type { MinorNation } from "@/types/MinorNation";
import type { Nation } from "@/types/Nation";
import type { Province } from "@/types/Province";
import type { Tile } from "@/types/Tile";
import { nationColor, TILE_PX } from "@/styles/theme";

/** One side of a tile on the 42 px grid, and the tile across it (null at the map's edge). */
interface TileSide {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  neighbour: { x: number; y: number } | null;
}

export interface BorderSegment extends TileSide {
  /** The owned tile this side belongs to. */
  tileId: string;
  nationId: string;
  color: string;
}

export interface ProvinceBorderSegment extends TileSide {
  tileId: string;
  /** The country that holds the provinces on both sides. */
  ownerId: string;
  neighbour: { x: number; y: number };
}

export interface MinorBorderSegment extends TileSide {
  tileId: string;
  minorId: string;
}

/**
 * The six sides of a tile. Rows are a brick pattern (odd rows shifted half a tile right), so a tile's
 * six neighbours are its six sides: left, right, and the left and right halves of its top and bottom.
 * The same neighbours as `getNeighborCoords` in engine/map/mapHelpers.ts.
 */
function sidesOf(map: GameMap, tile: Tile, tilePx: number): TileSide[] {
  const { cols, rows } = map.config;
  const half = tilePx / 2;
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
  return sides.map(([nx, ny, x1, y1, x2, y2]) => {
    const onMap = nx >= 0 && nx < cols && ny >= 0 && ny < rows;
    return { x1, y1, x2, y2, neighbour: onMap ? { x: nx, y: ny } : null };
  });
}

/** The sides of each owned tile that face another owner, no owner or the map's edge. */
export function territoryBorderSegments(map: GameMap, nations: readonly Nation[], tilePx = TILE_PX): BorderSegment[] {
  const segments: BorderSegment[] = [];
  for (const row of map.tiles) {
    for (const tile of row) {
      const owner = tile.ownerNationId;
      if (!owner) continue;
      // By the owner's palette slot, not its place in `nations` (FR-097).
      const color = nationColor(nations.find((n) => n.id === owner)?.colorSlot);
      for (const side of sidesOf(map, tile, tilePx)) {
        if (side.neighbour && map.tiles[side.neighbour.y][side.neighbour.x].ownerNationId === owner) continue;
        segments.push({ ...side, tileId: tile.id, nationId: owner, color });
      }
    }
  }
  return segments;
}

/** The owner of each province, for the tiles' `provinceId`. */
const ownersOf = (provinces: readonly Province[]) => new Map(provinces.map((p) => [p.id, p.ownerId]));

/**
 * The sides between two provinces of the same owner (FR-153 b), each side once: drawn from the tile
 * whose province id sorts first. Sides between two owners are the territory and minor borders.
 */
export function provinceBorderSegments(map: GameMap, provinces: readonly Province[], tilePx = TILE_PX): ProvinceBorderSegment[] {
  const owners = ownersOf(provinces);
  const segments: ProvinceBorderSegment[] = [];
  for (const row of map.tiles) {
    for (const tile of row) {
      const province = tile.provinceId;
      const owner = province ? owners.get(province) : undefined;
      if (!province || !owner) continue;
      for (const side of sidesOf(map, tile, tilePx)) {
        if (!side.neighbour) continue;
        const other = map.tiles[side.neighbour.y][side.neighbour.x].provinceId;
        if (!other || other <= province || owners.get(other) !== owner) continue;
        segments.push({ ...side, neighbour: side.neighbour, tileId: tile.id, ownerId: owner });
      }
    }
  }
  return segments;
}

/**
 * The sides of each minor nation's land that face the sea, another country or the map's edge
 * (FR-153 c). A tile belongs to the owner of its province (a minor's tiles have no `ownerNationId`).
 */
export function minorBorderSegments(
  map: GameMap,
  provinces: readonly Province[],
  minorNations: readonly MinorNation[],
  tilePx = TILE_PX
): MinorBorderSegment[] {
  const owners = ownersOf(provinces);
  const minors = new Set(minorNations.map((m) => m.id));
  const countryAt = (tile: Tile) => (tile.provinceId ? owners.get(tile.provinceId) : undefined);
  const segments: MinorBorderSegment[] = [];
  for (const row of map.tiles) {
    for (const tile of row) {
      const minorId = countryAt(tile);
      if (!minorId || !minors.has(minorId)) continue;
      for (const side of sidesOf(map, tile, tilePx)) {
        if (side.neighbour && countryAt(map.tiles[side.neighbour.y][side.neighbour.x]) === minorId) continue;
        segments.push({ ...side, tileId: tile.id, minorId });
      }
    }
  }
  return segments;
}

/** "M x1 y1 L x2 y2" for each side, as one SVG path. */
const pathOf = (segments: readonly TileSide[]): string => segments.map((s) => `M${s.x1} ${s.y1}L${s.x2} ${s.y2}`).join("");

/** Segments grouped by a key, in the order each key first appears. */
function groupBy<T>(segments: readonly T[], key: (s: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const s of segments) {
    const k = key(s);
    const group = groups.get(k);
    if (group) group.push(s);
    else groups.set(k, [s]);
  }
  return [...groups];
}

/** One SVG path per nation: "M x1 y1 L x2 y2" for each of its border sides. */
export function borderPaths(segments: readonly BorderSegment[]): { nationId: string; color: string; d: string }[] {
  return groupBy(segments, (s) => s.nationId).map(([nationId, parts]) => ({ nationId, color: parts[0].color, d: pathOf(parts) }));
}

/** One dotted path per owner of several provinces. */
export function provinceBorderPaths(segments: readonly ProvinceBorderSegment[]): { ownerId: string; d: string }[] {
  return groupBy(segments, (s) => s.ownerId).map(([ownerId, parts]) => ({ ownerId, d: pathOf(parts) }));
}

/** One dashed path per minor nation, in the order of `minorNations`. */
export function minorBorderPaths(segments: readonly MinorBorderSegment[], minorNations: readonly MinorNation[]): { minorId: string; d: string }[] {
  const groups = new Map(groupBy(segments, (s) => s.minorId));
  return minorNations.filter((m) => groups.has(m.id)).map((m) => ({ minorId: m.id, d: pathOf(groups.get(m.id)!) }));
}
