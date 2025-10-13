import { useMemo } from 'react';
import { Tile } from '@/types/Tile';
import { Nation } from '@/types/Nation';
import { PossibleAction } from '@/types/actions';
import { TERRAIN_COLORS } from '@/constants/gameConstants';

export interface TileVisuals {
  terrainColor: string;
  borderColor: string;
  borderWidth: string;
  cursor: string;
  hasJobCompleted: boolean;
}

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
 * Get cursor style based on possible action
 * @param possibleAction - The action that can be performed on this tile
 * @returns CSS cursor value
 */
function getCursorForAction(possibleAction: PossibleAction): string {
  if (!possibleAction) {
    return 'auto';
  }

  switch (possibleAction.type) {
    case 'prospect':
      return emojiToCursor('🔍'); // Magnifying glass for prospecting
    case 'develop':
      // Different emojis for different development types
      return emojiToCursor('🚜'); // Tractor for development
    case 'construct':
      if (possibleAction.kind === 'rail') {
        return emojiToCursor('🛤️'); // Railroad track
      } else if (possibleAction.kind === 'fort') {
        return emojiToCursor('🏰'); // Fort/castle
      }
      return 'pointer';
    case 'open-construct-modal':
      return emojiToCursor('🏗️'); // Construction/building
    default:
      return 'pointer';
  }
}

/**
 * Hook to compute visual properties for a tile
 *
 * @param tile - The tile to compute visuals for
 * @param isSelected - Whether this tile is currently selected
 * @param ownerNation - The nation that owns this tile (if any)
 * @param possibleAction - The action that can be performed on this tile
 * @returns Visual properties for rendering the tile
 */
export function useTileVisuals(
  tile: Tile,
  isSelected: boolean,
  ownerNation: Nation | null,
  possibleAction: PossibleAction
): TileVisuals {
  return useMemo(() => {
    const terrainColor = TERRAIN_COLORS[tile.terrain] || '#ccc';

    const borderColor = isSelected
      ? 'red'
      : ownerNation
      ? ownerNation.color
      : '#555';

    const borderWidth = ownerNation ? '3px' : '1px';

    const cursor = getCursorForAction(possibleAction);

    const hasJobCompleted =
      tile.developmentJob?.completed || tile.constructionJob?.completed || false;

    return {
      terrainColor,
      borderColor,
      borderWidth,
      cursor,
      hasJobCompleted,
    };
  }, [tile, isSelected, ownerNation, possibleAction]);
}
