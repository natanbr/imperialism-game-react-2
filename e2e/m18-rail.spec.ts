// FR-570 (M18b) in the running app, from the seed 1 save (e2e/seededGame.ts) with rail laid before it loads: a line of six
// tiles from nation 1's capital, the third on a river (a bridge), a depot at its end (a station), and the engineer starting
// a section out of the depot (under construction). The map draws each railed tile's piece in the ink-and-wash style, the
// section under construction as pencil ties, and no stretched rail pictures. Screenshots (a close-up at the map's 200% zoom
// and the map at its opening zoom) go to the test's output folder (testInfo.outputPath), or SCREENSHOT_DIR when set.
import type { TestInfo } from '@playwright/test';
import { tryApplyOrder } from '../src/app/engine';
import { areTilesAdjacent, getAdjacentTiles, isRailLand } from '../src/app/engine/map/mapHelpers';
import type { GameState } from '../src/app/types/GameState';
import { TerrainType, type Tile } from '../src/app/types/Tile';
import { WorkerType } from '../src/app/types/Workers';
import { expect, startSeededGame, test } from './seededGame';

const shotPath = (testInfo: TestInfo, name: string) => (process.env.SCREENSHOT_DIR ? `${process.env.SCREENSHOT_DIR}/${name}` : testInfo.outputPath(name));
const N = 'nation-1';
const key = (t: Tile) => `${t.x},${t.y}`;

interface Laid {
  path: string[];
  bridge: string;
  depot: string;
  building: string;
}

/** Lays the line, the river, the depot and the section under construction into the save's game (in place). */
function layRail(game: GameState): Laid {
  const nation = game.nations.find((n) => n.id === N)!;
  const capital = game.map.tiles.flat().find((t) => t.cityId === nation.cities[0])!;
  const free = (t: Tile) => t.ownerNationId === N && isRailLand(t) && t.terrain !== TerrainType.Capital && !t.depot && !t.port && !t.cityId;
  // Each next tile touches only the one before it, so the line reads as a line
  const lonely = (path: Tile[], t: Tile) => !path.includes(t) && !path.slice(0, -1).some((p) => areTilesAdjacent(game.map, p.x, p.y, t.x, t.y));
  const path = [capital];
  while (path.length < 6) {
    const last = path[path.length - 1];
    const next = getAdjacentTiles(game.map, last.x, last.y).find((t) => free(t) && lonely(path, t));
    if (!next) throw new Error(`no free tile next to ${last.id}`);
    path.push(next);
  }
  const network = game.transportNetwork.railroadNetworks![N];
  const graph = { ...network.graph };
  for (const [i, t] of path.entries()) {
    graph[key(t)] = [path[i - 1], path[i + 1]].filter((n): n is Tile => !!n).map((n) => ({ x: n.x, y: n.y }));
  }
  const [bridge, depot] = [path[2], path[5]];
  const tiles = game.map.tiles.map((row) =>
    row.map((t) => {
      if (t === bridge) return { ...t, hasRiver: true, connected: true };
      if (t === depot) return { ...t, depot: true, connected: true };
      return path.includes(t) && t !== capital ? { ...t, connected: true } : t;
    })
  );
  const laid: GameState = {
    ...game,
    map: { ...game.map, tiles },
    transportNetwork: {
      ...game.transportNetwork,
      railroadNetworks: { ...game.transportNetwork.railroadNetworks, [N]: { ...network, graph, depots: [...network.depots, { x: depot.x, y: depot.y, isActive: true }] } },
    },
  };
  // The engineer starts a section out of the depot through the order API, as a click would
  const building = getAdjacentTiles(laid.map, depot.x, depot.y).find((t) => free(t) && lonely(path, t));
  if (!building) throw new Error(`no free tile next to the depot ${depot.id}`);
  const engineer = laid.map.tiles.flat().flatMap((t) => t.workers).find((w) => w.nationId === N && w.type === WorkerType.Engineer)!;
  const { state, result } = tryApplyOrder(laid, {
    kind: 'moveAndStartConstruction',
    nationId: N,
    workerId: engineer.id,
    toTileId: building.id,
    structure: 'rail',
    fromTileId: depot.id,
  });
  expect(result).toEqual({ ok: true });
  Object.assign(game, state);
  return { path: path.map((t) => t.id), bridge: bridge.id, depot: depot.id, building: building.id };
}

test.describe('FR-570 at 1366x768', () => {
  // Twice the pixels, so the close-up shows the thin pen lines as they are
  test.use({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });

  test('FR-570 the rail is drawn tile by tile in the ink-and-wash style: curves, a bridge, a station and pencil ties under construction', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let laid: Laid | undefined;
    await startSeededGame(page, (game) => {
      laid = layRail(game);
    });
    const { path, bridge, depot, building } = laid!;
    await expect(page.getByTestId('map-scroll')).toHaveAttribute('data-ready', 'true');

    // One piece per railed tile; the ends (the capital and the depot) are ends, the depot a station, the river tile a bridge
    const pieces = page.locator('svg g[data-testid="rail-tile"]');
    await expect(pieces).toHaveCount(path.length);
    const drawn = await pieces.evaluateAll((gs) =>
      Object.fromEntries(
        gs.map((g) => [
          g.getAttribute('data-rail-tile-id'),
          {
            shape: g.getAttribute('data-shape'),
            bridge: g.getAttribute('data-bridge') === 'true',
            station: g.getAttribute('data-station') === 'true',
            parts: [...g.querySelectorAll('path')].map((p) => p.getAttribute('data-testid')),
          },
        ])
      )
    );
    console.log(`FR-570 pieces: ${JSON.stringify(drawn)}`);
    expect(Object.keys(drawn).sort()).toEqual([...path].sort());
    expect([drawn[path[0]].shape, drawn[depot].shape, drawn[depot].station]).toEqual(['end', 'end', true]);
    expect(drawn[depot].parts).toContain('rail-platform');
    expect([drawn[bridge].bridge, drawn[bridge].parts.includes('rail-trestle')]).toEqual([true, true]);
    for (const id of path.slice(1, -1)) expect(['straight', 'curve']).toContain(drawn[id].shape);
    // The zigzag north on the offset rows turns: at least one curve
    expect(path.slice(1, -1).some((id) => drawn[id].shape === 'curve')).toBe(true);
    for (const id of path) expect(drawn[id].parts).toEqual(expect.arrayContaining(['rail-wash', 'rail-ties', 'rail-rails']));

    // The section under construction: pencil ties out of the depot, no rails
    const section = page.locator('svg g[data-testid="rail-construction"]');
    await expect(section).toHaveCount(1);
    await expect(section).toHaveAttribute('data-rail-tile-id', building);
    await expect(section).toHaveAttribute('data-from-tile-id', depot);
    await expect(section.locator('[data-testid="rail-pencil"]')).toHaveCount(1);
    await expect(section.locator('[data-testid="rail-rails"]')).toHaveCount(0);

    // Thin pen lines in the tokens' colours; the FR-079 link lines still paint nothing; no stretched rail pictures
    const look = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.appendChild(probe);
      const colour = (token: string) => {
        probe.style.color = `var(${token})`;
        return getComputedStyle(probe).color;
      };
      const style = (sel: string) => {
        const s = getComputedStyle(document.querySelector(sel)!);
        return { stroke: s.stroke, width: Number.parseFloat(s.strokeWidth) };
      };
      const out = {
        rails: style('[data-testid="rail-rails"]'),
        ties: style('[data-testid="rail-ties"]'),
        pencil: style('[data-testid="rail-pencil"]'),
        trestle: style('[data-testid="rail-trestle"]'),
        tokens: { rail: colour('--color-rail'), tie: colour('--color-rail-tie'), pencil: colour('--color-rail-pencil'), timber: colour('--color-rail-timber') },
        segments: [...new Set([...document.querySelectorAll('[data-testid="rail-segment"]')].map((l) => getComputedStyle(l).stroke))],
        art: document.querySelectorAll('[data-testid="rail-art"]').length,
      };
      probe.remove();
      return out;
    });
    console.log(`FR-570 look: ${JSON.stringify(look)}`);
    expect([look.rails.stroke, look.ties.stroke, look.pencil.stroke, look.trestle.stroke]).toEqual([
      look.tokens.rail,
      look.tokens.tie,
      look.tokens.pencil,
      look.tokens.timber,
    ]);
    for (const part of [look.rails, look.ties, look.pencil, look.trestle]) expect(part.width).toBeLessThanOrEqual(1.2);
    expect(look.segments).toEqual(['none']);
    expect(look.art).toBe(0);

    // The map at its opening zoom, then a close-up at 200%
    await page.screenshot({ path: shotPath(testInfo, 'm18-rail-map.png') });
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    while (await zoomIn.isEnabled()) await zoomIn.click();
    await expect(page.getByTestId('map-viewport')).toHaveAttribute('data-zoom', '2');
    await pieces.nth(Math.floor(path.length / 2)).scrollIntoViewIfNeeded();
    const clip = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('[data-testid="rail-tile"], [data-testid="rail-construction"]')].map((g) => g.getBoundingClientRect());
      const [padX, padY] = [120, 48];
      const left = Math.max(0, Math.min(...boxes.map((b) => b.left)) - padX);
      const top = Math.max(0, Math.min(...boxes.map((b) => b.top)) - padY);
      const right = Math.min(window.innerWidth, Math.max(...boxes.map((b) => b.right)) + padX);
      const bottom = Math.min(window.innerHeight, Math.max(...boxes.map((b) => b.bottom)) + padY);
      return { x: left, y: top, width: right - left, height: bottom - top };
    });
    expect(clip.width).toBeGreaterThan(100);
    expect(clip.height).toBeGreaterThan(100);
    await page.screenshot({ path: shotPath(testInfo, 'm18-rail-closeup.png'), clip });
    expect(errors).toEqual([]);
  });
});
