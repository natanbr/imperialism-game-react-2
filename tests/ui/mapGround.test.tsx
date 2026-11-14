// @vitest-environment jsdom
// M11 (NR-032). FR-321: the map's ground is one SVG behind the tile rows, a TypeScript port of the pack demo's shoreline
// (terrain-renderer.js renderShoreline): deep water with open-water.png, a band of shallows, a sand rim and the land with
// grass-base.png through three rounded masks of the land (no edge extension), desert and tundra 48 px patches with a soft
// edge; textures repeat at their own 512 px from the map's origin; colours only through the ground tokens (FR-329); ids
// unique per instance; built once per land and water pattern, so End Turn, a selection and a scroll keep the same node.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { MapGround } from '@/components/map/MapGround';
import { groundSignature, isLandTerrain, shorelineLayout } from '@/components/map/shoreline';
import { GROUND_ART, GROUND_ART_PX } from '@/components/art/inkArt';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { THEME, TILE_PX } from '@/styles/theme';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const ROOT = join(__dirname, '..', '..');
const N = 'nation-1';
const show = (game: GameState) => useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N });
const withTiles = (game: GameState, patches: Record<string, Partial<Tile>>): GameState => ({
  ...game,
  map: { ...game.map, tiles: game.map.tiles.map((row) => row.map((t) => (patches[t.id] ? { ...t, ...patches[t.id] } : t))) },
});
const groundCss = readFileSync(join(ROOT, 'src/app/components/map/MapGround.module.css'), 'utf8');
const mapCss = readFileSync(join(ROOT, 'src/app/components/MapView.module.css'), 'utf8');
const rule = (source: string, name: string) => new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';
const SEA = new Set<string>([TerrainType.Water, TerrainType.River, TerrainType.Coast]);
/** The element an `url(#id)` or `#id` reference names, inside the given SVG only. */
const refOf = (svg: Element, ref: string) => {
  const id = /^(?:url\()?#([^)]+)\)?$/.exec(ref)?.[1];
  return id ? [...svg.querySelectorAll('[id]')].find((el) => el.id === id) : undefined;
};
const continent = newGame({ seed: 1, world: 'continent' });

describe('FR-321 the ground SVG', () => {
  it('FR-321 one ground SVG, first in the map viewport behind the rows: aria-hidden, no pointer events, 1029 x 672, isolated', () => {
    show(continent);
    const { container, unmount } = render(<MapView />);
    const grounds = screen.getAllByTestId('map-ground');
    expect(grounds).toHaveLength(1);
    const ground = grounds[0];
    expect(ground.tagName.toLowerCase()).toBe('svg');
    expect(ground.getAttribute('aria-hidden')).toBe('true');
    expect([ground.getAttribute('width'), ground.getAttribute('height')]).toEqual(['1029', '672']);
    const viewport = container.querySelector('[data-testid="tile"]')!.parentElement!.parentElement!;
    expect(ground.parentElement).toBe(viewport);
    expect(viewport.firstElementChild).toBe(ground);
    const body = rule(groundCss, 'ground');
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/pointer-events:\s*none/);
    expect(body).toMatch(/contain:\s*strict/);
    expect(body).toMatch(/will-change:\s*transform/);
    expect(Number(/z-index:\s*(-?\d+)/.exec(body)?.[1])).toBe(0);
    // No inline transform inside the scroller (FR-083, camera.test.tsx)
    expect(screen.getByTestId('map-scroll').querySelector('[style*="transform"]')).toBeNull();
    unmount();
  });

  it('FR-321 deep water, shallows, sand and grass in that order, the last three through rounded masks of the land', () => {
    show(continent);
    const { unmount } = render(<MapView />);
    const ground = screen.getByTestId('map-ground');
    const layers = [...ground.children].filter((el) => el.tagName.toLowerCase() !== 'defs');
    const fills = (el: Element) => [el, ...el.querySelectorAll('*')].map((e) => e.getAttribute('fill')).filter(Boolean);
    expect(layers.map((el) => ({ fills: fills(el).map((f) => (f!.startsWith('url(') ? refOf(ground, f!)?.tagName.toLowerCase() : f)), masked: el.getAttribute('mask') !== null }))).toEqual([
      { fills: [THEME.groundWater], masked: false },
      { fills: ['pattern'], masked: false },
      { fills: [THEME.groundShallows], masked: true },
      { fills: [THEME.groundSand], masked: true },
      { fills: [THEME.groundGrass, 'pattern'], masked: true },
    ]);
    // Each mask uses the land cells through its filter: dilate (shallows, sand), blur, a steep alpha ramp (the demo's numbers)
    const masks = layers.slice(2).map((el) => refOf(ground, el.getAttribute('mask')!)!);
    const radii = masks.map((mask) => {
      expect(mask.tagName.toLowerCase()).toBe('mask');
      const use = mask.querySelector('use')!;
      const cells = refOf(ground, use.getAttribute('href')!)!;
      expect(cells.querySelectorAll('rect').length).toBe(226);
      const filter = refOf(ground, use.getAttribute('filter')!)!;
      expect(filter.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')).toBe(String(TILE_PX / 6.5));
      const ramp = filter.querySelector('feFuncA')!;
      expect([ramp.getAttribute('type'), ramp.getAttribute('slope'), ramp.getAttribute('intercept')]).toEqual(['linear', '7', '-3']);
      return filter.querySelector('feMorphology')?.getAttribute('radius') ?? null;
    });
    expect(radii).toEqual([String(TILE_PX * 0.16), String(TILE_PX * 0.075), null]);
    unmount();
  });

  it('FR-321 the textures are 512 px patterns from the map origin (never stretched), from the table', () => {
    show(continent);
    const { unmount } = render(<MapView />);
    const ground = screen.getByTestId('map-ground');
    const patterns = [...ground.querySelectorAll('pattern')].map((p) => {
      const image = p.querySelector('image')!;
      return {
        units: p.getAttribute('patternUnits'),
        box: [p.getAttribute('x'), p.getAttribute('y'), p.getAttribute('width'), p.getAttribute('height')],
        href: image.getAttribute('href'),
        image: [image.getAttribute('width'), image.getAttribute('height'), image.getAttribute('preserveAspectRatio')],
      };
    });
    const px = String(GROUND_ART_PX);
    expect(patterns).toEqual(
      [GROUND_ART.water, GROUND_ART.grass].map((href) => ({ units: 'userSpaceOnUse', box: ['0', '0', px, px], href, image: [px, px, null] }))
    );
    // Only the pack's textures: no other image in the ground (the continent has no desert or tundra)
    expect([...ground.querySelectorAll('image')].map((i) => i.getAttribute('href'))).toEqual([GROUND_ART.water, GROUND_ART.grass]);
    unmount();
  });

  it('FR-321 FR-329 no colour literal in its markup: every fill is a ground token, a pattern or none', () => {
    const game = withTiles(continent, { '3-9': { terrain: TerrainType.Desert, resource: undefined }, '3-8': { terrain: TerrainType.Tundra, resource: undefined } });
    show(game);
    const { unmount } = render(<MapView />);
    const html = screen.getByTestId('map-ground').outerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(html).not.toMatch(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i);
    const tokens = new Set([THEME.groundWater, THEME.groundShallows, THEME.groundSand, THEME.groundGrass, THEME.groundDesert, THEME.groundTundra]);
    const colours = [...html.matchAll(/(?:fill|stroke|stop-color|flood-color)="([^"]*)"/g)].map((m) => m[1]);
    expect(colours.filter((c) => !tokens.has(c) && c !== 'none' && !/^url\(#[^)]+\)$/.test(c))).toEqual([]);
    unmount();
  });

  it('FR-321 mask, filter and pattern ids are unique per instance and every reference resolves inside its own ground', () => {
    const signature = groundSignature(continent.map.tiles);
    const { container } = render(
      <>
        <MapGround signature={signature} />
        <MapGround signature={signature} />
      </>
    );
    const [a, b] = [...container.querySelectorAll('[data-testid="map-ground"]')];
    const ids = (svg: Element) => [...svg.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids(a).length).toBeGreaterThan(5);
    expect(new Set(ids(a)).size).toBe(ids(a).length);
    expect(ids(a).filter((id) => ids(b).includes(id))).toEqual([]);
    for (const svg of [a, b]) {
      const refs = [...svg.outerHTML.matchAll(/(?:url\(#([^)]+)\)|href="#([^"]+)")/g)].map((m) => m[1] ?? m[2]);
      expect(refs.length).toBeGreaterThan(5);
      expect(refs.filter((id) => !ids(svg).includes(id))).toEqual([]);
    }
  });

  it('FR-321 the same DOM node with the same markup after End Turn, a tile selection and a scroll', () => {
    show(continent);
    const { unmount } = render(<MapView />);
    const ground = screen.getByTestId('map-ground');
    const html = ground.outerHTML;
    const map = useGameStore.getState().game.map;
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().game.turn).toBe(2);
    expect(useGameStore.getState().game.map).not.toBe(map);
    act(() => useGameStore.getState().selectTile('3-9'));
    const scroller = screen.getByTestId('map-scroll');
    act(() => {
      scroller.scrollLeft = 30;
      scroller.scrollTop = 20;
      fireEvent.scroll(scroller);
    });
    expect(useGameStore.getState().cameraX).toBe(30);
    expect(screen.getByTestId('map-ground')).toBe(ground);
    expect(ground.outerHTML).toBe(html);
    unmount();
  });

  it('FR-321 a desert or tundra tile adds its base texture as a 48 px patch with a soft edge; none without one', () => {
    show(continent);
    const first = render(<MapView />);
    expect(screen.getByTestId('map-ground').querySelectorAll('[data-ground-patch]')).toHaveLength(0);
    first.unmount();

    const desert = continent.map.tiles[9][3];
    const tundra = continent.map.tiles[8][3];
    show(withTiles(continent, { [desert.id]: { terrain: TerrainType.Desert, resource: undefined }, [tundra.id]: { terrain: TerrainType.Tundra, resource: undefined } }));
    const { unmount } = render(<MapView />);
    const ground = screen.getByTestId('map-ground');
    const patches = [...ground.querySelectorAll('[data-ground-patch]')];
    const origin = (t: Tile) => ({ x: t.x * TILE_PX + (t.y % 2) * (TILE_PX / 2), y: t.y * TILE_PX });
    expect(
      patches.map((p) => {
        const rects = [...p.querySelectorAll('rect')];
        const fill = rects[1].getAttribute('fill')!;
        return {
          kind: p.getAttribute('data-ground-patch'),
          box: rects.map((r) => [r.getAttribute('x'), r.getAttribute('y'), r.getAttribute('width'), r.getAttribute('height')].map(Number)),
          colour: rects[0].getAttribute('fill'),
          texture: refOf(ground, fill)?.querySelector('image')?.getAttribute('href'),
          soft: refOf(ground, p.getAttribute('mask')!)?.querySelector('rect')?.getAttribute('fill')?.startsWith('url(#'),
        };
      })
    ).toEqual(
      [
        [tundra, 'tundra', THEME.groundTundra, GROUND_ART.tundra],
        [desert, 'desert', THEME.groundDesert, GROUND_ART.desert],
      ].map(([t, kind, colour, texture]) => {
        const o = origin(t as Tile);
        const box = [o.x - 3, o.y - 3, 48, 48];
        return { kind, box: [box, box], colour, texture, soft: true };
      })
    );
    // The soft edge is a radial fade: full inside half the radius, transparent at the edge
    const mask = refOf(ground, patches[0].getAttribute('mask')!)!;
    const fade = refOf(ground, mask.querySelector('rect')!.getAttribute('fill')!)!;
    expect(fade.tagName).toBe('radialGradient');
    expect([...fade.querySelectorAll('stop')].map((s) => [s.getAttribute('offset'), s.getAttribute('stop-opacity')])).toEqual([
      ['0.5', '1'],
      ['1', '0'],
    ]);
    unmount();
  });

  it('FR-321 tiles have no background colour of their own; past the map the scroller shows the deep water', () => {
    show(continent);
    const { container, unmount } = render(<MapView />);
    const tiles = [...container.querySelectorAll('[data-testid="tile"]')] as HTMLElement[];
    expect(tiles.filter((t) => t.style.backgroundColor !== '' || t.style.background !== '')).toEqual([]);
    // The faint grid line stays (FR-087)
    expect(tiles.every((t) => t.style.border === tiles[0].style.border && t.style.border !== '')).toBe(true);
    expect(rule(mapCss, 'container')).toMatch(/background:\s*var\(--color-ground-water\)/);
    unmount();
  });
});

describe('FR-321 shoreline.ts, the port of renderShoreline', () => {
  it('FR-321 land is every terrain but water, river and coast', () => {
    const sea = Object.values(TerrainType).filter((t) => !isLandTerrain(t));
    expect(sea.sort()).toEqual([...SEA].sort());
  });

  it('FR-321 the land and water pattern changes with a tile turning land, water, desert or tundra, and with nothing else', () => {
    const base = groundSignature(continent.map.tiles);
    expect(base.split('/')).toHaveLength(16);
    expect(base.split('/').every((row) => row.length === 24)).toBe(true);
    const sig = (patch: Partial<Tile>) => groundSignature(withTiles(continent, { '3-9': patch }).map.tiles);
    expect(sig({ ownerNationId: 'nation-2' })).toBe(base);
    expect(sig({ resource: { type: ResourceType.Grain, level: 3 } })).toBe(base);
    expect(sig({ workers: [] , depot: true, connected: true })).toBe(base);
    expect(sig({ terrain: TerrainType.Orchard })).toBe(base);
    expect(sig({ terrain: TerrainType.Water })).not.toBe(base);
    expect(sig({ terrain: TerrainType.Desert })).not.toBe(base);
    expect(sig({ terrain: TerrainType.Tundra })).not.toBe(base);
    expect(sig({ terrain: TerrainType.Desert })).not.toBe(sig({ terrain: TerrainType.Tundra }));
  });

  it('FR-321 the layout: one 42 px cell per land tile on the brick grid, no edge extension, the demo\'s mask numbers', () => {
    const layout = shorelineLayout(groundSignature(continent.map.tiles));
    expect([layout.width, layout.height]).toEqual([24 * 42 + 21, 16 * 42]);
    const land = continent.map.tiles.flat().filter((t) => !SEA.has(t.terrain));
    expect(layout.cells).toEqual(land.map((t) => ({ x: t.x * 42 + (t.y % 2) * 21, y: t.y * 42, width: 42, height: 42 })));
    // The map is whole, not a crop: nothing lies outside it
    expect(layout.cells.filter((c) => c.x < 0 || c.y < 0 || c.x + c.width > layout.width || c.y + c.height > layout.height)).toEqual([]);
    expect(layout.masks).toEqual([
      { name: 'shallows', expansion: 42 * 0.16 },
      { name: 'sand', expansion: 42 * 0.075 },
      { name: 'land', expansion: 0 },
    ]);
    expect(layout.blur).toBe(42 / 6.5);
    expect(layout.patches).toEqual([]);
  });
});
