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

const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * The SVG matrix that lays a straight rail piece of `width` x `height` along a segment (FR-328): the piece's left middle
 * (0, height / 2) lands on the segment's start and its right middle (width, height / 2) on its end. It is turned to the
 * segment and stretched along it only, so its height stays: a 42 px east-west link is the piece unscaled, a diagonal
 * one 46.96 px long.
 */
export function railArtMatrix(s: Pick<RailSegment, "x1" | "y1" | "x2" | "y2">, width: number, height: number): number[] {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return [1, 0, 0, 1, round(s.x1), round(s.y1 - height / 2)];
  const [ux, uy] = [dx / length, dy / length];
  const stretch = length / width;
  const mid = height / 2;
  // translate(start) * rotate * scale(stretch, 1) * translate(0, -mid)
  return [stretch * ux, stretch * uy, -uy, ux, s.x1 + mid * uy, s.y1 - mid * ux].map(round);
}
