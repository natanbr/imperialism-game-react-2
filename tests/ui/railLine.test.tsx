// @vitest-environment jsdom
// FR-079 (NR-010), Nathan's bug of 2026-11-03: rail built tile by tile from the capital through a
// coast tile to a depot lit the depot green, but the map drew no line on the coast tile. The two-island
// map has no coast tiles (decision Q16, FR-080), so the line now runs along the shore: the land tiles
// next to the sea. The game is played through the order API on the real new-game map, then the map is
// rendered and its rail <line> elements are read back as tile pairs. FR-570 (M18b; replaces FR-328's stretched piece per
// line): each tile at a line's end draws its own piece (tests/ui/railDrawing.test.tsx).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { useGameStore } from '@/store/rootStore';
import { newGame, resolveTurn, type Order } from '@/engine';
import { areTilesAdjacent, getAdjacentTiles } from '@/engine/map/mapHelpers';
import type { GameState } from '@/types/GameState';
import { TerrainType, type Tile } from '@/types/Tile';
import { createTileId } from '@/utils/tileIdUtils';
import { TILE_PX } from '@/styles/theme';

const N = 'nation-1';
const ENGINEER = 'worker-nation-1-7';
type XY = readonly [number, number];
const CAPITAL: XY = [2, 9];
// North from the capital along island 1's west shore: four farms, two open ranges, an open range (the depot).
const LINE: readonly XY[] = [[2, 8], [2, 7], [2, 6], [2, 5], [2, 4], [2, 3], [3, 2]];
const SHORE: XY = [2, 3];
const DEPOT: XY = [3, 2];
// Rail on the two forests east and north of the depot: with 3-2 the three tiles are mutual neighbours.
const SPUR: readonly XY[] = [[4, 2], [3, 1]];

const tileAt = (s: GameState, [x, y]: XY): Tile => s.map.tiles[y][x];
const isShore = (s: GameState, xy: XY): boolean =>
  tileAt(s, xy).terrain !== TerrainType.Water && getAdjacentTiles(s.map, ...xy).some(n => n.terrain === TerrainType.Water);
const pairKey = (a: XY, b: XY): string => [createTileId(...a), createTileId(...b)].sort().join(' ');

/** Resolves one turn with the engineer's order (or none); every order must be accepted. */
function play(state: GameState, order?: Order): GameState {
  const { state: next, events } = resolveTurn(state, order ? { [N]: [order] } : {}, state.seed);
  expect(events.filter(e => e.type === 'order-rejected')).toEqual([]);
  return next;
}

function buildRail(state: GameState, to: XY): GameState {
  let s = play(state, { kind: 'moveAndBuildRail', nationId: N, workerId: ENGINEER, toTileId: createTileId(...to) });
  for (let i = 0; i < 3 && !tileAt(s, to).connected; i++) s = play(s);
  expect(tileAt(s, to).connected).toBe(true);
  return s;
}

function buildDepot(state: GameState, at: XY): GameState {
  let s = play(state, { kind: 'startConstruction', nationId: N, workerId: ENGINEER, tileId: createTileId(...at), structure: 'depot' });
  for (let i = 0; i < 5 && !tileAt(s, at).depot; i++) s = play(s);
  expect(tileAt(s, at).depot).toBe(true);
  return s;
}

/** The map's rail overlay read back as tile pairs (MapView draws on the TILE_PX grid, odd rows shifted half a tile; FR-088). */
function drawnPairs(state: GameState): [XY, XY][] {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N });
  const { container, unmount } = render(<MapView />);
  const toTile = (px: number, py: number): XY => {
    const half = TILE_PX / 2;
    const y = (py - half) / TILE_PX;
    return [(px - half - (y % 2 === 1 ? half : 0)) / TILE_PX, y];
  };
  const pairs = [...container.querySelectorAll('svg line[data-testid="rail-segment"]')].map((l): [XY, XY] => {
    const n = (name: string) => Number(l.getAttribute(name));
    return [toTile(n('x1'), n('y1')), toTile(n('x2'), n('y2'))];
  });
  const depotLight = container.querySelector(`[data-tile-id="${createTileId(...DEPOT)}"] [title^="Depot: "]`)?.getAttribute('data-connected') ?? '';
  lastDepotLight = depotLight;
  lastRailArt = railArtOf(container);
  unmount();
  return pairs;
}
let lastDepotLight = '';

/** FR-328: each rail-segment line and the rail-art images of the overlay, with the images' matrices applied to the piece's ends; FR-570: the rail-tile drawings' tiles. */
interface DrawnArt {
  lines: { x1: number; y1: number; x2: number; y2: number; nationId: string | null }[];
  images: { href: string | null; size: [string | null, string | null]; hidden: string | null; ends: [number, number][]; height: number }[];
  tiles: string[];
}
let lastRailArt: DrawnArt = { lines: [], images: [], tiles: [] };
function railArtOf(container: HTMLElement): DrawnArt {
  const lines = [...container.querySelectorAll('svg line[data-testid="rail-segment"]')].map((l) => {
    const n = (name: string) => Number(l.getAttribute(name));
    return { x1: n('x1'), y1: n('y1'), x2: n('x2'), y2: n('y2'), nationId: l.getAttribute('data-nation-id') };
  });
  const images = [...container.querySelectorAll('svg image[data-testid="rail-art"]')].map((img) => {
    const m = /^matrix\(([^)]+)\)$/.exec(img.getAttribute('transform') ?? '')![1].split(/[\s,]+/).map(Number);
    const at = (x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    // The piece's height drawn: the distance between its top and bottom middles
    const [top, bottom] = [at(21, 0), at(21, 16)];
    return {
      href: img.getAttribute('href'),
      size: [img.getAttribute('width'), img.getAttribute('height')] as [string | null, string | null],
      hidden: img.getAttribute('aria-hidden'),
      ends: [at(0, 8), at(42, 8)],
      height: Math.hypot(bottom[0] - top[0], bottom[1] - top[1]),
    };
  });
  const tiles = [...container.querySelectorAll('svg g[data-testid="rail-tile"]')].map((g) => g.getAttribute('data-rail-tile-id') ?? '');
  return { lines, images, tiles };
}

/** The tiles reachable from `start` along drawn segments. */
function reachable(pairs: [XY, XY][], start: XY): Set<string> {
  const seen = new Set([createTileId(...start)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [a, b] of pairs) {
      const [ka, kb] = [createTileId(...a), createTileId(...b)];
      if (seen.has(ka) !== seen.has(kb)) {
        seen.add(ka);
        seen.add(kb);
        grew = true;
      }
    }
  }
  return seen;
}

/** Every link of the nation's rail graph, the graph the depot lights are computed from. */
function graphPairs(state: GameState): Set<string> {
  const graph = state.transportNetwork.railroadNetworks![N].graph;
  const keys = new Set<string>();
  for (const [k, nodes] of Object.entries(graph)) {
    const [x, y] = k.split(',').map(Number);
    for (const n of nodes) keys.add(pairKey([x, y], [n.x, n.y]));
  }
  return keys;
}

describe('FR-079 the rail line is drawn as one continuous line (NR-010)', () => {
  let built: GameState;
  let pairs: [XY, XY][];
  let light: string;
  let art: DrawnArt;

  beforeAll(() => {
    let s = newGame({ seed: 1 });
    expect(tileAt(s, CAPITAL).terrain).toBe(TerrainType.Capital);
    expect(LINE.filter(xy => !isShore(s, xy))).toEqual([]);
    for (const to of LINE) s = buildRail(s, to);
    s = buildDepot(s, DEPOT);
    for (const to of SPUR) s = buildRail(s, to);
    built = s;
    pairs = drawnPairs(built);
    light = lastDepotLight;
    art = lastRailArt;
  }, 30000);

  // Changed in M18b (FR-570 replaces FR-328's piece): old -> one rail-art image per segment, the pack's straight piece
  // stretched along it; new -> no rail-art image, one rail-tile drawing per tile at a segment's end. The lengths stay.
  it('FR-570 one rail-tile drawing per tile at a segment\'s end and no stretched rail-art image; the lines are 42 or 46.96 px', () => {
    expect(art.lines.length).toBe(pairs.length);
    expect(art.images).toHaveLength(0);
    const ends = new Set(pairs.flatMap(([a, b]) => [createTileId(...a), createTileId(...b)]));
    expect([...art.tiles].sort()).toEqual([...ends].sort());
    // A 42 px east-west link; a diagonal one is 46.96 px long
    const lengths = art.lines.map((l) => Math.round(Math.hypot(l.x2 - l.x1, l.y2 - l.y1) * 100) / 100);
    expect([...new Set(lengths)].sort()).toEqual([42, 46.96]);
  });

  // FR-348 (QA; replaces FR-328's "drawn as a 3 px underlay in --color-rail"): the underlay filled the 2.8 px between the
  // piece's two rails and hid its sleepers, so a link read as a dark cable. The line keeps its test id and ends (above).
  it('FR-348 the line draws nothing of its own under the pack\'s piece, and the overlay with it lies above the tile pictures', () => {
    const mapCss = readFileSync(join(__dirname, '..', '..', 'src/app/components/MapView.module.css'), 'utf8');
    const tileCss = readFileSync(join(__dirname, '..', '..', 'src/app/components/Tile/Tile.module.css'), 'utf8');
    const rule = (css: string, name: string) => new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    expect(rule(mapCss, 'railSegment')).toMatch(/stroke:\s*none;/);
    expect(rule(mapCss, 'railSegment')).not.toMatch(/stroke-width|--color-rail/);
    // The piece's own rails are the rail colour (FR-329's 3:1 on the grass is theirs now): no other stroke covers them
    expect(art.lines.length).toBeGreaterThan(0);
    const z = (body: string) => Number(/z-index:\s*(-?\d+)/.exec(body)?.[1] ?? NaN);
    // Above the tile picture (FR-322), below every tile mark and the selection mark (FR-110 (b))
    expect(z(rule(mapCss, 'railOverlay'))).toBeGreaterThan(z(rule(tileCss, 'icon')));
    for (const mark of ['selectionRing', 'resourceMark', 'levelBadge', 'stations', 'jobs', 'workers', 'river']) {
      expect({ mark, above: z(rule(tileCss, mark)) > z(rule(mapCss, 'railOverlay')) }).toEqual({ mark, above: true });
    }
  });

  it('FR-079 the engine accepts rail on every shore tile of the line and lights the depot at its end green', () => {
    expect(LINE.filter(xy => !tileAt(built, xy).connected)).toEqual([]);
    const depot = built.transportNetwork.railroadNetworks![N].depots.find(d => d.x === DEPOT[0] && d.y === DEPOT[1]);
    expect(depot?.isActive).toBe(true);
    expect(light).toBe('true'); // drawn with the green dot (FR-085)
  });

  it('FR-079 the line built tile by tile along the shore from the capital to the depot has no gap', () => {
    const drawn = new Set(pairs.map(([a, b]) => pairKey(a, b)));
    const path = [CAPITAL, ...LINE];
    const missing = path.slice(1).map((to, i) => pairKey(path[i], to)).filter(k => !drawn.has(k));
    expect(missing).toEqual([]);
  });

  it('FR-079 a green depot is joined to the capital by drawn segments', () => {
    expect(reachable(pairs, CAPITAL).has(createTileId(...DEPOT))).toBe(true);
  });

  it('FR-079 the map draws exactly the links of the rail graph that decides the depot lights', () => {
    const drawn = pairs.map(([a, b]) => pairKey(a, b)).sort();
    expect(drawn).toEqual([...graphPairs(built)].sort());
  });

  // Changed in M4.3 (FR-136 replaced FR-079's "linked to every neighbouring node"): this case asserted that
  // all three sides of the triangle 3-1, 3-2, 4-2 were drawn, though only two sections were built.
  it('FR-079 FR-136 every drawn segment joins two neighbouring tiles; the spur 3-2 -> 4-2 -> 3-1 draws its two sections, not the third side 3-1/3-2', () => {
    const notNeighbours = pairs.filter(([a, b]) => !areTilesAdjacent(built.map, a[0], a[1], b[0], b[1]));
    expect(notNeighbours).toEqual([]);
    expect(areTilesAdjacent(built.map, 3, 1, 3, 2)).toBe(true);
    const drawn = new Set(pairs.map(([a, b]) => pairKey(a, b)));
    expect(drawn.has(pairKey([3, 2], [4, 2]))).toBe(true);
    expect(drawn.has(pairKey([4, 2], [3, 1]))).toBe(true);
    expect(drawn.has(pairKey([3, 1], [3, 2]))).toBe(false);
  });
});

describe('FR-139 the play-test triangle: three neighbouring tiles built from one of them draw two lines', () => {
  // Capital 2-9, A = 3-9 east of it, B = 3-8 next to both; the engineer builds A from the capital, walks back,
  // then builds B from the capital: two sections, so two lines, and the side A/B stays undrawn.
  const A: XY = [3, 9];
  const B: XY = [3, 8];

  it('FR-139 the map draws capital-A and capital-B and no A-B; a section built on purpose between A and B adds the third line', () => {
    let s = newGame({ seed: 1 });
    s = buildRail(s, A);
    s = play(s, { kind: 'moveWorker', nationId: N, workerId: ENGINEER, toTileId: createTileId(...CAPITAL) });
    s = buildRail(s, B);
    expect(areTilesAdjacent(s.map, ...A, ...B)).toBe(true);
    const two = drawnPairs(s).map(([a, b]) => pairKey(a, b)).sort();
    expect(two).toEqual([pairKey(CAPITAL, A), pairKey(CAPITAL, B)].sort());
    expect(two).toEqual([...graphPairs(s)].sort());

    // The engineer stands on B and names A as the start of the section
    s = play(s, { kind: 'startConstruction', nationId: N, workerId: ENGINEER, tileId: createTileId(...B), structure: 'rail', fromTileId: createTileId(...A) });
    const three = drawnPairs(s).map(([a, b]) => pairKey(a, b)).sort();
    expect(three).toEqual([pairKey(CAPITAL, A), pairKey(CAPITAL, B), pairKey(A, B)].sort());
  }, 30000);
});

describe('FR-079 a depot the line does not reach is red', () => {
  it('FR-079 rail stops at 2-4, the engineer walks along the shore and builds the depot on 3-2: red, and no segment reaches it', () => {
    let s = newGame({ seed: 1 });
    for (const to of LINE.slice(0, 5)) s = buildRail(s, to);
    s = play(s, { kind: 'moveWorker', nationId: N, workerId: ENGINEER, toTileId: createTileId(...SHORE) });
    s = play(s, { kind: 'moveWorker', nationId: N, workerId: ENGINEER, toTileId: createTileId(...DEPOT) });
    s = buildDepot(s, DEPOT);

    const depot = s.transportNetwork.railroadNetworks![N].depots.find(d => d.x === DEPOT[0] && d.y === DEPOT[1]);
    expect(depot?.isActive).toBe(false);
    const pairs = drawnPairs(s);
    expect(lastDepotLight).toBe('false'); // drawn with the red dot (FR-085)
    expect(reachable(pairs, CAPITAL).has(createTileId(...DEPOT))).toBe(false);
    expect(pairs.flat().some(([x, y]) => (x === SHORE[0] && y === SHORE[1]) || (x === DEPOT[0] && y === DEPOT[1]))).toBe(false);
  }, 30000);
});
