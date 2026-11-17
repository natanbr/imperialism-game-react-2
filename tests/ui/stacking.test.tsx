// @vitest-environment jsdom
// M4.1 FR-115 (NR-019): several civilians on any tile in the UI (stack, tray, selection, tile panel),
// and a click on another tile's civilians gives the selected civilian its order there. Real newGame():
// nation 1 "Testland", capital 2-9, farm 3-9 (grain level 1) and orchard 3-8 (fruit level 1) next to it.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { TileInfoPanel } from '@/components/TileInfoPanel';
import { HUD } from '@/components/HUD';
import { put } from '../engine/fixtures';
import { useGameStore } from '@/store/rootStore';
import { newGame, type Order } from '@/engine';
import { findWorker } from '@/engine/orders/queries';
import type { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import { UI_ICONS } from '@/components/icons';
import { artFileOf, civilianArt } from '@/components/art/inkArt';
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
    // FR-325: while one of its civilians is selected the stack shows that civilian's figure, with the count
    const selectedStack = within(farm()).getByTestId('worker-stack');
    expect([...selectedStack.querySelectorAll('img')].map((img) => img.getAttribute('data-art'))).toEqual([artFileOf(civilianArt(WorkerType.Forester))]);
    expect(selectedStack.querySelector('[data-icon]')).toBeNull();
    expect(selectedStack.textContent).toBe('2');

    const tile = useGameStore.getState().game.map.tiles[9][3];
    render(<TileInfoPanel selectedTile={tile} />);
    const items = within(screen.getByTestId('tile-info')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([expect.stringContaining(WorkerType.Rancher), expect.stringContaining(WorkerType.Forester)]);
  });

  it("FR-385 with a civilian selected, a click on another tile's lone civilian selects that one, named \"Select rancher\"; no move is ordered", () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    submit({ kind: 'moveWorker', nationId: N1, workerId: RANCHER, toTileId: ORCHARD });
    const button = () => within(tileEl(container, ORCHARD)).getByTestId('worker-button');
    expect(button().getAttribute('aria-label')).toBe(WorkerType.Rancher);
    act(() => useGameStore.getState().selectWorker(FORESTER));

    // The button says what the click does; it keeps the rancher's figure (FR-325: the pack's figure since M11)
    expect(button().getAttribute('aria-label')).toBe(`Select ${WorkerType.Rancher}`);
    expect(button().getAttribute('title')).toBe(`Select ${WorkerType.Rancher}`);
    expect([...button().querySelectorAll('img')].map((img) => img.getAttribute('data-art'))).toEqual([artFileOf(civilianArt(WorkerType.Rancher))]);
    const ordersBefore = useGameStore.getState().ordersThisTurn.length;
    fireEvent.click(button());

    expect(useGameStore.getState().selectedWorkerId).toBe(RANCHER);
    expect(tileOf(FORESTER)).toBe('2-9');
    expect(useGameStore.getState().ordersThisTurn.length).toBe(ordersBefore);
    expect(button().getAttribute('aria-pressed')).toBe('true');
  });

  it('FR-385 a move onto a tile with a civilian is a click on the tile outside the button', () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    submit({ kind: 'moveWorker', nationId: N1, workerId: RANCHER, toTileId: ORCHARD });
    act(() => useGameStore.getState().selectWorker(FORESTER));
    fireEvent.click(tileEl(container, ORCHARD));
    expect(tileOf(FORESTER)).toBe(ORCHARD);
    expect(within(tileEl(container, ORCHARD)).getByTestId('worker-stack').getAttribute('data-count')).toBe('2');
  });

  it("FR-385 with a civilian selected, a click on another tile's stack opens its tray (no order); the tile outside the button still takes the selected civilian's job", () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    submit({ kind: 'moveWorker', nationId: N1, workerId: RANCHER, toTileId: FARM });
    submit({ kind: 'moveWorker', nationId: N1, workerId: FORESTER, toTileId: FARM });
    act(() => useGameStore.getState().selectWorker(FARMER));

    const stack = () => within(tileEl(container, FARM)).getByTestId('worker-stack');
    expect(stack().getAttribute('aria-label')).toBe('2 civilians: choose one');
    expect(stack().getAttribute('title')).toBe('2 civilians: choose one');
    // FR-325: no civilian of this tile is selected, so the stack keeps the Game Icon GiMeepleGroup (the pack has no group picture)
    expect(stack().querySelector('[data-icon]')?.getAttribute('data-icon')).toBe(UI_ICONS.civilians);
    expect(UI_ICONS.civilians).toBe('GiMeepleGroup');
    expect(stack().querySelector('img')).toBeNull();
    fireEvent.click(stack());
    expect(tileOf(FARMER)).toBe('2-9');
    const tray = within(tileEl(container, FARM)).getByRole('group', { name: 'Civilians on this tile' });
    fireEvent.click(within(tray).getAllByTestId('worker-button')[1]);
    expect(useGameStore.getState().selectedWorkerId).toBe(FORESTER);

    // The farm (grain level 1) is the farmer's to develop: a click on the tile itself starts the job, at $1,000 once the
    // player says Spend (FR-383)
    act(() => useGameStore.getState().selectWorker(FARMER));
    fireEvent.click(tileEl(container, FARM));
    fireEvent.click(screen.getByRole('button', { name: 'Spend $1,000' }));
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

  // M12 QA fix round (track C): a click on a lone civilian's own button selected the civilian only; with no tile selected
  // the HUD kept the news, so its job offers ("Develop rancher L2, $1,000, 3 turns") showed only after a click on the tile
  it("FR-453 a click on a lone civilian's button selects its tile too, so Tile Info shows the civilian and its offers", () => {
    show(put(newGame({ seed: 1 }), FORESTER, '4-2'));
    const { container } = render(<><MapView /><HUD /></>);
    fireEvent.click(within(tileEl(container, '4-2')).getByTestId('worker-button'));
    expect(useGameStore.getState().selectedWorkerId).toBe(FORESTER);
    expect(useGameStore.getState().selectedTileId).toBe('4-2');
    const info = screen.getByTestId('tile-info');
    expect(within(info).getAllByTestId('job-offer').map((o) => within(o).getByRole('button').textContent)).toContain('Develop forester L1');
    // Its second click deselects the civilian (FR-115); the tile stays selected
    fireEvent.click(within(tileEl(container, '4-2')).getByTestId('worker-button'));
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    expect(useGameStore.getState().selectedTileId).toBe('4-2');
  });
});

describe('FR-384 a plain move ends the selection', () => {
  it('FR-384 the forester moved by a click is no longer selected; the next click only selects a tile, with no "already moved" refusal', () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    act(() => useGameStore.getState().selectWorker(FORESTER));
    fireEvent.click(tileEl(container, ORCHARD));
    expect(tileOf(FORESTER)).toBe(ORCHARD);
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    expect(useGameStore.getState().selectedTileId).toBe(ORCHARD);

    fireEvent.click(tileEl(container, FARM));
    expect(tileOf(FORESTER)).toBe(ORCHARD);
    expect(useGameStore.getState().selectedTileId).toBe(FARM);
    expect(useGameStore.getState().lastRejection).toBeNull();
  });

  it('FR-384 a refused move keeps the selection, so the player can click elsewhere', () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    act(() => useGameStore.getState().selectWorker(FORESTER));
    // 0-0 is the sea
    fireEvent.click(tileEl(container, '0-0'));
    expect(tileOf(FORESTER)).toBe('2-9');
    expect(useGameStore.getState().selectedWorkerId).toBe(FORESTER);
  });
});

// M12 (NR-033), lane L2. FR-433 (UIV-21): each figure in the civilians' tray shows its type as visible text under its
// 24 px button ("Prospector"); the buttons keep their names (FR-110, FR-111) and stay 24 px (the text is outside them, and
// hidden from screen readers, which hear the button's name); a click on the text picks that civilian as the button does.
describe('FR-433 the tray names its civilians', () => {
  it('FR-433 the capital\'s tray shows "Prospector", "Engineer" and the others under their figures; the buttons keep their names; a click on "Engineer" picks the engineer', () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    fireEvent.click(within(tileEl(container, '2-9')).getByTestId('worker-stack'));
    const tray = within(tileEl(container, '2-9')).getByRole('group', { name: 'Civilians on this tile' });
    const buttons = within(tray).getAllByTestId('worker-button');
    const types = buttons.map((b) => b.getAttribute('data-worker-type')!);
    expect(types).toHaveLength(7);
    const captions = buttons.map((b) => b.parentElement!.querySelector('[data-testid="worker-caption"]') as HTMLElement);
    expect(captions.map((c) => c?.textContent)).toEqual(types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)));
    expect(captions.map((c) => c.textContent)).toEqual(expect.arrayContaining(['Prospector', 'Engineer']));
    expect(captions.every((c) => c.getAttribute('aria-hidden') === 'true' && !c.closest('button'))).toBe(true);
    // The names stay the type (FR-110); the visible text is not inside the buttons
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(types);
    expect(buttons.map((b) => b.textContent)).toEqual(types.map(() => ''));
    expect(within(tray).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(types);

    fireEvent.click(captions[types.indexOf(WorkerType.Engineer)]);
    expect(useGameStore.getState().selectedWorkerId).toBe('worker-nation-1-7');
  });
});
