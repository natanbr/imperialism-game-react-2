// @vitest-environment jsdom
// FR-084, FR-085 (NR-008): Game Icons for every terrain, resource and worker type; each land tile
// shows one icon for what it holds, the sea none; level badges; depot and port lights; no emoji on the
// map, in the HUD or in the dialogs.
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import * as gi from 'react-icons/gi';
import Home from '@/page';
import { MapView } from '@/components/MapView';
import { GI, RESOURCE_ICONS, TERRAIN_ICONS, UI_ICONS, WORKER_ICONS, tileIconOf, type IconName } from '@/components/icons';
import { useGameStore } from '@/store/rootStore';
import { newGame, resolveTurn } from '@/engine';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import pkg from '../../package.json';

const N = 'nation-1';
const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N, ...ui });
const tileOf = (game: GameState, id: string): Tile => game.map.tiles.flat().find((t) => t.id === id)!;
const isGameIcon = (name: IconName) => typeof gi[name as keyof typeof gi] === 'function' && GI[name] === gi[name as keyof typeof gi];

describe('FR-084 icon set: Game Icons through react-icons/gi', () => {
  it('FR-084 react-icons is pinned to an exact version', () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['react-icons']).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('FR-084 every terrain type has a Game Icon', () => {
    expect(Object.keys(TERRAIN_ICONS).sort()).toEqual(Object.values(TerrainType).sort());
    for (const name of Object.values(TERRAIN_ICONS)) expect(isGameIcon(name), name).toBe(true);
  });

  it('FR-084 every resource type has a Game Icon', () => {
    expect(Object.keys(RESOURCE_ICONS).sort()).toEqual(Object.values(ResourceType).sort());
    for (const name of Object.values(RESOURCE_ICONS)) expect(isGameIcon(name), name).toBe(true);
  });

  it('FR-084 every worker type has a Game Icon', () => {
    expect(Object.keys(WORKER_ICONS).sort()).toEqual(Object.values(WorkerType).sort());
    for (const name of Object.values(WORKER_ICONS)) expect(isGameIcon(name), name).toBe(true);
  });

  it('FR-084 the capital, infrastructure, job markers and actions have Game Icons', () => {
    // FR-109 New game and FR-110 the civilians' stack are HUD and map actions too; FR-177 the Diplomacy screen; FR-195 the Deal Book;
    // FR-210 the army markers (Imp1 encampment tents) and their militia; FR-212 the Armoury
    const wanted = ['capital', 'town', 'depot', 'port', 'prospecting', 'development', 'construction', 'warehouse', 'market', 'transport', 'center', 'advanceTurn', 'finalScores', 'about', 'newGame', 'civilians', 'diplomacy', 'dealBook', 'army', 'militia', 'armoury'];
    expect(Object.keys(UI_ICONS).sort()).toEqual(wanted.sort());
    for (const name of Object.values(UI_ICONS)) expect(isGameIcon(name), name).toBe(true);
  });
});

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

  it('FR-085 no emoji on the map, in the HUD or in the open dialogs', () => {
    // A finished game, so the game-over screen and the HUD's Final scores button show too
    const over = resolveTurn({ ...newGame({ seed: 1 }), turnLimit: 1 }, {}, 1).state;
    show(over, {
      isCapitalOpen: true,
      isMarketOpen: true,
      isWarehouseOpen: true,
      isTransportAllocationOpen: true,
      isConstructionModalOpen: true,
      constructionModalTileId: '2-9',
      constructionModalWorkerId: 'worker-nation-1-7',
      selectedTileId: '2-9',
    });
    const { container, unmount } = render(<Home />);
    // FR-236: dialogs are named by their title (aria-labelledby), not aria-label
    expect(within(container).getByRole('dialog', { name: 'Game over' })).toBeTruthy();
    const emoji = (container.textContent ?? '').match(/\p{Extended_Pictographic}/gu) ?? [];
    expect(emoji).toEqual([]);
    unmount();
  });
});
