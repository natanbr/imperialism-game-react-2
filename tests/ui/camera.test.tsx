// @vitest-environment jsdom
// FR-083: on the small map the camera opens on the capital and never shows space beyond the map.
// FR-088: at 42 px tiles the 24x16 map is 1,029 x 672 px (odd rows are shifted half a tile), so on a
// 1280x720 screen (map area 1030x720 left of the 250 px HUD) it fits and the camera stays at 0, 0.
// The camera rules are checked on an 800x450 screen (map area 550x450), too small for the map.
// FR-091: data-ready only once scrolled. FR-092: Center scrolls the map even when the store already agrees.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLayoutEffect, useRef } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { ActionButtons } from '@/components/HUD/index';
import { ZOOM_STEPS, cameraOnTile, clampCamera, mapAreaOf, mapOffset, mapSizePx } from '@/components/camera';
import { useEdgeScroll } from '@/hooks/useEdgeScroll';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';

const CONFIG = { cols: 24, rows: 16 };
const SMALL = { width: 550, height: 450 };
const camera = () => ({ x: useGameStore.getState().cameraX, y: useGameStore.getState().cameraY });

describe('FR-083 camera arithmetic', () => {
  it('FR-088 the 24x16 map is 1,029 x 672 px at 42 px tiles; FR-083 the map area is the window left of the HUD', () => {
    expect(mapSizePx(CONFIG)).toEqual({ width: 1029, height: 672 });
    expect(mapAreaOf({ innerWidth: 1280, innerHeight: 720 })).toEqual({ width: 1030, height: 720 });
    expect(mapAreaOf({ innerWidth: 800, innerHeight: 450 })).toEqual(SMALL);
    expect(mapAreaOf({ innerWidth: 200, innerHeight: 100 })).toEqual({ width: 0, height: 100 });
  });

  it('FR-083 a tile in the middle of the map is centred in the map area', () => {
    // Tile 12-8 (even row) has its centre at 525 x 357 px.
    expect(cameraOnTile({ x: 12, y: 8 }, SMALL, CONFIG)).toEqual({ x: 525 - 275, y: 357 - 225 });
    // Tile 11-7 (odd row, shifted 21 px) has its centre at 504 x 315 px.
    expect(cameraOnTile({ x: 11, y: 7 }, SMALL, CONFIG)).toEqual({ x: 504 - 275, y: 315 - 225 });
  });

  it('FR-083 near an edge the camera stops at the edge instead of showing space beyond the map', () => {
    // The capital 2-9 is 126 px from the left edge: centring it would show 149 px of nothing.
    expect(cameraOnTile({ x: 2, y: 9 }, SMALL, CONFIG)).toEqual({ x: 0, y: 399 - 225 });
    // The far corner: the camera stops where the map's last column and row touch the HUD and the screen bottom.
    expect(cameraOnTile({ x: 23, y: 15 }, SMALL, CONFIG)).toEqual({ x: 1029 - 550, y: 672 - 450 });
    expect(clampCamera({ x: -40, y: 5000 }, SMALL, CONFIG)).toEqual({ x: 0, y: 222 });
  });

  it('FR-088 on a 1280x720 screen the whole map fits, so every tile gives the camera 0, 0', () => {
    const area = mapAreaOf({ innerWidth: 1280, innerHeight: 720 });
    expect(cameraOnTile({ x: 2, y: 9 }, area, CONFIG)).toEqual({ x: 0, y: 0 });
    expect(cameraOnTile({ x: 23, y: 15 }, area, CONFIG)).toEqual({ x: 0, y: 0 });
  });
});

describe('FR-083 the map opens on the capital, and Center brings it back', () => {
  const saved = { innerWidth: window.innerWidth, innerHeight: window.innerHeight };
  const screenOf = (innerWidth: number, innerHeight: number) => Object.assign(window, { innerWidth, innerHeight });
  beforeEach(() => {
    screenOf(800, 450);
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1', cameraX: 0, cameraY: 0 });
  });
  afterEach(() => {
    Object.assign(window, saved);
  });

  it('FR-083 WHEN the map first shows THEN the camera centres the capital 2-9 as far as the left edge allows', () => {
    render(<MapView />);
    expect(camera()).toEqual({ x: 0, y: 174 });
  });

  it('FR-088 WHEN the map first shows on 1280x720 THEN the camera stays at 0, 0: the whole map is in view', () => {
    screenOf(1280, 720);
    useGameStore.getState().setCamera(300, 200);
    render(<MapView />);
    expect(camera()).toEqual({ x: 0, y: 0 });
  });

  it('FR-083 the map is moved by scrolling its container, not by a transform, so the browser keeps it inside the map', () => {
    const { getByTestId } = render(<MapView />);
    const scroller = getByTestId('map-scroll');
    expect(scroller.querySelector('[style*="transform"]')).toBeNull();
  });

  it('FR-083 WHEN the player presses Center THEN the camera centres the capital again', () => {
    render(<ActionButtons />);
    useGameStore.getState().setCamera(479, 222);
    fireEvent.click(screen.getByTitle('Center Camera'));
    expect(camera()).toEqual({ x: 0, y: 174 });
  });

  it('FR-091 in every commit the container is already scrolled to the stored camera, so data-ready never shows with the old scroll', () => {
    // A sibling after MapView reads the container in its layout effect: that runs in the same commit
    // as MapView's layout effects but before any passive effect, which is when a reader like an e2e
    // poll can first see the new DOM.
    const seen: { camera: { x: number; y: number }; scroll: { x: number; y: number }; ready: string | null }[] = [];
    const Probe = () => {
      const x = useGameStore((s) => s.cameraX);
      const y = useGameStore((s) => s.cameraY);
      useLayoutEffect(() => {
        const el = document.querySelector('[data-testid="map-scroll"]')!;
        seen.push({ camera: { x, y }, scroll: { x: el.scrollLeft, y: el.scrollTop }, ready: el.getAttribute('data-ready') });
      });
      return null;
    };
    render(<><MapView /><Probe /></>);
    expect(seen.find((s) => s.ready === 'true')?.scroll).toEqual({ x: 0, y: 174 });
    expect(seen.filter((s) => s.scroll.x !== s.camera.x || s.scroll.y !== s.camera.y)).toEqual([]);
  });

  it('FR-092 WHEN the stored camera already equals the capital but the map is scrolled elsewhere THEN Center still scrolls the map back', () => {
    render(<><MapView /><ActionButtons /></>);
    const scroller = screen.getByTestId('map-scroll');
    expect(camera()).toEqual({ x: 0, y: 174 });
    // The browser scrolled the map and the scroll event has not reached the store yet.
    scroller.scrollLeft = 479;
    scroller.scrollTop = 222;
    fireEvent.click(screen.getByTitle('Center Camera'));
    expect({ x: scroller.scrollLeft, y: scroller.scrollTop }).toEqual({ x: 0, y: 174 });
  });
});

// M12 (NR-033). FR-364: the wheel and a trackpad scroll the map, FR-365: a finger pans it: both are the map scroller's
// native scrolling, so its overflow is scrollable (it was hidden: only edge scrolling moved it, UIV-02) and no scrollbar
// is drawn over the map. The scrolling itself is checked in the running app (e2e/m12-map.spec.ts); here the rule that
// makes it possible.
describe('FR-364 FR-365 the map scroller scrolls natively, without a drawn scrollbar', () => {
  const css = readFileSync(join(__dirname, '..', '..', 'src/app/components/MapView.module.css'), 'utf8');
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return css.slice(at, css.indexOf('}', at));
  };

  it('FR-364 the container scrolls (overflow auto), so the wheel, Shift and the wheel and a sideways swipe move the camera', () => {
    expect(rule('.container')).toMatch(/overflow:\s*auto;/);
    expect(rule('.container')).not.toMatch(/overflow:\s*hidden/);
  });

  it('FR-364 no scrollbar is drawn over the map (standard and WebKit rules)', () => {
    expect(rule('.container')).toMatch(/scrollbar-width:\s*none;/);
    expect(rule('.container::-webkit-scrollbar')).toMatch(/display:\s*none;/);
  });

  it('FR-365 a finger pans the map: the scroller takes touch panning (no touch-action that blocks it)', () => {
    expect(rule('.container')).toMatch(/touch-action:\s*pan-x pan-y;/);
  });
});

// FR-366 (UIV-03): edge scrolling runs only while the pointer is over the map: not over the HUD (marked
// data-edge-scroll="horizontal-only", where only the vertical part stopped before) or a dialog, and not after the pointer
// left the window. The right edge is the map area's, left of the HUD.
describe('FR-366 edge scrolling only over the map', () => {
  let frames: FrameRequestCallback[] = [];
  const runFrames = (n: number) => {
    for (let i = 0; i < n; i++) {
      const due = frames;
      frames = [];
      due.forEach((f) => f(0));
    }
  };
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = [];
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** A 800 x 600 map scroller with the HUD (250 px) and a dialog beside it, as page.tsx lays them out. */
  function Page({ onMove }: { onMove: (dx: number, dy: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useEdgeScroll({ containerRef: ref, onMove, rightInset: 250 });
    return (
      <>
        <div ref={ref} data-testid="scroller">
          <div data-testid="tile" />
        </div>
        <div data-edge-scroll="horizontal-only" data-testid="hud">
          <button>Advance Turn</button>
        </div>
        <div data-testid="backdrop">
          <div role="dialog" data-testid="dialog" />
        </div>
      </>
    );
  }
  function setUp() {
    const onMove = vi.fn();
    render(<Page onMove={onMove} />);
    const scroller = screen.getByTestId('scroller');
    scroller.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) });
    return onMove;
  }

  it('FR-083 over the map at the left edge it scrolls left, every frame (unchanged)', () => {
    const onMove = setUp();
    fireEvent.mouseMove(screen.getByTestId('tile'), { clientX: 5, clientY: 300 });
    runFrames(3);
    expect(onMove).toHaveBeenCalledTimes(3);
    expect(onMove).toHaveBeenLastCalledWith(-10, 0);
  });

  it('FR-366 over the HUD at the window\'s right edge: no scroll in either direction', () => {
    const onMove = setUp();
    fireEvent.mouseMove(screen.getByRole('button', { name: 'Advance Turn' }), { clientX: 795, clientY: 595 });
    runFrames(3);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('FR-366 over a dialog at an edge: no scroll', () => {
    const onMove = setUp();
    fireEvent.mouseMove(screen.getByTestId('dialog'), { clientX: 5, clientY: 5 });
    fireEvent.mouseMove(screen.getByTestId('backdrop'), { clientX: 5, clientY: 300 });
    runFrames(3);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('FR-366 the right edge is the map area\'s, beside the HUD: over the map within 20 px of the HUD it scrolls right', () => {
    const onMove = setUp();
    fireEvent.mouseMove(screen.getByTestId('tile'), { clientX: 540, clientY: 300 });
    runFrames(1);
    expect(onMove).toHaveBeenLastCalledWith(10, 0);
  });

  it('FR-366 moving from the edge onto the HUD stops a running scroll', () => {
    const onMove = setUp();
    fireEvent.mouseMove(screen.getByTestId('tile'), { clientX: 5, clientY: 300 });
    runFrames(1);
    fireEvent.mouseMove(screen.getByTestId('hud'), { clientX: 700, clientY: 300 });
    runFrames(3);
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('FR-366 after the pointer left the window (mouseout to nowhere, or the window lost the focus) no scroll runs on', () => {
    const onMove = setUp();
    fireEvent.mouseMove(screen.getByTestId('tile'), { clientX: 5, clientY: 300 });
    runFrames(1);
    fireEvent.mouseOut(screen.getByTestId('tile'), { clientX: -1, clientY: 300, relatedTarget: null });
    runFrames(3);
    expect(onMove).toHaveBeenCalledTimes(1);

    fireEvent.mouseMove(screen.getByTestId('tile'), { clientX: 5, clientY: 300 });
    runFrames(1);
    fireEvent.blur(window);
    runFrames(3);
    expect(onMove).toHaveBeenCalledTimes(2);
  });
});

// FR-367 (UIV-10, card Q84): a map smaller than the map area by more than 64 px on an axis is centred on that axis; with
// 64 px or less to spare it stays at the top left, so at 1280x720 (1 px and 48 px to spare) nothing moves (FR-088).
describe('FR-367 a small map is centred', () => {
  const saved = { innerWidth: window.innerWidth, innerHeight: window.innerHeight };
  const screenOf = (innerWidth: number, innerHeight: number) => Object.assign(window, { innerWidth, innerHeight });
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
  });
  afterEach(() => {
    Object.assign(window, saved);
  });

  it('FR-367 the offset: half the spare space on an axis with more than 64 px spare, else 0', () => {
    expect(mapOffset(mapAreaOf({ innerWidth: 1280, innerHeight: 720 }), CONFIG)).toEqual({ x: 0, y: 0 });
    expect(mapOffset(mapAreaOf({ innerWidth: 1920, innerHeight: 1080 }), CONFIG)).toEqual({ x: 320, y: 204 });
    // 64 px spare stays, 65 px centres
    expect(mapOffset({ width: 1029 + 64, height: 672 + 65 }, CONFIG)).toEqual({ x: 0, y: 32 });
    // Too small: no offset (the camera scrolls instead)
    expect(mapOffset(SMALL, CONFIG)).toEqual({ x: 0, y: 0 });
  });

  it('FR-367 at 1920x1080 the map is drawn centred in the map area; FR-088 at 1280x720 it is not moved and the camera stays 0, 0', () => {
    screenOf(1920, 1080);
    const { unmount } = render(<MapView />);
    const viewport = screen.getByTestId('map-viewport');
    expect([viewport.style.marginLeft, viewport.style.marginTop]).toEqual(['320px', '204px']);
    // The sea past the map continues the ground's water texture from the map's origin (FR-340)
    expect(screen.getByTestId('map-scroll').style.backgroundPosition).toBe('320px 204px');
    unmount();

    screenOf(1280, 720);
    render(<MapView />);
    expect([screen.getByTestId('map-viewport').style.marginLeft, screen.getByTestId('map-viewport').style.marginTop]).toEqual(['', '']);
    expect(camera()).toEqual({ x: 0, y: 0 });
  });
});

// FR-368 (UIV-10, card Q84): three zoom steps, 100%, 150% and 200%, with two buttons at the map area's bottom left and the
// keys "+" and "-" (not in a field, not while a dialog is open), keeping the tile at the map area's middle in place. The
// map is zoomed as one layer (CSS zoom on the map's viewport), so tiles, rail, borders, marks and arrows stay together;
// 100% draws today's 42 px tiles. jsdom draws no zoom: the step is read from data-zoom here, the boxes in e2e/m12-map.spec.ts.
describe('FR-368 zoom', () => {
  const saved = { innerWidth: window.innerWidth, innerHeight: window.innerHeight };
  beforeEach(() => {
    Object.assign(window, { innerWidth: 800, innerHeight: 450 });
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1', cameraX: 0, cameraY: 0 });
  });
  afterEach(() => {
    Object.assign(window, saved);
  });
  const zoomOf = () => screen.getByTestId('map-viewport').getAttribute('data-zoom');

  it('FR-368 the steps and the arithmetic: the map is 1.5 and 2 times as large; the camera is clamped to the zoomed map', () => {
    expect(ZOOM_STEPS).toEqual([1, 1.5, 2]);
    expect(mapSizePx(CONFIG, 1.5)).toEqual({ width: 1543.5, height: 1008 });
    expect(mapSizePx(CONFIG, 2)).toEqual({ width: 2058, height: 1344 });
    expect(clampCamera({ x: 5000, y: 5000 }, SMALL, CONFIG, 2)).toEqual({ x: 2058 - 550, y: 1344 - 450 });
    // The capital 2-9 at 200%: its centre 2 x (84 + 21 + 21, 378 + 21) = (252, 798), so the left edge stops the camera
    expect(cameraOnTile({ x: 2, y: 9 }, SMALL, CONFIG, 2)).toEqual({ x: 0, y: 798 - 225 });
  });

  it('FR-368 100% at the start; Zoom in to 150% and 200% (then disabled), Zoom out back (disabled at 100%)', () => {
    render(<MapView />);
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    expect(zoomOf()).toBe('1');
    expect((zoomOut as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(zoomIn);
    expect(zoomOf()).toBe('1.5');
    fireEvent.click(zoomIn);
    expect(zoomOf()).toBe('2');
    expect((zoomIn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(zoomOut);
    fireEvent.click(zoomOut);
    expect(zoomOf()).toBe('1');
    expect((zoomOut as HTMLButtonElement).disabled).toBe(true);
  });

  it('FR-368 the tile at the map area\'s middle stays in place: 800x450, camera (0, 174) at 100% -> (138, 374) at 150%', () => {
    render(<MapView />);
    expect(camera()).toEqual({ x: 0, y: 174 });
    // The middle (275, 399) in map px is (412.5, 598.5) at 150%: the camera puts it in the middle again
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(camera()).toEqual({ x: 138, y: 374 });
    expect(screen.getByTestId('map-scroll').scrollLeft).toBe(138);
    // And back: the same middle at 100%
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(camera()).toEqual({ x: 0, y: 174 });
  });

  it('FR-368 the keys "+" and "-" zoom, but not from a form field or while a dialog is open', () => {
    render(
      <>
        <MapView />
        <input aria-label="field" />
      </>
    );
    fireEvent.keyDown(document.body, { key: '+' });
    expect(zoomOf()).toBe('1.5');
    fireEvent.keyDown(document.body, { key: '-' });
    expect(zoomOf()).toBe('1');
    fireEvent.keyDown(screen.getByLabelText('field'), { key: '+' });
    expect(zoomOf()).toBe('1');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    fireEvent.keyDown(document.body, { key: '+' });
    expect(zoomOf()).toBe('1');
    dialog.remove();
  });

  it('FR-368 FR-083 Center at 150% centres the capital on the zoomed map', () => {
    render(<><MapView /><ActionButtons /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    useGameStore.getState().setCamera(0, 0);
    fireEvent.click(screen.getByTitle('Center Camera'));
    expect(camera()).toEqual(cameraOnTile({ x: 2, y: 9 }, SMALL, CONFIG, 1.5));
  });
});

// M12 (NR-033), lane L2. FR-429 (UIV-12, card Q96): below 700 px of width the map screen holds one dismissable line saying
// the game is made for a wider window; the map still pans by touch (FR-365, above).
describe('FR-429 a narrow window is told', () => {
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
  });

  it('FR-429 the map screen holds the line "Imperialism is made for a window at least 1024 px wide."; Dismiss removes it', () => {
    render(<MapView />);
    const note = screen.getByTestId('narrow-window');
    expect(note.querySelector('span')?.textContent).toBe('Imperialism is made for a window at least 1024 px wide.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('narrow-window')).toBeNull();
  });

  it('FR-429 the line shows only below 700 px of width (CSS), over the HUD and under the dialogs', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'src/app/components/MapView.module.css'), 'utf8');
    const rule = css.slice(css.indexOf('.narrowWindow {'), css.indexOf('}', css.indexOf('.narrowWindow {')));
    expect(rule).toMatch(/display: none;/);
    expect(rule).toMatch(/z-index: 20;/);
    const media = css.indexOf('@media (max-width: 699.98px) {');
    expect(media).toBeGreaterThanOrEqual(0);
    expect(css.slice(media, css.indexOf('\n}', media))).toMatch(/\.narrowWindow \{[^}]*display: flex;/);
  });
});
