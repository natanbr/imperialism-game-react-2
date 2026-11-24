// The map's own zoom gestures (FR-567): Ctrl and the wheel, and a trackpad pinch (the browser sends it as Ctrl and the
// wheel), anywhere on the game screen zoom the map instead of the page, so the top bar and the pane never change size:
// about the pointer over the map, about the map area's middle elsewhere (the bar, the pane, the zoom buttons); with a dialog
// open neither zooms. Two fingers pinch the map on a touch screen. The plain wheel still scrolls the map (FR-364) and one
// finger still pans it (FR-365). Known gap: Safari's trackpad pinch sends gesture events, not Ctrl and the wheel.
import { useEffect, type RefObject } from "react";
import { useGameStore } from "@/store/rootStore";
import { isDialogOpen, zoomMapTo } from "./useMapKeyboard";

/** How fast Ctrl and the wheel zoom: one mouse notch (100 px of deltaY) is about 22%. */
const WHEEL_ZOOM_RATE = 0.002;
/** A wheel's lines (Firefox) and pages, in the pixels the rate expects. */
const LINE_PX = 33;

type Point = { x: number; y: number };
type TouchPair = { readonly length: number; [index: number]: { clientX: number; clientY: number } };

const distance = (t: TouchPair) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
const midpoint = (t: TouchPair): Point => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

export function useMapZoomGestures(containerRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    /** A point of the window in the map area's own coordinates (the scroller's box starts at the area's top left). */
    const inArea = ({ x, y }: Point): Point => {
      const rect = el.getBoundingClientRect();
      return { x: x - rect.left, y: y - rect.top };
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      // The page's own zoom would resize the HUD too: the map takes this one, over the whole game screen
      e.preventDefault();
      if (isDialogOpen()) return;
      const overMap = e.target instanceof Node && el.contains(e.target);
      const pixels = e.deltaY * (e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? el.clientHeight : 1);
      zoomMapTo(useGameStore.getState().zoom * Math.exp(-pixels * WHEEL_ZOOM_RATE), overMap ? inArea({ x: e.clientX, y: e.clientY }) : undefined);
    };

    let pinch: { distance: number; zoom: number } | undefined;
    const onTouchStart = (e: TouchEvent) => {
      pinch = e.touches.length === 2 ? { distance: distance(e.touches), zoom: useGameStore.getState().zoom } : undefined;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2 || pinch.distance === 0) return;
      // Two fingers zoom the map, not pan it or the page
      e.preventDefault();
      zoomMapTo((pinch.zoom * distance(e.touches)) / pinch.distance, inArea(midpoint(e.touches)));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = undefined;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [containerRef]);
}
