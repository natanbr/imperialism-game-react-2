import { useMemo, useSyncExternalStore } from 'react';
import { PossibleAction } from '@/types/actions';
import { THEME } from '@/styles/theme';
import { cursorOf, serverCursorOf, subscribeCursors } from './tileCursor';

export interface TileVisuals {
  /** The same faint grid line on every tile: ownership is the border overlay (FR-087); the ground draws land and sea (FR-321). */
  border: string;
  cursor: string;
}

const GRID_BORDER = `1px solid ${THEME.line}`;

/**
 * Hook to compute visual properties for a tile. The selection mark is TileBase's own element (FR-110, FR-326).
 * The cursor is the art pack's picture of what a click would do (FR-330): a tile re-renders when its cursor is drawn,
 * and only then, since the snapshot is the cursor's own string.
 *
 * @param possibleAction - The action that can be performed on this tile
 * @returns Visual properties for rendering the tile
 */
export function useTileVisuals(possibleAction: PossibleAction): TileVisuals {
  const cursor = useSyncExternalStore(
    subscribeCursors,
    () => cursorOf(possibleAction),
    () => serverCursorOf(possibleAction)
  );
  return useMemo(() => ({ border: GRID_BORDER, cursor }), [cursor]);
}
