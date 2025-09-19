import { useEffect } from "react";

interface EdgeScrollOptions {
  containerRef: React.RefObject<HTMLDivElement | null> ;
  onMove: (dx: number, dy: number) => void;
  speed?: number; // pixels per frame
  edgeSize?: number; // px threshold from edge
}

export function useEdgeScroll({ containerRef, onMove, speed = 10, edgeSize = 20 }: EdgeScrollOptions) {
  useEffect(() => {
    let animationFrame: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef?.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let dx = 0;
      let dy = 0;

      if (e.clientX < rect.left + edgeSize) dx = -speed;
      else if (e.clientX > rect.right - edgeSize) dx = speed;

      if (e.clientY < rect.top + edgeSize) dy = -speed;
      else if (e.clientY > rect.bottom - edgeSize) dy = speed;

      if (dx !== 0 || dy !== 0) {
        const step = () => {
          onMove(dx, dy);
          animationFrame = requestAnimationFrame(step);
        };
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(animationFrame);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, [containerRef, onMove, speed, edgeSize]);
}