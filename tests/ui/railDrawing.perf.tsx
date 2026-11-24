// @vitest-environment jsdom
// FR-570 (M18b): the rail drawing must not slow the map down. The whole map is rendered in jsdom with every land tile of
// both Great Powers on rail, a dense network (each tile linked to every railed neighbour: junctions everywhere) and a
// tree (each tile linked once, toward its capital: mostly straight and curved pieces), against the same map with no rail.
// Measured: the first render (mount) and a re-render after a new turn's state with the same rail (the per-turn cost).
// jsdom has no layout or paint, so this times React and the geometry, not the browser's drawing. It reports and sets no
// wall-clock limit (jsdom's run-to-run spread is about 15 ms here). Run alone:
// `npx vitest run --config vitest.perf.config.ts tests/ui/railDrawing.perf.tsx`.
// Measured 2026-11-24 (three runs each, medians of five renders): the M11 piece per link, tree mount 66 to 70 ms and new
// turn 20 to 22 ms, dense 83 to 90 and 24 to 27; FR-570's pieces, tree 74 to 92 and 19 to 21, dense 84 to 103 and 22 to 24.
import { describe, it, expect } from 'vitest';
import { act, render } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { getAdjacentTiles, isRailLand } from '@/engine/map/mapHelpers';
import type { GameState } from '@/types/GameState';
import type { RailroadNode } from '@/types/Transport';

const RUNS = 5;
const key = (x: number, y: number) => `${x},${y}`;

/** The game with every owned land tile of each Great Power on rail: `dense` links all railed neighbours, else a BFS tree. */
function withRail(base: GameState, mode: 'none' | 'dense' | 'tree'): GameState {
  if (mode === 'none') return base;
  const networks = { ...base.transportNetwork.railroadNetworks };
  for (const nation of base.nations) {
    const own = (x: number, y: number) => {
      const t = base.map.tiles[y]?.[x];
      return !!t && t.ownerNationId === nation.id && isRailLand(t);
    };
    const graph: Record<string, RailroadNode[]> = {};
    const link = (a: RailroadNode, b: RailroadNode) => {
      (graph[key(a.x, a.y)] ??= []).push({ x: b.x, y: b.y });
      (graph[key(b.x, b.y)] ??= []).push({ x: a.x, y: a.y });
    };
    const tiles = base.map.tiles.flat().filter((t) => own(t.x, t.y));
    if (mode === 'dense') {
      for (const t of tiles)
        for (const n of getAdjacentTiles(base.map, t.x, t.y))
          if (own(n.x, n.y) && (n.y > t.y || (n.y === t.y && n.x > t.x))) link(t, n);
    } else {
      const capital = tiles.find((t) => t.cityId === nation.cities[0]) ?? tiles[0];
      const seen = new Set([key(capital.x, capital.y)]);
      const queue = [capital];
      while (queue.length) {
        const t = queue.shift()!;
        for (const n of getAdjacentTiles(base.map, t.x, t.y)) {
          if (!own(n.x, n.y) || seen.has(key(n.x, n.y))) continue;
          seen.add(key(n.x, n.y));
          link(t, n);
          queue.push(n);
        }
      }
    }
    networks[nation.id] = { ...(networks[nation.id] ?? { ports: [], depots: [] }), graph };
  }
  return { ...base, transportNetwork: { ...base.transportNetwork, railroadNetworks: networks } };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function time(game: GameState): { mount: number; turn: number; links: number } {
  const mounts: number[] = [];
  const turns: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: 'nation-1' });
    const t0 = performance.now();
    const { unmount } = render(<MapView />);
    mounts.push(performance.now() - t0);
    // A new turn: a new state object and map, the same rail
    const t1 = performance.now();
    act(() => useGameStore.setState({ game: { ...game, turn: game.turn + 1, map: { ...game.map }, transportNetwork: { ...game.transportNetwork } } }));
    turns.push(performance.now() - t1);
    unmount();
  }
  const links = Object.values(game.transportNetwork.railroadNetworks ?? {}).reduce(
    (n, net) => n + Object.values(net.graph).reduce((m, ns) => m + ns.length, 0) / 2,
    0
  );
  return { mount: median(mounts), turn: median(turns), links };
}

describe('FR-570 map render time with a full rail network', () => {
  it('FR-570 reports the mount and per-turn render times with no rail, a tree and a dense network', () => {
    const base = newGame({ seed: 1 });
    time(base); // warm-up: module loading and the first JIT pass
    const rows = (['none', 'tree', 'dense'] as const).map((mode) => ({ mode, ...time(withRail(base, mode)) }));
    for (const r of rows)
      console.log(`FR-570 perf ${r.mode}: ${r.links} links, mount ${r.mount.toFixed(1)} ms, new turn ${r.turn.toFixed(1)} ms (median of ${RUNS})`);
    expect(rows.find((r) => r.mode === 'dense')!.links).toBeGreaterThan(100);
  }, 120_000);
});
