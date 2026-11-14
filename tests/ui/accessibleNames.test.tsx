// @vitest-environment jsdom
// M3.5 review fix round. FR-093: depots and ports name their state ("Depot: connected") and show it by
// shape as well as colour. FR-095: every tile has an accessible name (terrain, resource and level,
// owner) now that the terrain text is no longer drawn. FR-096: the browser tab says "Imperialism". FR-324 (M11): the depot
// and port are the pack's pictures with its station marks, the state still by shape and in the name. FR-347 (QA, replaces
// FR-324's 14 px row with 8 px marks and FR-345): 20 px in the top-right corner, 11 px marks on their top-right, a depot
// and a port always stacked.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { TileInfrastructure } from '@/components/Tile/TileInfrastructure';
import tileStyles from '@/components/Tile/Tile.module.css';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { TerrainType } from '@/types/Tile';

const ROOT = join(__dirname, '..', '..');

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
    const css = readFileSync(join(ROOT, 'src/app/components/Tile/Tile.module.css'), 'utf8');
    expect(css).not.toMatch(/\.status(Dot|On|Off)\b/);
  });

  it('FR-347 the depot and the port stand in the top-right corner, 1 px in, at 20 px, each mark 11 px on its top-right', () => {
    const css = readFileSync(join(ROOT, 'src/app/components/Tile/Tile.module.css'), 'utf8');
    const rule = (name: string) => new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    const px = (body: string, prop: string) => Number(new RegExp(`(?:^|[;\\s])${prop}:\\s*(-?[\\d.]+)px`).exec(body)?.[1]);
    expect([px(rule('stations'), 'top'), px(rule('stations'), 'right')]).toEqual([1, 1]);
    expect(rule('stations')).toMatch(/flex-direction:\s*column/);
    expect([px(rule('station'), 'width'), px(rule('station'), 'height'), px(rule('stationPicture'), 'width'), px(rule('stationPicture'), 'height')]).toEqual([20, 20, 20, 20]);
    expect([px(rule('stationMark'), 'width'), px(rule('stationMark'), 'height'), px(rule('stationMark'), 'right'), px(rule('stationMark'), 'top')]).toEqual([11, 11, -1, -1]);
    expect(rule('stationMark')).not.toMatch(/bottom:/);
    // Clear of the level badge and the job markers below it, both from x 1 at the top-left (the badge's "L3" is 13 px wide,
    // e2e/look.spec.ts measures it): the stations start 40 - 1 - 20 = 19 px from the content box's left
    const left = 40 - px(rule('stations'), 'right') - px(rule('station'), 'width');
    expect(left).toBeGreaterThan(px(rule('levelBadge'), 'left') + 13);
    expect(px(rule('jobs'), 'left') + 10).toBeLessThan(left);
    const { container } = render(<TileInfrastructure depot depotActive port portActive />);
    expect([...container.querySelectorAll('[role="img"]')].map((s) => s.getAttribute('aria-label'))).toEqual(['Depot: connected', 'Port: connected']);
  });

  it('FR-347 a depot and a port on one tile always stack, the depot on top: side by side they would pass the 40 px box', () => {
    const css = readFileSync(join(ROOT, 'src/app/components/Tile/Tile.module.css'), 'utf8');
    // FR-345's stacked case is the only case now: its class and the badge condition are gone
    expect(css).not.toMatch(/\.stationsStacked\b/);
    expect(1 + 20 + 1 + 20).toBeGreaterThan(40);
    const two = render(<TileInfrastructure depot depotActive port portActive />).container;
    const stations = two.firstElementChild!;
    expect(stations.className).toBe(tileStyles.stations);
    expect([...stations.children].map((s) => s.getAttribute('aria-label')?.split(':')[0])).toEqual(['Depot', 'Port']);
  });

  // Review R3, QA: the wiring in Tile.tsx, on hand-built tiles drawn by the map: a badge or not, the same column
  it('FR-347 on the map: a level-1 farm and a level-0 tile with a depot and a port both stack them, the depot on top', () => {
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
    expect(tile(level0.id).querySelector('[data-testid="level-badge"]')).toBeNull();
    for (const id of ['3-9', level0.id]) {
      expect([...stations(id).children].map((s) => s.getAttribute('aria-label')?.split(':')[0])).toEqual(['Depot', 'Port']);
      expect(stations(id).className).toBe(tileStyles.stations);
    }
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

describe('FR-096 the browser tab title', () => {
  it('FR-096 layout.tsx titles the page "Imperialism"', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/title:\s*"Imperialism"/);
    expect(layout).not.toMatch(/Create Next App|create next app/);
  });
});
