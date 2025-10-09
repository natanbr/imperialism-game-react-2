import { useMemo } from 'react';
import { Tile } from '@/types/Tile';
import { Nation } from '@/types/Nation';
import { TERRAIN_COLORS } from '@/constants/gameConstants';

export interface TileVisuals {
  terrainColor: string;
  borderColor: string;
  borderWidth: string;
  cursor: string;
  hasJobCompleted: boolean;
}

/**
 * Hook to compute visual properties for a tile
 *
 * @param tile - The tile to compute visuals for
 * @param isSelected - Whether this tile is currently selected
 * @param ownerNation - The nation that owns this tile (if any)
 * @param hasSelectedWorker - Whether a worker is currently selected
 * @returns Visual properties for rendering the tile
 */
export function useTileVisuals(
  tile: Tile,
  isSelected: boolean,
  ownerNation: Nation | null,
  hasSelectedWorker: boolean
): TileVisuals {
  return useMemo(() => {
    const terrainColor = TERRAIN_COLORS[tile.terrain] || '#ccc';

    const borderColor = isSelected
      ? 'red'
      : ownerNation
      ? ownerNation.color
      : '#555';

    const borderWidth = ownerNation ? '3px' : '1px';

    const cursor = hasSelectedWorker ? 'pointer' : 'auto';

    const hasJobCompleted =
      tile.developmentJob?.completed || tile.constructionJob?.completed || false;

    return {
      terrainColor,
      borderColor,
      borderWidth,
      cursor,
      hasJobCompleted,
    };
  }, [tile, isSelected, ownerNation, hasSelectedWorker]);
}
