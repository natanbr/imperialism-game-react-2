// @vitest-environment jsdom
// FR-153 (M5): the map draws (a) the Great Power borders as before, (b) a dotted line between two
// provinces of the same owner, (c) each minor nation's border dashed in --color-minor, and (d) the
// minor's name on its capital tile beside the capital icon. A new continent game shows 2 Great Power
// borders, 8 Great Power provinces and 4 minor names; two-islands (no provinces, no minors) is as before.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, within } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { minorBorderSegments, provinceBorderSegments, territoryBorderSegments } from '@/components/territoryBorders';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { getNeighborCoords } from '@/engine/map/mapHelpers';
import { NATION_COLORS, THEME } from '@/styles/theme';
import type { GameState } from '@/types/GameState';
import type { Tile } from '@/types/Tile';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const ROOT = join(__dirname, '..', '..');
const continent = newGame({ seed: 1, world: 'continent' });
const twoIslands = newGame({ seed: 1, world: 'two-islands' });
const show = (g: GameState) => useGameStore.setState({ ...useGameStore.getInitialState(), game: g, activeNationId: 'nation-1' });
const tileAt = (g: GameState, x: number, y: number): Tile => g.map.tiles[y][x];
const byId = (g: GameState, id: string): Tile => g.map.tiles.flat().find((t) => t.id === id)!;
const ownerOf = (g: GameState, t: Tile) => g.provinces.find((p) => p.id === t.provinceId)?.ownerId;
const css = readFileSync(join(ROOT, 'src/app/components/MapView.module.css'), 'utf8');
const rule = (name: string) => new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
const dashArray = (body: string) => /stroke-dasharray:\s*([^;]+);/.exec(body)?.[1].trim().split(/[\s,]+/).map(Number);

const MINOR_CAPITALS = [
  ['minor-1', 'Arvelia', '11-4'],
  ['minor-2', 'Sundmark', '12-9'],
  ['minor-3', 'Lorran', '11-1'],
  ['minor-4', 'Pellis', '12-13'],
] as const;

describe('FR-153 (b) province borders', () => {
  const segments = provinceBorderSegments(continent.map, continent.provinces);

  it('FR-153 every dotted side lies between two tiles of the same owner in two different provinces, each side once', () => {
    expect(segments.length).toBeGreaterThan(0);
    for (const s of segments) {
      const a = byId(continent, s.tileId);
      const b = tileAt(continent, s.neighbour.x, s.neighbour.y);
      expect(a.provinceId).toBeDefined();
      expect(b.provinceId).toBeDefined();
      expect(a.provinceId).not.toBe(b.provinceId);
      expect(ownerOf(continent, a)).toBe(ownerOf(continent, b));
      expect(s.ownerId).toBe(ownerOf(continent, a));
    }
    const sides = segments.map((s) => [s.tileId, `${s.neighbour.x}-${s.neighbour.y}`].sort().join('|'));
    expect(new Set(sides).size).toBe(sides.length);
    // Only the two Great Powers hold more than one province at the start (each minor is one, FR-147)
    expect([...new Set(segments.map((s) => s.ownerId))].sort()).toEqual(['nation-1', 'nation-2']);
  });

  it('FR-153 the dotted lines cut each Great Power island into its 4 provinces: 8 regions, each one province', () => {
    const cut = new Set(segments.map((s) => [s.tileId, `${s.neighbour.x}-${s.neighbour.y}`].sort().join('|')));
    const land = continent.map.tiles.flat().filter((t) => t.ownerNationId);
    const seen = new Set<string>();
    const regions: Set<string>[] = [];
    for (const start of land) {
      if (seen.has(start.id)) continue;
      const region = new Set<string>([start.id]);
      const queue = [start];
      seen.add(start.id);
      while (queue.length) {
        const t = queue.pop()!;
        for (const [nx, ny] of getNeighborCoords(continent.map, t.x, t.y)) {
          const n = tileAt(continent, nx, ny);
          if (n.ownerNationId !== t.ownerNationId || seen.has(n.id)) continue;
          if (cut.has([t.id, n.id].sort().join('|'))) continue;
          seen.add(n.id);
          region.add(n.id);
          queue.push(n);
        }
      }
      regions.push(region);
    }
    expect(regions).toHaveLength(8);
    const provincesOfRegion = regions.map((r) => new Set([...r].map((id) => byId(continent, id).provinceId)));
    expect(provincesOfRegion.every((p) => p.size === 1)).toBe(true);
    expect(new Set(provincesOfRegion.map((p) => [...p][0])).size).toBe(8);
  });

  it('FR-153 two-islands has no provinces, so no dotted line', () => {
    expect(provinceBorderSegments(twoIslands.map, twoIslands.provinces)).toEqual([]);
  });
});

describe('FR-153 (c) minor nation borders', () => {
  const segments = minorBorderSegments(continent.map, continent.provinces, continent.minorNations);

  it('FR-153 each minor is outlined where its land meets the sea, another country or the map edge, never between two of its own tiles', () => {
    expect([...new Set(segments.map((s) => s.minorId))].sort()).toEqual(['minor-1', 'minor-2', 'minor-3', 'minor-4']);
    for (const s of segments) {
      const tile = byId(continent, s.tileId);
      expect(ownerOf(continent, tile)).toBe(s.minorId);
      if (s.neighbour) expect(ownerOf(continent, tileAt(continent, s.neighbour.x, s.neighbour.y))).not.toBe(s.minorId);
    }
    // Sundmark: 5 tiles in a column of the island in the middle channel, each with 6 sides
    const sundmark = continent.map.tiles.flat().filter((t) => ownerOf(continent, t) === 'minor-2');
    const inner = sundmark.reduce(
      (sum, t) => sum + getNeighborCoords(continent.map, t.x, t.y).filter(([x, y]) => ownerOf(continent, tileAt(continent, x, y)) === 'minor-2').length,
      0
    );
    expect(segments.filter((s) => s.minorId === 'minor-2')).toHaveLength(6 * sundmark.length - inner);
  });

  it('FR-153 Arvelia, the land bridge, is outlined on its sides toward Testland (10-4 / 9-4) and Valdoria (13-4 / 14-4)', () => {
    const side = (tileId: string, x: number, y: number) =>
      segments.find((s) => s.tileId === tileId && s.neighbour?.x === x && s.neighbour?.y === y);
    expect(side('10-4', 9, 4)).toMatchObject({ minorId: 'minor-1' });
    expect(side('13-4', 14, 4)).toMatchObject({ minorId: 'minor-1' });
    // The Great Power border is unchanged there: Testland's tile 9-4 draws its side toward Arvelia
    const gp = territoryBorderSegments(continent.map, continent.nations);
    expect(gp.find((s) => s.tileId === '9-4' && s.neighbour?.x === 10 && s.neighbour?.y === 4)).toMatchObject({ nationId: 'nation-1' });
  });

  it('FR-153 two-islands has no minor nation, so no minor border', () => {
    expect(minorBorderSegments(twoIslands.map, twoIslands.provinces, twoIslands.minorNations)).toEqual([]);
  });

  it('FR-153 a minor differs from a Great Power by line shape too: minor dashed, province dotted, Great Power solid', () => {
    expect(dashArray(rule('territoryBorder'))).toBeUndefined();
    const minor = dashArray(rule('minorBorder'))!;
    expect(minor).toHaveLength(2);
    expect(minor[0]).toBeGreaterThanOrEqual(4);
    expect(minor[1]).toBeGreaterThan(0);
    // Dots: zero-length dashes with round caps
    const province = dashArray(rule('provinceBorder'))!;
    expect(province[0]).toBe(0);
    expect(province[1]).toBeGreaterThan(0);
    expect(rule('provinceBorder')).toMatch(/stroke-linecap:\s*round/);
  });
});

describe('FR-153 MapView on a new continent game', () => {
  it('FR-153 (a) to (c) 2 Great Power borders in slot colours, 2 dotted province paths, 4 dashed minor borders in --color-minor', () => {
    show(continent);
    const { container, unmount } = render(<MapView />);
    const paths = (id: string) => [...container.querySelectorAll(`[data-testid="${id}"]`)];

    const gp = paths('territory-border');
    expect(gp).toHaveLength(2);
    expect(gp.map((b) => b.getAttribute('stroke'))).toEqual([NATION_COLORS[0], NATION_COLORS[1]]);

    const provinces = paths('province-border');
    expect(provinces.map((p) => p.getAttribute('data-owner-id'))).toEqual(['nation-1', 'nation-2']);
    expect(provinces.every((p) => p.getAttribute('stroke') === THEME.provinceBorder)).toBe(true);

    const minors = paths('minor-border');
    expect(minors.map((p) => p.getAttribute('data-minor-id'))).toEqual(['minor-1', 'minor-2', 'minor-3', 'minor-4']);
    expect(minors.every((p) => p.getAttribute('stroke') === THEME.minor)).toBe(true);
    expect([...provinces, ...minors, ...gp].every((p) => p.tagName.toLowerCase() === 'path' && (p.getAttribute('d') ?? '').length > 0)).toBe(true);
    unmount();
  });

  it('FR-153 (d) each minor capital shows the capital icon and the minor\'s name; no other tile shows a name', () => {
    show(continent);
    const { container, unmount } = render(<MapView />);
    for (const [, name, tileId] of MINOR_CAPITALS) {
      const tile = container.querySelector(`[data-tile-id="${tileId}"]`) as HTMLElement;
      expect(tile.getAttribute('data-terrain')).toBe('capital');
      expect(within(tile).getByTestId('tile-icon').getAttribute('data-icon')).toBe('GiCapitol');
      expect(within(tile).getByTestId('minor-name').textContent).toBe(name);
    }
    const names = [...container.querySelectorAll('[data-testid="minor-name"]')];
    expect(names.map((n) => n.textContent)).toEqual(['Lorran', 'Arvelia', 'Sundmark', 'Pellis']);
    // The Great Power capitals carry no name label
    for (const id of ['2-9', '14-9']) expect(container.querySelector(`[data-tile-id="${id}"] [data-testid="minor-name"]`)).toBeNull();
    unmount();
  });

  it('FR-153 FR-159 on two-islands the map draws the 2 Great Power borders only, as before M5', () => {
    show(twoIslands);
    const { container, unmount } = render(<MapView />);
    expect(container.querySelectorAll('[data-testid="territory-border"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="province-border"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="minor-border"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="minor-name"]')).toHaveLength(0);
    unmount();
  });
});
