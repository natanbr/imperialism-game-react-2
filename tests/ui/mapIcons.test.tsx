// @vitest-environment jsdom
// FR-085 (NR-008): each land tile shows one icon for what it holds, the sea none; level badges; the
// worker buttons' icons. Moved unchanged from tests/ui/icons.test.tsx in M11 lane 1, so the map lane
// can rewrite these for the pack's pictures (FR-322 to FR-325) without touching icons.test.tsx.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { RESOURCE_ICONS, TERRAIN_ICONS, UI_ICONS, WORKER_ICONS, tileIconOf } from '@/components/icons';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';

const N = 'nation-1';
const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N, ...ui });
const tileOf = (game: GameState, id: string): Tile => game.map.tiles.flat().find((t) => t.id === id)!;

describe('FR-085 what a tile shows', () => {
  const game = newGame({ seed: 1 });

  it('FR-085 the icon of what the tile holds: capital, known resource, else terrain; nothing on the sea', () => {
    expect(tileIconOf(tileOf(game, '2-9'))).toBe(UI_ICONS.capital);
    expect(tileIconOf(tileOf(game, '3-9'))).toBe(RESOURCE_ICONS.grain); // farm
    expect(tileIconOf(tileOf(game, '3-8'))).toBe(RESOURCE_ICONS.fruit); // orchard
    expect(tileIconOf(tileOf(game, '1-9'))).toBeNull(); // sea
    // Barren hills hide their coal until prospected, then show it.
    const hills = tileOf(game, '5-2');
    expect(hills.resource).toMatchObject({ type: ResourceType.Coal, discovered: false });
    expect(tileIconOf(hills)).toBe(TERRAIN_ICONS.barrenHills);
    expect(tileIconOf({ ...hills, resource: { ...hills.resource!, discovered: true } })).toBe(RESOURCE_ICONS.coal);
    expect(tileIconOf({ terrain: TerrainType.Town })).toBe(UI_ICONS.town);
    expect(tileIconOf({ terrain: TerrainType.Mountains })).toBe(TERRAIN_ICONS.mountains);
  });

  it('FR-085 on the new map every land tile shows exactly one icon, the sea none, the capital its own', () => {
    show(game);
    const { container, unmount } = render(<MapView />);
    const tiles = [...container.querySelectorAll('[data-testid="tile"]')];
    expect(tiles).toHaveLength(24 * 16);
    const wrong = tiles.filter((el) => {
      const icons = el.querySelectorAll('[data-testid="tile-icon"]').length;
      return el.getAttribute('data-terrain') === TerrainType.Water ? icons !== 0 : icons !== 1;
    });
    expect(wrong.map((el) => el.getAttribute('data-tile-id'))).toEqual([]);
    const capitalIcon = container.querySelector('[data-tile-id="2-9"] [data-testid="tile-icon"]');
    expect(capitalIcon?.getAttribute('data-icon')).toBe(UI_ICONS.capital);
    expect(container.querySelector('[data-tile-id="3-9"] [data-testid="tile-icon"]')?.getAttribute('data-icon')).toBe(RESOURCE_ICONS.grain);
    expect(container.querySelector('[data-tile-id="5-2"] [data-testid="tile-icon"]')?.getAttribute('data-icon')).toBe(TERRAIN_ICONS.barrenHills);
    unmount();
  });

  it('FR-085 a resource at level 1 shows the badge "L1"; level 0 shows none', () => {
    show(game);
    const { container, unmount } = render(<MapView />);
    const badge = (id: string) => container.querySelector(`[data-tile-id="${id}"] [data-testid="level-badge"]`);
    expect(tileOf(game, '3-9').resource?.level).toBe(1);
    expect(badge('3-9')?.textContent).toBe('L1');
    expect(tileOf(game, '7-5').resource?.level).toBe(0);
    expect(badge('7-5')).toBeNull();
    unmount();
  });

  // FR-110 (a): the capital's seven civilians are one stack button until the tile is selected, then a tray
  it('FR-085 FR-110 workers are buttons with their Game Icon', () => {
    show(game, { selectedTileId: '2-9' });
    const { container, unmount } = render(<MapView />);
    const buttons = [...container.querySelectorAll('[data-tile-id="2-9"] [data-testid="worker-button"]')];
    expect(buttons).toHaveLength(7);
    for (const b of buttons) {
      const type = b.getAttribute('data-worker-type') as WorkerType;
      expect(b.querySelector('svg')?.getAttribute('data-icon')).toBe(WORKER_ICONS[type]);
    }
    unmount();
  });
});
