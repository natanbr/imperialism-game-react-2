// @vitest-environment jsdom
// FR-570 (M18b, NR-037: no rule change): the rail in the ink-and-wash style. Each railed tile draws its own piece from its
// centre to the middles of the edges it is linked across: two thin rails with short cross ties over a faint wash, a smooth
// curve when the two links turn, a timber trestle on a river tile, a platform on a depot or port; a section under
// construction is pencil ties without rails. The wobble that makes it a pen line comes from the tile id, never
// Math.random. The geometry is read back from the path data (`M x y Q cx cy x y` rails, `M x y L x y` ties).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react';
import { drawRailPiece, railDrawing, type RailPieceDrawing } from '@/components/railDrawing';
import { MapView } from '@/components/MapView';
import { useGameStore } from '@/store/rootStore';
import { newGame, railLinksOf, type RailLink } from '@/engine';
import type { GameMap } from '@/types/Map';
import { MapStyle } from '@/types/Map';
import { TerrainType, type Tile } from '@/types/Tile';
import type { GameState } from '@/types/GameState';
import { TILE_PX } from '@/styles/theme';

type XY = readonly [number, number];
const T = TILE_PX;
const N = 'nation-1';

/** A plain farmland map, every tile without river, depot, port or job. */
function blankMap(cols = 10, rows = 10): GameMap {
  const tiles: Tile[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({ id: `${x}-${y}`, x, y, terrain: TerrainType.Farm, workers: [], explored: true, visible: true }))
  );
  return { config: { cols, rows, style: MapStyle.HexGrid }, tiles };
}
const link = (a: XY, b: XY, nationId = N): RailLink => ({ nationId, from: { x: a[0], y: a[1] }, to: { x: b[0], y: b[1] } });
/** A line through the tiles in order, one link per step. */
const line = (...tiles: XY[]): RailLink[] => tiles.slice(1).map((b, i) => link(tiles[i], b));
const centre = ([x, y]: XY) => ({ x: x * T + (y % 2 === 1 ? T / 2 : 0) + T / 2, y: y * T + T / 2 });
const edge = (a: XY, b: XY) => {
  const [p, q] = [centre(a), centre(b)];
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
};
const pieceAt = (pieces: RailPieceDrawing[], [x, y]: XY) => pieces.find((p) => p.tileId === `${x}-${y}`);

type P = { x: number; y: number };
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
/** The rails path as quadratic curves: start, control, end. */
function curves(d: string): { p0: P; c: P; p2: P }[] {
  const num = '(-?[\\d.]+)';
  const re = new RegExp(`M\\s*${num}[ ,]${num}\\s*Q\\s*${num}[ ,]${num}\\s+${num}[ ,]${num}`, 'g');
  return [...d.matchAll(re)].map((m) => {
    const [a, b, c, e, f, g] = m.slice(1).map(Number);
    return { p0: { x: a, y: b }, c: { x: c, y: e }, p2: { x: f, y: g } };
  });
}
/** A ties path as segments. */
function segments(d: string): { a: P; b: P }[] {
  const num = '(-?[\\d.]+)';
  const re = new RegExp(`M\\s*${num}[ ,]${num}\\s*L\\s*${num}[ ,]${num}`, 'g');
  return [...d.matchAll(re)].map((m) => {
    const [a, b, c, e] = m.slice(1).map(Number);
    return { a: { x: a, y: b }, b: { x: c, y: e } };
  });
}
/** The distance from p to the line through a and b. */
const offLine = (p: P, a: P, b: P) => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / dist(a, b);
/** The angle in degrees between two directions, 0 to 90 (a line has no sense). */
const angleBetween = (u: P, v: P) => {
  const cos = Math.abs(u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  return (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
};
const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });

// The tile (4, 4) is on an even row: its neighbours are NW 3-3, NE 4-3, W 3-4, E 5-4, SW 3-5, SE 4-5.
const C: XY = [4, 4];
const [NW, NE, W, E, SW, SE]: XY[] = [[3, 3], [4, 3], [3, 4], [5, 4], [3, 5], [4, 5]];

afterEach(() => vi.restoreAllMocks());

describe('FR-570 rail in the ink-and-wash style', () => {
  it('FR-570 nothing is drawn for a tile without rail: no links draw nothing, and only the ends of links get a piece', () => {
    expect(railDrawing(blankMap(), [])).toEqual({ pieces: [], constructions: [] });
    const { pieces } = railDrawing(blankMap(), line(W, C));
    expect(pieces.map((p) => p.tileId).sort()).toEqual(['3-4', '4-4']);
  });

  it('FR-570 the shape follows the connection pattern: one link an end, two opposite ones straight, two others a curve, three a junction', () => {
    const shape = (links: RailLink[]) => pieceAt(railDrawing(blankMap(), links).pieces, C)?.shape;
    expect(shape(line(C, E))).toBe('end');
    expect(shape(line(W, C, E))).toBe('straight');
    expect(shape(line(NW, C, SE))).toBe('straight');
    expect(shape(line(NE, C, SW))).toBe('straight');
    expect(shape(line(E, C, NW))).toBe('curve');
    expect(shape(line(E, C, NE))).toBe('curve');
    expect(shape(line(SW, C, SE))).toBe('curve');
    expect(shape([...line(W, C, E), link(C, NE)])).toBe('junction');
  });

  it('FR-570 a straight piece: two thin rails from edge to edge with short ties across them, over a faint wash', () => {
    const piece = pieceAt(railDrawing(blankMap(), line(W, C, E)).pieces, C)!;
    const rails = curves(piece.rails);
    expect(rails).toHaveLength(2);
    expect(piece.rails).not.toMatch(/L/);
    const [a, b] = [edge(W, C), edge(C, E)];
    for (const r of rails) {
      // Each rail runs from the west edge to the east edge, its bow (the pen's wobble) under a pixel
      expect(Math.min(dist(r.p0, a), dist(r.p0, b))).toBeLessThan(2);
      expect(Math.min(dist(r.p2, a), dist(r.p2, b))).toBeLessThan(2);
      expect(offLine(r.c, r.p0, r.p2)).toBeLessThan(1);
    }
    // Thin: the gauge between the rails 2 to 3 px
    const gauge = dist(rails[0].p0, rails[1].p0);
    expect(gauge).toBeGreaterThanOrEqual(2);
    expect(gauge).toBeLessThanOrEqual(3);
    // Ties: one every 5 to 7 px along the 42 px, each 4 to 6.5 px long and across the track (within 15 degrees)
    const ties = segments(piece.ties);
    expect(ties.length).toBeGreaterThanOrEqual(6);
    expect(ties.length).toBeLessThanOrEqual(9);
    for (const t of ties) {
      expect(dist(t.a, t.b)).toBeGreaterThan(4);
      expect(dist(t.a, t.b)).toBeLessThan(6.5);
      expect(90 - angleBetween(sub(t.b, t.a), sub(b, a))).toBeLessThan(15);
    }
    expect(piece.wash).toMatch(/^M/);
    expect([piece.trestle, piece.platform, piece.bridge, piece.station]).toEqual([undefined, undefined, false, false]);
  });

  it('FR-570 a curve is one smooth arc past the centre, leaving each edge along its link: no straight segments meeting at an angle', () => {
    for (const [from, to] of [[E, NW], [E, NE], [SW, SE], [NE, W]] as [XY, XY][]) {
      const piece = pieceAt(railDrawing(blankMap(), line(from, C, to)).pieces, C)!;
      expect(piece.rails).not.toMatch(/L/);
      const rails = curves(piece.rails);
      expect(rails).toHaveLength(2);
      const o = centre(C);
      for (const r of rails) {
        // A real bend: the control point lies well off the chord, on the centre's side
        expect(offLine(r.c, r.p0, r.p2)).toBeGreaterThan(3);
        // Tangent at each end along its link (within 4 degrees), so it runs on into the neighbour's piece without a corner
        const [e0, e2] = dist(r.p0, edge(from, C)) < dist(r.p0, edge(C, to)) ? [edge(from, C), edge(C, to)] : [edge(C, to), edge(from, C)];
        expect(angleBetween(sub(r.c, r.p0), sub(o, e0))).toBeLessThan(4);
        expect(angleBetween(sub(r.p2, r.c), sub(e2, o))).toBeLessThan(4);
      }
    }
  });

  it('FR-570 neighbouring pieces meet: the rails of two linked tiles end on the same two points of their shared edge', () => {
    const { pieces } = railDrawing(blankMap(), line(W, C, NE, [5, 2]));
    const ends = (p: RailPieceDrawing, at: P) =>
      curves(p.rails)
        .flatMap((r) => [r.p0, r.p2])
        .filter((q) => dist(q, at) < 2.5)
        .sort((u, v) => u.x - v.x || u.y - v.y);
    for (const [a, b] of [[W, C], [C, NE], [NE, [5, 2]]] as [XY, XY][]) {
      const m = edge(a, b);
      const [ea, eb] = [ends(pieceAt(pieces, a)!, m), ends(pieceAt(pieces, b)!, m)];
      expect(ea).toHaveLength(2);
      expect(eb).toHaveLength(2);
      for (const i of [0, 1]) expect(dist(ea[i], eb[i])).toBeLessThan(0.02);
    }
  });

  it('FR-570 under construction: pencil ties from the section\'s start to the tile, without rails; other jobs draw nothing', () => {
    const map = blankMap();
    map.tiles[4][4] = { ...map.tiles[4][4], constructionJob: { workerId: 'w', kind: 'rail', startedOnTurn: 1, durationTurns: 1, railFrom: '5-4' } };
    map.tiles[6][6] = { ...map.tiles[6][6], constructionJob: { workerId: 'v', kind: 'fort', startedOnTurn: 1, durationTurns: 2 } };
    const { pieces, constructions } = railDrawing(map, []);
    expect(pieces).toEqual([]);
    expect(constructions.map((c) => [c.tileId, c.fromTileId])).toEqual([['4-4', '5-4']]);
    const c = constructions[0];
    expect(c).not.toHaveProperty('rails');
    const ties = segments(c.ties);
    expect(ties.length).toBeGreaterThanOrEqual(6);
    const [from, to] = [centre(E), centre(C)];
    for (const t of ties) {
      const mid = { x: (t.a.x + t.b.x) / 2, y: (t.a.y + t.b.y) / 2 };
      expect(offLine(mid, from, to)).toBeLessThan(1);
      expect(mid.x).toBeGreaterThan(Math.min(from.x, to.x) - 1);
      expect(mid.x).toBeLessThan(Math.max(from.x, to.x) + 1);
      expect(90 - angleBetween(sub(t.b, t.a), sub(to, from))).toBeLessThan(15);
    }
  });

  it('FR-570 a bridge: a piece on a river tile has a timber trestle (two beams and the bents across) under its rails; without the river none', () => {
    const map = blankMap();
    map.tiles[4][4] = { ...map.tiles[4][4], hasRiver: true };
    const bridge = pieceAt(railDrawing(map, line(W, C, E)).pieces, C)!;
    expect(bridge.bridge).toBe(true);
    expect(bridge.trestle).toBeDefined();
    const beams = curves(bridge.trestle!);
    expect(beams).toHaveLength(2);
    // The beams lie outside the rails, still close: 1 to 3 px beyond each rail
    const rails = curves(bridge.rails);
    const half = dist(rails[0].p0, rails[1].p0) / 2;
    const o = centre(C);
    for (const beam of beams) {
      const away = offLine(beam.p0, centre(W), centre(E));
      expect(away - half).toBeGreaterThan(1);
      expect(away - half).toBeLessThan(3);
      expect(dist(beam.p0, o)).toBeLessThan(T / 2);
    }
    // Three bents, each longer than a tie and across the track
    const bents = segments(bridge.trestle!);
    expect(bents).toHaveLength(3);
    const tie = Math.max(...segments(bridge.ties).map((t) => dist(t.a, t.b)));
    for (const b of bents) expect(dist(b.a, b.b)).toBeGreaterThan(tie);
    expect(pieceAt(railDrawing(blankMap(), line(W, C, E)).pieces, C)!.trestle).toBeUndefined();
  });

  it('FR-570 a station: a depot or a port with rail is drawn with a platform beside the track; a plain tile is not', () => {
    for (const flag of ['depot', 'port'] as const) {
      const map = blankMap();
      map.tiles[4][4] = { ...map.tiles[4][4], [flag]: true };
      const piece = pieceAt(railDrawing(map, line(C, E)).pieces, C)!;
      expect([flag, piece.station, piece.shape]).toEqual([flag, true, 'end']);
      expect(piece.platform).toMatch(/^M.*Z$/);
      // Beside the track: the platform's middle 2 to 6 px from the tile centre
      const pts = [...piece.platform!.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
      const mid = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
      expect(dist(mid, centre(C))).toBeGreaterThan(2);
      expect(dist(mid, centre(C))).toBeLessThan(6);
    }
    const plain = pieceAt(railDrawing(blankMap(), line(C, E)).pieces, C)!;
    expect([plain.station, plain.platform]).toEqual([false, undefined]);
  });

  it('FR-570 deterministic: the same tile draws the same paths every time from its id, never Math.random; two tiles wobble differently', () => {
    const random = vi.spyOn(Math, 'random');
    const input = (x: number, y: number) => ({ tileId: `${x}-${y}`, x, y, nationId: N, dirs: [0, 3], bridge: false, station: false });
    const first = drawRailPiece(input(7, 6), T);
    expect(drawRailPiece(input(7, 6), T)).toEqual(first);
    expect(random).not.toHaveBeenCalled();
    // The same straight piece two tiles along: the same up to the move, but for the pen's wobble
    const other = drawRailPiece(input(8, 6), T);
    const local = (p: RailPieceDrawing) => p.rails.replace(/(-?[\d.]+)[ ,](-?[\d.]+)/g, (_, x, y) => `${(Number(x) - p.cx).toFixed(2)} ${(Number(y) - p.cy).toFixed(2)}`);
    expect(local(other)).not.toBe(local(first));
  });

  it('FR-570 the marks that carry a state, the pencil ties and the trestle timber, reach 3:1 on the ground grass (WCAG 2.2, 1.4.11)', () => {
    const tokens = readFileSync(join(__dirname, '..', '..', 'src/app/styles/tokens.css'), 'utf8');
    const token = (name: string) => new RegExp(`${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(tokens)?.[1] ?? '';
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const [la, lb] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (la + 0.05) / (lb + 0.05);
    };
    const grass = token('--color-ground-grass');
    for (const name of ['--color-rail-pencil', '--color-rail-timber']) {
      expect(token(name), name).toMatch(/^#/);
      expect({ name, ok: contrast(token(name), grass) >= 3 }).toEqual({ name, ok: true });
    }
    // The sleepers and wash are the pack's sepia, lighter than the rails (the rails keep FR-329's 3:1)
    expect(token('--color-rail-tie')).toMatch(/^#/);
    expect(luminance(token('--color-rail-tie'))).toBeGreaterThan(luminance(token('--color-rail')));
  });

  it('FR-570 memoized per tile: a new turn\'s map with the same rail returns the same drawing objects', () => {
    const map = blankMap();
    const links = line(W, C, NE);
    const before = railDrawing(map, links).pieces;
    const after = railDrawing({ ...map, tiles: map.tiles.map((row) => [...row]) }, links).pieces;
    expect(after).toHaveLength(before.length);
    for (const [i, p] of after.entries()) expect(p).toBe(before[i]);
  });
});

describe('FR-570 the map draws the rail tile by tile', () => {
  it('FR-570 one rail-tile drawing per railed tile and one construction drawing, over the FR-079 link lines; no stretched rail pictures', () => {
    const base = newGame({ seed: 1 });
    const key = (x: number, y: number) => `${x},${y}`;
    // Capital 2-9, north along island 1's west shore (tests/ui/railLine.test.tsx), a depot at the end on 2-6
    const path: XY[] = [[2, 9], [2, 8], [2, 7], [2, 6]];
    const graph: Record<string, { x: number; y: number }[]> = {};
    for (const [i, [x, y]] of path.entries()) {
      graph[key(x, y)] = [path[i - 1], path[i + 1]].filter(Boolean).map(([nx, ny]) => ({ x: nx, y: ny }));
    }
    const tiles = base.map.tiles.map((row) => row.map((t) => ({ ...t })));
    tiles[6][2] = { ...tiles[6][2], depot: true };
    tiles[5][2] = { ...tiles[5][2], constructionJob: { workerId: 'worker-nation-1-7', kind: 'rail', startedOnTurn: 1, durationTurns: 1, railFrom: '2-6' } };
    const game: GameState = {
      ...base,
      map: { ...base.map, tiles },
      transportNetwork: {
        ...base.transportNetwork,
        railroadNetworks: { ...base.transportNetwork.railroadNetworks, [N]: { ...base.transportNetwork.railroadNetworks![N], graph } },
      },
    };
    expect(railLinksOf(game)).toHaveLength(3);
    useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N });
    const { container, unmount } = render(<MapView />);
    const groups = [...container.querySelectorAll('svg g[data-testid="rail-tile"]')];
    expect(groups.map((g) => g.getAttribute('data-rail-tile-id')).sort()).toEqual(['2-6', '2-7', '2-8', '2-9']);
    expect(groups.map((g) => g.getAttribute('data-nation-id'))).toEqual([N, N, N, N]);
    const depot = container.querySelector('g[data-testid="rail-tile"][data-rail-tile-id="2-6"]')!;
    expect([depot.getAttribute('data-shape'), depot.getAttribute('data-station')]).toEqual(['end', 'true']);
    expect(depot.querySelector('[data-testid="rail-platform"]')).not.toBeNull();
    for (const g of groups) {
      expect(g.getAttribute('aria-hidden')).toBe('true');
      expect(g.querySelector('path[data-testid="rail-rails"]')?.getAttribute('d')).toMatch(/^M/);
      expect(g.querySelector('path[data-testid="rail-ties"]')?.getAttribute('d')).toMatch(/^M/);
    }
    const building = [...container.querySelectorAll('svg g[data-testid="rail-construction"]')];
    expect(building.map((g) => [g.getAttribute('data-rail-tile-id'), g.getAttribute('data-from-tile-id')])).toEqual([['2-5', '2-6']]);
    expect(building[0].querySelector('[data-testid="rail-rails"]')).toBeNull();
    expect(building[0].querySelector('path[data-testid="rail-pencil"]')?.getAttribute('d')).toMatch(/^M/);
    // FR-079's link lines stay, one per link; the stretched piece of FR-328 is gone
    expect(container.querySelectorAll('svg line[data-testid="rail-segment"]')).toHaveLength(3);
    expect(container.querySelectorAll('svg image[data-testid="rail-art"]')).toHaveLength(0);
    unmount();
  });
});
