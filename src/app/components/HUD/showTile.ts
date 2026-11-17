import { flushSync } from "react-dom";
import { useGameStore } from "@/store/rootStore";
import { cameraOnTileId } from "../camera";

/**
 * A line of the pane about a tile, a news place line (FR-376) or a Work in progress row (FR-475): the tile selected with
 * no civilian (so Tile Info shows the tile) and centred as the map's edges allow. Then the focus moves to Tile Info's
 * heading: the panel scrolls the pane to its top as it opens (FR-463), so the line just used may be out of sight, and a
 * screen reader user hears what opened (M12b review A11Y-3). One function for both, so the two never drift apart (NL-3).
 */
export function showTile(tileId: string): void {
  const { selectWorker, selectTile, moveCamera } = useGameStore.getState();
  // Rendered at once, so the heading to take the focus exists
  flushSync(() => {
    selectWorker(undefined);
    selectTile(tileId);
  });
  const camera = cameraOnTileId(useGameStore.getState().game, tileId);
  if (camera) moveCamera(camera.x, camera.y);
  document.querySelector<HTMLElement>('[data-testid="tile-info"] .tile-info-heading')?.focus({ preventScroll: true });
}
