// @vitest-environment jsdom
// M3.5 review fix round. FR-093: depots and ports name their state ("Depot: connected") and show it by
// shape as well as colour. FR-095: every tile has an accessible name (terrain, resource and level,
// owner) now that the terrain text is no longer drawn. FR-096: the browser tab says "Imperialism". FR-324 (M11): the depot
// and port are the pack's pictures with its station marks, the state still by shape and in the name. FR-347 (QA, replaces
// FR-324's 14 px row with 8 px marks and FR-345): 20 px in the top-right corner, 11 px marks on their top-right. FR-356
// (review F1 of the QA fix round; replaces FR-347's "always stacked"): each box cropped to its drawing's rows, a depot and
// a port side by side, civilians on such a tile in the corner, clear of the drawings.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { TileInfrastructure } from '@/components/Tile/TileInfrastructure';
import tileStyles from '@/components/Tile/Tile.module.css';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { TerrainType, type Tile } from '@/types/Tile';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';

const ROOT = join(__dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src/app/components/Tile/Tile.module.css'), 'utf8');
const rule = (name: string) => new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
/** A length in px; a bare 0 counts. */
const px = (body: string, prop: string) => Number(new RegExp(`(?:^|[;\\s])${prop}:\\s*(-?[\\d.]+)(?:px)?(?![\\w.%])`).exec(body)?.[1]);

/** A box in the tile's 40 x 40 content box. */
type Box = { x0: number; y0: number; x1: number; y1: number };
const meet = (a: Box, b: Box): Box => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const round = (n: number) => Math.round(n * 10) / 10;
/** Where depot.png and port.png draw in their 256 px (alpha above 32). */
const DEPOT_DRAWING: Box = { x0: 20, x1: 236, y0: 42, y1: 214 };
const PORT_DRAWING: Box = { x0: 20, x1: 236, y0: 39, y1: 218 };
/** The two stations' boxes from the CSS: the depot rightmost, the port left of it (the row's second box). */
const stationRow = () => {
  const top = px(rule('stations'), 'top');
  const width = px(rule('station'), 'width');
  const height = px(rule('station'), 'height');
  const depot = { x0: 40 - px(rule('stations'), 'right') - width, x1: 40 - px(rule('stations'), 'right'), y0: top, y1: top + height };
  const gap = px(/\.station \+ \.station\s*\{([^}]*)\}/.exec(css)?.[1] ?? '', 'margin-right');
  const port = { x0: depot.x0 - gap - width, x1: depot.x0 - gap, y0: top, y1: top + height };
  return { depot, port };
};
/** A picture's drawing inside its station box: `object-fit: cover` scales the square picture to the box's larger side. */
const drawingOf = (box: Box, drawing: Box): Box => {
  const w = px(rule('stationPicture'), 'width');
  const h = px(rule('stationPicture'), 'height');
  const scale = Math.max(w, h) / 256;
  const dx = (256 * scale - w) / 2;
  const dy = (256 * scale - h) / 2;
  return meet(box, { x0: box.x0 + drawing.x0 * scale - dx, x1: box.x0 + drawing.x1 * scale - dx, y0: box.y0 + drawing.y0 * scale - dy, y1: box.y0 + drawing.y1 * scale - dy });
};

describe('FR-093 depot and port state is named, not only coloured', () => {
  it('FR-093 a connected depot and an unconnected port carry their state as title and accessible name', () => {
    render(<TileInfrastructure depot depotActive port portActive={false} />);
    const depot = screen.getByRole('img', { name: 'Depot: connected' });
    expect(depot.getAttribute('title')).toBe('Depot: connected');
    expect(depot.getAttribute('data-connected')).toBe('true');
    const port = screen.getByRole('img', { name: 'Port: not connected' });
    expect(port.getAttribute('title')).toBe('Port: not connected');
    expect(port.getAttribute('data-connected')).toBe('false');
  });

  it('FR-093 an unconnected depot and a connected port', () => {
    render(<TileInfrastructure depot depotActive={false} port portActive />);
    expect(screen.getByRole('img', { name: 'Depot: not connected' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Port: connected' })).toBeTruthy();
  });

  // M11 (FR-324) replaced the CSS dots with the pack's station marks: the state shows by shape (a filled disc, a ring);
  // FR-347 (QA) draws them at 20 px with 11 px marks, readable at 1x (14 px and 8 px were a speck)
  it('FR-093 FR-347 not connected is the pack\'s ring, connected its filled disc: the shape differs, not only the colour', () => {
    const { container } = render(<TileInfrastructure depot depotActive port portActive={false} />);
    const pictures = (name: string) =>
      [...screen.getByRole('img', { name }).querySelectorAll('img')].map((img) => [img.getAttribute('data-art'), img.getAttribute('alt'), img.getAttribute('width')]);
    expect(pictures('Depot: connected')).toEqual([
      ['infrastructure/depot.png', '', '20'],
      ['map-ui/station-connected.svg', '', '11'],
    ]);
    expect(pictures('Port: not connected')).toEqual([
      ['infrastructure/port.png', '', '20'],
      ['map-ui/station-disconnected.svg', '', '11'],
    ]);
    // The two files differ by shape: the connected one is one filled disc, the other a disc with a ring drawn inside
    const file = (name: string) => readFileSync(join(ROOT, 'public/assets/ink-and-wash/map-ui', name), 'utf8');
    expect(file('station-connected.svg')).not.toMatch(/fill="none" stroke="#[0-9a-f]{6}" stroke-width="1\.25"/);
    expect(file('station-disconnected.svg')).toMatch(/fill="none" stroke="#[0-9a-f]{6}" stroke-width="1\.25"/);
    // The old dots are gone
    expect(container.querySelector('[class*="statusDot"]')).toBeNull();
    expect(css).not.toMatch(/\.status(Dot|On|Off)\b/);
  });

  // FR-356 (review F1 of the QA fix round) keeps the 20 px scale and crops each box to its drawing's 14 rows
  it('FR-347 FR-356 the depot and the port stand in the top-right corner, 1 px in, drawn at 20 px, each mark 11 px on its top-right', () => {
    expect([px(rule('stations'), 'top'), px(rule('stations'), 'right')]).toEqual([1, 1]);
    expect([px(rule('station'), 'width'), px(rule('station'), 'height'), px(rule('stationPicture'), 'width'), px(rule('stationPicture'), 'height')]).toEqual([20, 14, 20, 14]);
    // The picture covers its 20 x 14 box: drawn at the 20 px scale, its transparent top and bottom 3 px cut off
    expect(rule('stationPicture')).toMatch(/object-fit:\s*cover/);
    expect([px(rule('stationMark'), 'width'), px(rule('stationMark'), 'height'), px(rule('stationMark'), 'right'), px(rule('stationMark'), 'top')]).toEqual([11, 11, -1, -1]);
    expect(rule('stationMark')).not.toMatch(/bottom:/);
    // One station: clear of the level badge and the job markers below it, both from x 1 at the top-left (the badge's "L3" is
    // 13 px wide, e2e/look.spec.ts measures it): the station starts 40 - 1 - 20 = 19 px from the content box's left
    const left = 40 - px(rule('stations'), 'right') - px(rule('station'), 'width');
    expect(left).toBeGreaterThan(px(rule('levelBadge'), 'left') + 13);
    expect(px(rule('jobs'), 'left') + 10).toBeLessThan(left);
    const { container } = render(<TileInfrastructure depot depotActive port portActive />);
    expect([...container.querySelectorAll('[role="img"]')].map((s) => s.getAttribute('aria-label'))).toEqual(['Depot: connected', 'Port: connected']);
    expect([...container.querySelectorAll('img')].map((img) => [img.getAttribute('width'), img.getAttribute('height')])).toEqual([
      ['20', '14'],
      ['11', '11'],
      ['20', '14'],
      ['11', '11'],
    ]);
  });

  // FR-356 replaces FR-347's "always stacked": stacked, the port lay where the civilians' button stands (review F1)
  it('FR-356 a depot and a port on one tile stand side by side along the top, the depot rightmost, inside the 40 px box', () => {
    // FR-345's stacked class stays gone
    expect(css).not.toMatch(/\.stationsStacked\b/);
    expect(rule('stations')).toMatch(/flex-direction:\s*row-reverse/);
    const row = stationRow();
    // The two boxes meet over their transparent margins, so the row fits the content box (the stack was 1 + 20 + 20 = 41 px)
    expect(row.port.x0).toBeGreaterThanOrEqual(0);
    expect(row.depot.x1).toBeLessThanOrEqual(40);
    expect([row.port.y0, row.depot.y0]).toEqual([1, 1]);
    expect(row.port.x1).toBeLessThanOrEqual(row.depot.x0 + 1);
    // The drawings do not touch, and the port's mark ends left of the depot's drawing (its 11 px box by under a pixel)
    expect(area(meet(drawingOf(row.depot, DEPOT_DRAWING), drawingOf(row.port, PORT_DRAWING)))).toBe(0);
    const portMark = { x0: row.port.x1 + 1 - 11, x1: row.port.x1 + 1, y0: row.port.y0 - 1, y1: row.port.y0 + 10 };
    expect(portMark.x1 - drawingOf(row.depot, DEPOT_DRAWING).x0).toBeLessThan(1);
    const two = render(<TileInfrastructure depot depotActive port portActive />).container;
    const stations = two.firstElementChild!;
    expect(stations.className).toBe(tileStyles.stations);
    // In the DOM the depot comes first; row-reverse draws it rightmost
    expect([...stations.children].map((s) => s.getAttribute('aria-label')?.split(':')[0])).toEqual(['Depot', 'Port']);
  });

  // Review R3, QA, review F1: the wiring in Tile.tsx, on hand-built tiles drawn by the map: a badge or not, the same row
  it('FR-356 on the map: a level-1 farm and a level-0 tile with a depot and a port both show them in a row, the badge below', () => {
    const game = newGame({ seed: 1, world: 'continent' });
    const tiles = game.map.tiles.flat();
    const level0 = tiles.find((t) => t.ownerNationId === 'nation-1' && t.resource?.level === 0 && t.workers.length === 0)!;
    expect(tiles.find((t) => t.id === '3-9')!.resource?.level).toBe(1);
    const patched = new Set(['3-9', level0.id]);
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: { ...game, map: { ...game.map, tiles: game.map.tiles.map((row) => row.map((t) => (patched.has(t.id) ? { ...t, depot: true, port: true } : t))) } },
      activeNationId: 'nation-1',
    });
    const { container, unmount } = render(<MapView />);
    const tile = (id: string) => container.querySelector(`[data-tile-id="${id}"]`)!;
    const stations = (id: string) => tile(id).querySelector('[aria-label^="Depot: "]')!.parentElement!;
    expect(tile('3-9').querySelector('[data-testid="level-badge"]')?.textContent).toBe('L1');
    expect(tile('3-9').querySelector('[data-testid="level-badge"]')!.className).toBe(`${tileStyles.levelBadge} ${tileStyles.levelBadgeLow}`);
    expect(tile(level0.id).querySelector('[data-testid="level-badge"]')).toBeNull();
    for (const id of ['3-9', level0.id]) {
      expect([...stations(id).children].map((s) => s.getAttribute('aria-label')?.split(':')[0])).toEqual(['Depot', 'Port']);
      expect(stations(id).className).toBe(tileStyles.stations);
    }
    unmount();
  });
});

// Review F1 of the M11 QA fix round: the 20 px stations reached y 21 (a stacked port y 41), under the civilians' 24 px button
// (from y 15) and its count. FR-356: civilians on a tile with a depot or a port take the content box's corner, each station's
// box is cropped to its drawing's rows, two stations stand side by side, and the level badge and job markers of such a tile
// move below them. Geometry from Tile.module.css in the 40 x 40 content box (x right, y down); the e2e test in
// e2e/look.spec.ts measures the same in Chromium with the engineer on a depot and a port.
describe('FR-356 civilians on a tile with a depot or a port leave the stations clear', () => {
  const N = 'nation-1';
  const worker = (id: string, type: WorkerType = WorkerType.Engineer): Worker => ({ id, type, nationId: N, efficiency: 100, status: WorkerStatus.Available, justMoved: false });
  const button = () => {
    const corner = rule('workersCorner');
    const side = px(rule('workerTarget'), 'width');
    expect(px(rule('workerTarget'), 'height')).toBe(side);
    const x1 = 40 - px(corner, 'right');
    const y1 = 40 - px(corner, 'bottom');
    return { x0: x1 - side, x1, y0: y1 - side, y1 };
  };
  /** The count on the button's top-right corner, at its smallest (one digit). */
  const count = () => {
    const b = button();
    const c = rule('count');
    const x1 = b.x1 - px(c, 'right');
    const y0 = b.y0 + px(c, 'top');
    return { x0: x1 - px(c, 'min-width'), x1, y0, y1: y0 + px(c, 'height') };
  };

  it('FR-356 the civilians\' button in the corner covers no station drawing; one station, or two in a row', () => {
    const row = stationRow();
    const depot = drawingOf(row.depot, DEPOT_DRAWING);
    const port = drawingOf(row.port, PORT_DRAWING);
    // Drawn at the 20 px scale, whole: 16.9 px across, 13.4 (depot) and 14.0 (port) rows
    expect([round(depot.x1 - depot.x0), round(depot.y1 - depot.y0), round(port.y1 - port.y0)]).toEqual([16.9, 13.4, 14]);
    // A lone station is the row's rightmost box: the depot, or a port at the depot's place
    const lonePort = drawingOf(row.depot, PORT_DRAWING);
    for (const drawing of [depot, port, lonePort]) expect(area(meet(drawing, button()))).toBe(0);
    // A stack's count above the button's top-right corner covers at most a tenth of the rightmost drawing, none of the port's
    expect(area(meet(depot, count())) / area(depot)).toBeLessThanOrEqual(0.1);
    expect(area(meet(lonePort, count())) / area(lonePort)).toBeLessThanOrEqual(0.1);
    expect(area(meet(port, count()))).toBe(0);
  });

  it('FR-356 with two stations the level badge and the job markers stand below the row, left of the civilians\' button', () => {
    const row = stationRow();
    const badgeLeft = px(rule('levelBadge'), 'left');
    const badgeTop = px(rule('levelBadgeLow'), 'top');
    const badge = { x0: badgeLeft, x1: badgeLeft + 13, y0: badgeTop, y1: badgeTop + px(rule('levelBadge'), 'line-height') };
    const jobsTop = px(rule('jobsLow'), 'top');
    const job = { x0: px(rule('jobs'), 'left'), x1: px(rule('jobs'), 'left') + 10, y0: jobsTop, y1: jobsTop + 10 };
    for (const mark of [badge, job]) {
      expect(area(meet(mark, drawingOf(row.port, PORT_DRAWING)))).toBe(0);
      expect(area(meet(mark, drawingOf(row.depot, DEPOT_DRAWING)))).toBe(0);
      expect(area(meet(mark, button()))).toBe(0);
      expect(mark.y1).toBeLessThanOrEqual(40);
    }
    expect(area(meet(badge, job))).toBe(0);
  });

  it('FR-356 on the map: civilians on a station tile sit in the corner, elsewhere 5 px in; only two stations move the badge and jobs', () => {
    const game = newGame({ seed: 1, world: 'continent' });
    const farms = game.map.tiles.flat().filter((t) => t.ownerNationId === N && t.terrain === TerrainType.Farm && t.workers.length === 0 && t.resource?.level === 0);
    const [lone, plain, empty] = farms;
    const prospecting = { startedOnTurn: 1, workerId: 'w-both' };
    const patches: Record<string, Partial<Tile>> = {
      [lone.id]: { depot: true, workers: [worker('w-depot')] },
      // The level-1 farm east of the capital with both stations, a civilian and a job
      '3-9': { depot: true, port: true, workers: [worker('w-both'), worker('w-both-2', WorkerType.Farmer)], prospecting },
      [plain.id]: { workers: [worker('w-plain', WorkerType.Farmer)] },
      [empty.id]: { port: true, prospecting },
    };
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: { ...game, map: { ...game.map, tiles: game.map.tiles.map((row) => row.map((t) => (patches[t.id] ? { ...t, ...patches[t.id] } : t))) } },
      activeNationId: N,
    });
    const { container, unmount } = render(<MapView />);
    const tile = (id: string) => container.querySelector(`[data-tile-id="${id}"]`)!;
    const civilians = (id: string) => tile(id).querySelector('[data-testid="worker-stack"], [data-testid="worker-button"]')!.parentElement!;
    expect([lone.id, '3-9', plain.id].map((id) => civilians(id).className)).toEqual([
      `${tileStyles.workers} ${tileStyles.workersCorner}`,
      `${tileStyles.workers} ${tileStyles.workersCorner}`,
      tileStyles.workers,
    ]);
    // Two stations: the badge and the job markers below the row; one station: in their places
    expect(tile('3-9').querySelector('[data-testid="level-badge"]')!.className).toBe(`${tileStyles.levelBadge} ${tileStyles.levelBadgeLow}`);
    expect(tile('3-9').querySelector('[title="Prospecting in progress"]')!.parentElement!.className).toBe(`${tileStyles.jobs} ${tileStyles.jobsLow}`);
    expect(tile(empty.id).querySelector('[title="Prospecting in progress"]')!.parentElement!.className).toBe(tileStyles.jobs);
    // The names stay (FR-093)
    expect([...tile('3-9').querySelectorAll('[role="img"][aria-label$="connected"]')].map((s) => s.getAttribute('aria-label')!.split(':')[0])).toEqual(['Depot', 'Port']);
    unmount();
  });
});

describe('FR-095 every tile has an accessible name', () => {
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
  });

  it('FR-095 all 384 tiles are named groups', () => {
    const { container } = render(<MapView />);
    const tiles = [...container.querySelectorAll('[data-testid="tile"]')];
    expect(tiles).toHaveLength(24 * 16);
    expect(tiles.filter((t) => t.getAttribute('role') !== 'group' || !t.getAttribute('aria-label'))).toEqual([]);
  });

  it('FR-095 FR-098 terrain, resource and level, and owner; a hidden resource is not named; the sea is "Sea"', () => {
    // Since M4 island 2 is nation 2's (FR-098), so no land is unowned: one of its orchards is made
    // ownerless here for the "not owned" name.
    const start = useGameStore.getState().game;
    const [theirs, unowned] = start.map.tiles
      .flat()
      .filter((t) => t.terrain === TerrainType.Orchard && t.ownerNationId === 'nation-2' && t.resource?.level === 0);
    const game = {
      ...start,
      map: { ...start.map, tiles: start.map.tiles.map((row) => row.map((t) => (t.id === unowned.id ? { ...t, ownerNationId: undefined } : t))) },
    };
    useGameStore.setState({ game });
    const tiles = game.map.tiles.flat();
    const hidden = tiles.find((t) => t.terrain === TerrainType.BarrenHills && t.ownerNationId === 'nation-1' && t.resource?.discovered === false)!;
    const sea = tiles.find((t) => t.terrain === TerrainType.Water)!;
    const { container } = render(<MapView />);
    const label = (id: string) => container.querySelector(`[data-tile-id="${id}"]`)!.getAttribute('aria-label');

    // FR-081: the farm east of the capital starts at level 1
    expect(game.map.tiles[9][3].terrain).toBe(TerrainType.Farm);
    expect(label('3-9')).toBe('Farm, grain, level 1, owned by Testland');
    expect(label('2-9')).toBe('Capital, owned by Testland');
    expect(label(hidden.id)).toBe('Barren hills, owned by Testland');
    expect(label(theirs.id)).toBe('Orchard, fruit, level 0, owned by Valdoria');
    expect(label(unowned.id)).toBe('Orchard, fruit, level 0, not owned');
    expect(label(sea.id)).toBe('Sea');
    // FR-081: two farms next to the capital start at level 1, so two tiles share this name
    const farms = screen.getAllByRole('group', { name: 'Farm, grain, level 1, owned by Testland' });
    expect(farms.map((t) => t.getAttribute('data-tile-id'))).toContain('3-9');
    expect(farms).toHaveLength(2);
  });

  it('FR-095 the name is not drawn: the tile shows no terrain text', () => {
    const { container } = render(<MapView />);
    expect(container.querySelector('[data-tile-id="3-9"]')!.textContent).not.toMatch(/Farm|grain|Testland/);
  });
});

describe('FR-155 a minor nation\'s tile is named with the minor as its owner', () => {
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'continent' }), activeNationId: 'nation-1' });
  });

  it('FR-155 Arvelia\'s forest, hills and capital, Sundmark\'s capital; the Great Power names of FR-095 are unchanged', () => {
    const { container } = render(<MapView />);
    const label = (id: string) => container.querySelector(`[data-tile-id="${id}"]`)!.getAttribute('aria-label');
    expect(label('10-3')).toBe('Hardwood forest, timber, level 1, owned by Arvelia');
    expect(label('12-4')).toBe('Barren hills, iron ore, level 1, owned by Arvelia');
    expect(label('11-4')).toBe('Capital, owned by Arvelia');
    expect(label('12-9')).toBe('Capital, owned by Sundmark');
    expect(label('13-13')).toBe('Plantation, cotton, level 1, owned by Pellis');
    // FR-095 on the continent: the Great Power tiles keep their names
    expect(label('3-9')).toBe('Farm, grain, level 1, owned by Testland');
    expect(label('2-9')).toBe('Capital, owned by Testland');
    expect(label('14-9')).toBe('Capital, owned by Valdoria');
    expect(label('11-7')).toBe('Sea');
    // No minor tile is "not owned"
    const minorTiles = [...container.querySelectorAll('[data-testid="tile"]')].filter((t) => /owned by (Arvelia|Sundmark|Lorran|Pellis)$/.test(t.getAttribute('aria-label')!));
    expect(minorTiles).toHaveLength(12 + 5 + 4 + 5);
    expect([...container.querySelectorAll('[data-testid="tile"]')].filter((t) => /not owned$/.test(t.getAttribute('aria-label')!))).toEqual([]);
  });
});

// M12 (NR-033), lane L2. FR-388 (card Q88): the fort mark adds a title, not a name: the tile keeps its name (FR-095), and
// the mark's picture is decoration (alt "") inside a span with no role, outside the tab order.
describe('FR-388 the fort mark adds no name', () => {
  it('FR-388 FR-095 the capitals keep "Capital, owned by Testland" and "Capital, owned by Valdoria"; each mark is titled "Fort level 1", no image to a screen reader', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'continent' }), activeNationId: 'nation-1' });
    const { container } = render(<MapView />);
    const label = (id: string) => container.querySelector(`[data-tile-id="${id}"]`)!.getAttribute('aria-label');
    expect([label('2-9'), label('14-9')]).toEqual(['Capital, owned by Testland', 'Capital, owned by Valdoria']);
    const marks = screen.getAllByTitle('Fort level 1');
    expect(marks.map((m) => m.closest('[data-testid="tile"]')!.getAttribute('data-tile-id'))).toEqual(['2-9', '14-9']);
    for (const m of marks) {
      expect([m.getAttribute('role'), m.getAttribute('aria-label'), m.getAttribute('tabindex')]).toEqual([null, null, null]);
      expect(m.querySelector('img')!.getAttribute('alt')).toBe('');
    }
    expect(screen.queryAllByRole('img', { name: /fort/i })).toEqual([]);
  });
});

describe('FR-096 the browser tab title', () => {
  it('FR-096 layout.tsx titles the page "Imperialism"', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/title:\s*"Imperialism"/);
    expect(layout).not.toMatch(/Create Next App|create next app/);
  });
});
