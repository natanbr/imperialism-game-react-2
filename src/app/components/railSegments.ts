// View helper for the map's rail overlay (pixel geometry, not game rules).
import type { RailLink } from "@/engine";

export interface RailSegment {
  /** Whose rail graph the link is in. */
  nationId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * One line from tile centre to tile centre per rail link (FR-079). The links come from the
 * engine's rail graph (`railLinksOf`), never from a terrain rule of their own: a filter here once
 * hid the rail on coast tiles while the depot behind it was lit green.
 */
export function computeRailSegmentsPixels(links: readonly RailLink[], tileSize = 100, rowShift = 50): RailSegment[] {
  const centre = (x: number, y: number) => ({
    cx: x * tileSize + (y % 2 === 1 ? rowShift : 0) + tileSize / 2,
    cy: y * tileSize + tileSize / 2,
  });
  return links.map(({ nationId, from, to }) => {
    const a = centre(from.x, from.y);
    const b = centre(to.x, to.y);
    return { nationId, x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy };
  });
}
