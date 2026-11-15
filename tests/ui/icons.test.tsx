// @vitest-environment jsdom
// FR-335 (M11, NR-032; narrows FR-084): the Game Icons that stay are only those the ink-and-wash pack has no picture
// for (Q60); the per-terrain, resource, commodity and worker tables, tileIconOf and the UI icons the pack replaced are
// gone. FR-085: no emoji on the map, in the HUD or in the dialogs. What a tile shows (FR-322 to FR-325) is tested in
// tests/ui/mapIcons.test.tsx, the pack's table in tests/ui/inkArt.test.ts.
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import * as gi from 'react-icons/gi';
import Home from '@/page';
import * as icons from '@/components/icons';
import { GI, UI_ICONS, type IconName } from '@/components/icons';
import { useGameStore } from '@/store/rootStore';
import { newGame, resolveTurn } from '@/engine';
import type { GameState } from '@/types/GameState';
import pkg from '../../package.json';

const N = 'nation-1';
const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N, ...ui });
const isGameIcon = (name: IconName) => typeof gi[name as keyof typeof gi] === 'function' && GI[name] === gi[name as keyof typeof gi];

describe('FR-335 the Game Icons that stay (FR-084 narrowed)', () => {
  it('FR-335 react-icons stays pinned to an exact version', () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['react-icons']).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('FR-335 UI_ICONS holds exactly the icons the pack has no picture for, each a real Game Icon', () => {
    // FR-109 New game and FR-110 the civilians' stack; the three 10 px job markers; FR-177 the Diplomacy screen; FR-195 the
    // Deal Book; FR-210 the army chip's tent and militia; FR-230 the Attack screen; FR-231 the Battle screen; FR-298 the Council
    const kept = ['market', 'dealBook', 'diplomacy', 'center', 'advanceTurn', 'finalScores', 'about', 'newGame', 'civilians', 'prospecting', 'development', 'construction', 'army', 'militia', 'attack', 'battle', 'council'];
    expect(Object.keys(UI_ICONS).sort()).toEqual([...kept].sort());
    for (const name of Object.values(UI_ICONS)) expect(isGameIcon(name), name).toBe(true);
  });

  it('FR-335 the UI names no other Game Icon: GI is the UI_ICONS values and the river marker GiRiver', () => {
    expect(Object.keys(GI).sort()).toEqual([...new Set([...Object.values(UI_ICONS), 'GiRiver'])].sort());
    for (const name of Object.keys(GI) as IconName[]) expect(isGameIcon(name), name).toBe(true);
  });

  it('FR-335 the tables the pack replaced are removed', () => {
    const exports = icons as Record<string, unknown>;
    for (const gone of ['TERRAIN_ICONS', 'RESOURCE_ICONS', 'COMMODITY_ICONS', 'WORKER_ICONS', 'tileIconOf']) expect(exports[gone], gone).toBeUndefined();
    for (const gone of ['capital', 'town', 'depot', 'port', 'warehouse', 'transport', 'armoury']) expect(gone in UI_ICONS, gone).toBe(false);
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
