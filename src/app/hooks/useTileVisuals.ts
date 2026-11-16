import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { THEME } from '@/styles/theme';
import { cursorArtOf, cursorOf, requestCursor, serverCursorOf, subscribeCursors, type CursorAction } from './tileCursor';

export interface TileVisuals {
  /** The faint grid line on land; none on the sea, where the ground's water runs on (FR-087, FR-321, FR-355). */
  border: string;
  cursor: string;
}

/** The same faint grid line on every land tile: ownership is the border overlay (FR-087). */
const GRID_BORDER = `1px solid ${THEME.line}`;
/** Water, river and coast (FR-355): the same 1 px, so the tile stays 42 px (FR-088), but no line over the water texture. */
const SEA_BORDER = '1px solid transparent';

/**
 * Hook to compute visual properties for a tile. The selection mark is TileBase's own element (FR-110, FR-326).
 * The cursor is the art pack's picture of what a click would do (FR-330): a tile re-renders when its cursor is drawn,
 * and only then, since the snapshot is the cursor's own string. Its picture starts loading when the tile subscribes,
 * after React's commit; the snapshot only reads (FR-342).
 *
 * @param possibleAction - What a click on this tile would do (FR-379): a job, a construction, a plain move or nothing
 * @param onLand - The ground draws the tile as land (`isLandTerrain`): only land shows the grid line (FR-355)
 * @returns Visual properties for rendering the tile
 */
export function useTileVisuals(possibleAction: CursorAction, onLand: boolean): TileVisuals {
  const art = cursorArtOf(possibleAction);
  const subscribe = useCallback(
    (listener: () => void) => {
      const stop = subscribeCursors(listener);
      if (art) requestCursor(art);
      return stop;
    },
    [art]
  );
  const cursor = useSyncExternalStore(
    subscribe,
    () => cursorOf(possibleAction),
    () => serverCursorOf(possibleAction)
  );
  return useMemo(() => ({ border: onLand ? GRID_BORDER : SEA_BORDER, cursor }), [onLand, cursor]);
}
