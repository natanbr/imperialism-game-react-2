// The map's own keys (FR-368): "+" and "-" zoom. Not React apart from the hook; the zoom step itself is a plain function
// on the store, shared with the map's Zoom in and Zoom out buttons.
import { useEffect } from "react";
import { ZOOM_STEPS, cameraAfterZoom, mapAreaOf } from "@/components/camera";
import { useGameStore } from "@/store/rootStore";

/** A form field or editable text: its keys are typing. */
function isField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable === true ||
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

/** Any dialog on the page: its keys are its own. */
const isDialogOpen = (): boolean => document.querySelector('[role="dialog"]') !== null;

/** The zoom step `by` steps from the map's zoom (FR-368), or undefined past either end. */
export function nextZoom(zoom: number, by: 1 | -1): number | undefined {
  const at = ZOOM_STEPS.findIndex((z) => z === zoom);
  return ZOOM_STEPS[(at === -1 ? 0 : at) + by];
}

/** Zooms the map one step in (1) or out (-1), keeping the point at the map area's middle in place (FR-368). */
export function zoomBy(by: 1 | -1): void {
  const { zoom, cameraX, cameraY, game, zoomTo } = useGameStore.getState();
  const next = nextZoom(zoom, by);
  if (next === undefined) return;
  zoomTo(next, cameraAfterZoom({ x: cameraX, y: cameraY }, mapAreaOf(window), game.map.config, zoom, next));
}

/** Escape drops the civilian selection first, then the tile selection (FR-370). */
export function deselectOneStep(): void {
  const { selectedWorkerId, selectedTileId, selectWorker, selectTile } = useGameStore.getState();
  if (selectedWorkerId !== undefined) selectWorker(undefined);
  else if (selectedTileId !== undefined) selectTile(undefined);
}

/**
 * The map's keys, except in a form field or while a dialog is open: "+" zooms in and "-" out (FR-368); Escape drops the
 * civilian selection, a second one the tile selection (FR-370). A part that takes Escape itself (the civilians' tray)
 * stops it before it gets here.
 */
export function useMapKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isField(e.target) || isDialogOpen()) return;
      if (e.key === "Escape") {
        deselectOneStep();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(1);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomBy(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
