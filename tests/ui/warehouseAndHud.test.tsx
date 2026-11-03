// @vitest-environment jsdom
// FR-048 to FR-050: the warehouse dialog and the HUD show display names, the date and the food warning.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { WarehouseModal } from '@/components/WarehouseModal';
import { FoodWarning, NewsPanel, TurnIndicator } from '@/components/HUD/index';
import { useGameStore } from '@/store/rootStore';
import { resolveTurn } from '@/engine';
import type { GameState } from '@/types/GameState';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { emptyWarehouse, game, N1, setIndustry, setTile, T } from '../engine/fixtures';
import { text } from './domText';

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
}

describe('FR-050 warehouse dialog', () => {
  it('FR-056 lists every commodity but gold and gems by display name with its stock, grouped as resources, materials and goods', () => {
    show(emptyWarehouse(game(), N1, { cannedFood: 12, ironOre: 3, furniture: 1 }), { isWarehouseOpen: true });
    render(<WarehouseModal />);

    const groups = screen.getAllByRole('region').map(r => r.getAttribute('aria-label'));
    expect(groups).toEqual(['Resources', 'Materials', 'Goods']);
    const resources = within(screen.getByRole('region', { name: 'Resources' }));
    const materials = within(screen.getByRole('region', { name: 'Materials' }));
    const goods = within(screen.getByRole('region', { name: 'Goods' }));

    expect(text(materials.getByTestId('stock-cannedFood'))).toBe('Canned Food 12');
    expect(text(resources.getByTestId('stock-ironOre'))).toBe('Iron Ore 3');
    expect(text(goods.getByTestId('stock-furniture'))).toBe('Furniture 1');
    const rows = screen.getAllByTestId(/^stock-/);
    // Gold and gems never enter the warehouse (rules 05 section 2).
    expect(rows).toHaveLength(Object.values(ResourceType).length - 2 + Object.values(MaterialType).length + Object.values(GoodsType).length);
    expect(screen.queryByTestId('stock-gold')).toBeNull();
    expect(screen.queryByTestId('stock-gems')).toBeNull();
    for (const row of rows) expect(text(row)).not.toMatch(/[a-z][A-Z]/); // no camelCase key on screen
  });
});

describe('FR-048 FR-049 HUD', () => {
  it('FR-048 shows the turn and the season and year', () => {
    const g = game();
    show(g);
    const { rerender } = render(<TurnIndicator />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 Spring 1815');

    show(resolveTurn(g, {}, 1).state);
    rerender(<TurnIndicator />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 2 Summer 1815');
  });

  it('FR-049 no food warning when the forecast feeds everyone', () => {
    show(game());
    render(<FoodWarning />);
    expect(screen.queryByTestId('food-warning')).toBeNull();
  });

  it('FR-049 a food warning when the coming meal is short', () => {
    let s = emptyWarehouse(game(), N1, { grain: 20 });
    for (const tileId of [T.farm1, T.dryPlains1, T.homeOrchard1, T.range1]) s = setTile(s, tileId, { resource: undefined });
    show(setIndustry(s, N1, { workers: { untrained: 4, trained: 2, expert: 1 } }));
    render(<FoodWarning />);
    expect(text(screen.getByTestId('food-warning'))).toBe(
      'Food is short: at the end of this turn 3 workers will eat the wrong food and fall sick.'
    );
  });

  it('FR-050 the news names goods by display name', () => {
    show(game(), {
      eventLog: [{ turn: 1, year: 1815, events: [{ type: 'goods-produced', nationId: N1, output: MaterialType.CannedFood, amount: 2 }] }],
    });
    render(<NewsPanel />);
    expect(text(screen.getByTestId('news-panel'))).toContain('Produced 2 Canned Food.');
  });
});
