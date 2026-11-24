// @vitest-environment jsdom
// FR-083: on the small map the camera opens on the capital and never shows space beyond the map.
// FR-088: at 42 px tiles the 24x16 map is 1,029 x 672 px (odd rows are shifted half a tile), so on a
// 1280x720 screen (map area 1030x680: left of the 250 px pane, under the 40 px top bar, FR-465) it fits and the camera
// stays at 0, 0. The camera rules are checked on an 800x450 screen (map area 550x370 under the 80 px two-row bar), too
// small for the map.
// FR-091: data-ready only once scrolled. FR-092: Center scrolls the map even when the store already agrees.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLayoutEffect, useRef } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { ActionButtons } from '@/components/HUD/index';
import { ZOOM_STEPS, cameraOnTile, clampCamera, mapAreaOf, mapOffset, mapSizePx } from '@/components/camera';
import { TopBar } from '@/components/HUD/TopBar';
import { TOPBAR_BREAKPOINT, TOPBAR_NARROW_PX, TOPBAR_PX, topBarPx } from '@/styles/theme';
import { useEdgeScroll } from '@/hooks/useEdgeScroll';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';

const CONFIG = { cols: 24, rows: 16 };
/** A map area smaller than the map, for the pure camera arithmetic (it takes an area, not a window). */
const SMALL = { width: 550, height: 450 };
/** The map area of an 800x450 window (FR-465): the 250 px pane at the right, the 80 px two-row top bar (below 1024 px of width) at the top. */
const AREA_800x450 = { width: 550, height: 370 };
const camera = () => ({ x: useGameStore.getState().cameraX, y: useGameStore.getState().cameraY });

describe('FR-083 camera arithmetic', () => {
  it('FR-088 the 24x16 map is 1,029 x 672 px at 42 px tiles; FR-465 the map area is the window less the pane and the top bar', () => {
    expect(mapSizePx(CONFIG)).toEqual({ width: 1029, height: 672 });
    // Re-recorded in M12b T1 (FR-465: the top bar takes the window's top 40 px from 1024 px of width, 80 px below):
    // 1280x720 {1030, 720} -> {1030, 680}; 800x450 {550, 450} -> {550, 370}; 200x100 {0, 100} -> {0, 20}
    expect(mapAreaOf({ innerWidth: 1280, innerHeight: 720 })).toEqual({ width: 1030, height: 680 });
    expect(mapAreaOf({ innerWidth: 800, innerHeight: 450 })).toEqual(AREA_800x450);
    expect(mapAreaOf({ innerWidth: 200, innerHeight: 100 })).toEqual({ width: 0, height: 20 });
    // New: the sizes of docs/specs/hud.md section 3, both sides of the breakpoint, and never a negative size
    expect(mapAreaOf({ innerWidth: 1920, innerHeight: 1080 })).toEqual({ width: 1670, height: 1040 });
    expect(mapAreaOf({ innerWidth: 1024, innerHeight: 768 })).toEqual({ width: 774, height: 728 });
    expect(mapAreaOf({ innerWidth: 1023, innerHeight: 768 })).toEqual({ width: 773, height: 688 });
    expect(mapAreaOf({ innerWidth: 390, innerHeight: 844 })).toEqual({ width: 140, height: 764 });
    expect(mapAreaOf({ innerWidth: 300, innerHeight: 50 })).toEqual({ width: 50, height: 0 });
  });

  it('FR-465 the top bar is 40 px high from 1024 px of window width (never taller than 48 px there) and 80 px, two rows, below', () => {
    expect([TOPBAR_PX, TOPBAR_NARROW_PX, TOPBAR_BREAKPOINT]).toEqual([40, 80, 1024]);
    expect(TOPBAR_PX).toBeLessThanOrEqual(48);
    expect([1920, 1280, 1024].map(topBarPx)).toEqual([40, 40, 40]);
    expect([1023, 800, 640, 390].map(topBarPx)).toEqual([80, 80, 80, 80]);
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

  // Re-recorded in M12b T1 (FR-465): y 174 -> 214 here and in the three tests below that open at 800x450. The window's
  // map area is 370 px high under the 80 px bar (was 450), so the capital's centre 399 sits at 399 - 185 (was 399 - 225).
  it('FR-083 WHEN the map first shows THEN the camera centres the capital 2-9 as far as the left edge allows', () => {
    render(<MapView />);
    expect(camera()).toEqual({ x: 0, y: 214 });
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
    expect(camera()).toEqual({ x: 0, y: 214 });
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
    expect(seen.find((s) => s.ready === 'true')?.scroll).toEqual({ x: 0, y: 214 });
    expect(seen.filter((s) => s.scroll.x !== s.camera.x || s.scroll.y !== s.camera.y)).toEqual([]);
  });

  it('FR-092 WHEN the stored camera already equals the capital but the map is scrolled elsewhere THEN Center still scrolls the map back', () => {
    render(<><MapView /><ActionButtons /></>);
    const scroller = screen.getByTestId('map-scroll');
    expect(camera()).toEqual({ x: 0, y: 214 });
    // The browser scrolled the map and the scroll event has not reached the store yet.
    scroller.scrollLeft = 479;
    scroller.scrollTop = 222;
    fireEvent.click(screen.getByTitle('Center Camera'));
    expect({ x: scroller.scrollLeft, y: scroller.scrollTop }).toEqual({ x: 0, y: 214 });
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

  /** A 800 x 600 map scroller with the top bar, the HUD (250 px) and a dialog beside it, as page.tsx lays them out. */
  function Page({ onMove }: { onMove: (dx: number, dy: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useEdgeScroll({ containerRef: ref, onMove, rightInset: 250 });
    return (
      <>
        <TopBar />
        <div ref={ref} data-testid="scroller">
          <div data-testid="tile" />
        </div>
        {/* M12b (card Q113): Advance Turn left the pane for the top bar; the pane's own controls are now its group
            buttons, so the stub is one of them (was <button>Advance Turn</button>, which the bar now also renders) */}
        <div data-edge-scroll="horizontal-only" data-testid="hud">
          <button>Details for bug reports</button>
        </div>
        <div data-testid="backdrop">
          <div role="dialog" data-testid="dialog" />
        </div>
      </>
    );
  }
  /** `top`: where the scroller starts; page.tsx's map scroller starts under the top bar (FR-465). */
  function setUp(top = 0) {
    const onMove = vi.fn();
    render(<Page onMove={onMove} />);
    const scroller = screen.getByTestId('scroller');
    scroller.getBoundingClientRect = () => ({ left: 0, top, right: 800, bottom: 600, width: 800, height: 600 - top, x: 0, y: top, toJSON: () => ({}) });
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
    fireEvent.mouseMove(screen.getByRole('button', { name: 'Details for bug reports' }), { clientX: 795, clientY: 595 });
    runFrames(3);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('FR-479 the top bar carries data-edge-scroll; over it at the window\'s top left (2, 20): no scroll in either direction', () => {
    const onMove = setUp(40);
    const bar = screen.getByTestId('topbar');
    expect(bar.hasAttribute('data-edge-scroll')).toBe(true);
    fireEvent.mouseMove(bar, { clientX: 2, clientY: 20 });
    runFrames(3);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('FR-479 the top edge is the map area\'s, under the bar: over the map within 20 px of the bar it scrolls up', () => {
    const onMove = setUp(40);
    fireEvent.mouseMove(screen.getByTestId('tile'), { clientX: 300, clientY: 45 });
    runFrames(1);
    expect(onMove).toHaveBeenLastCalledWith(0, -10);
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
    // Re-recorded in M12b T1 (FR-465): y 204 -> 184; the 1920x1080 area is 1670 x 1040 under the 40 px bar: (1040 - 672) / 2
    expect(mapOffset(mapAreaOf({ innerWidth: 1920, innerHeight: 1080 }), CONFIG)).toEqual({ x: 320, y: 184 });
    // 64 px spare stays, 65 px centres
    expect(mapOffset({ width: 1029 + 64, height: 672 + 65 }, CONFIG)).toEqual({ x: 0, y: 32 });
    // Too small: no offset (the camera scrolls instead)
    expect(mapOffset(SMALL, CONFIG)).toEqual({ x: 0, y: 0 });
  });

  it('FR-367 at 1920x1080 the map is drawn centred in the map area; FR-088 at 1280x720 it is not moved and the camera stays 0, 0', () => {
    screenOf(1920, 1080);
    const { unmount } = render(<MapView />);
    // FR-567: 1920x1080 opens at the fit zoom (69 px tiles: the map is larger than its area) -> zoom out to 100%, where it is small
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    const viewport = screen.getByTestId('map-viewport');
    // Re-recorded in M12b T1 (FR-465): 204px -> 184px, as above (the scroller itself starts under the bar)
    expect([viewport.style.marginLeft, viewport.style.marginTop]).toEqual(['320px', '184px']);
    // The sea past the map continues the ground's water texture from the map's origin (FR-340)
    expect(screen.getByTestId('map-scroll').style.backgroundPosition).toBe('320px 184px');
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

  // Re-recorded in M12b T1 (FR-465): (0, 174) -> (0, 214) and (138, 374) -> (138, 414). The 800x450 map area is 550 x 370
  // under the 80 px bar, so the middle lies 185 px below the camera (was 225); the middle point itself is unchanged.
  it('FR-368 the tile at the map area\'s middle stays in place: 800x450, camera (0, 214) at 100% -> (138, 414) at 150%', () => {
    render(<MapView />);
    expect(camera()).toEqual({ x: 0, y: 214 });
    // The middle (275, 399) in map px is (412.5, 598.5) at 150%: the camera puts it in the middle again
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(camera()).toEqual({ x: 138, y: 414 });
    expect(screen.getByTestId('map-scroll').scrollLeft).toBe(138);
    // And back: the same middle at 100%
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(camera()).toEqual({ x: 0, y: 214 });
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
    // M12b T1 (FR-465): the window's map area is AREA_800x450 now (it was SMALL, which equalled it before the top bar)
    expect(camera()).toEqual(cameraOnTile({ x: 2, y: 9 }, AREA_800x450, CONFIG, 1.5));
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

  // Name moved (M12b QA fix round, FR-532, old -> new): "over the HUD" -> "beside the HUD": the line now ends at the pane's
  // left edge (right: var(--hud-width), tests/ui/hudQa.test.tsx), so it no longer covers Tile Info's Close tile info. Its
  // z-index (20, still checked here) keeps it over the map's marks and under the dialogs.
  it('FR-429 the line shows only below 700 px of width (CSS), over the map beside the HUD and under the dialogs; FR-479 under the top bar', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'src/app/components/MapView.module.css'), 'utf8');
    const rule = css.slice(css.indexOf('.narrowWindow {'), css.indexOf('}', css.indexOf('.narrowWindow {')));
    expect(rule).toMatch(/display: none;/);
    expect(rule).toMatch(/z-index: 20;/);
    // FR-479: drawn from the bar's bottom (80 px below 1024 px of width), not over the bar's turn, cash and score
    expect(rule).toMatch(/top: var\(--topbar-height\);/);
    expect(rule).not.toMatch(/top: 0;/);
    const media = css.indexOf('@media (max-width: 699.98px) {');
    expect(media).toBeGreaterThanOrEqual(0);
    expect(css.slice(media, css.indexOf('\n}', media))).toMatch(/\.narrowWindow \{[^}]*display: flex;/);
  });
});

// M12b (NR-034), task T1. FR-465: the frame. A top bar across the window's top (40 px from 1024 px of width, 80 px below),
// the 250 px right pane under it, and the map scroller under it too, so the map area is the window less both (mapAreaOf,
// above). jsdom draws no layout: the rules that place them are read here; the boxes are measured in e2e (FR-367, FR-090).
describe('FR-465 the frame: top bar, the right pane under it, the map under it', () => {
  const ROOT = join(__dirname, '..', '..');
  const ruleOf = (file: string, selector: string) => {
    const css = readFileSync(join(ROOT, file), 'utf8');
    const at = css.indexOf(`${selector} {`);
    expect(at, `${file} ${selector}`).toBeGreaterThanOrEqual(0);
    return css.slice(at, css.indexOf('}', at));
  };

  it('FR-465 the top bar shell: a header with the test ids topbar, topbar-status and topbar-actions, marked data-edge-scroll (FR-479)', () => {
    render(<TopBar />);
    const bar = screen.getByTestId('topbar');
    expect(bar.tagName).toBe('HEADER');
    expect(bar.hasAttribute('data-edge-scroll')).toBe(true);
    expect([...bar.children].map((c) => c.getAttribute('data-testid'))).toEqual(['topbar-status', 'topbar-actions']);
  });

  // Pin moved (M12b review LP-1, old -> new): "z 10, under the FR-429 line" -> "z 30, over the pane (10) and the FR-429
  // line (20), under the dialogs (60 and up)". At z 10, before the pane in the page, the pane was drawn over what hangs
  // from the bar: the score's parts below 1024 px (measured at 800x600: the popover's bottom right under the pane). The
  // bar and the line never overlap (the line starts at the bar's bottom, FR-479), so only what hangs from the bar moves up.
  it('FR-465 the bar spans the window\'s top at --topbar-height, over the pane and the FR-429 line, under the dialogs (z 30)', () => {
    const rule = ruleOf('src/app/components/HUD/TopBar.module.css', '.bar');
    expect(rule).toMatch(/position: absolute;/);
    expect(rule).toMatch(/top: 0;/);
    expect(rule).toMatch(/left: 0;/);
    expect(rule).toMatch(/right: 0;/);
    expect(rule).toMatch(/height: var\(--topbar-height\);/);
    expect(rule).toMatch(/box-sizing: border-box;/);
    expect(rule).toMatch(/z-index: 30;/);
  });

  it('FR-465 the right pane starts under the bar and ends at the window\'s bottom', () => {
    const rule = ruleOf('src/app/globals.css', '.hud-container');
    expect(rule).toMatch(/top: var\(--topbar-height\);/);
    expect(rule).toMatch(/height: calc\(100% - var\(--topbar-height\)\);/);
    expect(rule).toMatch(/width: var\(--hud-width\);/);
  });

  it('FR-465 the map scroller is drawn from the bar\'s bottom: margin-top and height take the bar\'s height off the window', () => {
    const rule = ruleOf('src/app/components/MapView.module.css', '.container');
    expect(rule).toMatch(/margin-top: var\(--topbar-height\);/);
    expect(rule).toMatch(/height: calc\(100vh - var\(--topbar-height\)\);/);
  });

  // Pin moved (M12b QA fix round, FR-535, old -> new): "the top bar after the map, before the HUD" -> "the top bar before
  // the map, the map before the HUD". After the map, Tab met about eight map stops before the bar's score and Advance
  // Turn, while the bar is what the eye meets first. The bar is placed by its own CSS (absolute, z-index 30), so the
  // order changes no box (e2e/m13-hud.spec.ts measures them).
  it('FR-465 FR-535 page.tsx mounts the top bar before the map, and the map before the HUD', () => {
    const page = readFileSync(join(ROOT, 'src/app/page.tsx'), 'utf8');
    expect(page).toMatch(/import \{ TopBar \} from '\.\/components\/HUD\/TopBar';/);
    expect(page.indexOf('<TopBar />')).toBeGreaterThanOrEqual(0);
    expect(page.indexOf('<TopBar />')).toBeLessThan(page.indexOf('<MapView />'));
    expect(page.indexOf('<MapView />')).toBeLessThan(page.indexOf('<HUD />'));
  });
});
