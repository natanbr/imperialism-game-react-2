// @vitest-environment jsdom
// M18c (owner play-test 2026-11-24), the Board of Trade made simpler: a bar of figures in place of the explanation
// (FR-573); the Board tab with Commodity, Price, Available, Order, Quantity, Market, a Buy/Sell choice and one stepper
// per row, the minors as flags (FR-574); a Details tab with what the Board no longer shows (FR-575); a Trade policies tab
// sending Diplomacy's setTradePolicy (FR-576); the three as WAI-ARIA tabs, each opening on the Board (FR-577).
// The FR-194 to FR-494 behaviour the tabs keep is in boardOfTrade.test.tsx.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MarketModal } from '@/components/MarketModal';
import { DiplomacyModal } from '@/components/DiplomacyModal';
import { useGameStore } from '@/store/rootStore';
import { BOARD_ORDER, marketOf, newGame, pairKey, tradeOrdersOf, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { GoodsType } from '@/types/Resource';
import { setPair, setWarehouse, treasury } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const N2 = 'nation-2';
const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';

const start = (): GameState => newGame({ seed: 1, world: 'continent' });
const withConsulate = (s: GameState, minorId: string): GameState =>
  setPair(s, N1, minorId, { consulates: [...s.diplomacy[pairKey(N1, minorId)].consulates, N1].sort() });
const now = () => useGameStore.getState().game;

let submitted: Order[] = [];
function openBoard(state: GameState) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, isMarketOpen: true });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
  return render(<MarketModal />);
}
/** Sends an order through the store, as another screen would, and expects it accepted. */
const order = (o: Order) => {
  let result: unknown;
  act(() => {
    result = useGameStore.getState().submitOrder(o);
  });
  expect(result).toEqual({ ok: true });
};

const dialog = () => screen.getByRole('dialog', { name: 'Board of Trade — Testland' });
const tabs = () => within(dialog()).getAllByRole('tab');
const tab = (name: string) => within(dialog()).getByRole('tab', { name });
const openTab = (name: string) => fireEvent.click(tab(name));
const panel = () => within(dialog()).getByRole('tabpanel');
const figure = (id: string) => text(within(dialog()).getByTestId(id));
const row = (commodity: string) => {
  openTab('Board');
  return within(dialog()).getByTestId(`trade-row-${commodity}`);
};
const choice = (commodity: string, side: 'Buy' | 'Sell') =>
  within(row(commodity)).getByRole('button', { name: `${side} ${text(within(row(commodity)).getByTestId('name'))}` });
const pressed = (commodity: string) => (['Buy', 'Sell'] as const).filter((side) => choice(commodity, side).getAttribute('aria-pressed') === 'true');
const plus = (commodity: string, name: string) => within(row(commodity)).getByRole('button', { name: new RegExp(`^${name}(: .*)?$`) }) as HTMLButtonElement;
/** Everything on screen or read aloud in `el`: its text and every name and tooltip. */
const readable = (el: Element) =>
  [el.textContent ?? '', ...[...el.querySelectorAll('*')].flatMap((e) => ['aria-label', 'title'].map((a) => e.getAttribute(a) ?? ''))].join('\n');

describe('FR-573 the status bar', () => {
  it('FR-573 a new game: Cash, Committed, Buying power, holds as one figure and the purchases, in one bar under the title', () => {
    openBoard(start());
    const bar = within(dialog()).getByTestId('board-status');
    expect(dialog().querySelector('header')!.nextElementSibling).toBe(bar);
    expect(['market-cash', 'market-committed', 'market-power', 'market-holds', 'market-bids'].map(figure)).toEqual([
      'Cash: $10,000',
      'Committed: $0',
      'Buying power: $10,000',
      'Holds: 0 of 4 used (1 Indiaman)',
      'Buying 0 of 4 commodities',
    ]);
    for (const id of ['market-cash', 'market-committed', 'market-power', 'market-holds', 'market-bids']) {
      expect(bar.contains(within(dialog()).getByTestId(id)), id).toBe(true);
    }
  });

  it('FR-573 no explanation paragraph on the Board tab, and the dialog is not described by one', () => {
    openBoard(start());
    expect(within(dialog()).queryByTestId('board-explanation')).toBeNull();
    expect(within(dialog()).queryByTestId('board-duration')).toBeNull();
    expect(dialog().textContent).not.toMatch(/Deals settle at End Turn|orders last one turn|favours/);
    expect(dialog().getAttribute('aria-describedby')).toBeNull();
  });

  it('FR-573 after a purchase of 2 Coal and a sale of 1 Clothing: Committed is what the engine took from the treasury, Buying power what is left, Cash the two together', () => {
    openBoard(setWarehouse(withConsulate(start(), ARVELIA), N1, { clothing: 2 }));
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    fireEvent.click(plus('clothing', 'Sell one more Clothing'));
    const paid = 10000 - treasury(now(), N1);
    expect(paid).toBe(2 * marketOf(now()).prices.coal!);
    expect(figure('market-committed')).toBe(`Committed: $${paid}`);
    expect(figure('market-power')).toBe('Buying power: $9,800');
    expect(figure('market-cash')).toBe('Cash: $10,000');
    expect(figure('market-holds')).toBe('Holds: 3 of 4 used (1 Indiaman)');
    expect(figure('market-bids')).toBe('Buying 1 of 4 commodities');
  });

  it('FR-573 FR-397 "Repeat last turn\'s trades" stands in the bar after a turn with trades', () => {
    openBoard(setWarehouse(withConsulate(start(), ARVELIA), N1, { clothing: 2 }));
    expect(within(dialog()).queryByRole('button', { name: "Repeat last turn's trades" })).toBeNull();
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    act(() => useGameStore.getState().advanceTurn());
    const repeat = within(dialog()).getByRole('button', { name: "Repeat last turn's trades" });
    expect(within(dialog()).getByTestId('board-status').contains(repeat)).toBe(true);
  });
});

describe('FR-574 the Board tab: columns, one order per row, flags', () => {
  it('FR-574 the columns Commodity, Price, Available, Order, Quantity, Market; each row a Buy/Sell choice and one stepper', () => {
    openBoard(start());
    expect(within(panel()).getAllByRole('columnheader').map(text)).toEqual(['Commodity', 'Price', 'Available', 'Order', 'Quantity', 'Market']);
    for (const c of BOARD_ORDER) {
      const r = row(c);
      expect(pressed(c), c).toHaveLength(1);
      expect([within(r).queryByTestId('bid'), within(r).queryByTestId('offer')].filter(Boolean), c).toHaveLength(1);
      expect(within(r).getAllByRole('button', { name: /one more/ }), c).toHaveLength(1);
    }
  });

  it('FR-574 a row opens on Sell where a sale is open, else on Buy', () => {
    openBoard(setWarehouse(withConsulate(start(), ARVELIA), N1, { clothing: 2, furniture: 2 }));
    // Clothing and furniture: Arvelia buys them and we hold some; coal: nobody buys it from us; lumber: none in stock
    expect(pressed('clothing')).toEqual(['Sell']);
    expect(pressed('furniture')).toEqual(['Sell']);
    expect(pressed('coal')).toEqual(['Buy']);
    expect(pressed('lumber')).toEqual(['Buy']);
  });

  it('FR-574 a row with an order given before the dialog opened (on an earlier opening, or by Repeat) opens on that order\'s side', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: setWarehouse(withConsulate(start(), ARVELIA), N1, { clothing: 2 }), activeNationId: N1 });
    // A purchase of clothing goes toward Valdoria (FR-492), though a sale of it is open too
    order({ kind: 'buyCommodity', nationId: N1, commodity: GoodsType.Clothing, amount: 1 });
    openBoard(now());
    expect(pressed('clothing')).toEqual(['Buy']);
    expect(text(within(row('clothing')).getByTestId('bid'))).toBe('1');
  });

  it('FR-574 switching sides clears the other side\'s order: the purchase is taken back (money back), then the Sell stepper shows at 0; back to Buy sends nothing', () => {
    openBoard(withConsulate(start(), ARVELIA));
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    expect(figure('market-committed')).toBe('Committed: $200');
    submitted = [];

    fireEvent.click(choice('coal', 'Sell'));
    expect(submitted).toEqual([{ kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 0 }]);
    expect(tradeOrdersOf(now(), N1).buy.coal ?? 0).toBe(0);
    expect(figure('market-committed')).toBe('Committed: $0');
    expect(pressed('coal')).toEqual(['Sell']);
    expect(text(within(row('coal')).getByTestId('offer'))).toBe('0');
    expect(within(row('coal')).queryByTestId('bid')).toBeNull();

    fireEvent.click(choice('coal', 'Buy'));
    expect(submitted).toHaveLength(1);
    expect(pressed('coal')).toEqual(['Buy']);
    expect(text(within(row('coal')).getByTestId('bid'))).toBe('0');
    // Pressing the side already chosen changes nothing
    fireEvent.click(choice('coal', 'Buy'));
    expect(submitted).toHaveLength(1);
  });

  it('FR-574 the Market column: "Sellers" and "Buyers" with flags only, no units or marks in words; a barred flag dimmed with its reason in its tooltip and name', () => {
    openBoard(setPair(withConsulate(start(), ARVELIA), N1, SUNDMARK, { boycotts: [N1] }));
    const market = within(row('coal')).getByTestId('market');
    expect(text(market)).toBe('Sellers');
    const flags = within(market).getAllByRole('img');
    expect(flags.map((f) => [f.getAttribute('aria-label'), f.getAttribute('title')])).toEqual([
      ['Arvelia', 'Arvelia'],
      ['Sundmark (boycott)', 'Sundmark (boycott)'],
      ['Pellis (no consulate)', 'Pellis (no consulate)'],
    ]);
    expect(within(market).getAllByRole('listitem').map((li) => li.dataset.barred ?? null)).toEqual([null, 'true', 'true']);
    expect(within(market).getAllByTestId('nation-flag')).toHaveLength(3);
    expect(text(within(row('clothing')).getByTestId('market'))).toBe('Buyers');
    // A row no minor trades: a dash named so
    const none = within(within(row('steel')).getByTestId('market')).getByRole('img');
    expect([text(none), none.getAttribute('aria-label'), none.getAttribute('title')]).toEqual(['—', 'No minor trades this', 'No minor trades this']);
  });

  it('FR-574 why a "+" is disabled is its tooltip and the end of its name, never text in the row ("None left in the warehouse" is gone: Available says 0)', () => {
    openBoard(withConsulate(start(), ARVELIA));
    fireEvent.click(choice('clothing', 'Sell'));
    const sell = plus('clothing', 'Sell one more Clothing');
    expect([sell.disabled, sell.title, sell.getAttribute('aria-label')]).toEqual([
      true,
      'None left in the warehouse',
      'Sell one more Clothing: None left in the warehouse',
    ]);
    expect(text(within(row('clothing')).getByTestId('available'))).toBe('0');
    const buy = plus('ironOre', 'Buy one more Iron Ore');
    expect(buy.disabled).toBe(false);
    expect(buy.getAttribute('aria-label')).toBe('Buy one more Iron Ore');
    for (const c of BOARD_ORDER) expect(row(c).textContent, c).not.toMatch(/None left|We need|No one buys|Not enough|favours|Money back/);
    expect(within(panel()).queryAllByTestId(/-note$/)).toEqual([]);
  });
});

describe('FR-575 the Details tab', () => {
  it('FR-575 every text the Board tab no longer shows is on Details: the minors with units and barriers, favourites, deal prices, money back, the rival\'s last turn, the first-sale help, the explanation; none on the Board', () => {
    let s = withConsulate(start(), ARVELIA);
    s = setPair(s, N1, ARVELIA, { subsidies: { [N1]: 10 } });
    s = { ...s, market: { ...marketOf(s), lastOrders: { [N2]: { sell: { coal: 1 }, buy: {} } } } as GameState['market'] };
    openBoard(s);
    openTab('Details');
    const details = panel();
    const texts = {
      explanation: text(within(details).getByTestId('board-explanation')),
      favourites: text(within(details).getByTestId('board-favourites')),
      firstSale: text(within(details).getByTestId('first-sale')),
      sellers: text(within(within(details).getByTestId('detail-row-coal')).getByTestId('sellers')),
      buyers: text(within(within(details).getByTestId('detail-row-clothing')).getByTestId('buyers')),
      dealPrice: text(within(within(details).getByTestId('detail-row-coal')).getByTestId('deal-price')),
      moneyBack: text(within(within(details).getByTestId('detail-row-steel')).getByTestId('bid-note')),
      rival: text(within(within(details).getByTestId('detail-row-coal')).getByTestId('rival-last-turn')),
      noMinor: text(within(within(details).getByTestId('detail-row-steel')).getByTestId('no-minor')),
    };
    expect(texts.explanation).toMatch(/^Buy and sell orders last one turn; production orders in the Capital stay\. Deals settle at End Turn/);
    expect(texts.favourites).toMatch(/favours? (Valdoria|Testland)/);
    expect(texts.firstSale).toMatch(/^Minor nations buy Clothing, Furniture and Hardware\./);
    expect(texts.sellers).toBe('Sellers: Arvelia: 3 units Sundmark: 1 unit (no consulate) Pellis: 1 unit (no consulate)');
    expect(texts.buyers).toMatch(/^Buyers: Arvelia: 2 units Sundmark: 2 units \(no consulate\)/);
    expect(texts.dealPrice).toBe('Arvelia charges $110 with our 10%');
    expect(texts.moneyBack).toBe('Money back if Valdoria does not sell.');
    expect(texts.rival).toBe('Valdoria wanted to sell 1 last turn');
    expect(texts.noMinor).toBe('No minor trades this');

    openTab('Board');
    const board = readable(panel()) + readable(within(dialog()).getByTestId('board-status'));
    for (const t of [texts.explanation, texts.favourites, texts.firstSale, texts.dealPrice, texts.moneyBack, texts.rival, 'units', 'Deals settle']) {
      expect(board, t).not.toContain(t);
    }
  });
});

describe('FR-576 the Trade policies tab', () => {
  const policyRow = (id: string) => within(panel()).getByTestId(`policy-row-${id}`);
  const step = (id: string, label: string) => within(within(policyRow(id)).getByRole('group')).getByRole('button', { name: label }) as HTMLButtonElement;
  const boycott = (id: string) => within(policyRow(id)).getByRole('checkbox', { name: 'Boycott' }) as HTMLInputElement;
  const describedBy = (el: Element) => document.getElementById(el.getAttribute('aria-describedby') ?? '')?.textContent ?? '';

  it('FR-576 every country we may set a policy for, its flag, the steps None to 100% and Boycott', () => {
    openBoard(start());
    openTab('Trade policies');
    const rows = within(panel()).getAllByTestId(/^policy-row-/);
    expect(rows.map((r) => text(within(r).getByRole('rowheader')))).toEqual(['Valdoria', 'Arvelia', 'Sundmark', 'Lorran', 'Pellis']);
    for (const r of rows) {
      expect(within(r).getAllByTestId('nation-flag')).toHaveLength(1);
      const steps = within(within(r).getByRole('group')).getAllByRole('button');
      expect(steps.map(text)).toEqual(['None', '5%', '10%', '25%', '50%', '75%', '100%']);
      expect(steps.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false', 'false', 'false']);
      expect(steps.every((b) => b.title !== '')).toBe(true);
      expect(within(r).getByRole('checkbox', { name: 'Boycott' })).toBeTruthy();
    }
  });

  it('FR-576 FR-171 a step and the boycott send setTradePolicy; the step pressed is the policy ordered, and the deal prices follow', () => {
    openBoard(withConsulate(start(), ARVELIA));
    openTab('Trade policies');
    fireEvent.click(step(ARVELIA, '25%'));
    expect(submitted).toEqual([{ kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 25, boycott: false }]);
    expect(step(ARVELIA, '25%').getAttribute('aria-pressed')).toBe('true');
    expect(step(ARVELIA, 'None').getAttribute('aria-pressed')).toBe('false');
    // The step in force again: nothing to send
    fireEvent.click(step(ARVELIA, '25%'));
    expect(submitted).toHaveLength(1);
    fireEvent.click(boycott(ARVELIA));
    expect(submitted.at(-1)).toEqual({ kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 25, boycott: true });
    expect(boycott(ARVELIA).checked).toBe(true);
    fireEvent.click(boycott(ARVELIA));
    expect(submitted.at(-1)).toEqual({ kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 25, boycott: false });
    // As in FR-394, the trade phase will find it: Arvelia's coal at the board price plus 25%
    openTab('Details');
    expect(text(within(within(panel()).getByTestId('detail-row-coal')).getByTestId('deal-price'))).toBe('Arvelia charges $125 with our 25%');
  });

  it('FR-576 FR-162 a refused step is disabled and its reason stands under the steps, its description, as in Diplomacy; a boycott alone is open', () => {
    openBoard(start());
    openTab('Trade policies');
    const five = step(ARVELIA, '5%');
    expect(five.disabled).toBe(true);
    expect(describedBy(five)).toBe('we need a consulate there first');
    expect(within(policyRow(ARVELIA)).getAllByTestId('reason').map(text)).toEqual(['5%, 10%, 25%, 50%, 75%, 100%: we need a consulate there first']);
    expect(step(ARVELIA, 'None').disabled).toBe(false);
    expect(boycott(ARVELIA).disabled).toBe(false);
    fireEvent.click(five);
    expect(submitted).toEqual([]);
    fireEvent.click(boycott(ARVELIA));
    expect(submitted).toEqual([{ kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 0, boycott: true }]);
  });

  it('FR-576 Diplomacy keeps its own trade policy form (Subsidy, Boycott, Set policy), and it starts at the order the tab sent', () => {
    const view = openBoard(withConsulate(start(), ARVELIA));
    openTab('Trade policies');
    fireEvent.click(step(ARVELIA, '50%'));
    view.unmount();

    act(() => useGameStore.setState({ isMarketOpen: false, isDiplomacyOpen: true }));
    render(<DiplomacyModal />);
    const diplomacy = screen.getByRole('dialog', { name: 'Diplomacy — Testland' });
    fireEvent.click(within(within(diplomacy).getByRole('tablist', { name: 'Countries' })).getByRole('tab', { name: 'Arvelia' }));
    const details = within(within(diplomacy).getByRole('tabpanel', { name: 'Arvelia' }));
    expect((details.getByRole('combobox', { name: 'Subsidy' }) as HTMLSelectElement).value).toBe('50');
    expect(details.getByRole('checkbox', { name: 'Boycott' })).toBeTruthy();
    expect(details.getByRole('button', { name: 'Set policy' })).toBeTruthy();
  });
});

describe('FR-577 the tabs', () => {
  it('FR-577 a tablist of Board, Details and Trade policies; the open tab is selected and alone in the Tab order; the panel is named by it', () => {
    openBoard(start());
    expect(within(dialog()).getByRole('tablist', { name: 'Board of Trade views' })).toBeTruthy();
    expect(tabs().map(text)).toEqual(['Board', 'Details', 'Trade policies']);
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(panel().getAttribute('aria-labelledby')).toBe(tab('Board').id);
    expect(tab('Board').getAttribute('aria-controls')).toBe(panel().id);
    openTab('Details');
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(panel().dataset.testid).toBe('board-tab-details');
    expect(within(dialog()).getByRole('tabpanel', { name: 'Details' })).toBe(panel());
  });

  it('FR-577 Right and Left move to the next and the previous tab, wrapping; Home and End to the first and the last; the focus follows', () => {
    openBoard(start());
    const key = (k: string) => fireEvent.keyDown(document.activeElement!, { key: k });
    act(() => tab('Board').focus());
    const expected: [string, string][] = [
      ['ArrowRight', 'Details'],
      ['ArrowRight', 'Trade policies'],
      ['ArrowRight', 'Board'],
      ['ArrowLeft', 'Trade policies'],
      ['Home', 'Board'],
      ['End', 'Trade policies'],
      ['ArrowLeft', 'Details'],
    ];
    for (const [k, name] of expected) {
      key(k);
      expect(tabs().filter((t) => t.getAttribute('aria-selected') === 'true').map(text), k).toEqual([name]);
      expect(document.activeElement, k).toBe(tab(name));
      expect(within(dialog()).getByRole('tabpanel', { name })).toBeTruthy();
    }
    // Another key does nothing
    key('ArrowDown');
    expect(document.activeElement).toBe(tab('Details'));
  });

  it('FR-577 each opening starts on the Board tab', () => {
    openBoard(start());
    openTab('Trade policies');
    act(() => useGameStore.getState().closeMarket());
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useGameStore.getState().openMarket());
    expect(tab('Board').getAttribute('aria-selected')).toBe('true');
    expect(panel().dataset.testid).toBe('board-tab-board');
  });
});
