// @vitest-environment jsdom
// FR-079 (NR-010), Nathan's bug of 2026-11-03: rail built tile by tile from the capital through a
// coast tile to a depot lit the depot green, but the map drew no line on the coast tile. The two-island
// map has no coast tiles (decision Q16, FR-080), so the line now runs along the shore: the land tiles
// next to the sea. The game is played through the order API on the real new-game map, then the map is
// rendered and its rail <line> elements are read back as tile pairs.
import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { useGameStore } from '@/store/rootStore';
import { newGame, resolveTurn, type Order } from '@/engine';
import { areTilesAdjacent, getAdjacentTiles } from '@/engine/map/mapHelpers';
import type { GameState } from '@/types/GameState';
import { TerrainType, type Tile } from '@/types/Tile';
import { createTileId } from '@/utils/tileIdUtils';

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

/** The map's rail overlay read back as tile pairs (MapView draws with 100px tiles, odd rows shifted 50px). */
function drawnPairs(state: GameState): [XY, XY][] {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N });
  const { container, unmount } = render(<MapView />);
  const toTile = (px: number, py: number): XY => {
    const y = (py - 50) / 100;
    return [(px - 50 - (y % 2 === 1 ? 50 : 0)) / 100, y];
  };
  const pairs = [...container.querySelectorAll('svg line')].map((l): [XY, XY] => {
    const n = (name: string) => Number(l.getAttribute(name));
    return [toTile(n('x1'), n('y1')), toTile(n('x2'), n('y2'))];
  });
  const depotLight = container.querySelector(`[data-tile-id="${createTileId(...DEPOT)}"] [title="Depot"]`)?.textContent ?? '';
  lastDepotLight = depotLight;
  unmount();
  return pairs;
}
let lastDepotLight = '';

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
  }, 30000);

  it('FR-079 the engine accepts rail on every shore tile of the line and lights the depot at its end green', () => {
    expect(LINE.filter(xy => !tileAt(built, xy).connected)).toEqual([]);
    const depot = built.transportNetwork.railroadNetworks![N].depots.find(d => d.x === DEPOT[0] && d.y === DEPOT[1]);
    expect(depot?.isActive).toBe(true);
    expect(light).toContain('🟢');
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

  it('FR-079 every drawn segment joins two neighbouring tiles (the triangle 3-1, 3-2, 4-2 is three neighbours)', () => {
    const notNeighbours = pairs.filter(([a, b]) => !areTilesAdjacent(built.map, a[0], a[1], b[0], b[1]));
    expect(notNeighbours).toEqual([]);
    const drawn = new Set(pairs.map(([a, b]) => pairKey(a, b)));
    expect(drawn.has(pairKey([3, 1], [3, 2]))).toBe(true);
    expect(drawn.has(pairKey([3, 1], [4, 2]))).toBe(true);
    expect(drawn.has(pairKey([3, 2], [4, 2]))).toBe(true);
  });
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
    expect(lastDepotLight).toContain('🔴');
    expect(reachable(pairs, CAPITAL).has(createTileId(...DEPOT))).toBe(false);
    expect(pairs.flat().some(([x, y]) => (x === SHORE[0] && y === SHORE[1]) || (x === DEPOT[0] && y === DEPOT[1]))).toBe(false);
  }, 30000);
});
