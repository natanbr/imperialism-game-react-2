import { useEffect } from "react";

interface EdgeScrollOptions {
  containerRef: React.RefObject<HTMLDivElement | null> ;
  onMove: (dx: number, dy: number) => void;
  speed?: number; // pixels per frame
  edgeSize?: number; // px threshold from edge
  /** What lies over the container's right side (the HUD): the right edge is that far in, the map area's (FR-366). */
  rightInset?: number;
}

/**
 * Scrolls the map while the pointer is near an edge of the map area (FR-083), and only while it is over the map itself:
 * never over the HUD (`data-edge-scroll`) or a dialog, which are not inside the container, and never after the pointer
 * has left the window (FR-366, UIV-03).
 */
export function useEdgeScroll({ containerRef, onMove, speed = 10, edgeSize = 20, rightInset = 0 }: EdgeScrollOptions) {
  useEffect(() => {
    let animationFrame: number;
    const stop = () => cancelAnimationFrame(animationFrame);

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef?.current;
      if (!container) return;
      const overMap =
        e.target instanceof Node &&
        container.contains(e.target) &&
        !(e.target instanceof Element && e.target.closest('[data-edge-scroll], [role="dialog"]'));
      if (!overMap) {
        stop();
        return;
      }

      const rect = container.getBoundingClientRect();
      const right = rect.right - rightInset;
      let dx = 0;
      let dy = 0;

      if (e.clientX < rect.left + edgeSize) dx = -speed;
      else if (e.clientX > right - edgeSize && e.clientX <= right) dx = speed;

      if (e.clientY < rect.top + edgeSize) dy = -speed;
      else if (e.clientY > rect.bottom - edgeSize) dy = speed;

      if (dx !== 0 || dy !== 0) {
        const step = () => {
          onMove(dx, dy);
          animationFrame = requestAnimationFrame(step);
        };
        stop();
        animationFrame = requestAnimationFrame(step);
      } else {
        stop();
      }
    };
    // The pointer left the window (it went to no element) or the window lost the focus: nothing scrolls on
    const handleMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) stop();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("blur", stop);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("blur", stop);
      stop();
    };
  }, [containerRef, onMove, speed, edgeSize, rightInset]);
}
