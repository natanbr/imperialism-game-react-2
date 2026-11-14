// @vitest-environment jsdom
// FR-084, FR-085 (NR-008): Game Icons for every terrain, resource and worker type; no emoji on the
// map, in the HUD or in the dialogs. What a tile shows (FR-085) is tested in tests/ui/mapIcons.test.tsx.
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import * as gi from 'react-icons/gi';
import Home from '@/page';
import { GI, RESOURCE_ICONS, TERRAIN_ICONS, UI_ICONS, WORKER_ICONS, type IconName } from '@/components/icons';
import { useGameStore } from '@/store/rootStore';
import { newGame, resolveTurn } from '@/engine';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { WorkerType } from '@/types/Workers';
import pkg from '../../package.json';

const N = 'nation-1';
const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N, ...ui });
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
    // FR-210 the army markers (Imp1 encampment tents) and their militia; FR-212 the Armoury; FR-230 the Attack screen; FR-231 the Battle screen;
    // FR-298 the Council screen
    const wanted = ['capital', 'town', 'depot', 'port', 'prospecting', 'development', 'construction', 'warehouse', 'market', 'transport', 'center', 'advanceTurn', 'finalScores', 'about', 'newGame', 'civilians', 'diplomacy', 'dealBook', 'army', 'militia', 'armoury', 'attack', 'battle', 'council'];
    expect(Object.keys(UI_ICONS).sort()).toEqual(wanted.sort());
    for (const name of Object.values(UI_ICONS)) expect(isGameIcon(name), name).toBe(true);
  });
});

describe('FR-085 what a tile shows', () => {
  // The map's FR-085 tests (the tile's icon, the icon count, level badges, the worker buttons) moved unchanged to
  // tests/ui/mapIcons.test.tsx in M11 lane 1; the no-emoji scan of the whole page stays here.
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
