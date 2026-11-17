// @vitest-environment jsdom
// M12 (NR-033), lane L2. FR-369 (UIV-11, card Q85): the map is one Tab stop: Tab reaches the selected tile, or the
// player's capital when none is selected; the arrow keys move the focus to the neighbouring tile (left, right, and up or
// down to the row above or below, keeping the column: odd rows are shifted half a tile) and scroll it into view; Enter or
// Space on the focused tile does what a click does. The focus ring differs from the selection mark; the civilian and army
// buttons on tiles keep their own Tab stops. FR-370 (ECONOMY-08, ECONOMY-16): with no dialog open, Escape drops the
// civilian selection, a second Escape the tile selection; Tile Info's heading holds "Close tile info".
// Real newGame(): nation 1 "Testland", capital 2-9 with its seven civilians, farm 3-9.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { HUD } from '@/components/HUD';
import { useGameStore } from '@/store/rootStore';
import { newGame, type Order } from '@/engine';
import { findWorker } from '@/engine/orders/queries';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const N1 = 'nation-1';
const ENGINEER = 'worker-nation-1-7';
let submitted: Order[] = [];

function show(ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: N1, ...ui });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
}
const tile = (id: string) => document.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
const tabStops = () => [...document.querySelectorAll('[data-testid="tile"]')].filter((t) => t.getAttribute('tabindex') === '0').map((t) => t.getAttribute('data-tile-id'));
const focusedTile = () => (document.activeElement as HTMLElement | null)?.getAttribute('data-tile-id');
const press = (key: string) => fireEvent.keyDown(document.activeElement as HTMLElement, { key });

describe('FR-369 the map by keyboard', () => {
  beforeEach(() => show());

  it('FR-369 one tile is the map\'s Tab stop: the capital with nothing selected, else the selected tile', () => {
    render(<MapView />);
    expect(tabStops()).toEqual(['2-9']);
    fireEvent.click(tile('5-8'));
    expect(tabStops()).toEqual(['5-8']);
  });

  it('FR-369 the arrow keys move the focus to the neighbour (rows keep the column) and it stays the one Tab stop', () => {
    render(<MapView />);
    tile('2-9').focus();
    press('ArrowRight');
    expect(focusedTile()).toBe('3-9');
    expect(tabStops()).toEqual(['3-9']);
    press('ArrowDown');
    expect(focusedTile()).toBe('3-10');
    press('ArrowUp');
    press('ArrowUp');
    expect(focusedTile()).toBe('3-8');
    press('ArrowLeft');
    expect(focusedTile()).toBe('2-8');
    // Nothing was selected by moving the focus
    expect(useGameStore.getState().selectedTileId).toBeUndefined();
  });

  it('FR-369 at the map\'s edge the focus stays; the key does not scroll the page (default prevented)', () => {
    render(<MapView />);
    fireEvent.click(tile('0-0'));
    tile('0-0').focus();
    const left = fireEvent.keyDown(tile('0-0'), { key: 'ArrowLeft' });
    const up = fireEvent.keyDown(tile('0-0'), { key: 'ArrowUp' });
    expect(focusedTile()).toBe('0-0');
    expect([left, up]).toEqual([false, false]);
  });

  it('FR-369 Enter or Space on the focused tile does what a click does: it selects the tile', () => {
    render(<MapView />);
    tile('2-9').focus();
    press('ArrowRight');
    press('Enter');
    expect(useGameStore.getState().selectedTileId).toBe('3-9');
    press('ArrowRight');
    press(' ');
    expect(useGameStore.getState().selectedTileId).toBe('4-9');
  });

  it('FR-369 with a civilian selected, Enter sends its order there, as a click would', () => {
    render(<MapView />);
    fireEvent.click(tile('2-9'));
    act(() => useGameStore.getState().selectWorker(ENGINEER));
    tile('2-9').focus();
    press('ArrowRight');
    press('Enter');
    expect(submitted[0]).toMatchObject({ kind: 'moveAndBuildRail', workerId: ENGINEER, toTileId: '3-9' });
    expect(findWorker(useGameStore.getState().game, ENGINEER)?.tile.id).toBe('3-9');
  });

  it('FR-369 the civilian and army buttons on a tile keep their own Tab stops; Enter on one is not taken as the tile\'s', () => {
    render(<MapView />);
    const stack = within(tile('2-9')).getByTestId('worker-stack');
    expect(stack.getAttribute('tabindex')).toBeNull();
    stack.focus();
    fireEvent.keyDown(stack, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(stack);
  });

  it('FR-369 the focused tile shows a focus ring of its own (an outline), not the selection\'s corner brackets', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'src/app/components/Tile/Tile.module.css'), 'utf8');
    const at = css.indexOf('.tile:focus-visible {');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(css.slice(at, css.indexOf('}', at))).toMatch(/outline:\s*2px dashed var\(--color-accent-strong\)/);
  });
});

describe('FR-370 deselecting', () => {
  beforeEach(() => show());

  it('FR-370 Escape drops the civilian selection, a second Escape the tile selection', () => {
    render(<MapView />);
    fireEvent.click(tile('2-9'));
    act(() => useGameStore.getState().selectWorker(ENGINEER));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    expect(useGameStore.getState().selectedTileId).toBe('2-9');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(useGameStore.getState().selectedTileId).toBeUndefined();
  });

  // M12 QA fix round (track A): Escape cleared the selection, the tab stop went back to the capital and the focused tile lost
  // its tabindex, so Chrome dropped the focus to the page; the arrows then did nothing
  it('FR-445 Escape drops the selection, not the focus: the tile keeps its Tab stop and the arrows go on from it', () => {
    render(<MapView />);
    tile('2-9').focus();
    press('ArrowRight');
    press('ArrowRight');
    press('Enter');
    expect(useGameStore.getState().selectedTileId).toBe('4-9');
    press('Escape');
    expect(useGameStore.getState().selectedTileId).toBeUndefined();
    expect(tabStops()).toEqual(['4-9']);
    expect(focusedTile()).toBe('4-9');
    press('ArrowRight');
    expect(focusedTile()).toBe('5-9');
    expect(tabStops()).toEqual(['5-9']);
  });

  it('FR-445 a deselection while the focus is off the map leaves the Tab stop to the capital (FR-369)', () => {
    render(<MapView />);
    fireEvent.click(tile('4-9'));
    expect(tabStops()).toEqual(['4-9']);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(tabStops()).toEqual(['2-9']);
  });

  it('FR-370 Escape while a dialog is open is the dialog\'s: the selection stays', () => {
    render(<MapView />);
    fireEvent.click(tile('2-9'));
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(useGameStore.getState().selectedTileId).toBe('2-9');
    dialog.remove();
  });

  it('FR-370 the Tile Info heading holds "Close tile info", which drops the tile (and civilian) selection', () => {
    show({ selectedTileId: '2-9', selectedWorkerId: ENGINEER });
    render(<HUD />);
    const info = screen.getByTestId('tile-info');
    const heading = within(info).getByRole('heading', { name: /Tile Info/ });
    fireEvent.click(within(heading).getByRole('button', { name: 'Close tile info' }));
    expect(useGameStore.getState().selectedTileId).toBeUndefined();
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    expect(screen.queryByTestId('tile-info')).toBeNull();
  });
});
