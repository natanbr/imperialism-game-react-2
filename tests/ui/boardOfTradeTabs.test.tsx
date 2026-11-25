// @vitest-environment jsdom
// M18c (owner play-test 2026-11-24), the Board of Trade made simpler: a bar of figures in place of the explanation
// (FR-573); the Board tab with Commodity, Price, Available, Order, Quantity, Market, a Buy/Sell choice and one stepper
// per row, the minors as flags (FR-574); a Details tab with what the Board no longer shows (FR-575); a Trade policies tab
// sending Diplomacy's setTradePolicy (FR-576); the three as WAI-ARIA tabs, each opening on the Board (FR-577).
// The FR-194 to FR-494 behaviour the tabs keep is in boardOfTrade.test.tsx.
// M18c review round: "Cash before purchases"; Buy/Sell a radio group whose side follows the order in place; a refused "+"
// aria-disabled and focusable, its reason its description and shown beside it on focus or press; the pressed subsidy
// step's help as text; the panel focusable and the tab keys without modifiers.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MarketModal } from '@/components/MarketModal';
import { DiplomacyModal } from '@/components/DiplomacyModal';
import { useGameStore } from '@/store/rootStore';
import { BOARD_ORDER, marketOf, newGame, pairKey, tradeOrdersOf, transferProvince, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { GoodsType, ResourceType } from '@/types/Resource';
import { setPair, setTreasury, setWarehouse, treasury } from '../engine/fixtures';
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
const policyView = (name: 'Map' | 'List') => within(panel()).getByRole('button', { name });
const policyMap = () => within(panel()).getByRole('group', { name: 'Trade policy map' });
const policyRow = (id: string) => within(panel()).getByTestId(`policy-row-${id}`);
const step = (id: string, label: string) => within(within(policyRow(id)).getByRole('group')).getByRole('button', { name: label }) as HTMLButtonElement;
const boycott = (id: string) => within(policyRow(id)).getByRole('checkbox', { name: 'Boycott' }) as HTMLInputElement;
const figure = (id: string) => text(within(dialog()).getByTestId(id));
const row = (commodity: string) => {
  openTab('Board');
  return within(dialog()).getByTestId(`trade-row-${commodity}`);
};
/** FR-574: a row's Buy or Sell radio (M18c review round: was a toggle button with aria-pressed). */
const choice = (commodity: string, side: 'Buy' | 'Sell') =>
  within(row(commodity)).getByRole('radio', { name: `${side} ${text(within(row(commodity)).getByTestId('name'))}` });
const pressed = (commodity: string) => (['Buy', 'Sell'] as const).filter((side) => choice(commodity, side).getAttribute('aria-checked') === 'true');
const plus = (commodity: string, name: string) => within(row(commodity)).getByRole('button', { name }) as HTMLButtonElement;
const less = (commodity: string, name: string) => within(row(commodity)).getByRole('button', { name }) as HTMLButtonElement;
/** The accessible description: the text of the elements aria-describedby names, "" without one. */
const description = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((id) => text(document.getElementById(id)!)).join(' ');
/** Everything on screen or read aloud in `el`: its text and every name and tooltip. */
const readable = (el: Element) =>
  [el.textContent ?? '', ...[...el.querySelectorAll('*')].flatMap((e) => ['aria-label', 'title'].map((a) => e.getAttribute(a) ?? ''))].join('\n');
/** The text drawn in `el`: its text without a refused "+"'s reason while that one is not shown (a description only). */
const drawn = (el: Element) => {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('[hidden]').forEach((e) => e.remove());
  return copy.textContent ?? '';
};

describe('FR-573 the status bar', () => {
  it('FR-605 review: interest alone can put the next purchase over the posted limit', () => {
    openBoard(setTreasury(withConsulate(start(), ARVELIA), N1, 5));
    order({ kind: 'openCredit', nationId: N1 });
    const preview = description(plus('coal', 'Buy one more Coal'));
    expect(preview).toMatch(/\$195 before interest/);
    expect(preview).toMatch(/\$12 interest/);
    expect(preview).toMatch(/\$207/);
    expect(preview).toMatch(/\$7 over/);
    expect(preview).toMatch(/forced sale/i);
  });
  it('FR-605 puts credit in the existing bar and describes the next purchase before the player pays', () => {
    openBoard(setTreasury(withConsulate(start(), ARVELIA), N1, 25));
    const buy = plus('coal', 'Buy one more Coal');
    expect(description(buy)).toBe('Not enough money');
    order({ kind: 'openCredit', nationId: N1 });
    const bar = within(dialog()).getByTestId('board-status');
    expect(text(bar)).toMatch(/credit limit:\s*\$200/i);
    expect(figure('market-power')).toBe('Buying power: $225');
    expect(description(buy)).toMatch(/\$75.*debt|debt.*\$75/i);
    expect(description(buy)).toMatch(/upkeep.*\$175/i);
    fireEvent.click(buy);
    expect(figure('market-cash')).toBe('Cash before purchases: $25');
    expect(figure('market-committed')).toBe('Committed: $100');
    expect(figure('market-power')).toBe('Buying power: $125');
    expect(description(buy)).toMatch(/\$75 over/i);
    fireEvent.click(buy);
    expect(figure('market-power')).toBe('Buying power: $25');
    expect(buy.getAttribute('aria-disabled')).toBe('true');
    expect(description(buy)).toMatch(/\$100.*\$25/);
    const count = submitted.length;
    fireEvent.click(buy);
    expect(submitted).toHaveLength(count);
  });
  // M18c review round: "Cash: $10,000" -> "Cash before purchases: $10,000", so it is not taken for the top bar's cash
  it('FR-573 a new game: Cash before purchases, Committed, Buying power, holds as one figure and the purchases, in one bar under the title', () => {
    openBoard(start());
    const bar = within(dialog()).getByTestId('board-status');
    expect(dialog().querySelector('header')!.nextElementSibling).toBe(bar);
    expect(['market-cash', 'market-committed', 'market-power', 'market-holds', 'market-bids'].map(figure)).toEqual([
      'Cash before purchases: $10,000',
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

  it('FR-573 after a purchase of 2 Coal and a sale of 1 Clothing: Committed is what the engine took from the treasury, Buying power what is left, Cash before purchases the two together', () => {
    openBoard(setWarehouse(withConsulate(start(), ARVELIA), N1, { clothing: 2 }));
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    fireEvent.click(plus('clothing', 'Sell one more Clothing'));
    const paid = 10000 - treasury(now(), N1);
    expect(paid).toBe(2 * marketOf(now()).prices.coal!);
    expect(figure('market-committed')).toBe(`Committed: $${paid}`);
    expect(figure('market-power')).toBe('Buying power: $9,800');
    // M18c review round: was "Cash: $10,000"
    expect(figure('market-cash')).toBe('Cash before purchases: $10,000');
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

  // M18c review round: was disabled, the reason at the end of its name ("Sell one more Clothing: None left in the
  // warehouse"), out of the Tab order. Now aria-disabled and focusable, the name plain and the reason its description;
  // the row draws no reason until the "+" has focus or is pressed (next test)
  it('FR-574 why a "+" is refused is its tooltip and its description, never text drawn in the row ("None left in the warehouse" is gone: Available says 0)', () => {
    openBoard(withConsulate(start(), ARVELIA));
    fireEvent.click(choice('clothing', 'Sell'));
    const sell = plus('clothing', 'Sell one more Clothing');
    expect([sell.getAttribute('aria-disabled'), sell.disabled, sell.title, sell.getAttribute('aria-label'), description(sell)]).toEqual([
      'true',
      false,
      'None left in the warehouse',
      'Sell one more Clothing',
      'None left in the warehouse',
    ]);
    expect(text(within(row('clothing')).getByTestId('available'))).toBe('0');
    const buy = plus('ironOre', 'Buy one more Iron Ore');
    expect([buy.getAttribute('aria-disabled'), buy.disabled, buy.getAttribute('aria-label'), description(buy)]).toEqual([null, false, 'Buy one more Iron Ore', '']);
    // Old: row(c).textContent; the reasons are in the row now, as descriptions nobody sees until asked for
    for (const c of BOARD_ORDER) expect(drawn(row(c)), c).not.toMatch(/None left|We need|No one buys|Not enough|favours|Money back/);
    expect(within(panel()).queryAllByTestId(/-note$/)).toEqual([]);
  });

  it('FR-574 a refused "+" is in the Tab order: focus or a press shows its reason beside it and sends nothing; leaving it hides the reason', () => {
    openBoard(start());
    const coal = plus('coal', 'Buy one more Coal');
    const reason = () => within(row('coal')).getByTestId('bid-reason');
    expect([coal.tabIndex, coal.disabled, reason().hidden, text(reason())]).toEqual([0, false, true, 'We need a consulate with a seller']);
    act(() => coal.focus());
    expect(document.activeElement).toBe(coal);
    expect(reason().hidden).toBe(false);
    act(() => coal.blur());
    expect(reason().hidden).toBe(true);
    fireEvent.click(coal);
    expect(reason().hidden).toBe(false);
    expect(submitted).toEqual([]);
    expect(useGameStore.getState().lastRejection).toBeNull();
  });

  // M18c review round (FR-574): the side follows the order in place. Old: a row's side came from its order at the opening
  // and from the Order column, so an order placed by Repeat left the row on its opening side once it went back to 0.
  it('FR-574 FR-397 after Repeat buys clothing on a row that opened on Sell, "−" to 0 keeps the row on Buy', () => {
    openBoard(setWarehouse(withConsulate(start(), ARVELIA), N1, { clothing: 2 }));
    fireEvent.click(choice('clothing', 'Buy'));
    fireEvent.click(plus('clothing', 'Buy one more Clothing'));
    act(() => useGameStore.getState().advanceTurn());
    // A new opening, so each row starts from the orders in place (none this turn yet)
    act(() => useGameStore.getState().closeMarket());
    act(() => useGameStore.getState().openMarket());
    expect(pressed('clothing')).toEqual(['Sell']);
    fireEvent.click(within(dialog()).getByRole('button', { name: "Repeat last turn's trades" }));
    expect(tradeOrdersOf(now(), N1).buy.clothing).toBe(1);
    expect(pressed('clothing')).toEqual(['Buy']);
    fireEvent.click(less('clothing', 'Buy one less Clothing'));
    expect(tradeOrdersOf(now(), N1).buy.clothing ?? 0).toBe(0);
    expect(pressed('clothing')).toEqual(['Buy']);
    expect(text(within(row('clothing')).getByTestId('bid'))).toBe('0');
  });

  it('FR-574 a switch the engine refuses (taking the purchase back) leaves the row on its side, and it stays there at 0', () => {
    openBoard(withConsulate(start(), ARVELIA));
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    const accept = useGameStore.getState().submitOrder;
    // Any refusal will do; after the last turn every order is refused so (FR-069)
    const refuseZero = (o: Order) => (o.kind === 'buyCommodity' && o.amount === 0 ? ({ ok: false, reason: 'game-over' } as const) : accept(o));
    act(() => useGameStore.setState({ submitOrder: refuseZero }));
    fireEvent.click(choice('coal', 'Sell'));
    expect(pressed('coal')).toEqual(['Buy']);
    expect(text(within(row('coal')).getByTestId('bid'))).toBe('1');
    act(() => useGameStore.setState({ submitOrder: accept }));
    fireEvent.click(less('coal', 'Buy one less Coal'));
    expect(tradeOrdersOf(now(), N1).buy.coal ?? 0).toBe(0);
    expect(pressed('coal')).toEqual(['Buy']);
  });

  it('FR-574 Buy/Sell is a radio group with one Tab stop: the arrow keys pick the other side and move the focus; a refused switch keeps both', () => {
    openBoard(withConsulate(start(), ARVELIA));
    const group = within(row('coal')).getByRole('radiogroup', { name: 'Order for Coal' });
    expect(within(group).getAllByRole('radio').map((r) => [text(r), r.getAttribute('aria-checked'), r.tabIndex])).toEqual([
      ['Buy', 'true', 0],
      ['Sell', 'false', -1],
    ]);
    act(() => choice('coal', 'Buy').focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(pressed('coal')).toEqual(['Sell']);
    expect(document.activeElement).toBe(choice('coal', 'Sell'));
    expect([choice('coal', 'Buy').tabIndex, choice('coal', 'Sell').tabIndex]).toEqual([-1, 0]);
    // Wrapping: Right from the last and Left from the first reach the other one; Up and Down too
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(choice('coal', 'Buy'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(pressed('coal')).toEqual(['Sell']);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(pressed('coal')).toEqual(['Buy']);
    // With a modifier the key belongs to the browser
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight', altKey: true });
    expect(pressed('coal')).toEqual(['Buy']);
    // A purchase the engine will not take back: the arrow changes nothing and the focus stays
    fireEvent.click(plus('coal', 'Buy one more Coal'));
    const accept = useGameStore.getState().submitOrder;
    act(() => useGameStore.setState({ submitOrder: (o: Order) => (o.kind === 'buyCommodity' && o.amount === 0 ? ({ ok: false, reason: 'game-over' } as const) : accept(o)) }));
    act(() => choice('coal', 'Buy').focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(pressed('coal')).toEqual(['Buy']);
    expect(document.activeElement).toBe(choice('coal', 'Buy'));
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

describe('FR-576 the Trade policies list', () => {
  const openList = () => {
    openTab('Trade policies');
    fireEvent.click(policyView('List'));
  };
  const describedBy = (el: Element) => document.getElementById(el.getAttribute('aria-describedby') ?? '')?.textContent ?? '';

  it('FR-576 every country we may set a policy for, its flag, the steps None to 100% and Boycott', () => {
    openBoard(start());
    openList();
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
    openList();
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

  // M18c review round: the help was each step's tooltip only, with "Point at a step to see what it does." in the intro
  it('FR-576 FR-395 what the pressed step does is a line under the steps, as Diplomacy\'s subsidy help, and the pressed step\'s description', () => {
    openBoard(withConsulate(start(), ARVELIA));
    openList();
    expect(panel().textContent).not.toMatch(/Point at a step/);
    const help = () => text(within(policyRow(ARVELIA)).getByTestId('subsidy-help'));
    expect(help()).toBe('No subsidy: we trade at the Board price.');
    expect(description(step(ARVELIA, 'None'))).toBe('No subsidy: we trade at the Board price.');
    expect(within(panel()).getAllByTestId('subsidy-help')).toHaveLength(5);
    fireEvent.click(step(ARVELIA, '25%'));
    expect(help()).toBe(step(ARVELIA, '25%').title);
    expect(help()).toMatch(/^Subsidy 25%: .*Arvelia pays us 25% less for our goods and charges us 25% more for its own\. In return it ranks us higher as a trading partner\.$/);
    expect(description(step(ARVELIA, '25%'))).toBe(help());
    expect(description(step(ARVELIA, 'None'))).toBe('');
  });

  it('FR-576 FR-162 a refused step is disabled and its reason stands under the steps, its description, as in Diplomacy; a boycott alone is open', () => {
    openBoard(start());
    openList();
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
    openList();
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

describe('FR-579 the Trade policies map', () => {
  const countryButton = (name: string) => within(policyMap()).getByRole('button', { name });
  const marker = (id: string) => within(policyMap()).getByTestId(`policy-marker-${id}`);

  it('FR-579 opens the SVG map with the first eligible landed country selected; the player’s country is drawn but has no selection control', () => {
    openBoard(start());
    openTab('Trade policies');

    expect(policyView('Map').getAttribute('aria-pressed')).toBe('true');
    expect(policyView('List').getAttribute('aria-pressed')).toBe('false');
    expect(policyMap().localName).toBe('svg');
    const buttons = within(policyMap()).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(within(policyMap()).getAllByRole('button', { pressed: true })).toEqual([countryButton('Valdoria, subsidy 0%')]);
    expect(within(panel()).getAllByTestId(/^policy-row-/)).toEqual([policyRow(N2)]);
    expect(text(within(policyRow(N2)).getByRole('rowheader'))).toBe('Valdoria');

    const ownLand = policyMap().querySelector(`[data-country="${N1}"]`)!;
    const ownLabel = policyMap().querySelector(`[data-annotation-for="${N1}"]`)!;
    expect(ownLabel.querySelector('text')?.textContent).toBe('Testland');
    expect(ownLabel.querySelector('svg[data-testid="nation-flag"]')).not.toBeNull();
    expect(ownLand.querySelector('[fill="var(--color-nation-1)"]:is(path, polygon, rect)')).not.toBeNull();
    expect(within(policyMap()).queryByRole('button', { name: /Testland/ })).toBeNull();
    expect(within(policyMap()).queryByTestId(`policy-marker-${N1}`)).toBeNull();
    expect(ownLand.getAttribute('tabindex')).toBeNull();
    fireEvent.click(ownLand);
    expect(countryButton('Valdoria, subsidy 0%').getAttribute('aria-pressed')).toBe('true');
    expect(submitted).toEqual([]);
  });

  it('FR-579 clicking, Enter and Space select a country and update its pressed state and the bar', () => {
    openBoard(start());
    openTab('Trade policies');

    const arvelia = countryButton('Arvelia, subsidy 0%');
    expect(arvelia.getAttribute('aria-label')).toBe('Arvelia, subsidy 0%');
    expect(arvelia.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(arvelia);
    expect(arvelia.getAttribute('aria-pressed')).toBe('true');
    expect(countryButton('Valdoria, subsidy 0%').getAttribute('aria-pressed')).toBe('false');
    expect(within(panel()).getAllByTestId(/^policy-row-/)).toEqual([policyRow(ARVELIA)]);

    const sundmark = countryButton('Sundmark, subsidy 0%') as unknown as SVGElement;
    expect(sundmark.tabIndex).toBe(0);
    act(() => sundmark.focus());
    expect(document.activeElement).toBe(sundmark);
    fireEvent.keyDown(sundmark, { key: 'Enter' });
    expect(sundmark.getAttribute('aria-pressed')).toBe('true');
    expect(within(panel()).getAllByTestId(/^policy-row-/)).toEqual([policyRow(SUNDMARK)]);
    expect(document.activeElement).toBe(sundmark);

    const valdoria = countryButton('Valdoria, subsidy 0%') as unknown as SVGElement;
    act(() => valdoria.focus());
    expect(fireEvent.keyDown(valdoria, { key: ' ' })).toBe(false);
    expect(sundmark.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyUp(valdoria, { key: ' ' });
    expect(valdoria.getAttribute('aria-pressed')).toBe('true');
    expect(sundmark.getAttribute('aria-pressed')).toBe('false');
    expect(within(panel()).getAllByTestId(/^policy-row-/)).toEqual([policyRow(N2)]);
    expect(document.activeElement).toBe(valdoria);
    expect(submitted).toEqual([]);
  });

  it('FR-579 Tab and Shift+Tab move between the SVG country buttons in the dialog', () => {
    openBoard(start());
    openTab('Trade policies');

    const [first, second] = within(policyMap()).getAllByRole('button');
    act(() => first.focus());
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(policyView('List'));
  });

  it('FR-579 the selected country’s bar sends subsidy and boycott orders and the SVG changes from no fill to a quarter ring to a cross', () => {
    openBoard(withConsulate(start(), ARVELIA));
    openTab('Trade policies');
    fireEvent.click(countryButton('Arvelia, subsidy 0%'));

    const arc = () => marker(ARVELIA).querySelector('circle[stroke-dasharray]');
    const cross = () => within(marker(ARVELIA)).queryByTestId('boycott-cross');
    expect(arc()?.getAttribute('stroke-dasharray')).toBe('0 100');
    expect(cross()).toBeNull();
    expect(description(step(ARVELIA, 'None'))).toBe('No subsidy: we trade at the Board price.');

    fireEvent.click(step(ARVELIA, '25%'));
    const subsidy = { kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 25, boycott: false };
    expect(submitted).toEqual([subsidy]);
    expect(countryButton('Arvelia, subsidy 25%').getAttribute('aria-pressed')).toBe('true');
    expect(arc()?.getAttribute('pathLength')).toBe('100');
    expect(arc()?.getAttribute('stroke-dasharray')).toBe('25 100');
    expect(cross()).toBeNull();
    const help = text(within(policyRow(ARVELIA)).getByTestId('subsidy-help'));
    expect(help).toMatch(/Arvelia pays us 25% less for our goods and charges us 25% more for its own/);
    expect(description(step(ARVELIA, '25%'))).toBe(help);

    fireEvent.click(boycott(ARVELIA));
    expect(submitted).toEqual([subsidy, { ...subsidy, boycott: true }]);
    expect(countryButton('Arvelia, boycott').getAttribute('aria-pressed')).toBe('true');
    expect(arc()).toBeNull();
    expect(cross()?.localName).toBe('path');
    expect(cross()?.getAttribute('d')).toMatch(/M.+[Ll].+M.+[Ll]/i);
    expect(boycott(ARVELIA).checked).toBe(true);

    fireEvent.click(boycott(ARVELIA));
    expect(submitted).toEqual([subsidy, { ...subsidy, boycott: true }, subsidy]);
    expect(countryButton('Arvelia, subsidy 25%').getAttribute('aria-pressed')).toBe('true');
    expect(arc()?.getAttribute('stroke-dasharray')).toBe('25 100');
    expect(cross()).toBeNull();
  });

  it('FR-579 the selected country’s bar visibly explains a refused step and sending is disabled', () => {
    openBoard(start());
    openTab('Trade policies');
    fireEvent.click(countryButton('Arvelia, subsidy 0%'));

    const five = step(ARVELIA, '5%');
    expect(five.disabled).toBe(true);
    expect(description(five)).toBe('we need a consulate there first');
    expect(within(policyRow(ARVELIA)).getAllByTestId('reason').map(text)).toEqual(['5%, 10%, 25%, 50%, 75%, 100%: we need a consulate there first']);
    fireEvent.click(five);
    expect(submitted).toEqual([]);
    expect(boycott(ARVELIA).disabled).toBe(false);
  });

  it('FR-579 List retains the full FR-576 list even if the first eligible country has no land, and Map restores the selected country', () => {
    const game = start();
    const landlessValdoria = game.provinces.filter((province) => province.ownerId === N2)
      .reduce((state, province) => transferProvince(state, province.id, N1), game);
    openBoard(landlessValdoria);
    openTab('Trade policies');

    expect(within(policyMap()).queryByRole('button', { name: /Valdoria/ })).toBeNull();
    expect(policyMap().querySelector(`[data-country="${N2}"]`)).toBeNull();
    expect(countryButton('Arvelia, subsidy 0%').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(countryButton('Sundmark, subsidy 0%'));

    fireEvent.click(policyView('List'));
    expect(policyView('List').getAttribute('aria-pressed')).toBe('true');
    expect(policyView('Map').getAttribute('aria-pressed')).toBe('false');
    expect(within(panel()).queryByRole('group', { name: 'Trade policy map' })).toBeNull();
    const rows = within(panel()).getAllByTestId(/^policy-row-/);
    expect(rows.map((r) => text(within(r).getByRole('rowheader')))).toEqual(['Valdoria', 'Arvelia', 'Sundmark', 'Lorran', 'Pellis']);
    fireEvent.click(boycott(N2));
    expect(submitted).toEqual([{ kind: 'setTradePolicy', nationId: N1, targetId: N2, subsidyPercent: 0, boycott: true }]);

    fireEvent.click(policyView('Map'));
    expect(policyView('Map').getAttribute('aria-pressed')).toBe('true');
    expect(countryButton('Sundmark, subsidy 0%').getAttribute('aria-pressed')).toBe('true');
    expect(within(panel()).getAllByTestId(/^policy-row-/)).toEqual([policyRow(SUNDMARK)]);
  });
});

describe('FR-577 the tabs', () => {
  it('FR-577 FR-612 the four Board tabs; the open tab is selected and alone in the Tab order; the panel is named by it', () => {
    openBoard(start());
    expect(within(dialog()).getByRole('tablist', { name: 'Board of Trade views' })).toBeTruthy();
    expect(tabs().map(text)).toEqual(['Board', 'Details', 'Trade policies', 'Trade Book']);
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(panel().getAttribute('aria-labelledby')).toBe(tab('Board').id);
    expect(tab('Board').getAttribute('aria-controls')).toBe(panel().id);
    // M18c review round: the panel is a Tab stop of its own, so the keyboard reaches a tab with nothing to focus in it
    expect(panel().tabIndex).toBe(0);
    openTab('Details');
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
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
      ['ArrowRight', 'Trade Book'],
      ['ArrowRight', 'Board'],
      ['ArrowLeft', 'Trade Book'],
      ['Home', 'Board'],
      ['End', 'Trade Book'],
      ['ArrowLeft', 'Trade policies'],
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
    // M18c review round: with Alt, Ctrl or Meta the key belongs to the browser (Alt+Left is Back)
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) {
      for (const k of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
        const event = fireEvent.keyDown(document.activeElement!, { key: k, [modifier]: true });
        expect(event, `${modifier} ${k}`).toBe(true);
        expect(document.activeElement, `${modifier} ${k}`).toBe(tab('Details'));
      }
    }
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

describe('FR-612 Trade Book', () => {
  const region = (name: string) => within(panel()).getByRole('region', { name });
  const choices = (el: HTMLElement) => within(el).getAllByRole('option').map(text);
  const book = () => openTab('Trade Book');

  it('NR-040 keeps Repeat last turn’s trades on the existing views and hides the order in each information view', () => {
    openBoard(withConsulate(start(), ARVELIA));
    order({ kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 });
    act(() => useGameStore.getState().advanceTurn());
    const repeat = () => within(dialog()).queryByRole('button', { name: "Repeat last turn's trades" });
    expect(repeat()).toBeTruthy();
    openTab('Details');
    expect(repeat()).toBeTruthy();
    book();
    expect(repeat()).toBeNull();
    openTab('Trade policies');
    expect(repeat()).toBeTruthy();
    const mode = within(panel()).getByRole('combobox', { name: 'Map mode' }) as HTMLSelectElement;
    for (const label of ['Relationships', 'Political status', 'Trade policies']) {
      const option = within(mode).getByRole('option', { name: label }) as HTMLOptionElement;
      fireEvent.change(mode, { target: { value: option.value } });
      expect(Boolean(repeat()), label).toBe(label === 'Trade policies');
    }
  });

  it('requires a positive bid in this round and withdraws access immediately on cancellation', () => {
    openBoard(withConsulate(start(), ARVELIA));
    book();
    expect(within(panel()).queryByRole('combobox')).toBeNull();
    expect(text(panel())).toMatch(/bid/i);
    order({ kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 });
    const current = region('Current turn 1');
    expect(choices(current)).toEqual(['Coal']);
    expect(text(current)).toMatch(/Our remaining holds\D*3/i);
    expect(text(current)).toMatch(/Arvelia\D*3 units/i);
    expect(text(current)).toMatch(/Sundmark\D*1 unit.*no consulate/i);
    const preferences = within(current).getAllByRole('list', { name: 'Seller preference' });
    expect(within(preferences[0]).getAllByRole('listitem').map(text)).toEqual(['Valdoria', 'Testland']);
    expect(within(panel()).queryByRole('region', { name: /Settled/ })).toBeNull();
    order({ kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 0 });
    expect(within(current).queryByRole('combobox')).toBeNull();
    expect(text(panel())).not.toMatch(/Arvelia|Seller preference/);
  });

  it('scopes an unfilled prior bid, offers and encounters to the viewer, commodity and turn', () => {
    const base = start();
    const game: GameState = { ...base, turn: 4, market: { ...marketOf(base),
      orders: { [N1]: { buy: { timber: 1 }, sell: {} } },
      lastOrders: {
        [N1]: { buy: { wool: 1, coal: 2 }, sell: { timber: 3 } },
        [N2]: { buy: { coal: 2 }, sell: { wool: 4, timber: 17 } },
      },
    } };
    openBoard(game);
    const purchase = { type: 'goods-bought', nationId: N1, commodity: ResourceType.Coal, amount: 1, price: 100, cost: 100, counterpartyId: ARVELIA } as const;
    act(() => useGameStore.setState({ eventLog: [
      { turn: 2, year: 1815, events: [{ ...purchase, amount: 91 }] },
      { turn: 3, year: 1815, events: [purchase, { ...purchase, nationId: N2, amount: 92 }, { ...purchase, commodity: ResourceType.Timber, amount: 93 },
        { ...purchase, counterpartyId: N2, amount: 94 },
        { type: 'offer-missed', nationId: N1, counterpartyId: SUNDMARK, commodity: ResourceType.Coal, amount: 1, reason: 'no-hold' }] },
    ] }));
    book();
    expect(choices(region('Current turn 4'))).toEqual(['Timber']);
    const settled = region('Settled turn 3');
    expect(choices(settled).sort()).toEqual(['Coal', 'Wool']);
    const select = within(settled).getByRole('combobox', { name: 'Commodity' });
    fireEvent.change(select, { target: { value: 'wool' } });
    expect(text(settled)).toMatch(/Valdoria\D*4 units/);
    expect(text(within(settled).getByRole('list', { name: 'Bidding Great Powers' }))).toBe('Testland');
    fireEvent.change(select, { target: { value: 'coal' } });
    expect(within(within(settled).getByRole('list', { name: 'Bidding Great Powers' })).getAllByRole('listitem').map(text)).toEqual(['Testland', 'Valdoria']);
    expect(text(settled)).toMatch(/Bought 1 Coal from Arvelia/);
    expect(text(settled)).toMatch(/Sundmark wanted to sell us 1 Coal \(no free hold\)/);
    expect(readable(settled)).not.toMatch(/91|92|93|94|17|preference|remaining holds/i);
    const before = readable(settled);
    act(() => useGameStore.setState({ game: setPair({ ...game, minorNations: game.minorNations.map(m => ({ ...m, colonyOf: N2 })) }, N1, ARVELIA, { points: 80 }) }));
    expect(readable(settled)).toBe(before);
    act(() => useGameStore.setState({ eventLog: [] }));
    expect(text(settled)).toContain('Deal Book report unavailable for this turn.');
    expect(text(settled)).not.toMatch(/Bought 1 Coal|Sundmark wanted to sell/);
    expect(within(within(settled).getByRole('list', { name: 'Bidding Great Powers' })).getAllByRole('listitem').map(text)).toEqual(['Testland', 'Valdoria']);
    act(() => useGameStore.setState({ game: { ...game, market: { ...marketOf(game), lastOrders: undefined } } }));
    expect(within(panel()).queryByRole('region', { name: /Settled/ })).toBeNull();
    expect(submitted).toEqual([]);
  });

  it('NR-040 has identical text and accessible names on Normal and Demo around a rival private reservation, bid and boycott', () => {
    const base = start();
    const game: GameState = { ...base, market: { ...marketOf(base), orders: { [N1]: { sell: {}, buy: { coal: 1 } } } } };
    openBoard(game);
    book();
    const expected = readable(dialog());
    const boycottIntent = { id: 'private', turn: 1, nationId: N2, targetId: ARVELIA, kind: 'trade-policy', boycott: true, subsidyPercent: 0 };
    for (const difficulty of ['normal', 'demo'] as const) {
      const changed = setTreasury(game, N2, 73);
      act(() => useGameStore.setState({ game: { ...changed, difficulty, intents: [boycottIntent],
        market: { ...marketOf(game), orders: { ...marketOf(game).orders, [N2]: { buy: { coal: 3 }, sell: { wool: 1 } } } },
      } }));
      expect(readable(dialog())).toBe(expected);
    }
    expect(submitted).toEqual([]);
  });

  it('keeps the Two islands world market without a Trade Book', () => {
    openBoard(newGame({ seed: 1, world: 'two-islands' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Trade Book' })).toBeNull();
  });
});
