// @vitest-environment jsdom
// M4.1 FR-119, FR-120 (NR-020): the capital dialog shows what will really be made ("P of M"), notes a
// standing order the stock or labour no longer covers, and removing and re-adding an order works.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CapitalModal } from '@/components/CapitalModal';
import { useGameStore } from '@/store/rootStore';
import { newGame, resolveTurn, tryApplyOrder, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import type { BuildingType, ProductionOutput } from '@/types/Industry';
import { emptyWarehouse, game, industryOf, N1, setBuilding, setIndustry, setWarehouse } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

let submitted: Order[] = [];

function openCapital(state: GameState) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, isCapitalOpen: true, lastRejection: null });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
  return render(<CapitalModal />);
}

const card = (building: string) => screen.getByTestId(`building-${building}`);
const amountText = (building: string, output: string) => text(within(card(building)).getByTestId(`order-${output}`));
const shortNote = (building: string, output: string) => within(card(building)).queryByTestId(`short-${output}`);
const more = (building: string, name: string) => within(card(building)).getByRole('button', { name: `More ${name}` });
const less = (building: string, name: string) => within(card(building)).getByRole('button', { name: `Less ${name}` });
const orderOf = (building: BuildingType, output: string) => industryOf(useGameStore.getState().game, N1).buildings[building]!.orders[output as ProductionOutput] ?? 0;

describe('FR-119 the dialog shows the production plan', () => {
  it('FR-119 a standing order without its inputs shows 0 of 0 and the short-of-inputs note; More is disabled, Less clears it in one press', () => {
    openCapital(setBuilding(emptyWarehouse(game(), N1), N1, 'steelMill', { orders: { steel: 2 } }));

    expect(amountText('steelMill', 'steel')).toBe('0 of 0');
    expect(text(shortNote('steelMill', 'steel')!)).toBe('Order 2: only 0 can be made (short of inputs)');
    expect(more('steelMill', 'Steel')).toHaveProperty('disabled', true);
    expect(less('steelMill', 'Steel')).toHaveProperty('disabled', false);

    fireEvent.click(less('steelMill', 'Steel'));
    expect(submitted).toEqual([{ kind: 'setProduction', nationId: N1, building: 'steelMill', output: 'steel', amount: 0 }]);
    expect(orderOf('steelMill', 'steel')).toBe(0);
    expect(shortNote('steelMill', 'steel')).toBeNull();
    expect(less('steelMill', 'Steel')).toHaveProperty('disabled', true);
  });

  it('FR-119 a standing order the stock covers in part shows what will be made', () => {
    openCapital(setBuilding(emptyWarehouse(game(), N1, { timber: 2 }), N1, 'lumberMill', { orders: { lumber: 2 } }));
    expect(amountText('lumberMill', 'lumber')).toBe('1 of 1');
    expect(text(shortNote('lumberMill', 'lumber')!)).toBe('Order 2: only 1 can be made (short of inputs)');
  });

  it('FR-119 a standing order the labour no longer covers says so', () => {
    // All workers sick: no labour at all, the timber is there
    const s = setIndustry(setBuilding(emptyWarehouse(game(), N1, { timber: 4 }), N1, 'lumberMill', { orders: { lumber: 2 } }), N1, { sick: { untrained: 4, trained: 2, expert: 1 } });
    openCapital(s);
    expect(amountText('lumberMill', 'lumber')).toBe('0 of 0');
    expect(text(shortNote('lumberMill', 'lumber')!)).toBe('Order 2: only 0 can be made (short of labour)');
  });

  it('FR-119 with the inputs and labour there, an order can be removed and added back, and the card shows it fully planned', () => {
    openCapital(emptyWarehouse(game(), N1, { timber: 4 }));
    fireEvent.click(more('lumberMill', 'Lumber'));
    fireEvent.click(more('lumberMill', 'Lumber'));
    expect(amountText('lumberMill', 'lumber')).toBe('2 of 2');
    fireEvent.click(less('lumberMill', 'Lumber'));
    fireEvent.click(less('lumberMill', 'Lumber'));
    expect(amountText('lumberMill', 'lumber')).toBe('0 of 2');
    fireEvent.click(more('lumberMill', 'Lumber'));
    fireEvent.click(more('lumberMill', 'Lumber'));
    expect(submitted.map(o => (o.kind === 'setProduction' ? o.amount : null))).toEqual([1, 2, 1, 0, 1, 2]);
    expect(orderOf('lumberMill', 'lumber')).toBe(2);
    expect(amountText('lumberMill', 'lumber')).toBe('2 of 2');
    expect(shortNote('lumberMill', 'lumber')).toBeNull();
    expect(screen.queryByTestId('capital-refusal')).toBeNull();
  });

  it('FR-119 when stock comes back the stale order counts again (the order is kept, rules 05)', () => {
    const stale = setBuilding(emptyWarehouse(game(), N1), N1, 'steelMill', { orders: { steel: 2 } });
    openCapital(stale);
    expect(amountText('steelMill', 'steel')).toBe('0 of 0');
    act(() => useGameStore.setState({ game: setWarehouse(stale, N1, { coal: 2, ironOre: 2 }) }));
    expect(amountText('steelMill', 'steel')).toBe('2 of 2');
    expect(shortNote('steelMill', 'steel')).toBeNull();
  });
});

describe('FR-120 the play-test bug in the dialog, from the real newGame()', () => {
  it('FR-120 on turn 7 lumber and steel show 0 of 0 with the note (not "2 of 2"), labour shows 4 committed, fabric is removed and added back', () => {
    let s = newGame({ seed: 1 });
    for (const [building, output] of [['lumberMill', 'lumber'], ['steelMill', 'steel'], ['textileMill', 'fabric']] as const) {
      s = tryApplyOrder(s, { kind: 'setProduction', nationId: N1, building, output: output as ProductionOutput, amount: 2 }).state;
    }
    for (let t = 0; t < 6; t++) s = resolveTurn(s, {}, s.seed).state;
    openCapital(s);

    expect(amountText('lumberMill', 'lumber')).toBe('0 of 0');
    expect(amountText('steelMill', 'steel')).toBe('0 of 0');
    expect(text(shortNote('steelMill', 'steel')!)).toBe('Order 2: only 0 can be made (short of inputs)');
    expect(amountText('textileMill', 'fabric')).toBe('2 of 2');
    expect(text(screen.getByTestId('labour'))).toContain('12 total, 4 committed, 8 free');
    // Canned food can be ordered (no stale order holds the labour)
    expect(more('foodProcessing', 'Canned Food')).toHaveProperty('disabled', false);

    fireEvent.click(less('textileMill', 'Fabric'));
    fireEvent.click(less('textileMill', 'Fabric'));
    fireEvent.click(more('textileMill', 'Fabric'));
    fireEvent.click(more('textileMill', 'Fabric'));
    expect(screen.queryByTestId('capital-refusal')).toBeNull();
    expect(amountText('textileMill', 'fabric')).toBe('2 of 2');
  });
});
