// @vitest-environment jsdom
// FR-046, FR-047: the capital dialog shows production, labour and freight cars, and every button
// sends one order through submitOrder; a refused order shows its reason in the dialog.
import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CapitalModal } from '@/components/CapitalModal';
import { useGameStore } from '@/store/rootStore';
import { readSave } from '@/store/persistence';
import type { Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { emptyWarehouse, game, industryOf, N1, nationOf, setBuilding, setIndustry, setTechnologies, stockOf } from '../engine/fixtures';
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

it('FR-524 University explains each missing technology beside the affected civilian', () => {
  const s = stocked();
  nationOf(s, N1).technologies = [];
  openCapital(s);
  for (const [worker, tech] of [['Rancher', 'Feed Grasses'], ['Forester', 'Iron Railroad Bridge'], ['Driller', 'Oil Drilling']]) {
    const button = screen.getByRole('button', { name: `Train one more ${worker}` }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(`Needs ${tech}`);
  }
});

it('FR-525 the Clipper and refinery follow the active nation’s inventions', () => {
  const s = stocked();
  const owner = nationOf(s, N1);
  owner.technologies = ['streamlinedHulls', 'oilDrilling'];
  openCapital(s);
  const more = screen.getByRole('button', { name: 'Build one more Clipper' });
  expect(text(more.closest('li')!)).toMatch(/4 holds.*6 lumber.*2 fabric/);
  fireEvent.click(more);
  expect(text(screen.getByTestId('shipyard-stock'))).toBe('In warehouse: 4 lumber, 2 fabric');
  expect(card('refinery')).toBeTruthy();
});

it('FR-525 a rival owning Streamlined Hulls and Oil Drilling reveals neither option in our Capital', () => {
  const s = stocked();
  nationOf(s, 'nation-2').technologies = ['streamlinedHulls', 'oilDrilling'];
  openCapital(s);
  expect(screen.queryByRole('button', { name: 'Build one more Clipper' })).toBeNull();
  expect(screen.queryByTestId('building-refinery')).toBeNull();
});

describe('FR-513 University orders in the Capital', () => {
  it('FR-513 shows seven fees and requirements, orders an Engineer and refunds it', () => {
    openCapital(stocked());
    const university = within(screen.getByRole('region', { name: 'University' }));
    const costs = { Prospector: '$500', Miner: '$1,500', Engineer: '$1,000', Farmer: '$1,000', Rancher: '$1,000', Forester: '$1,000', Driller: '$1,000' };
    const rows = university.getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    for (const [name, fee] of Object.entries(costs)) {
      const row = university.getByRole('button', { name: `Train one more ${name}` }).closest('li')!;
      expect(text(row)).toContain(fee);
      expect(text(row)).toContain('2 paper');
      expect(text(row)).toContain('1 expert worker');
    }
    const previousCash = nationOf(now(), N1).treasury;
    const plus = university.getByRole('button', { name: 'Train one more Engineer' }) as HTMLButtonElement;
    fireEvent.click(plus);
    expect(nationOf(now(), N1).treasury).toBe(previousCash - 1000);
    expect(stockOf(now(), N1, 'paper')).toBe(3);
    expect(plus.disabled).toBe(true);
    expect(document.getElementById(plus.getAttribute('aria-describedby')!)?.textContent).toBe('No expert worker free');
    fireEvent.click(university.getByRole('button', { name: 'Train one less Engineer' }));
    expect(nationOf(now(), N1).treasury).toBe(previousCash);
    expect(stockOf(now(), N1, 'paper')).toBe(5);
    expect(plus.disabled).toBe(false);
  });

  it('FR-513 explains a missing paper supply beside the disabled control', () => {
    openCapital(emptyWarehouse(game(), N1, {}));
    const more = screen.getByRole('button', { name: 'Train one more Prospector' }) as HTMLButtonElement;
    expect(more.disabled).toBe(true);
    expect(document.getElementById(more.getAttribute('aria-describedby')!)?.textContent).toBe('Needs 2 paper (0)');
  });
});

it('FR-515 shows both ship costs, holds and current stocks, and lets either order be refunded', () => {
  openCapital(stocked());
  const yard = within(screen.getByRole('region', { name: 'Shipyard' }));
  for (const [ship, lumber, fabric, holds] of [['Trader', 4, 2, 2], ['Indiaman', 7, 3, 4]] as const) {
    const more = yard.getByRole('button', { name: `Build one more ${ship}` });
    const row = more.closest('li')!;
    expect(text(row)).toContain(`${lumber} lumber`);
    expect(text(row)).toContain(`${fabric} fabric`);
    expect(text(row)).toContain(`${holds} holds`);
    fireEvent.click(more);
    expect(text(yard.getByTestId('shipyard-stock'))).toBe(`In warehouse: ${10 - lumber} lumber, ${4 - fabric} fabric`);
    fireEvent.click(yard.getByRole('button', { name: `Build one less ${ship}` }));
    expect(text(yard.getByTestId('shipyard-stock'))).toBe('In warehouse: 10 lumber, 4 fabric');
  }
});

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
    nationOf(s, N1).technologies = ['oilDrilling'];
    openCapital(s);
    expect(card('refinery')).toBeTruthy();
  });

  it('FR-525 distinguishes migrated oil in storage from oil available to the refinery', () => {
    const raw = readFileSync(join(ROOT, 'tests/store/fixtures/pre-m16-turn-3.json'), 'utf8');
    const slot = readSave({ getItem: () => raw });
    if (slot.kind !== 'usable') throw new Error('Expected the captured save to load');
    const owner = setTechnologies(slot.save.game, N1, 'oilDrilling');
    openCapital(setBuilding(owner, N1, 'refinery', { capacity: 2, orders: { fuel: 1 } }));

    const refinery = within(card('refinery'));
    const oil = refinery.getByTestId('input-oil');
    expect(text(oil)).toContain('2 Oil (2 in warehouse, 0 available for production)');
    expect(oil.getAttribute('data-missing')).toBe('true');
    expect(text(refinery.getByTestId('short-fuel'))).toBe('Order 1: waiting for an oil supply');
    expect((refinery.getByRole('button', { name: 'More Fuel' }) as HTMLButtonElement).disabled).toBe(true);
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

  // FR-119 disables More when nothing more can be made, so the refusal comes from Expand here
  it('FR-046 FR-119 a refused order shows its reason in the dialog; the next accepted order clears it', () => {
    openCapital(emptyWarehouse(game(), N1, { lumber: 1, steel: 1 }));
    expect(within(card('steelMill')).getByRole('button', { name: 'More Steel' })).toHaveProperty('disabled', true);

    fireEvent.click(within(card('steelMill')).getByRole('button', { name: /Expand Steel mill/ }));

    expect(submitted).toHaveLength(1);
    expect(text(screen.getByRole('alert'))).toContain('refused: not enough goods in the warehouse.');
    expect(industryOf(now(), N1).buildings.steelMill!.pendingCapacity).toBe(0);

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

  // M11 FR-332 (Q75): the art pack's worker-grade and labour pictures, decorative, the texts above unchanged
  it("FR-332 each grade's row shows its grade picture before the name, the Labour line and the freight car's labour cost the labour picture", () => {
    openCapital(setIndustry(stocked(), N1, {
      workers: { untrained: 4, trained: 2, expert: 1 },
      sick: { untrained: 1, trained: 0, expert: 0 },
      training: { untrained: 1, trained: 0, expert: 0 },
    }));
    const panel = screen.getByTestId('labour-panel');
    const pictures = (el: Element) => [...el.querySelectorAll('img')].map((img) => [img.getAttribute('data-art'), img.getAttribute('alt')]);
    for (const [grade, name] of [['untrained', 'Untrained'], ['trained', 'Trained'], ['expert', 'Expert']]) {
      const row = within(panel).getByTestId(`grade-${grade}`);
      expect(pictures(row), grade).toEqual([[`worker-icons/${grade}.png`, '']]);
      // Before the grade's name, in the name's cell (the row's first part)
      const nameCell = row.firstElementChild!;
      expect(nameCell.firstElementChild?.tagName.toLowerCase(), grade).toBe('img');
      expect(text(nameCell), grade).toBe(name);
    }
    expect(text(within(panel).getByTestId('grade-untrained'))).toBe('Untrained 4 1 sick 1 in training');
    const labour = within(panel).getByTestId('labour');
    expect(pictures(labour)).toEqual([['worker-icons/labour.png', '']]);
    expect(text(labour)).toBe('Labour 10 total, 0 committed, 10 free');
    const freight = screen.getByTestId('freight-cars');
    const cost = within(freight).getByText((_, el) => el?.tagName === 'DIV' && /labour per car$/.test(el.textContent ?? ''));
    expect(pictures(cost)).toEqual([['worker-icons/labour.png', '']]);
    expect(text(cost)).toBe('1 Lumber, 1 Steel and 2 labour per car');
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

  it('FR-101 the capacity line shows only the cars in service, and the ordered cars say they carry goods from next turn', () => {
    openCapital(stocked());
    const freight = screen.getByTestId('freight-cars');
    const before = text(freight);
    fireEvent.click(within(freight).getByRole('button', { name: 'Order a freight car' }));

    expect(nationOf(now(), N1).transportCapacityPendingIncrease).toBe(1);
    expect(text(freight)).toContain(`Transport capacity ${nationOf(now(), N1).transportCapacity} `);
    expect(before).toContain(`Transport capacity ${nationOf(now(), N1).transportCapacity} `);
    expect(text(within(freight).getByTestId('cars-ordered'))).toBe('1 ordered this turn, carrying goods from next turn');
  });
});

// FR-426 (card Q97): a column that does not fit says so: an always-drawn scrollbar and a fade at its cut edge. jsdom has
// no layout, so each column's sizes are set by hand: 600 px of content in a 400 px window, scrolled `top` px.
describe('FR-426 FR-428 the Capital columns show that there is more', () => {
  function sized(el: HTMLElement, content: number, window: number) {
    let top = 0;
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => content });
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => window });
    Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => (top = v) });
    return (to: number) => {
      top = to;
      fireEvent.scroll(el);
    };
  }
  const industry = () => screen.getByRole('main', { name: 'Industry' });
  const side = () => screen.getByTestId('labour-panel').parentElement!;

  it('FR-426 a column cut at its bottom shows a fade there; scrolled to its end, none; a column that fits has none', () => {
    openCapital(stocked());
    const scrollIndustry = sized(industry(), 600, 400);
    sized(side(), 300, 400);
    // A window resize measures again (as a render does)
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('industry-fade').getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByTestId('side-fade')).toBeNull();

    scrollIndustry(200);
    expect(screen.queryByTestId('industry-fade')).toBeNull();
    scrollIndustry(150);
    expect(screen.getByTestId('industry-fade')).toBeTruthy();
  });

  it('FR-426 the fade lies over the cut edge, outside the scrolling content, and lets clicks through', () => {
    openCapital(stocked());
    sized(industry(), 600, 400);
    fireEvent(window, new Event('resize'));
    const fade = screen.getByTestId('industry-fade');
    expect(industry().contains(fade)).toBe(false);
    expect(fade.parentElement).toBe(industry().parentElement);
    const css = readFileSync(join(ROOT, 'src/app/components/capital/Capital.module.css'), 'utf8');
    expect(css).toMatch(/\.fade \{[^}]*position: absolute;[^}]*bottom: 0;[^}]*pointer-events: none;/);
    expect(css).toMatch(/\.column \{[^}]*position: relative;/);
  });

  it('FR-426 both columns draw an always-visible scrollbar when they scroll (not the overlay one)', () => {
    const css = readFileSync(join(ROOT, 'src/app/components/capital/Capital.module.css'), 'utf8');
    expect(css).toMatch(/\.industry::-webkit-scrollbar,\s*\.side::-webkit-scrollbar \{[^}]*width: \d+px/);
    expect(css).toMatch(/\.industry::-webkit-scrollbar-thumb,\s*\.side::-webkit-scrollbar-thumb \{[^}]*background/);
  });

  it('FR-428 below 600 px the columns stack and the body scrolls as one; the header wraps so the close button stays', () => {
    const css = readFileSync(join(ROOT, 'src/app/components/capital/Capital.module.css'), 'utf8');
    const narrow = /@media \(max-width: 599\.98px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(narrow).toMatch(/\.dialog \{[^}]*width: calc\(100vw - 16px\)/);
    expect(narrow).toMatch(/\.body \{[^}]*grid-template-columns: minmax\(0, 1fr\);[^}]*overflow-y: auto;/);
    expect(narrow).toMatch(/\.header \{[^}]*flex-wrap: wrap;/);
  });
});
