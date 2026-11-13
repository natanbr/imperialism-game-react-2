// @vitest-environment jsdom
// M7 UI half. FR-194: in "partners" the market dialog is the Board of Trade (Imp1 Board of Trade and Trade Book, rules 11
// sections 1 and 1.2): its rows in the FR-186 order, each with Price, Available and today's bid or offer control (at most
// 4 bids, a row with a bid has no offer), "Sellers:" the minors offering it with units and favourite ("Arvelia 3, favours
// Valdoria"), for goods "Buyers:" the minors' demand, a minor the player cannot trade with marked "no consulate", "at war"
// or "boycott", and the free holds as "Holds: 3 of 4 free". In "world" the v1 dialog is unchanged (tests/ui/marketDialog).
// The rows come from the React-free helper components/market/boardView.ts; every control sends one order (FR-022).
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MarketModal } from '@/components/MarketModal';
import { CapitalModal } from '@/components/CapitalModal';
import { ActionButtons } from '@/components/HUD/index';
import { boardView, partnerText, BARRIER_TEXT } from '@/components/market/boardView';
import { useGameStore } from '@/store/rootStore';
import { BOARD_ORDER, marketOf, newGame, pairKey, tradeOrdersOf, type Order } from '@/engine';
import { TRADE_COMMODITIES } from '@/definisions/marketPrices';
import type { GameState } from '@/types/GameState';
import { setPair, setWarehouse, stockOf, treasury } from '../engine/fixtures';
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

/** A new continent game: "partners" (FR-182). Testland is nation-1; on turn 1 every minor favours it (FR-187, FR-197). */
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
const now = () => useGameStore.getState().game;
/** Test setup: the nation holds a consulate in the minor (FR-163). */
const withConsulate = (s: GameState, nationId: string, minorId: string): GameState =>
  setPair(s, nationId, minorId, { consulates: [...s.diplomacy[pairKey(nationId, minorId)].consulates, nationId].sort() });

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

  it('FR-194 each row shows the board price, the warehouse stock as Available, the bid and the offer', () => {
    const s = start();
    const market = marketOf(s);
    openBoard(setWarehouse({ ...s, market: { ...market, prices: { ...market.prices, coal: 123 } } }, N1, { coal: 7 }));
    const headers = within(dialog()).getAllByRole('columnheader').map((h) => text(h));
    expect(headers).toEqual(['Commodity', 'Price', 'Available', 'Bid', 'Offer', 'Minor nations']);
    expect(cell('coal', 'price')).toBe('$123');
    expect(cell('coal', 'available')).toBe('7');
    expect(cell('clothing', 'price')).toBe('$900');
    expect(cell('clothing', 'available')).toBe('0');
    expect(cell('coal', 'bid')).toBe('0');
    expect(cell('coal', 'offer')).toBe('0');
  });

  it('FR-194 FR-183 Sellers: each minor offering the commodity with its units and favourite, marked "no consulate" without one', () => {
    openBoard(start());
    expect(partners('timber', 'sellers')).toEqual([
      'Arvelia 4, favours Testland (no consulate)',
      'Sundmark 1, favours Testland (no consulate)',
      'Lorran 2, favours Testland (no consulate)',
      'Pellis 1, favours Testland (no consulate)',
    ]);
    expect(partners('coal', 'sellers')).toEqual([
      'Arvelia 3, favours Testland (no consulate)',
      'Sundmark 1, favours Testland (no consulate)',
      'Pellis 1, favours Testland (no consulate)',
    ]);
    // The label is on the screen too, not only the list's name
    expect(text(within(row('timber')).getByTestId('sellers'))).toMatch(/^Sellers: Arvelia 4/);
    // Raw materials have no minor buyers
    expect(within(row('timber')).queryByRole('list', { name: 'Buyers' })).toBeNull();
  });

  it('FR-194 FR-184 Buyers, for goods: each minor\'s demand with its favourite; a row nobody trades has neither list', () => {
    openBoard(start());
    for (const good of ['clothing', 'furniture', 'hardware']) {
      expect(partners(good, 'buyers')).toEqual([
        'Arvelia 2, favours Testland (no consulate)',
        'Sundmark 2, favours Testland (no consulate)',
        'Lorran 2, favours Testland (no consulate)',
        'Pellis 2, favours Testland (no consulate)',
      ]);
      expect(text(within(row(good)).getByTestId('buyers'))).toMatch(/^Buyers: Arvelia 2/);
      expect(within(row(good)).queryByRole('list', { name: 'Sellers' })).toBeNull();
    }
    for (const nobody of ['lumber', 'steel', 'armaments', 'oil']) {
      expect(within(row(nobody)).queryByRole('list')).toBeNull();
    }
  });

  it('FR-194 FR-187 the FR example: "Arvelia 3, favours Valdoria" when Valdoria stands higher with Arvelia', () => {
    openBoard(setPair(start(), N2, ARVELIA, { points: 40 }));
    expect(partners('coal', 'sellers')[0]).toBe('Arvelia 3, favours Valdoria (no consulate)');
    expect(partners('coal', 'sellers')[1]).toBe('Sundmark 1, favours Testland (no consulate)');
  });

  it('FR-194 FR-185 a consulate held, or ordered this turn, lifts the mark; war and a boycott are marked', () => {
    let s = withConsulate(start(), N1, ARVELIA);
    s = setPair(s, N1, LORRAN, { war: { aggressors: [N1], since: 1 } });
    s = setPair(withConsulate(s, N1, SUNDMARK), N1, SUNDMARK, { boycotts: [SUNDMARK] });
    openBoard(s);
    expect(partners('timber', 'sellers')).toEqual([
      'Arvelia 4, favours Testland',
      'Sundmark 1, favours Testland (boycott)',
      'Lorran 2, favours Testland (at war)',
      'Pellis 1, favours Testland (no consulate)',
    ]);
    // The mark is its own element, so it can look different from the name (and reads as part of the line)
    expect(within(row('timber')).getAllByTestId('barrier').map((el) => text(el))).toEqual(['(boycott)', '(at war)', '(no consulate)']);

    // A consulate ordered this turn counts: the diplomacy phase runs before trade (FR-163, FR-185)
    let result: unknown;
    act(() => {
      result = useGameStore.getState().submitOrder({ kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: PELLIS });
    });
    expect(result).toEqual({ ok: true });
    expect(partners('timber', 'sellers')[3]).toBe('Pellis 1, favours Testland');
  });

  it('FR-194 the cash, "Holds: 4 of 4 free" and the bids used of 4', () => {
    openBoard(start());
    expect(text(within(dialog()).getByTestId('market-cash'))).toBe('Cash: $10,000');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 4 of 4 free');
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Bids: 0 of 4');
  });
});

describe('FR-194 the Board of Trade: orders', () => {
  it('FR-194 FR-062 Bid + sends buyCommodity one higher: the bid, the cash, the holds and the bids update', () => {
    openBoard(start());
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

  it('FR-194 FR-062 Bid − sends buyCommodity one lower and refunds; − is disabled at 0', () => {
    openBoard(start());
    expect((button('coal', 'Bid one less Coal') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button('coal', 'Bid one more Coal'));
    fireEvent.click(button('coal', 'Bid one less Coal'));
    expect(submitted.at(-1)).toEqual({ kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 0 });
    expect(treasury(now(), N1)).toBe(10000);
    expect(cell('coal', 'bid')).toBe('0');
  });

  it('FR-194 FR-061 Offer + sends sellCommodity one higher: the unit leaves Available and takes a hold; − gives it back', () => {
    openBoard(start());
    fireEvent.click(button('lumber', 'Offer one more Lumber'));
    expect(submitted).toEqual([{ kind: 'sellCommodity', nationId: N1, commodity: 'lumber', amount: 1 }]);
    expect(cell('lumber', 'offer')).toBe('1');
    expect(cell('lumber', 'available')).toBe('9');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 3 of 4 free');

    fireEvent.click(button('lumber', 'Offer one less Lumber'));
    expect(submitted.at(-1)).toEqual({ kind: 'sellCommodity', nationId: N1, commodity: 'lumber', amount: 0 });
    expect(stockOf(now(), N1, 'lumber')).toBe(10);
  });

  it('FR-194 a row with a bid has no offer control, and a row with an offer no bid control', () => {
    openBoard(start());
    fireEvent.click(button('coal', 'Bid one more Coal'));
    expect(within(row('coal')).queryByRole('button', { name: /Offer one/ })).toBeNull();
    expect(within(row('coal')).queryByTestId('offer')).toBeNull();

    fireEvent.click(button('lumber', 'Offer one more Lumber'));
    expect(within(row('lumber')).queryByRole('button', { name: /Bid one/ })).toBeNull();
    expect(within(row('lumber')).queryByTestId('bid')).toBeNull();

    // Back to 0: both controls again
    fireEvent.click(button('coal', 'Bid one less Coal'));
    expect(button('coal', 'Offer one more Coal')).toBeTruthy();
  });

  it('FR-194 FR-062 at most 4 bids: "Bids: 4 of 4", and a fifth is refused in plain words, changing nothing', () => {
    openBoard(start());
    for (const c of ['coal', 'timber', 'ironOre', 'cotton']) fireEvent.click(button(c, `Bid one more ${cell(c, 'name')}`));
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Bids: 4 of 4');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 0 of 4 free');
    const before = now();

    fireEvent.click(button('wool', 'Bid one more Wool'));
    expect(submitted.at(-1)).toEqual({ kind: 'buyCommodity', nationId: N1, commodity: 'wool', amount: 1 });
    expect(now()).toBe(before);
    expect(text(within(dialog()).getByRole('alert'))).toBe('Purchase refused: over the limit.');
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
      expect(text(within(world).getByTestId('market-holds'))).toMatch(/^Cargo holds:/);
      view.unmount();
    }
  });
});

describe('FR-194 boardView, the screen\'s rows without React', () => {
  it('FR-194 BARRIER_TEXT words, partnerText and the view of a new continent game', () => {
    expect(BARRIER_TEXT).toEqual({ 'no-consulate': 'no consulate', 'at-war': 'at war', boycott: 'boycott', 'not-a-partner': 'no trade' });
    const s = start();
    const names: Record<string, string> = { 'nation-1': 'Testland', 'nation-2': 'Valdoria', [ARVELIA]: 'Arvelia' };
    expect(partnerText({ minorId: ARVELIA, units: 3, favouriteId: N2 }, (id) => names[id] ?? id)).toBe('Arvelia 3, favours Valdoria');
    expect(partnerText({ minorId: ARVELIA, units: 3 }, (id) => names[id] ?? id)).toBe('Arvelia 3');
    const view = boardView(s, s.nations[0]);
    expect(view.holdsText).toBe('Holds: 4 of 4 free');
    expect(view.bids).toEqual({ used: 0, max: 4 });
    expect(view.rows.map((r) => r.commodity)).toEqual([...BOARD_ORDER]);
    expect(view.rows.find((r) => r.commodity === 'coal')!.sellers.map((p) => p.minorId)).toEqual([ARVELIA, SUNDMARK, PELLIS]);
    expect(view.rows.find((r) => r.commodity === 'coal')!.sellers[0]).toEqual({ minorId: ARVELIA, text: 'Arvelia 3, favours Testland', barrier: 'no consulate' });
  });
});
