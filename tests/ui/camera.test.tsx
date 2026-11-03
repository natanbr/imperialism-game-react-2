// @vitest-environment jsdom
// FR-083: on the small map the camera opens on the capital and never shows space beyond the map.
// The numbers are for a 1280x720 screen: the map area left of the 250 px HUD is 1030x720, and the
// 24x16 map at 100 px tiles is 2,450 x 1,600 px (odd rows are shifted half a tile).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { ActionButtons } from '@/components/HUD/index';
import { cameraOnTile, clampCamera, mapAreaOf, mapSizePx } from '@/components/camera';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';

const CONFIG = { cols: 24, rows: 16 };
const SCREEN = { width: 1030, height: 720 };
const camera = () => ({ x: useGameStore.getState().cameraX, y: useGameStore.getState().cameraY });

describe('FR-083 camera arithmetic', () => {
  it('FR-083 the 24x16 map is 2,450 x 1,600 px at 100 px tiles; the map area is the window left of the HUD', () => {
    expect(mapSizePx(CONFIG)).toEqual({ width: 2450, height: 1600 });
    expect(mapAreaOf({ innerWidth: 1280, innerHeight: 720 })).toEqual(SCREEN);
    expect(mapAreaOf({ innerWidth: 200, innerHeight: 100 })).toEqual({ width: 0, height: 100 });
  });

  it('FR-083 a tile in the middle of the map is centred in the map area', () => {
    // Tile 12-8 (even row) has its centre at 1,250 x 850 px.
    expect(cameraOnTile({ x: 12, y: 8 }, SCREEN, CONFIG)).toEqual({ x: 1250 - 515, y: 850 - 360 });
    // Tile 11-7 (odd row, shifted 50 px) has its centre at 1,200 x 750 px.
    expect(cameraOnTile({ x: 11, y: 7 }, SCREEN, CONFIG)).toEqual({ x: 1200 - 515, y: 750 - 360 });
  });

  it('FR-083 near an edge the camera stops at the edge instead of showing space beyond the map', () => {
    // The capital 2-9 is 300 px from the left edge: centring it would show 215 px of nothing.
    expect(cameraOnTile({ x: 2, y: 9 }, SCREEN, CONFIG)).toEqual({ x: 0, y: 590 });
    // The far corner: the camera stops where the map's last column and row touch the HUD and the screen bottom.
    expect(cameraOnTile({ x: 23, y: 15 }, SCREEN, CONFIG)).toEqual({ x: 2450 - 1030, y: 1600 - 720 });
    expect(clampCamera({ x: -40, y: 5000 }, SCREEN, CONFIG)).toEqual({ x: 0, y: 880 });
    // A map smaller than the screen stays at the top left.
    expect(cameraOnTile({ x: 3, y: 3 }, { width: 3000, height: 2000 }, CONFIG)).toEqual({ x: 0, y: 0 });
  });
});

describe('FR-083 the map opens on the capital, and Center brings it back', () => {
  const saved = { innerWidth: window.innerWidth, innerHeight: window.innerHeight };
  beforeEach(() => {
    Object.assign(window, { innerWidth: 1280, innerHeight: 720 });
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1', cameraX: 0, cameraY: 0 });
  });
  afterEach(() => {
    Object.assign(window, saved);
  });

  it('FR-083 WHEN the map first shows THEN the camera centres the capital 2-9 as far as the left edge allows', () => {
    render(<MapView />);
    expect(camera()).toEqual({ x: 0, y: 590 });
  });

  it('FR-083 the map is moved by scrolling its container, not by a transform, so the browser keeps it inside the map', () => {
    const { getByTestId } = render(<MapView />);
    const scroller = getByTestId('map-scroll');
    expect(scroller.querySelector('[style*="transform"]')).toBeNull();
  });

  it('FR-083 WHEN the player presses Center THEN the camera centres the capital again', () => {
    render(<ActionButtons />);
    useGameStore.getState().setCamera(1400, 800);
    fireEvent.click(screen.getByTitle('Center Camera'));
    expect(camera()).toEqual({ x: 0, y: 590 });
  });
});
