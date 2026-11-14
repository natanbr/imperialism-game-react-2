// The map's cursors, drawn from the art pack's pictures (FR-330; NR-032 replaced the emoji cursors). A CSS cursor image
// cannot be an SVG that loads another file and is ignored above 128 px, and the pack's files stay as supplied, so each
// picture is drawn once at runtime into a 32 x 32 canvas and used as a PNG data URL. Not React: tiles read it through
// useTileVisuals, which re-renders a tile when its cursor becomes ready.
import { CURSOR_ART, artInfoOf, civilianArt } from "@/components/art/inkArt";
import type { PossibleAction } from "@/types/actions";

/** The cursor's size in px; its hotspot is the middle. */
export const CURSOR_PX = 32;
const HOTSPOT = CURSOR_PX / 2;

/** The picture a tile's cursor is drawn from, by the action a click there would take (FR-330); none without one. */
export function cursorArtOf(action: PossibleAction): string | undefined {
  if (!action) return undefined;
  switch (action.type) {
    case "prospect":
      return CURSOR_ART.prospect;
    case "develop":
      // The developing civilian's own figure
      return civilianArt(action.workerType);
    case "construct":
      return action.kind === "rail" ? CURSOR_ART.constructRail : CURSOR_ART.constructFort;
    case "open-construct-modal":
      return CURSOR_ART.constructModal;
  }
}

/** Where a picture of `width` x `height` is drawn in the cursor: contained, figures on the bottom centre. */
export function cursorDrawBox(width: number, height: number, anchor: "bottom-center" | "center"): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(CURSOR_PX / width, CURSOR_PX / height);
  const w = width * scale;
  const h = height * scale;
  return { x: (CURSOR_PX - w) / 2, y: anchor === "bottom-center" ? CURSOR_PX - h : (CURSOR_PX - h) / 2, width: w, height: h };
}

/** A drawn cursor keeps its Image: the picture is also a figure on the map, which then needs no second request (FR-342). */
type Drawn = { state: "loading" } | { state: "ready"; cursor: string; image: HTMLImageElement } | { state: "failed" };
/**
 * Each picture's cursor, by its URL: loaded and drawn once for the whole map. A picture that failed to load has no entry,
 * so the next request tries again; one that loaded but cannot be drawn (no canvas) stays "failed".
 */
const drawn = new Map<string, Drawn>();
const listeners = new Set<() => void>();

/** Server render or a test DOM without a canvas: no picture is drawn, every action shows the pointer. */
const canDraw = (): boolean => typeof document !== "undefined" && typeof Image !== "undefined";

function draw(image: HTMLImageElement, url: string): string | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = CURSOR_PX;
  canvas.height = CURSOR_PX;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  const info = artInfoOf(url);
  const box = cursorDrawBox(info?.width ?? (image.naturalWidth || CURSOR_PX), info?.height ?? (image.naturalHeight || CURSOR_PX), info?.anchor ?? "center");
  context.drawImage(image, box.x, box.y, box.width, box.height);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

function load(url: string): void {
  drawn.set(url, { state: "loading" });
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    const data = draw(image, url);
    if (!data) {
      drawn.set(url, { state: "failed" });
      return;
    }
    drawn.set(url, { state: "ready", cursor: `url(${data}) ${HOTSPOT} ${HOTSPOT}, pointer`, image });
    listeners.forEach((listener) => listener());
  };
  // A network error need not last: the next request tries again (FR-342)
  image.onerror = () => drawn.delete(url);
  image.src = url;
}

/**
 * Starts loading and drawing the cursor picture `url` unless it is drawn or on its way; nothing where nothing can be
 * drawn. Called when a tile subscribes to its cursor (after React's commit), never while rendering (FR-342).
 */
export function requestCursor(url: string): void {
  if (!canDraw() || drawn.has(url)) return;
  load(url);
}

/**
 * The CSS cursor of a tile whose click would take `action`: `auto` without one; the picture's cursor once it is drawn;
 * until then, and where nothing can be drawn, `pointer`. It only reads: React calls it while rendering (FR-342).
 */
export function cursorOf(action: PossibleAction): string {
  if (!action) return "auto";
  const url = cursorArtOf(action);
  const entry = url ? drawn.get(url) : undefined;
  return entry?.state === "ready" ? entry.cursor : "pointer";
}

/** The cursor in a server render (and the first client render it hydrates): nothing is drawn there. */
export const serverCursorOf = (action: PossibleAction): string => (action ? "pointer" : "auto");

/** Calls `listener` whenever a cursor becomes ready; returns the unsubscribe (for React's useSyncExternalStore). */
export function subscribeCursors(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
