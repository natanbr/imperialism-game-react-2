import { useMemo } from 'react';
import { Tile } from '@/types/Tile';
import { PossibleAction } from '@/types/actions';
import { TERRAIN_TINT, THEME } from '@/styles/theme';

export interface TileVisuals {
  terrainColor: string;
  /** The same faint grid line on every tile: ownership is the border overlay (FR-087). */
  border: string;
  /** The accent ring of the selected tile, a style no other tile has (FR-087). */
  boxShadow: string | undefined;
  cursor: string;
}

const GRID_BORDER = `1px solid ${THEME.line}`;
const SELECTED_RING = `inset 0 0 0 3px ${THEME.accent}`;

/**
 * Convert an emoji to a cursor data URI
 * @param emoji - The emoji to convert
 * @returns CSS cursor value with data URI
 */
function emojiToCursor(emoji: string): string {
  // Create an SVG with the emoji
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <text x="50%" y="50%" text-anchor="middle" dy=".35em" font-size="24">${emoji}</text>
    </svg>
  `;

  const encoded = encodeURIComponent(svg);
  return `url('data:image/svg+xml;utf8,${encoded}') 16 16, pointer`;
}

/**
 * Pre-computed cursor cache to avoid repeated SVG generation
 * This dramatically improves performance by eliminating the need to
 * generate cursor data URIs on every render
 */
const CURSOR_CACHE = {
  prospect: emojiToCursor('🔍'), // Magnifying glass for prospecting
  develop: emojiToCursor('🚜'), // Tractor for development
  constructRail: emojiToCursor('🛤️'), // Railroad track
  constructFort: emojiToCursor('🏰'), // Fort/castle
  constructModal: emojiToCursor('🏗️'), // Construction/building
  pointer: 'pointer',
  auto: 'auto',
} as const;

/**
 * Get cursor style based on possible action
 * @param possibleAction - The action that can be performed on this tile
 * @returns CSS cursor value
 */
function getCursorForAction(possibleAction: PossibleAction): string {
  if (!possibleAction) {
    return CURSOR_CACHE.auto;
  }

  switch (possibleAction.type) {
    case 'prospect':
      return CURSOR_CACHE.prospect;
    case 'develop':
      return CURSOR_CACHE.develop;
    case 'construct':
      if (possibleAction.kind === 'rail') {
        return CURSOR_CACHE.constructRail;
      } else if (possibleAction.kind === 'fort') {
        return CURSOR_CACHE.constructFort;
      }
      return CURSOR_CACHE.pointer;
    case 'open-construct-modal':
      return CURSOR_CACHE.constructModal;
    default:
      return CURSOR_CACHE.pointer;
  }
}

/**
 * Hook to compute visual properties for a tile
 *
 * @param tile - The tile to compute visuals for
 * @param isSelected - Whether this tile is currently selected
 * @param possibleAction - The action that can be performed on this tile
 * @returns Visual properties for rendering the tile
 */
export function useTileVisuals(
  tile: Tile,
  isSelected: boolean,
  possibleAction: PossibleAction
): TileVisuals {
  return useMemo(() => {
    return {
      terrainColor: TERRAIN_TINT[tile.terrain] ?? THEME.land,
      border: GRID_BORDER,
      boxShadow: isSelected ? SELECTED_RING : undefined,
      cursor: getCursorForAction(possibleAction),
    };
  }, [tile.terrain, isSelected, possibleAction]);
}
