// The map camera (FR-083): the camera is the map's scroll position in pixels, and the map area is
// the window left of the HUD, which lies over the map's right edge.
import type { MapConfig } from "@/types/Map";
import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import { HUD_PX, TILE_PX } from "@/styles/theme";

// The grid as MapView draws it (FR-088): odd rows are shifted half a tile.
export { HUD_PX, TILE_PX };

export interface Camera {
  x: number;
  y: number;
}

export interface MapArea {
  width: number;
  height: number;
}

type MapSize = Pick<MapConfig, "cols" | "rows">;

export const mapSizePx = ({ cols, rows }: MapSize): MapArea => ({ width: cols * TILE_PX + TILE_PX / 2, height: rows * TILE_PX });

export const mapAreaOf = ({ innerWidth, innerHeight }: { innerWidth: number; innerHeight: number }): MapArea => ({
  width: Math.max(0, innerWidth - HUD_PX),
  height: innerHeight,
});

/** The camera kept inside the map, so no space beyond the map's edges shows. */
export function clampCamera(camera: Camera, area: MapArea, map: MapSize): Camera {
  const size = mapSizePx(map);
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), Math.max(0, max)));
  return { x: clamp(camera.x, size.width - area.width), y: clamp(camera.y, size.height - area.height) };
}

/** The camera that puts the tile as near the middle of the map area as the map's edges allow. */
export function cameraOnTile({ x, y }: Pick<Tile, "x" | "y">, area: MapArea, map: MapSize): Camera {
  const centreX = x * TILE_PX + (y % 2 === 1 ? TILE_PX / 2 : 0) + TILE_PX / 2;
  const centreY = y * TILE_PX + TILE_PX / 2;
  return clampCamera({ x: centreX - area.width / 2, y: centreY - area.height / 2 }, area, map);
}

/** The camera on the nation's capital in the current window, or undefined if it has none. */
export function cameraOnCapital(game: GameState, nationId: string): Camera | undefined {
  const cityId = game.nations.find((n) => n.id === nationId)?.cities[0];
  const capital = cityId ? game.map.tiles.flat().find((t) => t.cityId === cityId) : undefined;
  return capital ? cameraOnTile(capital, mapAreaOf(window), game.map.config) : undefined;
}
