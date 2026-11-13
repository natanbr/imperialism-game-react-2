// @vitest-environment jsdom
// M7 UI half. FR-194: in "partners" the market dialog is the Board of Trade (Imp1 Board of Trade and Trade Book, rules 11
// sections 1 and 1.2): its rows in the FR-186 order, each with Price, our stock and today's bid or offer control (at most
// 4 bids, a row with a bid has no offer), "Sellers:" the minors offering it, for goods "Buyers:" the minors' demand, a
// minor the player cannot trade with marked "no consulate", "at war" or "boycott", and the free holds as "Holds: 3 of 4
// free". In "world" the v1 dialog is unchanged (tests/ui/marketDialog).
// The rows come from the React-free helper components/market/boardView.ts; every control sends one order (FR-022).
// Review fix round: a "+" the engine would refuse is disabled with its reason, and the note (FR-248); the marks and
// favourites as this turn's diplomacy phase will leave them (FR-246).
// QA fix round: the column "In warehouse" and the counts as units ("Arvelia: 2 units"), the favourites named once in the
// note (FR-251); a bid nobody may sell us and an offer nobody may buy are refused when ordered, the reason beside the
// disabled "+", and a bid or offer a rival may win says so (FR-252, FR-253); "No minor trades this" (FR-254); every
// disabled control shows its reason as visible text, its accessible description, and there is no "−" at 0 (FR-257).
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MarketModal } from '@/components/MarketModal';
import { CapitalModal } from '@/components/CapitalModal';
import { ActionButtons } from '@/components/HUD/index';
import { barredText, boardView, partnerText, BARRIER_TEXT } from '@/components/market/boardView';
import { useGameStore } from '@/store/rootStore';
import { BOARD_ORDER, marketOf, newGame, pairKey, tradeOrdersOf, type Order } from '@/engine';
import { TRADE_COMMODITIES } from '@/definisions/marketPrices';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { setPair, setTile, setWarehouse, stockOf, treasury } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const N2 = 'nation-2';
const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';
const LORRAN = 'minor-3';
const PELLIS = 'minor-4';

const BOARD = 'Board of Trade — Testland';
let submitted: Order[] = [];

/** A new continent game: "partners" (FR-242). Testland is nation-1; on turn 1 every minor favours it (FR-187, FR-197). */
const start = (): GameState => newGame({ seed: 1, world: 'continent' });

/** Opens the market dialog on `state` for the player and records every order it submits. */
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

const dialog = () => screen.getByRole('dialog', { name: BOARD });
const row = (commodity: string) => within(dialog()).getByTestId(`trade-row-${commodity}`);
const cell = (commodity: string, part: string) => text(within(row(commodity)).getByTestId(part));
/** The lines of a row's "Sellers:" or "Buyers:" list, as the screen reads them. */
const partners = (commodity: string, side: 'sellers' | 'buyers') =>
  within(within(row(commodity)).getByRole('list', { name: side === 'sellers' ? 'Sellers' : 'Buyers' }))
    .getAllByRole('listitem')
    .map((li) => text(li));
const button = (commodity: string, name: string) => within(row(commodity)).getByRole('button', { name });
/** The text of the elements an element's aria-describedby names: its accessible description. */
const description = (el: HTMLElement): string =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
/** A "+" button with what the row shows beside it: disabled, its title, the visible note and the description. */
const plus = (commodity: string, name: string) => {
  const b = button(commodity, name) as HTMLButtonElement;
  const side = name.startsWith('Bid') ? 'bid' : 'offer';
  const note = within(row(commodity)).queryByTestId(`${side}-note`);
  return { disabled: b.disabled, title: b.title, note: note ? text(note) : null, description: description(b) };
};
const now = () => useGameStore.getState().game;
/** Test setup: the nation holds a consulate in the minor (FR-163). */
const withConsulate = (s: GameState, nationId: string, minorId: string): GameState =>
  setPair(s, nationId, minorId, { consulates: [...s.diplomacy[pairKey(nationId, minorId)].consulates, nationId].sort() });
const setTreasuryOf = (s: GameState, treasury: number): GameState => ({ ...s, nations: s.nations.map((n) => (n.id === N1 ? { ...n, treasury } : n)) });
/** Sends an order through the store, as a dialog would, and expects it accepted. */
const order = (o: Order) => {
  let result: unknown;
  act(() => {
    result = useGameStore.getState().submitOrder(o);
  });
  expect(result).toEqual({ ok: true });
};

const NOTE_START =
  'Deals settle at End Turn at the board price; bought goods arrive next turn. Minor nations sell what their land yields and buy only clothing, furniture and hardware. A minor trades only where we hold a consulate (one ordered this turn counts) and serves the Great Power it favours first';

describe('FR-194 the Board of Trade: what it shows', () => {
  it('FR-194 in "partners" the market dialog is named "Board of Trade", not "World market"', () => {
    openBoard(start());
    expect(dialog()).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: /World market/ })).toBeNull();
    expect(text(within(dialog()).getByRole('heading', { level: 2 }))).toBe(BOARD);
  });

  it("FR-194 the HUD's Open Market button and the capital's Trade button open it", () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: start(), activeNationId: N1 });
    const first = render(<><ActionButtons /><MarketModal /></>);
    fireEvent.click(screen.getByRole('button', { name: /Open Market/ }));
    expect(dialog()).toBeTruthy();
    first.unmount();

    useGameStore.setState({ ...useGameStore.getInitialState(), game: start(), activeNationId: N1, isCapitalOpen: true });
    render(<><CapitalModal /><MarketModal /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Trade' }));
    expect(dialog()).toBeTruthy();
  });

  it('FR-194 FR-186 one row per tradeable commodity in the Board order: clothing first, then fuel and oil last', () => {
    openBoard(start());
    const rows = within(dialog()).getAllByTestId(/^trade-row-/).map((el) => el.dataset.testid);
    expect(rows).toEqual(BOARD_ORDER.map((c) => `trade-row-${c}`));
    expect(rows[0]).toBe('trade-row-clothing');
    expect(rows.slice(-2)).toEqual(['trade-row-fuel', 'trade-row-oil']);
    expect(rows).toHaveLength(TRADE_COMMODITIES.length);
    expect(cell('ironOre', 'name')).toBe('Iron Ore');
  });

  it('FR-194 FR-251 each row shows the board price, our own stock under "In warehouse", the bid and the offer', () => {
    const s = start();
    const market = marketOf(s);
    openBoard(setWarehouse({ ...s, market: { ...market, prices: { ...market.prices, coal: 123 } } }, N1, { coal: 7 }));
    const headers = within(dialog()).getAllByRole('columnheader').map((h) => text(h));
    expect(headers).toEqual(['Commodity', 'Price', 'In warehouse', 'Bid', 'Offer', 'Minor nations']);
    expect(cell('coal', 'price')).toBe('$123');
    expect(cell('coal', 'available')).toBe('7');
    expect(cell('clothing', 'price')).toBe('$900');
    expect(cell('clothing', 'available')).toBe('0');
    expect(cell('coal', 'bid')).toBe('0');
    expect(cell('coal', 'offer')).toBe('0');
  });

  it('FR-194 FR-183 FR-251 Sellers: each minor offering the commodity with its units ("Arvelia: 4 units", "Sundmark: 1 unit"), marked "no consulate" without one', () => {
    openBoard(start());
    expect(partners('timber', 'sellers')).toEqual([
      'Arvelia: 4 units (no consulate)',
      'Sundmark: 1 unit (no consulate)',
      'Lorran: 2 units (no consulate)',
      'Pellis: 1 unit (no consulate)',
    ]);
    expect(partners('coal', 'sellers')).toEqual(['Arvelia: 3 units (no consulate)', 'Sundmark: 1 unit (no consulate)', 'Pellis: 1 unit (no consulate)']);
    // The label is on the screen too, not only the list's name
    expect(text(within(row('timber')).getByTestId('sellers'))).toMatch(/^Sellers: Arvelia: 4 units/);
    // Raw materials have no minor buyers
    expect(within(row('timber')).queryByRole('list', { name: 'Buyers' })).toBeNull();
  });

  it('FR-194 FR-184 FR-251 FR-254 Buyers, for goods: each minor\'s demand in units; a row no minor trades has neither list and says "No minor trades this"', () => {
    openBoard(start());
    for (const good of ['clothing', 'furniture', 'hardware']) {
      expect(partners(good, 'buyers')).toEqual([
        'Arvelia: 2 units (no consulate)',
        'Sundmark: 2 units (no consulate)',
        'Lorran: 2 units (no consulate)',
        'Pellis: 2 units (no consulate)',
      ]);
      expect(text(within(row(good)).getByTestId('buyers'))).toMatch(/^Buyers: Arvelia: 2 units/);
      expect(within(row(good)).queryByRole('list', { name: 'Sellers' })).toBeNull();
      expect(within(row(good)).queryByTestId('no-minor')).toBeNull();
    }
    for (const nobody of ['lumber', 'steel', 'armaments', 'wool', 'oil']) {
      expect(within(row(nobody)).queryByRole('list')).toBeNull();
      expect(cell(nobody, 'no-minor')).toBe('No minor trades this');
    }
    expect(within(row('coal')).queryByTestId('no-minor')).toBeNull();
  });

  it('FR-251 FR-187 the favourites are named once, in the note, not in every chip', () => {
    openBoard(start());
    expect(text(within(dialog()).getByTestId('board-favourites'))).toBe('Arvelia, Sundmark, Lorran and Pellis favour Testland.');
    expect(within(dialog()).queryByText(/favours Testland/)).toBeNull();
  });

  it('FR-251 FR-187 the FR example: Arvelia favours Valdoria at 40 points; its chip keeps only its units', () => {
    openBoard(setPair(start(), N2, ARVELIA, { points: 40 }));
    expect(text(within(dialog()).getByTestId('board-favourites'))).toBe('Arvelia favours Valdoria; Sundmark, Lorran and Pellis favour Testland.');
    expect(partners('coal', 'sellers')[0]).toBe('Arvelia: 3 units (no consulate)');
  });

  it('FR-194 FR-185 a consulate held, or ordered this turn, lifts the mark; war and a boycott are marked', () => {
    let s = withConsulate(start(), N1, ARVELIA);
    s = setPair(s, N1, LORRAN, { war: { aggressors: [N1], since: 1 } });
    s = setPair(withConsulate(s, N1, SUNDMARK), N1, SUNDMARK, { boycotts: [SUNDMARK] });
    openBoard(s);
    expect(partners('timber', 'sellers')).toEqual([
      'Arvelia: 4 units',
      'Sundmark: 1 unit (boycott)',
      'Lorran: 2 units (at war)',
      'Pellis: 1 unit (no consulate)',
    ]);
    // The mark is its own element, so it can look different from the name (and reads as part of the line)
    expect(within(row('timber')).getAllByTestId('barrier').map((el) => text(el))).toEqual(['(boycott)', '(at war)', '(no consulate)']);

    // A consulate ordered this turn counts: the diplomacy phase runs before trade (FR-163, FR-185)
    order({ kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: PELLIS });
    expect(partners('timber', 'sellers')[3]).toBe('Pellis: 1 unit');
  });

  it('FR-246 a war declared this turn marks the minor "at war" at once; a boycott lifted this turn lifts the mark', () => {
    let s = withConsulate(withConsulate(start(), N1, ARVELIA), N1, SUNDMARK);
    s = setPair(s, N1, SUNDMARK, { boycotts: [N1] });
    openBoard(s);
    expect(partners('coal', 'sellers').slice(0, 2)).toEqual(['Arvelia: 3 units', 'Sundmark: 1 unit (boycott)']);

    order({ kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA });
    order({ kind: 'setTradePolicy', nationId: N1, targetId: SUNDMARK, subsidyPercent: 0, boycott: false });

    expect(partners('coal', 'sellers').slice(0, 2)).toEqual(['Arvelia: 3 units (at war)', 'Sundmark: 1 unit']);
    // The war also costs Testland points with every minor (FR-168), so this turn's trade phase serves Valdoria first
    expect(text(within(dialog()).getByTestId('board-favourites'))).toBe('Arvelia, Sundmark, Lorran and Pellis favour Valdoria.');
    // Sundmark, open to Testland, serves Valdoria first: the coal bid is allowed and says so (FR-252)
    expect(plus('coal', 'Bid one more Coal')).toEqual({ disabled: false, title: '', note: 'Sundmark favours Valdoria', description: 'Sundmark favours Valdoria' });
  });

  it('FR-248 FR-253 FR-251 the note under the title says when deals settle, that minors buy only clothing, furniture and hardware, and whom each favours; it is the dialog\'s description', () => {
    openBoard(start());
    const note = document.getElementById(dialog().getAttribute('aria-describedby')!)!;
    expect(text(note)).toBe(`${NOTE_START}: Arvelia, Sundmark, Lorran and Pellis favour Testland.`);
  });

  it('FR-194 the cash, "Holds: 4 of 4 free" and the bids used of 4', () => {
    openBoard(start());
    expect(text(within(dialog()).getByTestId('market-cash'))).toBe('Cash: $10,000');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 4 of 4 free');
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Bids: 0 of 4');
  });
});

describe('FR-252 FR-253 FR-257 the reasons beside the controls', () => {
  it('FR-252 FR-257 a new game: a bid nobody sells shows "No minor nation sells this", a bid without a consulate "We need a consulate with a seller", beside the disabled "+" and as its description', () => {
    openBoard(start());
    const noSeller = { disabled: true, title: 'No minor nation sells this', note: 'No minor nation sells this', description: 'No minor nation sells this' };
    for (const c of ['Clothing', 'Lumber', 'Steel', 'Wool', 'Oil']) expect(plus(c === 'Oil' ? 'oil' : c.toLowerCase(), `Bid one more ${c}`)).toEqual(noSeller);
    const consulate = 'We need a consulate with a seller';
    for (const [c, name] of [['coal', 'Coal'], ['timber', 'Timber'], ['ironOre', 'Iron Ore'], ['cotton', 'Cotton']]) {
      expect(plus(c, `Bid one more ${name}`)).toEqual({ disabled: true, title: consulate, note: consulate, description: consulate });
    }
    fireEvent.click(button('coal', 'Bid one more Coal'));
    expect(submitted).toEqual([]);
  });

  it('FR-253 FR-257 an offer nobody buys shows "No one buys this"; goods without a consulate with a buyer "We need a consulate with a buyer"', () => {
    openBoard(setWarehouse(start(), N1, { clothing: 2 }));
    expect(plus('lumber', 'Offer one more Lumber')).toEqual({ disabled: true, title: 'No one buys this', note: 'No one buys this', description: 'No one buys this' });
    expect(plus('timber', 'Offer one more Timber').note).toBe('No one buys this');
    const consulate = 'We need a consulate with a buyer';
    expect(plus('clothing', 'Offer one more Clothing')).toEqual({ disabled: true, title: consulate, note: consulate, description: consulate });

    order({ kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: PELLIS });
    expect(plus('clothing', 'Offer one more Clothing')).toEqual({ disabled: false, title: '', note: null, description: '' });
  });

  it('FR-252 FR-253 war and boycotts name the barrier: "We are at war with every seller", "A boycott bars every buyer"', () => {
    let s = start();
    for (const m of [ARVELIA, SUNDMARK, PELLIS]) s = setPair(withConsulate(s, N1, m), N1, m, { war: { aggressors: [N1], since: 1 } });
    s = setPair(withConsulate(s, N1, LORRAN), N1, LORRAN, { boycotts: [N1] });
    openBoard(setWarehouse(s, N1, { furniture: 1 }));
    expect(plus('coal', 'Bid one more Coal').note).toBe('We are at war with every seller');
    expect(plus('furniture', 'Offer one more Furniture').note).toBe('War or a boycott bars every buyer');
    expect(barredText(['boycott', 'boycott'], 'buyer')).toBe('A boycott bars every buyer');
    expect(barredText(['at-war', 'no-consulate'], 'seller')).toBe('We need a consulate with a seller');
  });

  it('FR-253 an offer only a rival Great Power may buy is allowed and says so: "Only Valdoria may buy this"', () => {
    openBoard(withConsulate(start(), N2, ARVELIA));
    expect(plus('timber', 'Offer one more Timber')).toEqual({
      disabled: false,
      title: '',
      note: 'Only Valdoria may buy this',
      description: 'Only Valdoria may buy this',
    });
    expect(plus('lumber', 'Offer one more Lumber').note).toBe('No one buys this');
  });

  it('FR-252 a bid a rival may win is allowed and says so: "Arvelia favours Valdoria"; a minor that favours us says nothing', () => {
    openBoard(setPair(withConsulate(withConsulate(start(), N1, ARVELIA), N1, PELLIS), N2, ARVELIA, { points: 40 }));
    expect(plus('coal', 'Bid one more Coal')).toEqual({ disabled: false, title: '', note: 'Arvelia favours Valdoria', description: 'Arvelia favours Valdoria' });
    // Lorran sells no coal; Pellis (favours Testland) sells timber too, Arvelia timber as well
    expect(plus('timber', 'Bid one more Timber').note).toBe('Arvelia favours Valdoria');
    fireEvent.click(button('coal', 'Bid one more Coal'));
    expect(tradeOrdersOf(now(), N1).buy.coal).toBe(1);
  });

  it('FR-257 no disabled control without a visible reason: every disabled "+" has its note as its description, and there is no "−" at 0', () => {
    openBoard(start());
    const all = within(dialog()).getAllByRole('button').filter((b) => /one (more|less)/.test(b.getAttribute('aria-label') ?? ''));
    expect(all.filter((b) => /one less/.test(b.getAttribute('aria-label')!))).toEqual([]);
    const disabled = all.filter((b) => (b as HTMLButtonElement).disabled);
    expect(disabled).toHaveLength(34);
    for (const b of disabled) {
      expect(description(b)).not.toBe('');
      expect(description(b)).toBe(b.title);
    }
    // The place of "−" keeps the stepper's width
    expect(within(row('coal')).getByTestId('bid-less-place').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('FR-194 the Board of Trade: orders', () => {
  /** A new game with a consulate in Arvelia: coal, timber, iron ore and cotton can be bid for, goods offered. */
  const open = () => withConsulate(start(), N1, ARVELIA);

  it('FR-194 FR-062 Bid + sends buyCommodity one higher: the bid, the cash, the holds and the bids update', () => {
    openBoard(open());
    fireEvent.click(button('coal', 'Bid one more Coal'));
    fireEvent.click(button('coal', 'Bid one more Coal'));

    expect(submitted).toEqual([
      { kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 1 },
      { kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 2 },
    ]);
    expect(tradeOrdersOf(now(), N1).buy.coal).toBe(2);
    expect(cell('coal', 'bid')).toBe('2');
    expect(treasury(now(), N1)).toBe(10000 - 200);
    expect(text(within(dialog()).getByTestId('market-cash'))).toBe('Cash: $9,800');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 2 of 4 free');
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Bids: 1 of 4');
  });

  it('FR-194 FR-062 FR-257 Bid − sends buyCommodity one lower and refunds; at 0 there is no "−", only its place', () => {
    openBoard(open());
    expect(within(row('coal')).queryByRole('button', { name: 'Bid one less Coal' })).toBeNull();
    fireEvent.click(button('coal', 'Bid one more Coal'));
    expect((button('coal', 'Bid one less Coal') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button('coal', 'Bid one less Coal'));
    expect(submitted.at(-1)).toEqual({ kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 0 });
    expect(treasury(now(), N1)).toBe(10000);
    expect(cell('coal', 'bid')).toBe('0');
    expect(within(row('coal')).queryByRole('button', { name: 'Bid one less Coal' })).toBeNull();
  });

  it('FR-194 FR-061 Offer + sends sellCommodity one higher: the unit leaves the warehouse and takes a hold; − gives it back', () => {
    openBoard(setWarehouse(open(), N1, { clothing: 2 }));
    fireEvent.click(button('clothing', 'Offer one more Clothing'));
    expect(submitted).toEqual([{ kind: 'sellCommodity', nationId: N1, commodity: 'clothing', amount: 1 }]);
    expect(cell('clothing', 'offer')).toBe('1');
    expect(cell('clothing', 'available')).toBe('1');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 3 of 4 free');

    fireEvent.click(button('clothing', 'Offer one less Clothing'));
    expect(submitted.at(-1)).toEqual({ kind: 'sellCommodity', nationId: N1, commodity: 'clothing', amount: 0 });
    expect(stockOf(now(), N1, 'clothing')).toBe(2);
  });

  it('FR-194 a row with a bid has no offer control, and a row with an offer no bid control', () => {
    openBoard(setWarehouse(open(), N1, { clothing: 2 }));
    fireEvent.click(button('coal', 'Bid one more Coal'));
    expect(within(row('coal')).queryByRole('button', { name: /Offer one/ })).toBeNull();
    expect(within(row('coal')).queryByTestId('offer')).toBeNull();

    fireEvent.click(button('clothing', 'Offer one more Clothing'));
    expect(within(row('clothing')).queryByRole('button', { name: /Bid one/ })).toBeNull();
    expect(within(row('clothing')).queryByTestId('bid')).toBeNull();

    // Back to 0: both controls again
    fireEvent.click(button('coal', 'Bid one less Coal'));
    expect(button('coal', 'Offer one more Coal')).toBeTruthy();
  });

  it('FR-194 FR-248 FR-257 every hold taken: "Holds: 0 of 4 free", each "+" open to trade disabled saying so beside it, and a press sends nothing', () => {
    openBoard(setWarehouse(open(), N1, { clothing: 2 }));
    for (const c of ['coal', 'timber', 'ironOre', 'cotton']) fireEvent.click(button(c, `Bid one more ${cell(c, 'name')}`));
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Bids: 4 of 4');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 0 of 4 free');
    const sent = submitted.length;

    const holds = 'No free hold this turn';
    for (const [commodity, name] of [['coal', 'Bid one more Coal'], ['timber', 'Bid one more Timber'], ['clothing', 'Offer one more Clothing']]) {
      expect(plus(commodity, name)).toEqual({ disabled: true, title: holds, note: holds, description: holds });
    }
    // The market's reason comes first (FR-252): wool is sold by no minor, whatever the holds
    expect(plus('wool', 'Bid one more Wool').title).toBe('No minor nation sells this');
    fireEvent.click(button('coal', 'Bid one more Coal'));
    expect(submitted).toHaveLength(sent);
    expect(within(dialog()).queryByRole('alert')).toBeNull();
    // "−" stays: lowering is always allowed
    expect((button('coal', 'Bid one less Coal') as HTMLButtonElement).disabled).toBe(false);
  });

  it('FR-248 at most 4 bids: with holds to spare a fifth commodity\'s Bid "+" is disabled with "Already 4 bids this turn, the most"; a row already bid on is not', () => {
    // A fifth commodity a minor sells: wool on one of Arvelia's tiles; Sundmark also sells the other four
    let s = setTile(withConsulate(open(), N1, SUNDMARK), '10-4', { resource: { type: ResourceType.Wool, level: 1, discovered: true } });
    s = { ...s, nations: s.nations.map((n) => (n.id === N1 ? { ...n, merchantMarine: { ...n.merchantMarine, holds: 6 } } : n)) };
    openBoard(s);
    for (const c of ['coal', 'timber', 'ironOre', 'cotton']) fireEvent.click(button(c, `Bid one more ${cell(c, 'name')}`));
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 2 of 6 free');

    const bids = 'Already 4 bids this turn, the most';
    expect(plus('wool', 'Bid one more Wool')).toEqual({ disabled: true, title: bids, note: bids, description: bids });
    expect((button('coal', 'Bid one more Coal') as HTMLButtonElement).disabled).toBe(false);
    expect(button('coal', 'Bid one more Coal').title).toBe('');
  });

  it('FR-248 Offer "+" with nothing in the warehouse says "None left in the warehouse"; Bid "+" without the money "Not enough money"', () => {
    openBoard(setWarehouse(setTreasuryOf(open(), 50), N1, { furniture: 1 }));
    expect(plus('clothing', 'Offer one more Clothing')).toMatchObject({ disabled: true, title: 'None left in the warehouse', note: 'None left in the warehouse' });
    expect(plus('coal', 'Bid one more Coal')).toMatchObject({ disabled: true, title: 'Not enough money', note: 'Not enough money' });
    // A row the player can trade has an enabled "+" with no title
    expect(plus('furniture', 'Offer one more Furniture')).toEqual({ disabled: false, title: '', note: null, description: '' });
  });

  it('FR-194 Close closes the Board of Trade', () => {
    openBoard(start());
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close Board of Trade' }));
    expect(useGameStore.getState().isMarketOpen).toBe(false);
  });
});

describe('FR-194 in "world" the v1 dialog is unchanged', () => {
  it('FR-194 FR-073 two-islands, and the continent with market "world", show the World market without minor nations', () => {
    for (const state of [newGame({ seed: 1 }), newGame({ seed: 1, world: 'continent', market: 'world' })]) {
      const view = openBoard(state);
      const world = screen.getByRole('dialog', { name: 'World market — Testland' });
      expect(screen.queryByRole('dialog', { name: BOARD })).toBeNull();
      const rows = within(world).getAllByTestId(/^trade-row-/).map((el) => el.dataset.testid);
      expect(rows).toEqual(TRADE_COMMODITIES.map((c) => `trade-row-${c}`));
      expect(within(world).queryByText(/Sellers|Buyers|favours/)).toBeNull();
      expect(within(world).getByRole('button', { name: 'Sell one more Lumber' })).toBeTruthy();
      // The v1 stepper keeps its disabled "−" at 0
      expect((within(world).getByRole('button', { name: 'Sell one less Lumber' }) as HTMLButtonElement).disabled).toBe(true);
      expect(text(within(world).getByTestId('market-holds'))).toMatch(/^Cargo holds:/);
      view.unmount();
    }
  });
});

describe('FR-194 boardView, the screen\'s rows without React', () => {
  it('FR-194 FR-251 BARRIER_TEXT words, partnerText and the view of a new continent game', () => {
    expect(BARRIER_TEXT).toEqual({ 'no-consulate': 'no consulate', 'at-war': 'at war', boycott: 'boycott', 'not-a-partner': 'no trade' });
    const s = start();
    const names: Record<string, string> = { 'nation-1': 'Testland', 'nation-2': 'Valdoria', [ARVELIA]: 'Arvelia' };
    expect(partnerText({ minorId: ARVELIA, units: 3, favouriteId: N2 }, (id) => names[id] ?? id)).toBe('Arvelia: 3 units');
    expect(partnerText({ minorId: ARVELIA, units: 1 }, (id) => names[id] ?? id)).toBe('Arvelia: 1 unit');
    const view = boardView(s, s.nations[0]);
    expect(view.holdsText).toBe('Holds: 4 of 4 free');
    expect(view.bids).toEqual({ used: 0, max: 4 });
    expect(view.favouritesText).toBe('Arvelia, Sundmark, Lorran and Pellis favour Testland.');
    expect(view.rows.map((r) => r.commodity)).toEqual([...BOARD_ORDER]);
    const coal = view.rows.find((r) => r.commodity === 'coal')!;
    expect(coal.sellers.map((p) => p.minorId)).toEqual([ARVELIA, SUNDMARK, PELLIS]);
    expect(coal.sellers[0]).toEqual({ minorId: ARVELIA, text: 'Arvelia: 3 units', barrier: 'no consulate' });
    expect(coal.bidNote).toEqual({ text: 'We need a consulate with a seller', tone: 'refusal' });
    expect(coal.offerNote).toEqual({ text: 'No one buys this', tone: 'refusal' });
    expect(coal.noMinorText).toBeUndefined();
    expect(view.rows.find((r) => r.commodity === 'armaments')!.noMinorText).toBe('No minor trades this');
    expect(view.rows.find((r) => r.commodity === ResourceType.Coal)!.bidMoreRefusal).toBe('We need a consulate with a seller');
  });
});
