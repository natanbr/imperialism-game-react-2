// The map camera (FR-083): the camera is the map's scroll position in pixels, and the map area is
// the window under the top bar and left of the HUD, which lies over the map's right edge (FR-465). The map is drawn at a
// zoom (FR-368 steps; FR-567 the opening fit, the wheel and a pinch): every size here is in screen pixels at that zoom.
import type { MapConfig } from "@/types/Map";
import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { HUD_PX, TILE_PX, topBarPx } from "@/styles/theme";
import { useGameStore } from "@/store/rootStore";
import { isLandTerrain } from "./map/shoreline";

// The grid as MapView draws it (FR-088): odd rows are shifted half a tile.
export { HUD_PX, TILE_PX, topBarPx };

/** Steps shared by all maps (FR-368). Oversized maps may have one more step below 100% (FR-598). */
export const ZOOM_STEPS = [1, 1.5, 2] as const;
export const ZOOM_MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1];
/**
 * FR-567: an opening fit under this gain stays at 100%, where the ink pictures are drawn: at 1280x720 the land would gain
 * 7% (45 px tiles) for blurred pictures, and there the whole map already fills the area (FR-088 keeps its camera 0, 0).
 */
export const FIT_MIN_GAIN = 1.1;

/**
 * Trap (FR-567 review): an exact fit is a float a hair off, 630 x 54/42 = 810.0000000000001 at 1465x850, so a strict test
 * of "the land fits" opened on the capital and clipped the land. The fit and the test allow half a pixel.
 */
const FIT_SLACK_PX = 0.5;

/** A map smaller than the map area by more than this on an axis is centred on it (FR-367); 1280x720 spares 1 and 8 px. */
export const CENTRE_SPARE_PX = 64;

export interface Camera {
  x: number;
  y: number;
}

export interface MapArea {
  width: number;
  height: number;
}

export type MapSize = Pick<MapConfig, "cols" | "rows">;

export const mapSizePx = ({ cols, rows }: MapSize, zoom = 1): MapArea => ({
  width: (cols * TILE_PX + TILE_PX / 2) * zoom,
  height: rows * TILE_PX * zoom,
});

const exceedsFixedMapSize = ({ cols, rows }: MapSize) => cols > 24 || rows > 20;

function wholePixelFit(area: MapArea, size: MapArea, slack = 0): number {
  const fit = Math.min((area.width + slack) / size.width, (area.height + slack) / size.height);
  return Math.floor(fit * TILE_PX) / TILE_PX;
}

/** FR-598: only maps beyond the fixed dimensions can shrink below their native 42 px tiles. */
export function minZoom(area: MapArea, map: MapSize): number {
  return exceedsFixedMapSize(map) ? Math.max(0.5, Math.min(1, wholePixelFit(area, mapSizePx(map)))) : 1;
}

export const clampZoom = (zoom: number, area: MapArea, map: MapSize): number => Math.min(ZOOM_MAX, Math.max(minZoom(area, map), zoom));

/** The window less the right pane and the top bar (FR-465): 1030 x 680 at 1280x720, 550 x 370 at 800x450 (two-row bar). */
export const mapAreaOf = ({ innerWidth, innerHeight }: { innerWidth: number; innerHeight: number }): MapArea => ({
  width: Math.max(0, innerWidth - HUD_PX),
  height: Math.max(0, innerHeight - topBarPx(innerWidth)),
});

/** Where the map is drawn in the map area (FR-367): half the spare space on an axis with more than 64 px spare, else 0. */
export function mapOffset(area: MapArea, map: MapSize, zoom = 1): Camera {
  const size = mapSizePx(map, zoom);
  const offset = (spare: number) => (spare > CENTRE_SPARE_PX ? Math.floor(spare / 2) : 0);
  return { x: offset(area.width - size.width), y: offset(area.height - size.height) };
}

/** The camera kept inside the map, so no space beyond the map's edges shows. */
export function clampCamera(camera: Camera, area: MapArea, map: MapSize, zoom = 1): Camera {
  const size = mapSizePx(map, zoom);
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), Math.max(0, max)));
  return { x: clamp(camera.x, size.width - area.width), y: clamp(camera.y, size.height - area.height) };
}

/** The camera that puts the tile as near the middle of the map area as the map's edges allow. */
export function cameraOnTile({ x, y }: Pick<Tile, "x" | "y">, area: MapArea, map: MapSize, zoom = 1): Camera {
  const centreX = (x * TILE_PX + (y % 2 === 1 ? TILE_PX / 2 : 0) + TILE_PX / 2) * zoom;
  const centreY = (y * TILE_PX + TILE_PX / 2) * zoom;
  return clampCamera({ x: centreX - area.width / 2, y: centreY - area.height / 2 }, area, map, zoom);
}

/**
 * The camera that keeps the map point under `focus` (a point of the map area, its middle by default: FR-368; the pointer
 * or a pinch's midpoint: FR-567) where it is when the zoom goes from `from` to `to`: `camera` is the scroll position at `from`.
 */
export function cameraAfterZoom(
  camera: Camera,
  area: MapArea,
  map: MapSize,
  from: number,
  to: number,
  focus: Camera = { x: area.width / 2, y: area.height / 2 }
): Camera {
  const before = mapOffset(area, map, from);
  const after = mapOffset(area, map, to);
  const pointX = (camera.x + focus.x - before.x) / from;
  const pointY = (camera.y + focus.y - before.y) / from;
  return clampCamera({ x: pointX * to + after.x - focus.x, y: pointY * to + after.y - focus.y }, area, map, to);
}

/** A box in map px at 100%. */
export interface MapBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The land's bounding box (FR-567, land as the ground draws it: `isLandTerrain`) with half a tile of sea round it. */
export function landBoxPx(map: Pick<GameState["map"], "tiles">): MapBox {
  const land = map.tiles.flat().filter((t) => isLandTerrain(t.terrain));
  if (land.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = (t: Tile) => t.x * TILE_PX + (t.y % 2 === 1 ? TILE_PX / 2 : 0);
  const margin = TILE_PX / 2;
  const x = Math.min(...land.map(left)) - margin;
  const y = Math.min(...land.map((t) => t.y)) * TILE_PX - margin;
  const right = Math.max(...land.map(left)) + TILE_PX + margin;
  const bottom = (Math.max(...land.map((t) => t.y)) + 1) * TILE_PX + margin;
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Fit the opening box (fixed-map land or the whole oversized grid), in whole pixels per tile.
 * Keep native-size art for a gain under FIT_MIN_GAIN (FR-567, FR-598).
 */
export function fitZoom(area: MapArea, box: MapBox, map: MapSize): number {
  if (box.width <= 0 || box.height <= 0) return 1;
  const fit = wholePixelFit(area, box, exceedsFixedMapSize(map) ? 0 : FIT_SLACK_PX);
  return fit < FIT_MIN_GAIN ? minZoom(area, map) : Math.min(ZOOM_MAX, fit);
}

/**
 * Centre the opening box when it fits at an allowed zoom, or centre the capital when the area is too small.
 */
export function openingView(game: GameState, nationId: string, area: MapArea): { zoom: number; camera: Camera } {
  const map = game.map.config;
  const box = exceedsFixedMapSize(map) ? { x: 0, y: 0, ...mapSizePx(map) } : landBoxPx(game.map);
  const zoom = fitZoom(area, box, map);
  if (box.width * zoom <= area.width + FIT_SLACK_PX && box.height * zoom <= area.height + FIT_SLACK_PX) {
    const offset = mapOffset(area, game.map.config, zoom);
    const centre = { x: (box.x + box.width / 2) * zoom + offset.x, y: (box.y + box.height / 2) * zoom + offset.y };
    return { zoom, camera: clampCamera({ x: centre.x - area.width / 2, y: centre.y - area.height / 2 }, area, game.map.config, zoom) };
  }
  return { zoom, camera: cameraOnCapital(game, nationId, zoom, area) ?? { x: 0, y: 0 } };
}

/** The camera on the tile with this id in the current window at the map's zoom (FR-376), or undefined if there is none. */
export function cameraOnTileId(game: GameState, tileId: string, zoom: number = useGameStore.getState().zoom): Camera | undefined {
  const tile = game.map.tiles.flat().find((t) => t.id === tileId);
  return tile ? cameraOnTile(tile, mapAreaOf(window), game.map.config, zoom) : undefined;
}

/** The camera on the nation's capital in the current window at the map's zoom, or undefined if it has none. */
export function cameraOnCapital(
  game: GameState,
  nationId: string,
  zoom: number = useGameStore.getState().zoom,
  area: MapArea = mapAreaOf(window)
): Camera | undefined {
  const cityId = game.nations.find((n) => n.id === nationId)?.cities[0];
  const capital = cityId ? game.map.tiles.flat().find((t) => t.cityId === cityId) : undefined;
  return capital ? cameraOnTile(capital, area, game.map.config, zoom) : undefined;
}
