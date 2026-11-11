// @vitest-environment jsdom
// M4.1 FR-115 (NR-019): several civilians on any tile in the UI (stack, tray, selection, tile panel),
// and a click on another tile's civilians gives the selected civilian its order there. Real newGame():
// nation 1 "Testland", capital 2-9, farm 3-9 (grain level 1) and orchard 3-8 (fruit level 1) next to it.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { TileInfoPanel } from '@/components/TileInfoPanel';
import { useGameStore } from '@/store/rootStore';
import { newGame, type Order } from '@/engine';
import { findWorker } from '@/engine/orders/queries';
import type { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import { UI_ICONS, WORKER_ICONS } from '@/components/icons';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const N1 = 'nation-1';
const FARM = '3-9';
const ORCHARD = '3-8';
const FARMER = 'worker-nation-1-2';
const RANCHER = 'worker-nation-1-3';
const FORESTER = 'worker-nation-1-4';

const show = (game: GameState) => useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1 });
const tileEl = (container: HTMLElement, id: string) => container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
const submit = (order: Order) => act(() => void useGameStore.getState().submitOrder(order));
const tileOf = (id: string) => findWorker(useGameStore.getState().game, id)?.tile.id;

// Each test renders the whole 24 x 16 map: about 2 s alone, more under a loaded full run (testTimeout in vitest.config.ts)
describe('FR-115 stacks on any tile', () => {
  it('FR-115 two civilians on a farm show as a stack with their count; the tray and the tile panel list both', () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    submit({ kind: 'moveWorker', nationId: N1, workerId: RANCHER, toTileId: FARM });
    submit({ kind: 'moveWorker', nationId: N1, workerId: FORESTER, toTileId: FARM });

    const farm = () => tileEl(container, FARM);
    const stack = within(farm()).getByTestId('worker-stack');
    expect(stack.getAttribute('data-count')).toBe('2');
    expect(stack.getAttribute('aria-label')).toBe('2 civilians: choose one');

    fireEvent.click(stack);
    const tray = within(farm()).getByRole('group', { name: 'Civilians on this tile' });
    const buttons = within(tray).getAllByTestId('worker-button');
    expect(buttons.map((b) => b.getAttribute('data-worker-type'))).toEqual([WorkerType.Rancher, WorkerType.Forester]);
    fireEvent.click(buttons[1]);
    expect(useGameStore.getState().selectedWorkerId).toBe(FORESTER);
    expect(within(farm()).getByTestId('worker-stack').getAttribute('aria-label')).toBe(`2 civilians, ${WorkerType.Forester} selected`);

    const tile = useGameStore.getState().game.map.tiles[9][3];
    render(<TileInfoPanel selectedTile={tile} />);
    const items = within(screen.getByTestId('tile-info')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([expect.stringContaining(WorkerType.Rancher), expect.stringContaining(WorkerType.Forester)]);
  });

  it("FR-115 with a civilian selected, a click on another tile's lone civilian moves the selected one there instead of selecting the other", () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    submit({ kind: 'moveWorker', nationId: N1, workerId: RANCHER, toTileId: ORCHARD });
    const button = () => within(tileEl(container, ORCHARD)).getByTestId('worker-button');
    expect(button().getAttribute('aria-label')).toBe(WorkerType.Rancher);
    act(() => useGameStore.getState().selectWorker(FORESTER));

    // The button says what the click does; it keeps the rancher's icon
    expect(button().getAttribute('aria-label')).toBe(`Move ${WorkerType.Forester} here`);
    expect(button().getAttribute('title')).toBe(`Move ${WorkerType.Forester} here`);
    expect(button().querySelector('[data-icon]')?.getAttribute('data-icon')).toBe(WORKER_ICONS[WorkerType.Rancher]);
    fireEvent.click(button());

    expect(tileOf(FORESTER)).toBe(ORCHARD);
    expect(within(tileEl(container, ORCHARD)).getByTestId('worker-stack').getAttribute('data-count')).toBe('2');
  });

  it("FR-115 with a civilian selected, a click on another tile's stack gives the selected civilian its job there", () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    submit({ kind: 'moveWorker', nationId: N1, workerId: RANCHER, toTileId: FARM });
    submit({ kind: 'moveWorker', nationId: N1, workerId: FORESTER, toTileId: FARM });
    act(() => useGameStore.getState().selectWorker(FARMER));

    const stack = within(tileEl(container, FARM)).getByTestId('worker-stack');
    expect(stack.getAttribute('aria-label')).toBe(`Move ${WorkerType.Farmer} here`);
    expect(stack.getAttribute('title')).toBe(`Move ${WorkerType.Farmer} here`);
    expect(stack.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe(UI_ICONS.civilians);
    // The farm (grain level 1) is the farmer's to develop: the click on its stack starts the job
    fireEvent.click(stack);

    const game = useGameStore.getState().game;
    expect(tileOf(FARMER)).toBe(FARM);
    expect(game.map.tiles[9][3].developmentJob).toMatchObject({ workerId: FARMER, targetLevel: 2 });
    expect(within(tileEl(container, FARM)).getByTestId('worker-stack').getAttribute('data-count')).toBe('3');
  });

  it("FR-115 a click on the selected civilian's own button deselects it", () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    submit({ kind: 'moveWorker', nationId: N1, workerId: RANCHER, toTileId: ORCHARD });
    const button = () => within(tileEl(container, ORCHARD)).getByTestId('worker-button');

    fireEvent.click(button());
    expect(useGameStore.getState().selectedWorkerId).toBe(RANCHER);
    expect(button().getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button());
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    expect(button().getAttribute('aria-pressed')).toBe('false');
  });
});
