// View geometry for the map's ground (FR-321): a TypeScript port of the art pack demo's `renderShoreline`
// (terrain-renderer.js, kept as supplied and never imported). Pure: no React, no DOM.
import { TILE_PX } from "@/styles/theme";
import { TerrainType, type Tile } from "@/types/Tile";

/** Land is every terrain but open water, river and coast; the ground draws those as water. */
export const isLandTerrain = (terrain: TerrainType): boolean =>
  terrain !== TerrainType.Water && terrain !== TerrainType.River && terrain !== TerrainType.Coast;

/** One letter per tile, as in the demo's rows: sea, land, desert, tundra (the two that get a patch). */
const SEA = "~";
const LAND = "g";
const DESERT = "e";
const TUNDRA = "u";

/**
 * The map's land and water pattern as a string, rows joined by "/". The ground is built from this alone, so it is
 * the same after any change that does not turn a tile to land, water, desert or tundra (an End Turn makes a new
 * `game.map` every turn).
 */
export function groundSignature(tiles: readonly (readonly Pick<Tile, "terrain">[])[]): string {
  return tiles
    .map((row) =>
      row
        .map(({ terrain }) =>
          terrain === TerrainType.Desert ? DESERT : terrain === TerrainType.Tundra ? TUNDRA : isLandTerrain(terrain) ? LAND : SEA
        )
        .join("")
    )
    .join("/");
}

export interface GroundBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroundPatch extends GroundBox {
  kind: "desert" | "tundra";
}

export interface GroundMask {
  name: "shallows" | "sand" | "land";
  /** How far the land is dilated before the blur, in px (0: the land itself). */
  expansion: number;
}

export interface GroundLayout {
  width: number;
  height: number;
  /** One square per land tile on the brick grid; the masks are drawn from these. */
  cells: GroundBox[];
  /** The desert and tundra tiles' 48 px patches of their base texture. */
  patches: GroundPatch[];
  masks: readonly GroundMask[];
  /** The masks' blur (feGaussianBlur stdDeviation), then a steep alpha ramp rounds the blurred edge. */
  blur: number;
  alphaSlope: number;
  alphaIntercept: number;
  /** The filters' and masks' region: the map plus two tiles each side, so the blur is not cut at the edge. */
  region: GroundBox;
}

/**
 * The shoreline's geometry for a `groundSignature`: the demo's formulas (tile origin col * 42 + (row % 2) * 21, masks
 * dilated by 0.16 and 0.075 of a tile, blurred by a 6.5th of a tile, alpha ramp 7x - 3), without the demo's edge
 * extension: the demo is a crop of a larger map, the game's map is whole.
 */
export function shorelineLayout(signature: string, tileSize: number = TILE_PX): GroundLayout {
  const rows = signature.split("/");
  const columns = rows[0]?.length ?? 0;
  const origin = (column: number, row: number) => ({ x: column * tileSize + (row % 2) * (tileSize / 2), y: row * tileSize });
  const cells: GroundBox[] = [];
  const patches: GroundPatch[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === SEA) return;
      const { x: left, y: top } = origin(x, y);
      cells.push({ x: left, y: top, width: tileSize, height: tileSize });
      if (cell === DESERT || cell === TUNDRA) {
        patches.push({ kind: cell === DESERT ? "desert" : "tundra", x: left - 3, y: top - 3, width: tileSize + 6, height: tileSize + 6 });
      }
    });
  });
  const width = columns * tileSize + tileSize / 2;
  const height = rows.length * tileSize;
  const padding = tileSize * 2;
  return {
    width,
    height,
    cells,
    patches,
    masks: [
      { name: "shallows", expansion: tileSize * 0.16 },
      { name: "sand", expansion: tileSize * 0.075 },
      { name: "land", expansion: 0 },
    ],
    blur: tileSize / 6.5,
    alphaSlope: 7,
    alphaIntercept: -3,
    region: { x: -padding, y: -padding, width: width + padding * 2, height: height + padding * 2 },
  };
}
