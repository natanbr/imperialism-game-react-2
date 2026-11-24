// View helper for the map's rail drawing (FR-570): pixel geometry, not game rules.
import type { RailLink } from "@/engine";
import type { GameMap } from "@/types/Map";
import type { Tile } from "@/types/Tile";
import { TILE_PX } from "@/styles/theme";
import { createTileId, parseTileId } from "@/utils/tileIdUtils";

/**
 * FR-570: the rail in the ink and wash style, drawn tile by tile. Each railed tile draws its own piece from its centre to
 * the middles of the edges it is linked across, so two neighbours' pieces meet on their shared edge, both running along
 * the link there (the curves join without a corner):
 * - one link: an end, from the centre to the edge;
 * - two opposite links: straight, edge to edge;
 * - two other links: one smooth curve from edge to edge that bends past the centre (a quadratic curve with the centre
 *   as its control point, so it leaves each edge along its link);
 * - three or more: a junction, a spoke from the centre to each edge.
 * A piece is two thin rails with short cross ties over a faint wash; on a river tile a timber trestle (two beams and three
 * bents) lies under it, on a depot or a port a platform beside it. A rail job draws its section, from the tile it starts
 * on to its own, as pencil ties without rails. The wobble that makes it a pen line is drawn from the tile id, never
 * from Math.random, so a tile looks the same on every render. Each piece is cached by what it is drawn from.
 */

/**
 * The six directions from a tile to its neighbours on the offset rows (odd rows shifted right half a tile), 0 east and
 * then clockwise, as the centre-to-centre step in tiles.
 */
const STEP: readonly (readonly [number, number])[] = [
  [1, 0], // E
  [0.5, 1], // SE
  [-0.5, 1], // SW
  [-1, 0], // W
  [-0.5, -1], // NW
  [0.5, -1], // NE
];
const opposite = (d: number) => (d + 3) % 6;

/** The pen's measures in px at 100% zoom: thin, so the terrain and the tile's marks stay visible beneath. */
export const RAIL_PEN = {
  /** Between the two rails. */
  gauge: 2.6,
  /** A tie's length across the track and the distance between two ties along it. */
  tieLength: 4.8,
  tieSpacing: 5.6,
  /** How far a rail bows from a true line at most (the pen's unevenness). */
  wobble: 0.45,
  /** A bridge's beams this far beyond each rail, its bents this far beyond the beams. */
  beamGap: 1.8,
  bentOverhang: 1.6,
  /** A station's platform: length along the track, width, gap from the rail. */
  platform: [7, 2, 1] as const,
} as const;

export type RailShape = "end" | "straight" | "curve" | "junction";

export interface RailPieceInput {
  tileId: string;
  x: number;
  y: number;
  nationId: string;
  /** The directions (0 east, then clockwise) of the tile's links. */
  dirs: readonly number[];
  bridge: boolean;
  station: boolean;
}

export interface RailPieceDrawing {
  tileId: string;
  nationId: string;
  shape: RailShape;
  station: boolean;
  bridge: boolean;
  /** The tile centre. */
  cx: number;
  cy: number;
  /** SVG path data: the wash under the track, the ties, the two rails, the trestle and the platform. */
  wash: string;
  ties: string;
  rails: string;
  trestle?: string;
  platform?: string;
}

export interface RailConstructionDrawing {
  tileId: string;
  /** The tile the section starts from (`constructionJob.railFrom`, FR-136). */
  fromTileId: string;
  ties: string;
}

export interface RailDrawing {
  pieces: RailPieceDrawing[];
  constructions: RailConstructionDrawing[];
}

type P = { x: number; y: number };
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k });
const dot = (a: P, b: P) => a.x * b.x + a.y * b.y;
const len = (a: P) => Math.hypot(a.x, a.y);
const unit = (a: P): P => {
  const l = len(a);
  return l === 0 ? { x: 1, y: 0 } : mul(a, 1 / l);
};
/** The left-hand normal of a direction (a quarter turn). */
const perp = (d: P): P => ({ x: -d.y, y: d.x });
const fmt = (v: number) => String(Math.round(v * 100) / 100);
const pt = (p: P) => `${fmt(p.x)} ${fmt(p.y)}`;

/** A quadratic curve: start, control, end. A straight stroke has its control halfway. */
interface Quad {
  p0: P;
  c: P;
  p2: P;
}
const at = ({ p0, c, p2 }: Quad, t: number): P => add(add(mul(p0, (1 - t) ** 2), mul(c, 2 * (1 - t) * t)), mul(p2, t * t));
const tangentAt = ({ p0, c, p2 }: Quad, t: number): P => unit(add(mul(sub(c, p0), 2 * (1 - t)), mul(sub(p2, c), 2 * t)));
const quadPath = (q: Quad) => `M${pt(q.p0)}Q${pt(q.c)} ${pt(q.p2)}`;
const segPath = (a: P, b: P) => `M${pt(a)}L${pt(b)}`;

/** The part of a curve between t0 and t1, itself a quadratic curve. */
function part(q: Quad, t0: number, t1: number): Quad {
  const p0 = at(q, t0);
  const d = add(mul(sub(q.c, q.p0), 2 * (1 - t0)), mul(sub(q.p2, q.c), 2 * t0));
  return { p0, c: add(p0, mul(d, (t1 - t0) / 2)), p2: at(q, t1) };
}

/**
 * The curve `off` px to the left of `q` (right when negative), its control moved `bow` px across: the ends move along
 * their normals and the control to where the moved end tangents cross, so the copy keeps the curve's end directions.
 */
function offset(q: Quad, off: number, bow = 0): Quad {
  const d0 = len(sub(q.c, q.p0)) === 0 ? unit(sub(q.p2, q.p0)) : unit(sub(q.c, q.p0));
  const d2 = len(sub(q.p2, q.c)) === 0 ? unit(sub(q.p2, q.p0)) : unit(sub(q.p2, q.c));
  const [n0, n2] = [perp(d0), perp(d2)];
  const across = unit(add(n0, n2));
  return {
    p0: add(q.p0, mul(n0, off)),
    c: add(add(q.c, mul(add(n0, n2), off / (1 + dot(n0, n2)))), mul(across, bow)),
    p2: add(q.p2, mul(n2, off)),
  };
}

/** The curve's length and, for a length along it, the t there (sampled; the curves are short). */
function arc(q: Quad): { length: number; tAt: (s: number) => number } {
  const samples = 16;
  const lengths = [0];
  let prev = q.p0;
  for (let i = 1; i <= samples; i++) {
    const p = at(q, i / samples);
    lengths.push(lengths[i - 1] + len(sub(p, prev)));
    prev = p;
  }
  const length = lengths[samples];
  const tAt = (s: number) => {
    const target = Math.min(Math.max(s, 0), length);
    let i = 1;
    while (i < samples && lengths[i] < target) i++;
    const span = lengths[i] - lengths[i - 1];
    return (i - 1 + (span === 0 ? 0 : (target - lengths[i - 1]) / span)) / samples;
  };
  return { length, tAt };
}

/** A small seeded random source from a tile id (FNV-1a hash, then mulberry32): -1 to 1. */
function penOf(id: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Ties across a curve, about `tieSpacing` apart and half that from each end, each slightly uneven; none before `skip` px. */
function ties(q: Quad, pen: () => number, skip = 0): string {
  const { length, tAt } = arc(q);
  const count = Math.max(1, Math.round(length / RAIL_PEN.tieSpacing));
  const spacing = length / count;
  let d = "";
  for (let k = 0; k < count; k++) {
    const s = (k + 0.5) * spacing + pen() * 0.35;
    const [turn, half] = [pen() * 0.09, RAIL_PEN.tieLength / 2 + pen() * 0.3];
    if (s < skip) continue;
    const t = tAt(s);
    const n = perp(tangentAt(q, t));
    const across = { x: n.x * Math.cos(turn) - n.y * Math.sin(turn), y: n.x * Math.sin(turn) + n.y * Math.cos(turn) };
    const p = at(q, t);
    d += segPath(add(p, mul(across, -half)), add(p, mul(across, half)));
  }
  return d;
}

/** The two rails of a curve, each with its own bow. */
const rails = (q: Quad, pen: () => number) =>
  [1, -1].map((side) => quadPath(offset(q, (side * RAIL_PEN.gauge) / 2, pen() * RAIL_PEN.wobble))).join("");

/** A bridge's timber over the middle of a curve: two beams outside the rails and three bents across them. */
function trestle(q: Quad): string {
  const middle = part(q, 0.2, 0.8);
  const beam = RAIL_PEN.gauge / 2 + RAIL_PEN.beamGap;
  const bent = beam + RAIL_PEN.bentOverhang;
  const beams = [beam, -beam].map((off) => quadPath(offset(middle, off))).join("");
  const bents = [0.2, 0.5, 0.8]
    .map((t) => {
      const [p, n] = [at(q, t), perp(tangentAt(q, t))];
      return segPath(add(p, mul(n, -bent)), add(p, mul(n, bent)));
    })
    .join("");
  return beams + bents;
}

/** A station's platform: a strip beside the track at `t` of the curve, on the side away from `away`. */
function platform(q: Quad, t: number, away: P): string {
  const [length, width, gap] = RAIL_PEN.platform;
  const p = at(q, t);
  const along = tangentAt(q, t);
  let n = perp(along);
  if (dot(n, sub(p, away)) < 0) n = mul(n, -1);
  // Centred a little along the track from the point, so on an end piece it sits beside the rails, not past their end
  const mid = add(add(p, mul(along, length / 2 - 0.5)), mul(n, RAIL_PEN.gauge / 2 + gap + width / 2));
  const [a, w] = [mul(along, length / 2), mul(n, width / 2)];
  const corners = [sub(sub(mid, a), w), add(sub(mid, a), w), add(add(mid, a), w), sub(add(mid, a), w)];
  return `M${pt(corners[0])}L${pt(corners[1])}L${pt(corners[2])}L${pt(corners[3])}Z`;
}

const centreOf = (x: number, y: number, tileSize: number): P => ({
  x: x * tileSize + (y % 2 === 1 ? tileSize / 2 : 0) + tileSize / 2,
  y: y * tileSize + tileSize / 2,
});

/** The direction from one tile to the other when they are neighbours, else undefined. */
function directionTo(from: { x: number; y: number }, to: { x: number; y: number }): number | undefined {
  // In half tiles, so the odd rows' shift is whole
  const hx = 2 * (to.x - from.x) + (to.y % 2) - (from.y % 2);
  const hy = to.y - from.y;
  const d = STEP.findIndex(([sx, sy]) => sx * 2 === hx && sy === hy);
  return d < 0 ? undefined : d;
}

/** One tile's piece (uncached: `railDrawing` caches it per tile). */
export function drawRailPiece(input: RailPieceInput, tileSize: number = TILE_PX): RailPieceDrawing {
  const o = centreOf(input.x, input.y, tileSize);
  const dirs = [...new Set(input.dirs)].sort((a, b) => a - b);
  const edgeOf = (d: number): P => add(o, mul({ x: STEP[d][0], y: STEP[d][1] }, tileSize / 2));
  const shape: RailShape =
    dirs.length === 1 ? "end" : dirs.length === 2 ? (dirs[1] === opposite(dirs[0]) ? "straight" : "curve") : "junction";
  // Edge to edge through the centre's pull for two links; a spoke from the centre to each edge otherwise
  const strokes: Quad[] =
    dirs.length === 2
      ? [{ p0: edgeOf(dirs[0]), c: o, p2: edgeOf(dirs[1]) }]
      : dirs.map((d) => ({ p0: o, c: mul(add(o, edgeOf(d)), 0.5), p2: edgeOf(d) }));
  const pen = penOf(input.tileId);
  // A junction's rails run on past the centre by half the gauge, so its spokes cross there instead of leaving a gap
  const railStrokes =
    shape === "junction" ? strokes.map((q) => ({ ...q, p0: sub(q.p0, mul(unit(sub(q.p2, q.p0)), RAIL_PEN.gauge / 2)) })) : strokes;
  const drawing: RailPieceDrawing = {
    tileId: input.tileId,
    nationId: input.nationId,
    shape,
    station: input.station,
    bridge: input.bridge,
    cx: o.x,
    cy: o.y,
    wash: strokes.map(quadPath).join(""),
    ties: strokes.map((q) => ties(q, pen, shape === "junction" ? RAIL_PEN.gauge + 1 : 0)).join(""),
    rails: railStrokes.map((q) => rails(q, pen)).join(""),
  };
  if (input.bridge) drawing.trestle = strokes.map(trestle).join("");
  if (input.station) drawing.platform = platform(strokes[0], dirs.length === 2 ? 0.5 : 0, o);
  return drawing;
}

/** A section under construction: pencil ties from the start tile's centre to the job's tile centre (uncached). */
export function drawRailConstruction(tileId: string, from: P, to: P, fromTileId: string, tileSize: number = TILE_PX): RailConstructionDrawing {
  const [a, b] = [centreOf(from.x, from.y, tileSize), centreOf(to.x, to.y, tileSize)];
  const pen = penOf(`${fromTileId}>${tileId}`);
  const c = add(mul(add(a, b), 0.5), mul(perp(unit(sub(b, a))), pen() * RAIL_PEN.wobble));
  return { tileId, fromTileId, ties: ties({ p0: a, c, p2: b }, pen) };
}

// Per tile: a piece is drawn once for what it is drawn from and reused on every later render while that stays the same
const pieceCache = new Map<string, RailPieceDrawing>();
const constructionCache = new Map<string, RailConstructionDrawing>();
const CACHE_LIMIT = 4096;
function cached<V>(cache: Map<string, V>, key: string, make: () => V): V {
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size >= CACHE_LIMIT) cache.clear();
  const value = make();
  cache.set(key, value);
  return value;
}

/**
 * The rail drawing of the map: one piece for every tile at the end of a link of the rail graph (`railLinksOf`, FR-079),
 * none for a tile without a link, and one section for every rail job with its start tile. A tile in two nations' graphs
 * draws one piece with both nations' links, named after the first.
 */
export function railDrawing(map: GameMap, links: readonly RailLink[], tileSize: number = TILE_PX): RailDrawing {
  const tileAt = (x: number, y: number): Tile | undefined => map.tiles[y]?.[x];
  const byTile = new Map<string, { x: number; y: number; nationId: string; dirs: number[] }>();
  const note = (node: { x: number; y: number }, dir: number, nationId: string) => {
    const id = tileAt(node.x, node.y)?.id ?? createTileId(node.x, node.y);
    const entry = byTile.get(id) ?? { x: node.x, y: node.y, nationId, dirs: [] };
    if (!entry.dirs.includes(dir)) entry.dirs.push(dir);
    byTile.set(id, entry);
  };
  for (const { nationId, from, to } of links) {
    const dir = directionTo(from, to);
    if (dir === undefined) continue;
    note(from, dir, nationId);
    note(to, opposite(dir), nationId);
  }
  const pieces = [...byTile].map(([tileId, { x, y, nationId, dirs }]) => {
    const tile = tileAt(x, y);
    const bridge = !!tile?.hasRiver;
    const station = !!(tile?.depot || tile?.port);
    const mask = dirs.reduce((m, d) => m | (1 << d), 0);
    return cached(pieceCache, `${tileId}|${nationId}|${mask}|${+bridge}${+station}|${tileSize}`, () =>
      drawRailPiece({ tileId, x, y, nationId, dirs, bridge, station }, tileSize)
    );
  });
  const constructions: RailConstructionDrawing[] = [];
  for (const row of map.tiles) {
    for (const tile of row) {
      const job = tile.constructionJob;
      if (job?.kind !== "rail" || !job.railFrom) continue;
      const from = parseTileId(job.railFrom);
      if (!from || directionTo(from, tile) === undefined) continue;
      constructions.push(
        cached(constructionCache, `${tile.id}|${job.railFrom}|${tileSize}`, () => drawRailConstruction(tile.id, from, tile, job.railFrom!, tileSize))
      );
    }
  }
  return { pieces, constructions };
}
