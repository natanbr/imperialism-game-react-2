// @vitest-environment jsdom
// FR-155 (M5): a click on a minor nation's tile or capital selects it for viewing only; the tile panel
// names the minor ("Arvelia (minor nation)"), its province, the terrain and the resource with its level,
// and offers no control that builds an order. On a world with provinces every tile's panel shows its
// province ("Province: Testland South-West"). FR-149: a click on minor land with a civilian selected
// builds no order, so no refusal reaches the news.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/page';
import { HUD } from '@/components/HUD';
import { useGameStore } from '@/store/rootStore';
import { newGame, type Order, type ValidationResult } from '@/engine';
import type { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const continent = () => newGame({ seed: 1, world: 'continent' });
const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1, ...ui });
const tileEl = (container: HTMLElement, id: string) => container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
const panel = () => screen.getByTestId('tile-info');

describe('FR-155 a minor nation\'s tile in the tile panel', () => {
  it('FR-155 a click on Arvelia\'s forest selects it read-only: the minor, its province, terrain, resource and level, no button', () => {
    show(continent());
    const { container } = render(<Home />);
    fireEvent.click(tileEl(container, '10-3'));
    expect(useGameStore.getState().selectedTileId).toBe('10-3');

    expect(text(within(panel()).getByTestId('tile-owner'))).toBe('Owner: Arvelia (minor nation)');
    expect(text(within(panel()).getByTestId('tile-province'))).toBe('Province: Arvelia');
    expect(text(panel())).toContain('Terrain: Hardwood forest');
    expect(text(panel())).toContain('Resource: Timber (L1)');
    expect(text(panel())).toContain('Arvelia is a minor nation: you can watch its land, not give orders here.');
    expect(text(panel())).not.toContain('Unclaimed');
    expect(within(panel()).queryAllByRole('button')).toEqual([]);
  });

  it('FR-155 a click on a minor capital (Sundmark, 12-9) shows the capital read-only', () => {
    show(continent());
    const { container } = render(<Home />);
    fireEvent.click(tileEl(container, '12-9'));
    expect(useGameStore.getState().selectedTileId).toBe('12-9');
    expect(text(within(panel()).getByTestId('tile-owner'))).toBe('Owner: Sundmark (minor nation)');
    expect(text(within(panel()).getByTestId('tile-province'))).toBe('Province: Sundmark');
    expect(text(panel())).toContain('Terrain: Capital');
    expect(text(panel())).toContain('Resource: None');
    expect(within(panel()).queryAllByRole('button')).toEqual([]);
  });

  it('FR-155 FR-149 with the player\'s engineer selected a click on minor land builds no order and selects the tile for viewing', () => {
    show(continent());
    const submitted: Order[] = [];
    const real = useGameStore.getState().submitOrder;
    useGameStore.setState({
      submitOrder: (order: Order): ValidationResult => {
        submitted.push(order);
        return real(order);
      },
    });
    const { container } = render(<Home />);
    fireEvent.click(within(tileEl(container, '2-9')).getByTestId('worker-stack'));
    fireEvent.click(container.querySelector(`[data-tile-id="2-9"] button[data-worker-type="${WorkerType.Engineer}"]`)!);
    expect(useGameStore.getState().selectedWorkerId).toBe('worker-nation-1-7');

    for (const id of ['10-4', '11-4', '12-13']) {
      fireEvent.click(tileEl(container, id));
      expect(useGameStore.getState().selectedTileId).toBe(id);
    }
    expect(submitted).toEqual([]);
    expect(useGameStore.getState().lastRejection).toBeNull();
    expect(within(panel()).queryAllByRole('button')).toEqual([]);
    // Every minor tile is still empty of civilians
    const game = useGameStore.getState().game;
    expect(game.map.tiles.flat().filter((t) => !t.ownerNationId && t.workers.length > 0)).toEqual([]);
  });
});

describe('FR-155 the province of every tile on a world with provinces', () => {
  it('FR-155 the player\'s farm 3-9 is in Testland South-West; its owner line is unchanged (FR-108)', () => {
    show(continent(), { selectedTileId: '3-9' });
    render(<HUD />);
    expect(text(within(panel()).getByTestId('tile-province'))).toBe('Province: Testland South-West');
    expect(text(within(panel()).getByTestId('tile-owner'))).toBe('Owner: Testland (you)');
  });

  it('FR-155 Valdoria\'s capital and a north-east tile name their provinces; the sea has none', () => {
    show(continent(), { selectedTileId: '14-9' });
    const { rerender } = render(<HUD />);
    expect(text(within(panel()).getByTestId('tile-province'))).toBe('Province: Valdoria South-West');
    expect(text(within(panel()).getByTestId('tile-owner'))).toBe('Owner: Valdoria');

    act(() => useGameStore.setState({ selectedTileId: '8-3' }));
    rerender(<HUD />);
    expect(text(within(panel()).getByTestId('tile-province'))).toBe('Province: Testland North-East');

    act(() => useGameStore.setState({ selectedTileId: '11-7' }));
    rerender(<HUD />);
    expect(within(panel()).queryByTestId('tile-province')).toBeNull();
    expect(text(within(panel()).getByTestId('tile-owner'))).toBe('Owner: Unclaimed');
  });

  it('FR-155 FR-159 two-islands has no provinces, so the panel shows no province line', () => {
    show(newGame({ seed: 1, world: 'two-islands' }), { selectedTileId: '3-9' });
    render(<HUD />);
    expect(within(panel()).queryByTestId('tile-province')).toBeNull();
    expect(text(within(panel()).getByTestId('tile-owner'))).toBe('Owner: Testland (you)');
  });
});
