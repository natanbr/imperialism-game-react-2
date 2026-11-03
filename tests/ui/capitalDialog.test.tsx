// @vitest-environment jsdom
// FR-046, FR-047: the capital dialog shows production, labour and freight cars, and every button
// sends one order through submitOrder; a refused order shows its reason in the dialog.
import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CapitalModal } from '@/components/CapitalModal';
import { useGameStore } from '@/store/rootStore';
import type { Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { emptyWarehouse, game, industryOf, N1, nationOf, setIndustry, stockOf } from '../engine/fixtures';
import { text } from './domText';

const ROOT = join(__dirname, '..', '..');

let submitted: Order[] = [];

/** Opens the capital on `state` and records every order the dialog submits. */
function openCapital(state: GameState) {
  submitted = [];
  const fresh = useGameStore.getInitialState();
  useGameStore.setState({ ...fresh, game: state, activeNationId: N1, isCapitalOpen: true, lastRejection: null });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
  return render(<CapitalModal />);
}

const stocked = () =>
  emptyWarehouse(game(), N1, {
    grain: 20, fruit: 10, livestock: 10, timber: 10, cotton: 10, coal: 10, ironOre: 10, lumber: 10, steel: 10, paper: 5,
    cannedFood: 3, clothing: 3, furniture: 3, fabric: 4,
  });

const card = (building: string) => screen.getByTestId(`building-${building}`);
const now = () => useGameStore.getState().game;

beforeEach(() => {
  submitted = [];
});

describe('FR-046 capital dialog: production cards', () => {
  it('FR-046 one card per built building, with its name, capacity and outputs; no refinery before Oil Drilling', () => {
    openCapital(stocked());

    const cards = screen.getAllByTestId(/^building-/).map(el => el.dataset.testid);
    expect(cards).toEqual([
      'building-steelMill', 'building-lumberMill', 'building-textileMill', 'building-foodProcessing',
      'building-metalWorks', 'building-furnitureFactory', 'building-clothingFactory',
    ]);
    expect(text(within(card('steelMill')).getByRole('heading'))).toContain('Steel mill');
    expect(text(within(card('steelMill')).getByTestId('capacity'))).toContain('Capacity 2');
    expect(text(within(card('lumberMill')).getByTestId('output-lumber'))).toContain('Lumber');
    expect(text(within(card('lumberMill')).getByTestId('output-paper'))).toContain('Paper');
    expect(text(within(card('foodProcessing')).getByTestId('capacity'))).toContain('No limit');
  });

  it('FR-046 the refinery shows once Oil Drilling is known', () => {
    const s = stocked();
    openCapital({ ...s, technologyState: { ...s.technologyState, oilDrillingTechUnlocked: true } });
    expect(card('refinery')).toBeTruthy();
  });

  it('FR-046 a card lists the recipe inputs with their stock and marks a missing input', () => {
    openCapital(emptyWarehouse(game(), N1, { coal: 3 }));

    const steel = within(card('steelMill')).getByTestId('output-steel');
    expect(text(within(steel).getByTestId('input-coal'))).toContain('1 Coal (3)');
    expect(within(steel).getByTestId('input-coal').getAttribute('data-missing')).toBeNull();
    expect(text(within(steel).getByTestId('input-ironOre'))).toContain('1 Iron Ore (0)');
    expect(within(steel).getByTestId('input-ironOre').getAttribute('data-missing')).toBe('true');
  });

  it('FR-046 More sends setProduction one unit up; the order and the maximum show on the card', () => {
    openCapital(stocked());

    fireEvent.click(within(card('steelMill')).getByRole('button', { name: 'More Steel' }));

    expect(submitted).toEqual([{ kind: 'setProduction', nationId: N1, building: 'steelMill', output: 'steel', amount: 1 }]);
    expect(industryOf(now(), N1).buildings.steelMill!.orders.steel).toBe(1);
    expect(text(within(card('steelMill')).getByTestId('order-steel'))).toContain('1 of 2');
  });

  it('FR-046 Less sends setProduction one unit down', () => {
    openCapital(stocked());
    const more = within(card('steelMill')).getByRole('button', { name: 'More Steel' });
    fireEvent.click(more);
    fireEvent.click(more);
    fireEvent.click(within(card('steelMill')).getByRole('button', { name: 'Less Steel' }));

    expect(submitted.map(o => (o.kind === 'setProduction' ? o.amount : null))).toEqual([1, 2, 1]);
    expect(industryOf(now(), N1).buildings.steelMill!.orders.steel).toBe(1);
  });

  it('FR-046 canned food goes up in batches of 2', () => {
    openCapital(stocked());

    fireEvent.click(within(card('foodProcessing')).getByRole('button', { name: 'More Canned Food' }));

    expect(submitted).toEqual([{ kind: 'setProduction', nationId: N1, building: 'foodProcessing', output: 'cannedFood', amount: 2 }]);
    expect(text(within(card('foodProcessing')).getByTestId('order-cannedFood'))).toContain('2 of');
  });

  it('FR-046 Expand sends expandBuilding, shows its cost and the capacity ordered for next turn', () => {
    openCapital(stocked());
    const expand = within(card('steelMill')).getByRole('button', { name: /Expand Steel mill/ });
    expect(text(expand)).toContain('Expand to 4 (2 Lumber, 2 Steel)');

    fireEvent.click(expand);

    expect(submitted).toEqual([{ kind: 'expandBuilding', nationId: N1, building: 'steelMill' }]);
    expect(stockOf(now(), N1, 'lumber')).toBe(8);
    expect(text(within(card('steelMill')).getByTestId('capacity'))).toContain('Capacity 2 (+2 next turn)');
    expect(within(card('foodProcessing')).queryByRole('button', { name: /Expand/ })).toBeNull();
  });

  it('FR-057 Cancel sends expandBuilding with delta -1, refunds the step, and is disabled with nothing to cancel', () => {
    openCapital(stocked());
    const cancel = () => within(card('steelMill')).getByRole('button', { name: 'Cancel expansion of Steel mill' });
    expect(cancel()).toHaveProperty('disabled', true);

    fireEvent.click(within(card('steelMill')).getByRole('button', { name: /Expand Steel mill/ }));
    expect(cancel()).toHaveProperty('disabled', false);
    fireEvent.click(cancel());

    expect(submitted).toEqual([
      { kind: 'expandBuilding', nationId: N1, building: 'steelMill' },
      { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: -1 },
    ]);
    expect([stockOf(now(), N1, 'lumber'), stockOf(now(), N1, 'steel')]).toEqual([10, 10]);
    expect(text(within(card('steelMill')).getByTestId('capacity'))).toBe('Capacity 2');
    expect(cancel()).toHaveProperty('disabled', true);
    expect(within(card('foodProcessing')).queryByRole('button', { name: /Cancel expansion/ })).toBeNull();
  });

  it('FR-046 a refused order shows its reason in the dialog; the next accepted order clears it', () => {
    openCapital(emptyWarehouse(game(), N1, { lumber: 1, steel: 1 }));

    fireEvent.click(within(card('steelMill')).getByRole('button', { name: 'More Steel' }));

    expect(submitted).toHaveLength(1);
    expect(text(screen.getByRole('alert'))).toContain('Production refused: not enough goods in the warehouse.');
    expect(industryOf(now(), N1).buildings.steelMill!.orders.steel ?? 0).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Order a freight car' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('FR-046 the dialog and its parts use a CSS module, no inline styles; the old IndustryCard is gone', () => {
    const files = [
      join(ROOT, 'src/app/components/CapitalModal.tsx'),
      ...readdirSync(join(ROOT, 'src/app/components/capital')).map(f => join(ROOT, 'src/app/components/capital', f)),
    ].filter(f => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(1);
    for (const file of files) expect({ file, inline: /style=\{/.test(readFileSync(file, 'utf8')) }).toEqual({ file, inline: false });
    expect(existsSync(join(ROOT, 'src/app/components/IndustryCard.tsx'))).toBe(false);
  });
});

describe('FR-047 capital dialog: labour, training, migration, freight cars', () => {
  it('FR-047 the labour panel shows labour, workers by grade, the sick and the trainees', () => {
    openCapital(setIndustry(stocked(), N1, {
      workers: { untrained: 4, trained: 2, expert: 1 },
      sick: { untrained: 1, trained: 0, expert: 0 },
      training: { untrained: 1, trained: 0, expert: 0 },
    }));

    const panel = screen.getByTestId('labour-panel');
    expect(text(within(panel).getByTestId('labour'))).toContain('Labour 10 total, 0 committed, 10 free');
    expect(text(within(panel).getByTestId('grade-untrained'))).toContain('Untrained 4 1 sick 1 in training');
    expect(text(within(panel).getByTestId('grade-trained'))).toContain('Trained 2');
    expect(text(within(panel).getByTestId('grade-expert'))).toContain('Expert 1');
  });

  it('FR-047 Trade School buttons send trainWorkers, and a cancel sends a negative delta', () => {
    openCapital(stocked());

    fireEvent.click(screen.getByRole('button', { name: /Train an untrained worker/ }));
    fireEvent.click(screen.getByRole('button', { name: /Train a trained worker/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel an untrained trainee/ }));

    expect(submitted).toEqual([
      { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 },
      { kind: 'trainWorkers', nationId: N1, from: 'trained', delta: 1 },
      { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: -1 },
    ]);
    expect(industryOf(now(), N1).training).toEqual({ untrained: 0, trained: 1, expert: 0 });
    expect(nationOf(now(), N1).treasury).toBe(10000 - 1000);
    expect(text(screen.getByRole('button', { name: /Train an untrained worker/ }))).toContain('$100 + 1 Paper');
    expect(text(screen.getByRole('button', { name: /Train a trained worker/ }))).toContain('$1,000 + 2 Paper');
  });

  it('FR-047 Capitol buttons send recruitWorkers up to the cap; the cap shows', () => {
    openCapital(stocked());

    fireEvent.click(screen.getByRole('button', { name: /Recruit a migrant/ }));

    expect(submitted).toEqual([{ kind: 'recruitWorkers', nationId: N1, delta: 1 }]);
    expect(text(screen.getByTestId('recruits'))).toContain('1 of 1 this turn');
    expect(stockOf(now(), N1, 'cannedFood')).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: /Recruit a migrant/ }));
    expect(text(screen.getByRole('alert'))).toContain('Migration refused: over the limit.');

    fireEvent.click(screen.getByRole('button', { name: /Cancel a migrant/ }));
    expect(submitted.at(-1)).toEqual({ kind: 'recruitWorkers', nationId: N1, delta: -1 });
    expect(industryOf(now(), N1).recruits).toBe(0);
  });

  it('FR-047 the freight-car buttons send changeTransportCapacity +1 and -1 and show the cost per car', () => {
    openCapital(stocked());
    const freight = screen.getByTestId('freight-cars');
    expect(text(freight)).toContain('1 Lumber, 1 Steel and 2 labour per car');

    fireEvent.click(within(freight).getByRole('button', { name: 'Order a freight car' }));
    fireEvent.click(within(freight).getByRole('button', { name: 'Order a freight car' }));
    fireEvent.click(within(freight).getByRole('button', { name: 'Cancel a freight car' }));

    expect(submitted).toEqual([
      { kind: 'changeTransportCapacity', nationId: N1, delta: 1 },
      { kind: 'changeTransportCapacity', nationId: N1, delta: 1 },
      { kind: 'changeTransportCapacity', nationId: N1, delta: -1 },
    ]);
    expect(nationOf(now(), N1).transportCapacityPendingIncrease).toBe(1);
    expect(text(within(freight).getByTestId('cars-ordered'))).toContain('1 ordered this turn');
  });
});
