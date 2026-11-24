// @vitest-environment jsdom
// FR-567 (M18b, owner 2026-11-23: "the map when I open the game is too small, the only way to zoom in is with browser zoom
// in but that changes also the size of the HUD"). The map opens at the zoom that fits its land (plus half a tile of sea)
// to the map area, never under 100% and never over 200%; under a 10% gain it stays at 100%, where the ink pictures are
// drawn (so 1280x720 keeps FR-088's camera 0, 0). Its own zoom: the buttons and keys (FR-368) step from any zoom, Ctrl and
// the wheel (a trackpad pinch is the same event) keep the point under the pointer, two fingers pinch. The top bar and the
// pane are outside the zoomed layer, so the map's zoom never resizes them. jsdom draws no zoom: sizes are in e2e/m18-map.spec.ts.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { TopBar } from '@/components/HUD/TopBar';
import { HUD } from '@/components/HUD';
import {
  FIT_MIN_GAIN,
  ZOOM_MAX,
  ZOOM_MIN,
  cameraAfterZoom,
  cameraOnTile,
  fitZoom,
  landBoxPx,
  mapAreaOf,
  mapOffset,
  openingView,
} from '@/components/camera';
import { nextZoom } from '@/hooks/useMapKeyboard';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import type { WorldId } from '@/types/World';

const AREA_1366 = mapAreaOf({ innerWidth: 1366, innerHeight: 768 });
const AREA_1920 = mapAreaOf({ innerWidth: 1920, innerHeight: 1080 });
const camera = () => ({ x: useGameStore.getState().cameraX, y: useGameStore.getState().cameraY });
const zoom = () => useGameStore.getState().zoom;
const gameOn = (world: WorldId) => newGame({ seed: 1, world });

describe('FR-567 the land box and the zoom that fits it', () => {
  it('FR-567 the land of both stock maps, with half a tile of sea round it, in map px at 100%', () => {
    // Two islands: land from column 2 (even rows, x 84) to column 22 (odd rows, 22 x 42 + 21 + 42 = 987), rows 1 to 13
    expect(landBoxPx(gameOn('two-islands').map)).toEqual({ x: 84 - 21, y: 42 - 21, width: 903 + 42, height: 546 + 42 });
    // The continent adds the minors in the channel; Pellis reaches row 14 (bottom 630)
    expect(landBoxPx(gameOn('continent').map)).toEqual({ x: 84 - 21, y: 42 - 21, width: 903 + 42, height: 588 + 42 });
  });

  it('FR-567 the fit zoom: whole pixels a tile, at least 100%, at most 200%, and 100% under a 10% gain', () => {
    expect([ZOOM_MIN, ZOOM_MAX, FIT_MIN_GAIN]).toEqual([1, 2, 1.1]);
    const continent = landBoxPx(gameOn('continent').map);
    const islands = landBoxPx(gameOn('two-islands').map);
    // 1366x768: 1116 x 728 over 945 x 630 is 1.156, floored to 48 px tiles; the islands 1.181, 49 px
    expect(fitZoom(AREA_1366, continent)).toBe(48 / 42);
    expect(fitZoom(AREA_1366, islands)).toBe(49 / 42);
    // 1920x1080: 1040 / 630 = 1.651, 69 px tiles
    expect(fitZoom(AREA_1920, continent)).toBe(69 / 42);
    // 2560x1440 would be 2.2: clamped to 200%
    expect(fitZoom(mapAreaOf({ innerWidth: 2560, innerHeight: 1440 }), continent)).toBe(2);
    // 1280x720 gains 7% (45 px tiles): not worth blurring the 42 px pictures, so 100% (FR-088 holds)
    expect(fitZoom(mapAreaOf({ innerWidth: 1280, innerHeight: 720 }), continent)).toBe(1);
    // Smaller than the land: never under 100%
    expect(fitZoom(mapAreaOf({ innerWidth: 1024, innerHeight: 768 }), continent)).toBe(1);
    expect(fitZoom(mapAreaOf({ innerWidth: 390, innerHeight: 844 }), continent)).toBe(1);
  });

  it('FR-567 the opening view at 1366x768 and 1920x1080 shows the whole land box inside the map area, filling most of it', () => {
    for (const world of ['continent', 'two-islands'] as const) {
      const game = gameOn(world);
      for (const area of [AREA_1366, AREA_1920]) {
        const view = openingView(game, 'nation-1', area);
        expect(view.zoom, `${world} ${area.width}`).toBeGreaterThan(1);
        const box = landBoxPx(game.map);
        const offset = mapOffset(area, game.map.config, view.zoom);
        const left = box.x * view.zoom + offset.x - view.camera.x;
        const top = box.y * view.zoom + offset.y - view.camera.y;
        expect(left, `${world} ${area.width}`).toBeGreaterThanOrEqual(-1);
        expect(top, `${world} ${area.width}`).toBeGreaterThanOrEqual(-1);
        expect(left + box.width * view.zoom, `${world} ${area.width}`).toBeLessThanOrEqual(area.width + 1);
        expect(top + box.height * view.zoom, `${world} ${area.width}`).toBeLessThanOrEqual(area.height + 1);
        // On its limiting axis the land box takes at least 90% of the area
        const share = Math.max((box.width * view.zoom) / area.width, (box.height * view.zoom) / area.height);
        expect(share, `${world} ${area.width}`).toBeGreaterThanOrEqual(0.9);
      }
    }
    // The continent at 1366x768, by hand: centre (535.5, 336) x 48/42 = (612, 384), less half the area (558, 364)
    expect(openingView(gameOn('continent'), 'nation-1', AREA_1366)).toEqual({ zoom: 48 / 42, camera: { x: 54, y: 20 } });
  });

  it('FR-567 where the land does not fit at 100% the map opens at 100% on the capital, as before (FR-083)', () => {
    const game = gameOn('continent');
    for (const area of [mapAreaOf({ innerWidth: 1024, innerHeight: 768 }), mapAreaOf({ innerWidth: 800, innerHeight: 450 }), mapAreaOf({ innerWidth: 390, innerHeight: 844 })]) {
      expect(openingView(game, 'nation-1', area)).toEqual({ zoom: 1, camera: cameraOnTile({ x: 2, y: 9 }, area, game.map.config, 1) });
    }
    // 1280x720: 100%, and the whole map fits, so the camera stays 0, 0 (FR-088)
    expect(openingView(game, 'nation-1', mapAreaOf({ innerWidth: 1280, innerHeight: 720 }))).toEqual({ zoom: 1, camera: { x: 0, y: 0 } });
  });

  it('FR-567 a zoom about a point keeps that point of the map under it; the middle is the default (FR-368)', () => {
    const config = { cols: 24, rows: 16 };
    const at = { x: 300, y: 200 };
    const before = { x: 54, y: 20 };
    const after = cameraAfterZoom(before, AREA_1366, config, 48 / 42, 1.5, at);
    // The map point under (300, 200): (54 + 300) / (48/42) = 309.75 and (20 + 200) / (48/42) = 192.5
    expect((after.x + at.x) / 1.5).toBeCloseTo(309.75, 0);
    expect((after.y + at.y) / 1.5).toBeCloseTo(192.5, 0);
    expect(cameraAfterZoom(before, AREA_1366, config, 48 / 42, 1.5)).toEqual(
      cameraAfterZoom(before, AREA_1366, config, 48 / 42, 1.5, { x: AREA_1366.width / 2, y: AREA_1366.height / 2 })
    );
  });

  it('FR-567 FR-368 the steps go to the next step past any zoom: 1.14 steps out to 100% and in to 150%', () => {
    expect([nextZoom(48 / 42, -1), nextZoom(48 / 42, 1)]).toEqual([1, 1.5]);
    expect([nextZoom(69 / 42, -1), nextZoom(69 / 42, 1)]).toEqual([1.5, 2]);
    expect([nextZoom(1, -1), nextZoom(1, 1), nextZoom(1.5, 1), nextZoom(2, 1)]).toEqual([undefined, 1.5, 2, undefined]);
  });
});

describe('FR-567 the map opens fitted and zooms on its own', () => {
  const saved = { innerWidth: window.innerWidth, innerHeight: window.innerHeight };
  beforeEach(() => {
    Object.assign(window, { innerWidth: 1366, innerHeight: 768 });
    useGameStore.setState({ ...useGameStore.getInitialState(), game: gameOn('continent'), activeNationId: 'nation-1', cameraX: 0, cameraY: 0 });
  });
  afterEach(() => {
    Object.assign(window, saved);
  });
  const zoomOf = () => screen.getByTestId('map-viewport').getAttribute('data-zoom');
  /** The map point (map px at 100%) under a point of the map area; the map is larger than the area here, so no offset. */
  const mapPointUnder = (p: { x: number; y: number }) => ({ x: (camera().x + p.x) / zoom(), y: (camera().y + p.y) / zoom() });

  it('FR-567 WHEN the map first shows at 1366x768 THEN it is drawn at the fit zoom on the land', () => {
    render(<MapView />);
    expect(zoomOf()).toBe(String(48 / 42));
    expect(camera()).toEqual({ x: 54, y: 20 });
    expect(screen.getByTestId('map-scroll').scrollLeft).toBe(54);
  });

  it('FR-567 Ctrl and the wheel zoom in about the pointer, keeping the map point under it; the plain wheel does not zoom (FR-364)', () => {
    render(<MapView />);
    const scroller = screen.getByTestId('map-scroll');
    const pointer = { x: 300, y: 200 };
    const under = mapPointUnder(pointer);
    fireEvent.wheel(scroller, { deltaY: 100 });
    expect(zoom()).toBe(48 / 42);
    const notCancelled = fireEvent.wheel(scroller, { deltaY: -100, ctrlKey: true, clientX: pointer.x, clientY: pointer.y });
    // Cancelled: the browser does not zoom the page (which would resize the HUD)
    expect(notCancelled).toBe(false);
    expect(zoom()).toBeGreaterThan(48 / 42);
    const now = mapPointUnder(pointer);
    expect(Math.abs(now.x - under.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(now.y - under.y)).toBeLessThanOrEqual(1);
  });

  it('FR-567 the wheel zoom is clamped to 100% and 200%', () => {
    render(<MapView />);
    const scroller = screen.getByTestId('map-scroll');
    for (let i = 0; i < 20; i++) fireEvent.wheel(scroller, { deltaY: -500, ctrlKey: true, clientX: 100, clientY: 100 });
    expect(zoom()).toBe(2);
    expect((screen.getByRole('button', { name: 'Zoom in' }) as HTMLButtonElement).disabled).toBe(true);
    for (let i = 0; i < 20; i++) fireEvent.wheel(scroller, { deltaY: 500, ctrlKey: true, clientX: 100, clientY: 100 });
    expect(zoom()).toBe(1);
    expect((screen.getByRole('button', { name: 'Zoom out' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('FR-567 two fingers pinch the map: half as far apart again zooms 1.5 times, about their midpoint', () => {
    render(<MapView />);
    const scroller = screen.getByTestId('map-scroll');
    const start = zoom();
    const under = mapPointUnder({ x: 400, y: 300 });
    fireEvent.touchStart(scroller, { touches: [{ clientX: 350, clientY: 300 }, { clientX: 450, clientY: 300 }] });
    const move = fireEvent.touchMove(scroller, { touches: [{ clientX: 325, clientY: 300 }, { clientX: 475, clientY: 300 }] });
    expect(move).toBe(false);
    expect(zoom()).toBeCloseTo(start * 1.5, 5);
    const now = mapPointUnder({ x: 400, y: 300 });
    expect(Math.abs(now.x - under.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(now.y - under.y)).toBeLessThanOrEqual(1);
    fireEvent.touchEnd(scroller, { touches: [] });
  });

  it('FR-567 the buttons step from the fit zoom: Zoom out to 100%, Zoom in to 150%', () => {
    render(<MapView />);
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' }) as HTMLButtonElement;
    expect(zoomOut.disabled).toBe(false);
    fireEvent.click(zoomOut);
    expect(zoomOf()).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(zoomOf()).toBe('1.5');
  });

  it('FR-567 the top bar and the pane lie outside the zoomed layer, so the map zoom never resizes them', () => {
    useGameStore.setState({ zoom: 2 });
    const { container } = render(
      <>
        <TopBar />
        <MapView />
        <HUD />
      </>
    );
    const zoomed = [...container.querySelectorAll<HTMLElement>('*')].filter((el) => ![undefined, ''].includes(el.style.zoom) || ![undefined, ''].includes(el.style.transform));
    expect(zoomed.map((el) => el.getAttribute('data-testid'))).toEqual(['map-viewport']);
    expect(screen.getByTestId('map-viewport').contains(screen.getByTestId('topbar'))).toBe(false);
    expect(screen.getByTestId('map-viewport').contains(container.querySelector('.hud-container'))).toBe(false);
  });
});

describe('FR-567 the top bar text stays readable', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/components/HUD/TopBar.module.css'), 'utf8');
  const px = (rule: string, prop: string) => Number(new RegExp(`${prop}:\\s*(\\d+)px`).exec(rule)?.[1]);

  it('FR-567 the bar\'s main values (turn, date, cash) are at least 14 px on lines that fit two in the 40 px bar', () => {
    const bar = /\.bar \{[^}]*\}/.exec(css)![0];
    expect(px(bar, 'font-size')).toBeGreaterThanOrEqual(14);
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const second = /\.cash-change \{[^}]*\}/.exec(globals)![0];
    expect(px(bar, 'line-height') + (px(second, 'line-height') || px(bar, 'line-height'))).toBeLessThanOrEqual(40);
  });
});
