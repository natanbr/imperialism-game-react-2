// @vitest-environment jsdom
// FR-083: on the small map the camera opens on the capital and never shows space beyond the map.
// FR-088: at 42 px tiles the 24x16 map is 1,029 x 672 px (odd rows are shifted half a tile), so on a
// 1280x720 screen (map area 1030x720 left of the 250 px HUD) it fits and the camera stays at 0, 0.
// The camera rules are checked on an 800x450 screen (map area 550x450), too small for the map.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { ActionButtons } from '@/components/HUD/index';
import { cameraOnTile, clampCamera, mapAreaOf, mapSizePx } from '@/components/camera';
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
});
