// The map camera (FR-083): the camera is the map's scroll position in pixels, and the map area is
// the window left of the HUD, which lies over the map's right edge. The map is drawn at a zoom step (FR-368):
// every size here is in screen pixels at that step.
import type { MapConfig } from "@/types/Map";
import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { HUD_PX, TILE_PX } from "@/styles/theme";
import { useGameStore } from "@/store/rootStore";

// The grid as MapView draws it (FR-088): odd rows are shifted half a tile.
export { HUD_PX, TILE_PX };

/** The map's zoom steps (FR-368): 100% (today's 42 px tiles, the start), 150% and 200%. */
export const ZOOM_STEPS = [1, 1.5, 2] as const;

/** A map smaller than the map area by more than this on an axis is centred on it (FR-367); 1280x720 spares 1 and 48 px. */
export const CENTRE_SPARE_PX = 64;

export interface Camera {
  x: number;
  y: number;
}

export interface MapArea {
  width: number;
  height: number;
}

type MapSize = Pick<MapConfig, "cols" | "rows">;

export const mapSizePx = ({ cols, rows }: MapSize, zoom = 1): MapArea => ({
  width: (cols * TILE_PX + TILE_PX / 2) * zoom,
  height: rows * TILE_PX * zoom,
});

export const mapAreaOf = ({ innerWidth, innerHeight }: { innerWidth: number; innerHeight: number }): MapArea => ({
  width: Math.max(0, innerWidth - HUD_PX),
  height: innerHeight,
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
 * The camera that keeps the point at the map area's middle where it is when the zoom goes from `from` to `to` (FR-368):
 * `camera` is the scroll position at `from`.
 */
export function cameraAfterZoom(camera: Camera, area: MapArea, map: MapSize, from: number, to: number): Camera {
  const before = mapOffset(area, map, from);
  const after = mapOffset(area, map, to);
  const middleX = (camera.x + area.width / 2 - before.x) / from;
  const middleY = (camera.y + area.height / 2 - before.y) / from;
  return clampCamera({ x: middleX * to + after.x - area.width / 2, y: middleY * to + after.y - area.height / 2 }, area, map, to);
}

/** The camera on the tile with this id in the current window at the map's zoom (FR-376), or undefined if there is none. */
export function cameraOnTileId(game: GameState, tileId: string, zoom: number = useGameStore.getState().zoom): Camera | undefined {
  const tile = game.map.tiles.flat().find((t) => t.id === tileId);
  return tile ? cameraOnTile(tile, mapAreaOf(window), game.map.config, zoom) : undefined;
}

/** The camera on the nation's capital in the current window at the map's zoom, or undefined if it has none. */
export function cameraOnCapital(game: GameState, nationId: string, zoom: number = useGameStore.getState().zoom): Camera | undefined {
  const cityId = game.nations.find((n) => n.id === nationId)?.cities[0];
  const capital = cityId ? game.map.tiles.flat().find((t) => t.cityId === cityId) : undefined;
  return capital ? cameraOnTile(capital, mapAreaOf(window), game.map.config, zoom) : undefined;
}
