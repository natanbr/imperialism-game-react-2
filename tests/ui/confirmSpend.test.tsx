// @vitest-environment jsdom
// M12 (NR-033), lane L2. FR-383 (ECONOMY-04, ECONOMY-10, card Q82): WHEN a map click, a Tile Info button or Construction
// Options would send an order costing $1,000 or more (development to level 2 or 3, a depot, a port, a fort) THEN a dialog
// asks once, naming the job, the tile, the price, the turns and the cancel rule ("Develop forester to level 3 at 6-4 for
// $5,000 (3 turns)? Cancelled this turn, the money comes back; later, it is lost."), with "Spend $5,000" first and "Keep
// the money"; only Spend sends the order. An order under $1,000 asks nothing.
// Real newGame(): nation 1 "Testland" with $10,000, capital 2-9 with its seven civilians; 3-9 a farm with grain level 1
// next to the capital, 4-8 a farm with grain level 0, 7-8 a farm that is a depot site, 3-1 a coastal forest, 4-2 a forest.
import { describe, it, expect, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HUD } from '@/components/HUD';
import { MapView } from '@/components/MapView';
import { ConfirmSpend } from '@/components/ConfirmSpend';
import { ConstructionOptionsModal } from '@/components/ConstructionOptionsModal';
import { useGameStore } from '@/store/rootStore';
import { newGame, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import { locate, put, setTile, setTreasury, tileAt, treasury } from '../engine/fixtures';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const N1 = 'nation-1';
const civilian = (state: GameState, type: WorkerType) =>
  state.map.tiles.flat().flatMap((t) => t.workers).find((w) => w.nationId === N1 && w.type === type)!.id;

let submitted: Order[] = [];

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({ submitOrder: (order: Order) => (submitted.push(order), submitOrder(order)) });
}

const question = () => screen.queryByRole('dialog', { name: /^Spend \$/ });
const cash = () => treasury(useGameStore.getState().game, N1);
const tile = (id: string) => document.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
const answers = (dialog: HTMLElement) => within(dialog).getAllByRole('button').map(text);

describe('FR-383 ask before a large spend', () => {
  beforeEach(() => useGameStore.setState(useGameStore.getInitialState()));

  it('FR-383 Tile Info: Construct Depot ($2,000) asks first, naming job, tile, price, turns and the cancel rule; "Spend $2,000" first, then "Keep the money"; nothing is sent yet', () => {
    const start = newGame({ seed: 1 });
    const engineer = civilian(start, WorkerType.Engineer);
    show(put(start, engineer, '7-8'), { selectedTileId: '7-8', selectedWorkerId: engineer });
    render(<><HUD /><ConfirmSpend /></>);
    fireEvent.click(within(screen.getByTestId('tile-info')).getByRole('button', { name: 'Construct Depot' }));
    const dialog = question()!;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(text(dialog)).toContain('Build a depot at 7-8 for $2,000 (3 turns)? Cancelled this turn, the money comes back; later, it is lost.');
    expect(answers(dialog)).toEqual(['Spend $2,000', 'Keep the money']);
    expect(submitted).toEqual([]);
    expect(cash()).toBe(10000);
  });

  it('FR-383 "Keep the money" sends nothing; asked again, "Spend $2,000" sends the depot order once', () => {
    const start = newGame({ seed: 1 });
    const engineer = civilian(start, WorkerType.Engineer);
    show(put(start, engineer, '7-8'), { selectedTileId: '7-8', selectedWorkerId: engineer });
    render(<><HUD /><ConfirmSpend /></>);
    const build = () => within(screen.getByTestId('tile-info')).getByRole('button', { name: 'Construct Depot' });
    fireEvent.click(build());
    fireEvent.click(within(question()!).getByRole('button', { name: 'Keep the money' }));
    expect(question()).toBeNull();
    expect(submitted).toEqual([]);

    fireEvent.click(build());
    fireEvent.click(within(question()!).getByRole('button', { name: 'Spend $2,000' }));
    expect(question()).toBeNull();
    expect(submitted).toEqual([{ kind: 'startConstruction', nationId: N1, workerId: engineer, tileId: '7-8', structure: 'depot' }]);
    expect(cash()).toBe(8000);
  });

  it('FR-383 Escape is "Keep the money"', () => {
    const start = newGame({ seed: 1 });
    const engineer = civilian(start, WorkerType.Engineer);
    show(put(start, engineer, '7-8'), { selectedTileId: '7-8', selectedWorkerId: engineer });
    render(<><HUD /><ConfirmSpend /></>);
    fireEvent.click(within(screen.getByTestId('tile-info')).getByRole('button', { name: 'Construct Depot' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(question()).toBeNull();
    expect(submitted).toEqual([]);
  });

  it('FR-383 the spec\'s example: a forester\'s level 3 asks "Develop forester to level 3 at 4-2 for $5,000 (3 turns)? ..." with "Spend $5,000"', () => {
    const start = newGame({ seed: 1 });
    const forester = civilian(start, WorkerType.Forester);
    const levelTwo = setTile(put(start, forester, '4-2'), '4-2', { resource: { ...tileAt(start, '4-2').resource!, level: 2 } });
    show(levelTwo, { selectedTileId: '4-2', selectedWorkerId: forester });
    render(<><HUD /><ConfirmSpend /></>);
    fireEvent.click(within(screen.getByTestId('tile-info')).getByRole('button', { name: 'Develop forester L3' }));
    const dialog = question()!;
    expect(text(dialog)).toContain('Develop forester to level 3 at 4-2 for $5,000 (3 turns)? Cancelled this turn, the money comes back; later, it is lost.');
    expect(answers(dialog)).toEqual(['Spend $5,000', 'Keep the money']);
  });

  it('FR-383 under $1,000 asks nothing: the miner\'s level 1 ($100) is sent at once', () => {
    const start = newGame({ seed: 1 });
    const miner = civilian(start, WorkerType.Miner);
    const found = setTile(put(start, miner, '5-2'), '5-2', { resource: { ...tileAt(start, '5-2').resource!, discovered: true } });
    show(found, { selectedTileId: '5-2', selectedWorkerId: miner });
    render(<><HUD /><ConfirmSpend /></>);
    fireEvent.click(within(screen.getByTestId('tile-info')).getByRole('button', { name: 'Develop miner L1' }));
    expect(question()).toBeNull();
    expect(submitted.map((o) => o.kind)).toEqual(['startDevelopment']);
  });

  it('FR-383 a map click: the farmer sent to 3-9 (level 2, $1,000) asks first and stays selected; Spend moves him there and starts the job, then the selection ends on 3-9', () => {
    const start = newGame({ seed: 1 });
    const farmer = civilian(start, WorkerType.Farmer);
    show(start);
    render(<MapView />);
    act(() => useGameStore.getState().selectWorker(farmer));
    fireEvent.click(tile('3-9'));
    const dialog = question()!;
    expect(text(dialog)).toContain('Develop farmer to level 2 at 3-9 for $1,000 (3 turns)? Cancelled this turn, the money comes back; later, it is lost.');
    expect(answers(dialog)).toEqual(['Spend $1,000', 'Keep the money']);
    expect(submitted).toEqual([]);
    expect(useGameStore.getState().selectedWorkerId).toBe(farmer);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Spend $1,000' }));
    expect(submitted).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: farmer, toTileId: '3-9' }]);
    expect(locate(useGameStore.getState().game, farmer)?.tile.id).toBe('3-9');
    expect(cash()).toBe(9000);
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    expect(useGameStore.getState().selectedTileId).toBe('3-9');
  });

  it('FR-383 a map click answered "Keep the money": no order, the farmer stays where he is and stays selected', () => {
    const start = newGame({ seed: 1 });
    const farmer = civilian(start, WorkerType.Farmer);
    show(start);
    render(<MapView />);
    act(() => useGameStore.getState().selectWorker(farmer));
    fireEvent.click(tile('3-9'));
    fireEvent.click(within(question()!).getByRole('button', { name: 'Keep the money' }));
    expect(submitted).toEqual([]);
    expect(locate(useGameStore.getState().game, farmer)?.tile.id).toBe('2-9');
    expect(useGameStore.getState().selectedWorkerId).toBe(farmer);
  });

  it('FR-383 a map click under $1,000 asks nothing: the farmer sent to 4-8 (level 1, $100) goes at once', () => {
    const start = newGame({ seed: 1 });
    const farmer = civilian(start, WorkerType.Farmer);
    show(start);
    render(<MapView />);
    act(() => useGameStore.getState().selectWorker(farmer));
    fireEvent.click(tile('4-8'));
    expect(question()).toBeNull();
    expect(submitted.map((o) => o.kind)).toEqual(['moveAndStartDevelopment']);
  });

  it('FR-383 a job the engine would refuse asks nothing: without the money the click is refused and said on the map', () => {
    const start = setTreasury(newGame({ seed: 1 }), N1, 500);
    const farmer = civilian(start, WorkerType.Farmer);
    show(start);
    render(<MapView />);
    act(() => useGameStore.getState().selectWorker(farmer));
    fireEvent.click(tile('3-9'));
    expect(question()).toBeNull();
    expect(submitted.map((o) => o.kind)).toEqual(['moveAndStartDevelopment']);
    expect(text(screen.getByTestId('map-status'))).toBe('Move and develop refused: not enough money.');
  });

  it('FR-383 Construction Options: Build Depot closes the options and asks; Spend sends the depot order', () => {
    const start = newGame({ seed: 1 });
    const engineer = civilian(start, WorkerType.Engineer);
    show(put(start, engineer, '3-1'));
    render(<><ConstructionOptionsModal /><ConfirmSpend /></>);
    act(() => useGameStore.getState().openConstructionModal('3-1', engineer));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Construction Options' })).getByRole('button', { name: 'Build Depot' }));
    expect(screen.queryByRole('dialog', { name: 'Construction Options' })).toBeNull();
    const dialog = question()!;
    expect(text(dialog)).toContain('Build a depot at 3-1 for $2,000 (3 turns)?');
    expect(submitted).toEqual([]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Spend $2,000' }));
    expect(submitted).toEqual([{ kind: 'startConstruction', nationId: N1, workerId: engineer, tileId: '3-1', structure: 'depot' }]);
  });
});
