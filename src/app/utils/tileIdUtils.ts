/**
 * Utilities for working with tile IDs in the format "x-y"
 */

/**
 * Tile coordinates interface
 */
export interface TileCoordinates {
  x: number;
  y: number;
}

/**
 * Create a tile ID from x and y coordinates
 * @param x - The x coordinate
 * @param y - The y coordinate
 * @returns Tile ID in format "x-y"
 */
export function createTileId(x: number, y: number): string {
  return `${x}-${y}`;
}

/**
 * Parse a tile ID into x and y coordinates
 * @param tileId - Tile ID in format "x-y"
 * @returns Object with x and y properties, or null if invalid format
 */
export function parseTileId(tileId: string): TileCoordinates | null {
  const parts = tileId.split("-");
  if (parts.length !== 2) return null;

  const x = Number(parts[0]);
  const y = Number(parts[1]);

  if (isNaN(x) || isNaN(y)) return null;

  return { x, y };
}

/**
 * Validate that a string is a valid tile ID
 * @param tileId - String to validate
 * @returns true if valid tile ID format
 */
export function isValidTileId(tileId: string): boolean {
  return parseTileId(tileId) !== null;
}

/**
 * Parse tile ID into array [x, y] for destructuring
 * @param tileId - Tile ID in format "x-y"
 * @returns Tuple [x, y] or [NaN, NaN] if invalid
 */
export function parseTileIdToArray(tileId: string): [number, number] {
  const coords = parseTileId(tileId);
  return coords ? [coords.x, coords.y] : [NaN, NaN];
}
