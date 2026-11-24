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
// Re-targeted by M18c (FR-573 to FR-575, owner play-test 2026-11-24): the Board tab shows Price, Available, a Buy/Sell
// choice with one stepper for that side, and the minors as flags; a refused "+" says why in its tooltip (title) and its
// accessible description (the M18c review round: it stays focusable, aria-disabled, and was its accessible name's end
// before), no longer in a visible note beside it; the minors in words with their units, the notes beside the
// steppers that were info (not refusals), the deal prices, the rivals' last turn, the first-sale line and the note under
// the title moved to the Details tab, where these tests now read them. New FR-573 to FR-577 tests: boardOfTradeTabs.test.tsx.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MarketModal } from '@/components/MarketModal';
import { CapitalModal } from '@/components/CapitalModal';
import { ActionButtons } from '@/components/HUD/index';
import { barredText, boardView, lastTurnTrades, partnerText, BARRIER_TEXT } from '@/components/market/boardView';
import { useGameStore } from '@/store/rootStore';
import { BOARD_ORDER, marketOf, newGame, pairKey, tradeOrdersOf, type Order } from '@/engine';
import { TRADE_COMMODITIES } from '@/definisions/marketPrices';
import type { GameState } from '@/types/GameState';
import type { SubsidyPercent } from '@/types/Diplomacy';
import { GoodsType, ResourceType } from '@/types/Resource';
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

/** A new continent game: "partners" (FR-242). Testland is nation-1. */
const start = (): GameState => newGame({ seed: 1, world: 'continent' });
/**
 * M12 FR-401: at equal points each minor's tie order is fixed from the seed and its id; on seed 1 Arvelia, Sundmark and
 * Lorran favour Valdoria, Pellis Testland (until M12 every minor favoured Testland on turn 1, FR-187's intentOrder).
 */
const FAVOURITES_SEED_1 = 'Arvelia, Sundmark and Lorran favour Valdoria; Pellis favours Testland.';

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
/** FR-577: opens one of the dialog's tabs (a press on the open one changes nothing). */
const openTab = (name: 'Board' | 'Details' | 'Trade policies') => fireEvent.click(within(dialog()).getByRole('tab', { name }));
/** A commodity's row on the Board tab (opened first). */
const row = (commodity: string) => {
  openTab('Board');
  return within(dialog()).getByTestId(`trade-row-${commodity}`);
};
/** FR-575: a commodity's row on the Details tab (opened first). */
const detailRow = (commodity: string) => {
  openTab('Details');
  return within(dialog()).getByTestId(`detail-row-${commodity}`);
};
const cell = (commodity: string, part: string) => text(within(row(commodity)).getByTestId(part));
/** The text of a Details row's part, null when the row has none. */
const detail = (commodity: string, part: string) => {
  const el = within(detailRow(commodity)).queryByTestId(part);
  return el ? text(el) : null;
};
/** The lines of a row's "Sellers:" or "Buyers:" list on the Details tab, as the screen reads them (FR-575). */
const partners = (commodity: string, side: 'sellers' | 'buyers') =>
  within(within(detailRow(commodity)).getByRole('list', { name: side === 'sellers' ? 'Sellers' : 'Buyers' }))
    .getAllByRole('listitem')
    .map((li) => text(li));
/** FR-574: the names of a Board row's flags in its Sellers or Buyers line ("Arvelia (no consulate)"). */
const flags = (commodity: string, side: 'sellers' | 'buyers') =>
  within(within(row(commodity)).getByRole('list', { name: side === 'sellers' ? 'Sellers' : 'Buyers' }))
    .getAllByRole('img')
    .map((img) => img.getAttribute('aria-label'));
/** A button by its exact name (a refused "+" keeps its plain name, "Buy one more Coal", FR-574). */
const button = (commodity: string, name: string) => within(row(commodity)).getByRole('button', { name });
/** FR-574: picks Buy or Sell in the row's Order column (a radio group). */
const choose = (commodity: string, side: 'Buy' | 'Sell') => fireEvent.click(within(row(commodity)).getByRole('radio', { name: `${side} ${cell(commodity, 'name')}` }));
/** The accessible description: the text of the elements aria-describedby names, "" without one. */
const description = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((id) => text(document.getElementById(id)!)).join(' ');
/**
 * A "+" button as the Board shows it since the M18c review round (FR-574): refused (aria-disabled), still focusable (not
 * natively disabled), its tooltip, and its accessible description, the reason. Old (FR-257): disabled, the reason also a
 * visible note beside it; then (M18c) disabled, the reason at the end of its accessible name.
 */
const plus = (commodity: string, name: string) => {
  const b = button(commodity, name) as HTMLButtonElement;
  return { disabled: b.getAttribute('aria-disabled') === 'true', focusable: !b.disabled, title: b.title, reason: description(b) };
};
/** A "+" refused for `why`: aria-disabled and focusable, the reason in its tooltip and its accessible description. */
const refused = (why: string) => ({ disabled: true, focusable: true, title: why, reason: why });
const OPEN = { disabled: false, focusable: true, title: '', reason: '' };
const now = () => useGameStore.getState().game;

// Re-recorded by M18c FR-573: the two lines "Holds: 8 (2 Indiamen)" (in the header) and "Holds: 8 of 8 free" are one
// figure in the bar under the title, "Holds: 0 of 8 used (2 Indiamen)"; it still counts this turn's units live.
it('FR-515 FR-573 names the merchant fleet in the holds figure and keeps the live hold count', () => {
  const state = start();
  const nations = state.nations.map(n => n.id === N1 ? { ...n, merchantMarine: { ...n.merchantMarine, holds: 8, ships: { indiaman: 2 } } } : n);
  openBoard(withConsulate({ ...state, nations }, N1, ARVELIA));
  expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 0 of 8 used (2 Indiamen)');
  fireEvent.click(button('coal', 'Buy one more Coal'));
  expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 1 of 8 used (2 Indiamen)');
});
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

// M12 FR-399: the note under the title starts with how long orders last
const DURATION = 'Buy and sell orders last one turn; production orders in the Capital stay.';
const NOTE_START =
  DURATION +
  ' Deals settle at End Turn at the board price; bought goods arrive next turn. Minor nations sell what their land yields and buy only clothing, furniture and hardware. A minor trades only where we hold a consulate (one ordered this turn counts) and serves the Great Power it favours first';

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

  // Re-recorded by M18c FR-574: the heads were Commodity, Price, In warehouse, Buy, Sell, Minor nations; a row showed a
  // Buy and a Sell stepper. Now one stepper for the side the Order column picks: the coal Sell stepper after "Sell Coal".
  it('FR-194 FR-251 FR-574 each row shows the board price, our own stock under "Available", and the stepper of its side', () => {
    const s = start();
    const market = marketOf(s);
    openBoard(setWarehouse({ ...s, market: { ...market, prices: { ...market.prices, coal: 123 } } }, N1, { coal: 7 }));
    const headers = within(dialog()).getAllByRole('columnheader').map((h) => text(h));
    expect(headers).toEqual(['Commodity', 'Price', 'Available', 'Order', 'Quantity', 'Market']);
    expect(cell('coal', 'price')).toBe('$123');
    expect(cell('coal', 'available')).toBe('7');
    expect(cell('clothing', 'price')).toBe('$900');
    expect(cell('clothing', 'available')).toBe('0');
    expect(cell('coal', 'bid')).toBe('0');
    choose('coal', 'Sell');
    expect(cell('coal', 'offer')).toBe('0');
  });

  // Re-targeted by M18c FR-575: the sellers with their units are on the Details tab; the Board tab shows their flags,
  // each named with its mark (FR-574)
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
    expect(text(within(detailRow('timber')).getByTestId('sellers'))).toMatch(/^Sellers: Arvelia: 4 units/);
    // Raw materials have no minor buyers
    expect(within(detailRow('timber')).queryByRole('list', { name: 'Buyers' })).toBeNull();
    // FR-574: the Board tab's flags, the same minors in the same order with their marks
    expect(flags('coal', 'sellers')).toEqual(['Arvelia (no consulate)', 'Sundmark (no consulate)', 'Pellis (no consulate)']);
    expect(within(row('timber')).queryByRole('list', { name: 'Buyers' })).toBeNull();
  });

  // Re-targeted by M18c FR-575: on the Details tab; the Board tab marks a row no minor trades with a dash named so
  it('FR-194 FR-184 FR-251 FR-254 Buyers, for goods: each minor\'s demand in units; a row no minor trades has neither list and says "No minor trades this"', () => {
    openBoard(start());
    for (const good of ['clothing', 'furniture', 'hardware']) {
      expect(partners(good, 'buyers')).toEqual([
        'Arvelia: 2 units (no consulate)',
        'Sundmark: 2 units (no consulate)',
        'Lorran: 2 units (no consulate)',
        'Pellis: 2 units (no consulate)',
      ]);
      expect(text(within(detailRow(good)).getByTestId('buyers'))).toMatch(/^Buyers: Arvelia: 2 units/);
      expect(within(detailRow(good)).queryByRole('list', { name: 'Sellers' })).toBeNull();
      expect(within(detailRow(good)).queryByTestId('no-minor')).toBeNull();
      expect(flags(good, 'buyers')).toHaveLength(4);
    }
    for (const nobody of ['lumber', 'steel', 'armaments', 'wool', 'oil']) {
      expect(within(detailRow(nobody)).queryByRole('list')).toBeNull();
      expect(detail(nobody, 'no-minor')).toBe('No minor trades this');
      expect(within(row(nobody)).queryByRole('list')).toBeNull();
      expect(within(row(nobody)).getByRole('img', { name: 'No minor trades this' })).toBeTruthy();
    }
    expect(detail('coal', 'no-minor')).toBeNull();
  });

  // Re-targeted by M18c FR-575: the favourites are in the explanation on the Details tab
  it('FR-251 FR-187 the favourites are named once, in the note, not in every chip', () => {
    openBoard(start());
    // M12 FR-401: seed 1's tie order (until M12 turn 1 gave "Arvelia, Sundmark, Lorran and Pellis favour Testland.")
    openTab('Details');
    expect(text(within(dialog()).getByTestId('board-favourites'))).toBe(FAVOURITES_SEED_1);
    expect([...partners('coal', 'sellers'), ...partners('timber', 'sellers'), ...partners('clothing', 'buyers')].filter(t => /favour/.test(t))).toEqual([]);
  });

  it('FR-251 FR-187 the FR example: Arvelia favours Valdoria at 40 points; its chip keeps only its units', () => {
    // Testland 1 point ahead with Sundmark and Lorran, which favour Valdoria at equal points on seed 1 (M12 FR-401)
    openBoard(setPair(setPair(setPair(start(), N2, ARVELIA, { points: 40 }), N1, SUNDMARK, { points: 31 }), N1, LORRAN, { points: 31 }));
    openTab('Details');
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
    expect(within(detailRow('timber')).getAllByTestId('barrier').map((el) => text(el))).toEqual(['(boycott)', '(at war)', '(no consulate)']);
    // FR-574: on the Board tab each barred flag is faded and named with its mark; an open one by its name alone
    expect(flags('timber', 'sellers')).toEqual(['Arvelia', 'Sundmark (boycott)', 'Lorran (at war)', 'Pellis (no consulate)']);
    expect(within(row('timber')).getAllByRole('listitem').map((li) => li.dataset.barred ?? 'open')).toEqual(['open', 'true', 'true', 'true']);

    // A consulate ordered this turn counts: the diplomacy phase runs before trade (FR-163, FR-185)
    order({ kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: PELLIS });
    expect(partners('timber', 'sellers')[3]).toBe('Pellis: 1 unit');
    expect(flags('timber', 'sellers')[3]).toBe('Pellis');
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
    openTab('Details');
    expect(text(within(dialog()).getByTestId('board-favourites'))).toBe('Arvelia, Sundmark, Lorran and Pellis favour Valdoria.');
    // Sundmark, open to Testland, serves Valdoria first: the coal bid is allowed and says so (FR-252). Re-targeted by M18c
    // FR-575: the line was a note beside the "+" and its description; it is info, not a refusal, so it is on Details now
    expect(plus('coal', 'Buy one more Coal')).toEqual(OPEN);
    expect(detail('coal', 'bid-note')).toBe('Sundmark favours Valdoria');
  });

  // Re-targeted by M18c FR-573 FR-575: the note stood under the title as the dialog's description; the bar of figures
  // replaced it there, and it is the explanation on the Details tab, word for word
  it('FR-248 FR-253 FR-251 FR-575 the explanation says when deals settle, that minors buy only clothing, furniture and hardware, and whom each favours; it is on the Details tab, no longer the dialog\'s description', () => {
    openBoard(start());
    expect(dialog().getAttribute('aria-describedby')).toBeNull();
    expect(within(dialog()).queryByTestId('board-explanation')).toBeNull();
    openTab('Details');
    expect(text(within(dialog()).getByTestId('board-explanation'))).toBe(`${NOTE_START}: ${FAVOURITES_SEED_1}`);
  });

  // Re-recorded by M18c FR-573: old "Cash: $10,000", "Holds: 4 of 4 free", "Buying: 0 of 4"; now the bar's five figures
  // (M18c review round: "Cash" -> "Cash before purchases", apart from the top bar's cash)
  it('FR-194 FR-573 the cash before purchases, what is committed, the buying power, "Holds: 0 of 4 used (1 Indiaman)" and "Buying 0 of 4 commodities"', () => {
    openBoard(start());
    expect(text(within(dialog()).getByTestId('market-cash'))).toBe('Cash before purchases: $10,000');
    expect(text(within(dialog()).getByTestId('market-committed'))).toBe('Committed: $0');
    expect(text(within(dialog()).getByTestId('market-power'))).toBe('Buying power: $10,000');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 0 of 4 used (1 Indiaman)');
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Buying 0 of 4 commodities');
  });
});

describe('FR-252 FR-253 FR-257 the reasons beside the controls', () => {
  // Re-recorded by M13 FR-494 (FR-492, card Q118 (a)): a bid where no minor sells goes to Valdoria and is refunded if
  // Valdoria does not sell, so that "+" is enabled with FR-494's line. Old: disabled, title, note and description
  // "No minor nation sells this". New: enabled, no title, note and description "A purchase is refunded if Valdoria does not
  // sell." (FR-494's line without its first clause, which broke FR-257's fit at 1280x720; see the FR-494 describe).
  // Re-recorded by M13 review UTH-2: Clothing's line was the short one -> FR-494's in full ("No minor nation sells this;
  // a bid is ..."): minors buy clothing, so its minors column lists buyers and never said that no minor sells it.
  // Re-targeted by M18c FR-574 FR-575 (all of this describe): a refusal was a visible note beside the disabled "+", its
  // title and its description; now it is the title and the description of the focusable, aria-disabled "+" (the end of its
  // accessible name before the M18c review round), and no note shows until the "+" has focus or is pressed. A line
  // beside an open "+" (info, not a refusal) moved to the row's Notes on the Details tab. A Sell "+" is reached by picking
  // Sell first where the row opens on Buy (its offer refused).
  it('FR-252 FR-257 FR-494 a new game: a bid no minor sells is open toward Valdoria, "Money back if Valdoria does not sell." (in full where minors buy it); a bid without a consulate "We need a consulate with a seller", in the refused "+"\'s title and description', () => {
    openBoard(start());
    const rival = 'Money back if Valdoria does not sell.';
    const full = `No minor nation sells this; money back if Valdoria does not sell.`;
    expect(plus('clothing', 'Buy one more Clothing')).toEqual(OPEN);
    expect(detail('clothing', 'bid-note')).toBe(full);
    for (const [c, name] of [['lumber', 'Lumber'], ['steel', 'Steel'], ['wool', 'Wool'], ['oil', 'Oil']]) {
      expect(plus(c, `Buy one more ${name}`)).toEqual(OPEN);
      expect(detail(c, 'bid-note')).toBe(rival);
    }
    const consulate = 'We need a consulate with a seller';
    for (const [c, name] of [['coal', 'Coal'], ['timber', 'Timber'], ['ironOre', 'Iron Ore'], ['cotton', 'Cotton']]) {
      expect(plus(c, `Buy one more ${name}`)).toEqual(refused(consulate));
      // A refusal is not repeated on the Details tab
      expect(detail(c, 'bid-note')).toBeNull();
    }
    fireEvent.click(button('coal', 'Buy one more Coal'));
    expect(submitted).toEqual([]);
  });

  it('FR-253 FR-257 an offer nobody buys shows "No one buys this"; goods without a consulate with a buyer "We need a consulate with a buyer"', () => {
    openBoard(setWarehouse(start(), N1, { clothing: 2 }));
    choose('lumber', 'Sell');
    expect(plus('lumber', 'Sell one more Lumber')).toEqual(refused('No one buys this'));
    choose('timber', 'Sell');
    expect(plus('timber', 'Sell one more Timber').title).toBe('No one buys this');
    const consulate = 'We need a consulate with a buyer';
    choose('clothing', 'Sell');
    expect(plus('clothing', 'Sell one more Clothing')).toEqual(refused(consulate));

    order({ kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: PELLIS });
    expect(plus('clothing', 'Sell one more Clothing')).toEqual(OPEN);
    expect(detail('clothing', 'offer-note')).toBeNull();
  });

  it('FR-252 FR-253 war and boycotts name the barrier: "We are at war with every seller", "A boycott bars every buyer"', () => {
    let s = start();
    for (const m of [ARVELIA, SUNDMARK, PELLIS]) s = setPair(withConsulate(s, N1, m), N1, m, { war: { aggressors: [N1], since: 1 } });
    s = setPair(withConsulate(s, N1, LORRAN), N1, LORRAN, { boycotts: [N1] });
    openBoard(setWarehouse(s, N1, { furniture: 1 }));
    expect(plus('coal', 'Buy one more Coal')).toEqual(refused('We are at war with every seller'));
    choose('furniture', 'Sell');
    expect(plus('furniture', 'Sell one more Furniture')).toEqual(refused('War or a boycott bars every buyer'));
    expect(barredText(['boycott', 'boycott'], 'buyer')).toBe('A boycott bars every buyer');
    expect(barredText(['at-war', 'no-consulate'], 'seller')).toBe('We need a consulate with a seller');
  });

  // Re-recorded by the M13 review fix round, FR-540 (UTH-1; card Q118 (a)): Valdoria's consulate in Arvelia, which sells
  // timber, made Valdoria a buyer of Testland's timber (old: enabled, "Only Valdoria may buy this"), and the offer always
  // came back unsold (audit MKT-02). Now only Valdoria's bid of last turn makes it a buyer (FR-491).
  it('FR-253 FR-540 an offer only a rival Great Power may buy: "No one buys this" while it did not bid for it last turn (was "Only Valdoria may buy this"); after its bid "Only Valdoria may buy this"', () => {
    const s = withConsulate(start(), N2, ARVELIA);
    openBoard(s);
    choose('timber', 'Sell');
    expect(plus('timber', 'Sell one more Timber')).toEqual(refused('No one buys this'));
    act(() => useGameStore.setState({ game: { ...s, market: { ...marketOf(s), lastOrders: { [N2]: { sell: {}, buy: { timber: 2 } } } } as GameState['market'] } }));
    expect(plus('timber', 'Sell one more Timber')).toEqual(OPEN);
    expect(detail('timber', 'offer-note')).toBe('Only Valdoria may buy this');
    choose('lumber', 'Sell');
    expect(plus('lumber', 'Sell one more Lumber').title).toBe('No one buys this');
  });

  it('FR-540 (M13 review UTH-1) a new game, idle: cotton, coal and iron ore (minors sell them, none buys) have no open Offer "+" while Valdoria did not bid for them last turn', () => {
    let s = setWarehouse(start(), N1, { cotton: 12, coal: 10, ironOre: 10 });
    for (const m of [ARVELIA, SUNDMARK, LORRAN, PELLIS]) s = withConsulate(s, N2, m);
    openBoard(s);
    const none = 'No one buys this';
    for (const [c, name] of [['cotton', 'Cotton'], ['coal', 'Coal'], ['ironOre', 'Iron Ore']]) {
      choose(c, 'Sell');
      expect(plus(c, `Sell one more ${name}`)).toEqual(refused(none));
    }
  });

  it('FR-252 a bid a rival may win is allowed and says so: "Arvelia favours Valdoria"; a minor that favours us says nothing', () => {
    openBoard(setPair(withConsulate(withConsulate(start(), N1, ARVELIA), N1, PELLIS), N2, ARVELIA, { points: 40 }));
    expect(plus('coal', 'Buy one more Coal')).toEqual(OPEN);
    expect(detail('coal', 'bid-note')).toBe('Arvelia favours Valdoria');
    // Lorran sells no coal; Pellis (favours Testland) sells timber too, Arvelia timber as well
    expect(detail('timber', 'bid-note')).toBe('Arvelia favours Valdoria');
    fireEvent.click(button('coal', 'Buy one more Coal'));
    expect(tradeOrdersOf(now(), N1).buy.coal).toBe(1);
  });

  // Re-recorded by M18c FR-574: old 22 disabled "+" in a new game, a Buy and a Sell stepper per row, each reason a visible
  // note and the description. Now a row shows one stepper: a new game opens every row on Buy (no offer is open without a
  // consulate), 5 Buy "+" are refused (coal, timber, iron ore, cotton, horses: a consulate with a seller); on Sell all 17
  // are (5 + 17 = the old 22). Each says its reason in its title and its accessible description. M18c review round: a
  // refused "+" is aria-disabled and stays focusable (was disabled, the reason at the end of its name).
  it('FR-257 FR-574 no refused control without its reason: every refused "+" is focusable with it as its tooltip and description, and there is no "−" at 0', () => {
    openBoard(start());
    const steppers = () => within(dialog()).getAllByRole('button').filter((b) => /one (more|less)/.test(b.getAttribute('aria-label') ?? ''));
    const refusedPlus = () => steppers().filter((b) => b.getAttribute('aria-disabled') === 'true');
    const check = () => {
      expect(steppers().filter((b) => /one less/.test(b.getAttribute('aria-label')!))).toEqual([]);
      // No "+" is natively disabled, so every one is in the Tab order
      expect(steppers().filter((b) => (b as HTMLButtonElement).disabled)).toEqual([]);
      for (const b of refusedPlus()) {
        expect(b.title).not.toBe('');
        expect(description(b)).toBe(b.title);
        expect(b.getAttribute('aria-label')).toMatch(/^(Buy|Sell) one more [A-Za-z ]+$/);
      }
    };
    expect(steppers()).toHaveLength(BOARD_ORDER.length);
    expect(refusedPlus()).toHaveLength(5);
    check();
    // The place of "−" keeps the stepper's width
    expect(within(row('coal')).getByTestId('bid-less-place').getAttribute('aria-hidden')).toBe('true');

    for (const c of BOARD_ORDER) choose(c, 'Sell');
    expect(submitted).toEqual([]);
    expect(steppers()).toHaveLength(BOARD_ORDER.length);
    expect(refusedPlus()).toHaveLength(17);
    check();
  });
});

describe('FR-194 the Board of Trade: orders', () => {
  /** A new game with a consulate in Arvelia: coal, timber, iron ore and cotton can be bid for, goods offered. */
  const open = () => withConsulate(start(), N1, ARVELIA);

  it('FR-194 FR-062 Bid + sends buyCommodity one higher: the bid, the cash, the holds and the bids update', () => {
    openBoard(open());
    fireEvent.click(button('coal', 'Buy one more Coal'));
    fireEvent.click(button('coal', 'Buy one more Coal'));

    expect(submitted).toEqual([
      { kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 1 },
      { kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 2 },
    ]);
    expect(tradeOrdersOf(now(), N1).buy.coal).toBe(2);
    expect(cell('coal', 'bid')).toBe('2');
    expect(treasury(now(), N1)).toBe(10000 - 200);
    // Re-recorded by M18c FR-573: old "Cash: $9,800" (the treasury once the bid is paid) is now "Buying power"; Cash is the
    // treasury before this turn's purchases (named so since the M18c review round) and Committed what they took. Old
    // "Holds: 2 of 4 free", "Buying: 1 of 4".
    expect(text(within(dialog()).getByTestId('market-cash'))).toBe('Cash before purchases: $10,000');
    expect(text(within(dialog()).getByTestId('market-committed'))).toBe('Committed: $200');
    expect(text(within(dialog()).getByTestId('market-power'))).toBe('Buying power: $9,800');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 2 of 4 used (1 Indiaman)');
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Buying 1 of 4 commodities');
  });

  it('FR-194 FR-062 FR-257 Bid − sends buyCommodity one lower and refunds; at 0 there is no "−", only its place', () => {
    openBoard(open());
    expect(within(row('coal')).queryByRole('button', { name: 'Buy one less Coal' })).toBeNull();
    fireEvent.click(button('coal', 'Buy one more Coal'));
    expect((button('coal', 'Buy one less Coal') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button('coal', 'Buy one less Coal'));
    expect(submitted.at(-1)).toEqual({ kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 0 });
    expect(treasury(now(), N1)).toBe(10000);
    expect(cell('coal', 'bid')).toBe('0');
    expect(within(row('coal')).queryByRole('button', { name: 'Buy one less Coal' })).toBeNull();
  });

  it('FR-194 FR-061 Offer + sends sellCommodity one higher: the unit leaves the warehouse and takes a hold; − gives it back', () => {
    openBoard(setWarehouse(open(), N1, { clothing: 2 }));
    fireEvent.click(button('clothing', 'Sell one more Clothing'));
    expect(submitted).toEqual([{ kind: 'sellCommodity', nationId: N1, commodity: 'clothing', amount: 1 }]);
    expect(cell('clothing', 'offer')).toBe('1');
    expect(cell('clothing', 'available')).toBe('1');
    // Re-recorded by M18c FR-573: old "Holds: 3 of 4 free"
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 1 of 4 used (1 Indiaman)');

    fireEvent.click(button('clothing', 'Sell one less Clothing'));
    expect(submitted.at(-1)).toEqual({ kind: 'sellCommodity', nationId: N1, commodity: 'clothing', amount: 0 });
    expect(stockOf(now(), N1, 'clothing')).toBe(2);
  });

  // Re-recorded by M18c FR-574: old, a row at 0 showed both steppers ("Back to 0: both controls again"). Now a row always
  // shows the one stepper of the side its Order column picks, and picking the other side takes back the order first.
  it('FR-194 FR-574 a row with a bid has no offer control, and a row with an offer no bid control; switching sides sends the other side at 0', () => {
    openBoard(setWarehouse(open(), N1, { clothing: 2 }));
    fireEvent.click(button('coal', 'Buy one more Coal'));
    expect(within(row('coal')).queryByRole('button', { name: /Sell one/ })).toBeNull();
    expect(within(row('coal')).queryByTestId('offer')).toBeNull();

    fireEvent.click(button('clothing', 'Sell one more Clothing'));
    expect(within(row('clothing')).queryByRole('button', { name: /Buy one/ })).toBeNull();
    expect(within(row('clothing')).queryByTestId('bid')).toBeNull();

    // Sell on the coal row: the bid goes to 0 (its money back) and the Sell stepper shows instead
    choose('coal', 'Sell');
    expect(submitted.at(-1)).toEqual({ kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 0 });
    expect(treasury(now(), N1)).toBe(10000);
    expect(button('coal', 'Sell one more Coal')).toBeTruthy();
    expect(within(row('coal')).queryByTestId('bid')).toBeNull();
    // Buy on the clothing row: the offer goes to 0 (the unit back in the warehouse)
    choose('clothing', 'Buy');
    expect(submitted.at(-1)).toEqual({ kind: 'sellCommodity', nationId: N1, commodity: 'clothing', amount: 0 });
    expect(stockOf(now(), N1, 'clothing')).toBe(2);
    expect(button('clothing', 'Buy one more Clothing')).toBeTruthy();
    expect(within(row('clothing')).queryByTestId('offer')).toBeNull();
  });

  it('FR-194 FR-248 FR-257 every hold taken: "Holds: 4 of 4 used", each "+" open to trade refused saying so in its tooltip and description, and a press sends nothing', () => {
    openBoard(setWarehouse(open(), N1, { clothing: 2 }));
    for (const c of ['coal', 'timber', 'ironOre', 'cotton']) fireEvent.click(button(c, `Buy one more ${cell(c, 'name')}`));
    // Re-recorded by M18c FR-573: old "Buying: 4 of 4", "Holds: 0 of 4 free"
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Buying 4 of 4 commodities');
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 4 of 4 used (1 Indiaman)');
    const sent = submitted.length;

    const holds = 'No free hold this turn';
    // The clothing row opened on Sell: its offer was open (a consulate with Arvelia, 2 in the warehouse)
    for (const [commodity, name] of [['coal', 'Buy one more Coal'], ['timber', 'Buy one more Timber'], ['clothing', 'Sell one more Clothing']]) {
      expect(plus(commodity, name)).toEqual(refused(holds));
    }
    // Re-recorded by M13 FR-494: old 'No minor nation sells this', new 'No free hold this turn'. Wool, sold by no minor, may
    // be bid toward Valdoria (FR-492), so the market no longer refuses it; the holds do.
    expect(plus('wool', 'Buy one more Wool').title).toBe('No free hold this turn');
    fireEvent.click(button('coal', 'Buy one more Coal'));
    expect(submitted).toHaveLength(sent);
    // Nothing sent, nothing refused: no toast follows (FR-569); the press shows the reason beside the "+" (M18c review)
    expect(useGameStore.getState().lastRejection).toBeNull();
    expect(within(row('coal')).getByTestId('bid-reason').hidden).toBe(false);
    // "−" stays: lowering is always allowed
    expect((button('coal', 'Buy one less Coal') as HTMLButtonElement).disabled).toBe(false);
  });

  it('FR-248 at most 4 bids: with holds to spare a fifth commodity\'s Bid "+" is disabled with "Already buying 4 commodities this turn, the most"; a row already bid on is not', () => {
    // A fifth commodity a minor sells: wool on one of Arvelia's tiles; Sundmark also sells the other four
    let s = setTile(withConsulate(open(), N1, SUNDMARK), '10-4', { resource: { type: ResourceType.Wool, level: 1, discovered: true } });
    // 6 holds: an Indiaman and a Trader (M18c: was `ships: undefined, holds: 6`, a v1 save's shape, which reads as
    // "1.5 Indiamen" now that the holds figure names the fleet; v1 saves hold 4 per Indiaman, so a real one never does)
    s = { ...s, nations: s.nations.map((n) => (n.id === N1 ? { ...n, merchantMarine: { ...n.merchantMarine, ships: { indiaman: 1, trader: 1 }, holds: 6 } } : n)) };
    openBoard(s);
    for (const c of ['coal', 'timber', 'ironOre', 'cotton']) fireEvent.click(button(c, `Buy one more ${cell(c, 'name')}`));
    // Re-recorded by M18c FR-573: old "Holds: 2 of 6 free"
    expect(text(within(dialog()).getByTestId('market-holds'))).toBe('Holds: 4 of 6 used (1 Trader, 1 Indiaman)');

    const bids = 'Already buying 4 commodities this turn, the most';
    expect(plus('wool', 'Buy one more Wool')).toEqual(refused(bids));
    // M18c review round: was `.disabled` false and title ''; a refused "+" is aria-disabled now, so the whole state
    expect(plus('coal', 'Buy one more Coal')).toEqual(OPEN);
  });

  it('FR-248 Offer "+" with nothing in the warehouse says "None left in the warehouse"; Bid "+" without the money "Not enough money"', () => {
    openBoard(setWarehouse(setTreasuryOf(open(), 50), N1, { furniture: 1 }));
    // M18c FR-574: no visible "None left in the warehouse" any more, only the tooltip and the description
    choose('clothing', 'Sell');
    expect(plus('clothing', 'Sell one more Clothing')).toEqual(refused('None left in the warehouse'));
    expect(plus('coal', 'Buy one more Coal')).toEqual(refused('Not enough money'));
    // M18c review round: was no such text at all; now each is a refused "+"'s description, drawn only while that "+" has
    // focus or was pressed, so none shows
    const reasons = within(dialog()).queryAllByText(/None left in the warehouse|Not enough money/);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.filter((el) => !/^(bid|offer)-reason$/.test(el.dataset.testid ?? '') || !el.hidden)).toEqual([]);
    // A row the player can trade has an enabled "+" with no title (M12 FR-401: seed 1's Arvelia favours Valdoria at equal
    // points, so the note says so, FR-252; until M12 turn 1 favoured Testland and there was no note). The note is on the
    // Details tab since M18c FR-575.
    expect(plus('furniture', 'Sell one more Furniture')).toEqual(OPEN);
    expect(detail('furniture', 'offer-note')).toBe('Arvelia favours Valdoria');
  });

  it('FR-194 Close closes the Board of Trade', () => {
    openBoard(start());
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close Board of Trade' }));
    expect(useGameStore.getState().isMarketOpen).toBe(false);
  });
});

describe('M12 FR-394 FR-400 FR-434 the deal price, the offer cap and the first sale', () => {
  /** Test setup: our subsidy toward the minor, in percent (FR-162; the pair's record as the diplomacy phase leaves it). */
  const withSubsidy = (s: GameState, minorId: string, percent: SubsidyPercent): GameState =>
    setPair(s, N1, minorId, { subsidies: { ...s.diplomacy[pairKey(N1, minorId)].subsidies, [N1]: percent } });
  const withPrice = (s: GameState, commodity: string, price: number): GameState => {
    const market = marketOf(s);
    return { ...s, market: { ...market, prices: { ...market.prices, [commodity]: price } } };
  };
  const withHolds = (s: GameState, holds: number): GameState => ({
    ...s,
    nations: s.nations.map((n) => (n.id === N1 ? { ...n, merchantMarine: { ...n.merchantMarine, ships: undefined, holds } } : n)),
  });
  // Re-targeted by M18c FR-575: the deal prices stood under the board price, the first-sale line under the note; both are
  // on the Details tab now
  const dealPrices = (commodity: string) => within(detailRow(commodity)).queryAllByTestId('deal-price').map((el) => text(el));
  const firstSale = () => {
    openTab('Details');
    return within(dialog()).queryByTestId('first-sale');
  };
  const FIRST_SALE =
    'Minor nations buy Clothing, Furniture and Hardware. Make them in the Capital (Clothing factory, Furniture factory, Metal works) and open a consulate in Diplomacy ($500).';

  it('FR-394 a minor we may trade with and subsidise shows the deal price under the board price: "Sundmark pays $0 with our 100% subsidy", "Arvelia charges $114 with our 10%"', () => {
    let s = withConsulate(withConsulate(start(), N1, ARVELIA), N1, SUNDMARK);
    s = withSubsidy(withSubsidy(s, SUNDMARK, 100), ARVELIA, 10);
    // Lorran: a subsidy on the record but no consulate, so no trade and no line
    s = withSubsidy(s, LORRAN, 50);
    openBoard(withPrice(s, 'coal', 104));
    // Sundmark buys clothing at P less our subsidy (floor(900 x 0)); Arvelia sells coal at P plus ours (floor(104 x 1.1))
    expect(dealPrices('clothing')).toEqual(['Arvelia pays $810 with our 10% subsidy', 'Sundmark pays $0 with our 100% subsidy']);
    expect(dealPrices('coal')).toEqual(['Arvelia charges $114 with our 10%', 'Sundmark charges $208 with our 100%']);
    // Old toMatch(/^\$104/): the price cell held the deal prices too; now it holds the board price alone
    expect(cell('coal', 'price')).toBe('$104');
    expect(within(row('coal')).queryAllByTestId('deal-price')).toEqual([]);
    // Lorran sells timber; no consulate, so no deal price; no subsidy, no line
    expect(dealPrices('timber')).toEqual(['Arvelia charges $110 with our 10%', 'Sundmark charges $200 with our 100%']);
    expect(dealPrices('lumber')).toEqual([]);
    // Bid and Offer work as before
    fireEvent.click(button('coal', 'Buy one more Coal'));
    expect(tradeOrdersOf(now(), N1).buy.coal).toBe(1);
  });

  it('FR-394 a subsidy ordered this turn counts at once, as the trade phase will find it (FR-246)', () => {
    openBoard(withConsulate(start(), N1, PELLIS));
    expect(dealPrices('cotton')).toEqual([]);
    order({ kind: 'setTradePolicy', nationId: N1, targetId: PELLIS, subsidyPercent: 25, boycott: false });
    expect(dealPrices('cotton')).toEqual(['Pellis charges $125 with our 25%']);
    expect(dealPrices('furniture')).toEqual(['Pellis pays $675 with our 25% subsidy']);
  });

  it('FR-400 the Offer "+" stops at what the minors we may trade with want, with the line "Arvelia and Sundmark want 4"; the engine still takes more', () => {
    const s = withHolds(withConsulate(withConsulate(start(), N1, ARVELIA), N1, SUNDMARK), 8);
    openBoard(setWarehouse(s, N1, { clothing: 6 }));
    for (let i = 0; i < 3; i++) fireEvent.click(button('clothing', 'Sell one more Clothing'));
    expect(plus('clothing', 'Sell one more Clothing').disabled).toBe(false);
    fireEvent.click(button('clothing', 'Sell one more Clothing'));
    expect(cell('clothing', 'offer')).toBe('4');
    const want = 'Arvelia and Sundmark want 4';
    expect(plus('clothing', 'Sell one more Clothing')).toEqual(refused(want));
    // Card Q104: the Board only; an order for more is still accepted (the surplus comes back)
    order({ kind: 'sellCommodity', nationId: N1, commodity: GoodsType.Clothing, amount: 5 });
    expect(plus('clothing', 'Sell one more Clothing')).toEqual(refused(want));
  });

  it('FR-400 one buyer reads "Arvelia wants 2"; a minor without a consulate is not counted', () => {
    openBoard(setWarehouse(withConsulate(start(), N1, ARVELIA), N1, { furniture: 3 }));
    fireEvent.click(button('furniture', 'Sell one more Furniture'));
    fireEvent.click(button('furniture', 'Sell one more Furniture'));
    expect(plus('furniture', 'Sell one more Furniture')).toEqual(refused('Arvelia wants 2'));
  });

  it('FR-434 FR-575 a new game, nothing to offer: one line on the Details tab names the goods the minors buy, their buildings and the consulate step', () => {
    openBoard(start());
    expect(within(dialog()).queryByTestId('first-sale')).toBeNull();
    expect(text(firstSale()!)).toBe(FIRST_SALE);
  });

  it('FR-434 with a consulate held the line drops the consulate step; with goods to offer it is gone', () => {
    openBoard(withConsulate(start(), N1, ARVELIA));
    expect(text(firstSale()!)).toBe('Minor nations buy Clothing, Furniture and Hardware. Make them in the Capital (Clothing factory, Furniture factory, Metal works).');
    act(() => useGameStore.setState({ game: setWarehouse(now(), N1, { hardware: 1 }) }));
    expect(firstSale()).toBeNull();
  });

  it('FR-434 boardView gives the line, built from the recipes and the consulate cost', () => {
    const s = start();
    expect(boardView(s, s.nations[0]).firstSaleText).toBe(FIRST_SALE);
    const stocked = setWarehouse(withConsulate(s, N1, ARVELIA), N1, { clothing: 1 });
    expect(boardView(stocked, stocked.nations[0]).firstSaleText).toBeUndefined();
  });
});

describe('M12 FR-397 FR-398 FR-399 repeat last turn\'s trades; how long orders last', () => {
  const REPEAT = "Repeat last turn's trades";
  const repeatButton = () => within(dialog()).queryByRole('button', { name: REPEAT });
  const repeatLine = () => within(dialog()).queryByTestId('repeat-result');
  const endTurn = () => act(() => useGameStore.getState().advanceTurn());
  /** Turn 1 with a consulate in Arvelia and 2 clothing in stock: bid 2 coal and offer 1 clothing on the Board, then End Turn. */
  const tradedTurn = () => {
    openBoard(setWarehouse(withConsulate(start(), N1, ARVELIA), N1, { clothing: 2 }));
    fireEvent.click(button('coal', 'Buy one more Coal'));
    fireEvent.click(button('coal', 'Buy one more Coal'));
    fireEvent.click(button('clothing', 'Sell one more Clothing'));
    endTurn();
    submitted = [];
  };

  // Re-targeted by M18c FR-573 FR-575: the line was the first words under the header and began the dialog's description;
  // the bar of figures stands under the header now, and the line begins the explanation that opens the Details tab
  it('FR-399 FR-575 the Details tab opens with "Buy and sell orders last one turn; production orders in the Capital stay."', () => {
    openBoard(start());
    expect(within(dialog()).queryByTestId('board-duration')).toBeNull();
    openTab('Details');
    const line = within(dialog()).getByTestId('board-duration');
    expect(text(line)).toBe(DURATION);
    const explanation = within(dialog()).getByTestId('board-explanation');
    expect(explanation.firstElementChild).toBe(line);
    expect(within(dialog()).getByRole('tabpanel').firstElementChild).toBe(explanation);
  });

  it('FR-397 no trades last turn (a new game, or a turn without bids or offers): no Repeat button', () => {
    openBoard(start());
    expect(repeatButton()).toBeNull();
    endTurn();
    expect(repeatButton()).toBeNull();
  });

  it('FR-397 after a turn with a bid of 2 coal and an offer of 1 clothing, Repeat orders them again unit by unit through submitOrder', () => {
    tradedTurn();
    expect(cell('coal', 'bid')).toBe('0');
    fireEvent.click(repeatButton()!);
    expect(submitted).toEqual([
      { kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 1 },
      { kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 2 },
      { kind: 'sellCommodity', nationId: N1, commodity: 'clothing', amount: 1 },
    ]);
    expect(cell('coal', 'bid')).toBe('2');
    expect(cell('clothing', 'offer')).toBe('1');
    // Re-recorded by M18c FR-573: old "Buying: 1 of 4"
    expect(text(within(dialog()).getByTestId('market-bids'))).toBe('Buying 1 of 4 commodities');
    expect(text(repeatLine()!)).toBe('Repeated 3 of 3 units.');
    // A second press finds them in place and sends nothing
    submitted = [];
    fireEvent.click(repeatButton()!);
    expect(submitted).toEqual([]);
    expect(text(repeatLine()!)).toBe('Repeated 3 of 3 units.');
    // The next End Turn: the line goes; the button stays, for this turn's trades
    endTurn();
    expect(repeatLine()).toBeNull();
    expect(repeatButton()).not.toBeNull();
  });

  it('FR-398 a refused unit is said in one line: "Repeated 2 of 3 units. Coal purchase: not enough money."; no refusal recorded', () => {
    tradedTurn();
    // Money for one coal and a half: the second unit is refused
    const price = marketOf(now()).prices.coal!;
    act(() => useGameStore.setState({ game: setTreasuryOf(now(), Math.floor(price * 1.5)) }));
    fireEvent.click(repeatButton()!);
    expect(cell('coal', 'bid')).toBe('1');
    expect(cell('clothing', 'offer')).toBe('1');
    expect(text(repeatLine()!)).toBe('Repeated 2 of 3 units. Coal purchase: not enough money.');
    // The refused unit was never sent (FR-398), so the store holds no refusal and no toast follows (FR-569)
    expect(useGameStore.getState().lastRejection).toBeNull();
  });

  it('FR-398 goods gone: "Clothing sale: none left in the warehouse."', () => {
    tradedTurn();
    act(() => useGameStore.setState({ game: setWarehouse(now(), N1, { clothing: 0 }) }));
    fireEvent.click(repeatButton()!);
    expect(text(repeatLine()!)).toBe('Repeated 2 of 3 units. Clothing sale: none left in the warehouse.');
  });

  it('FR-397 lastTurnTrades reads the final total of each bid and offer of the turn just resolved, in the order first given', () => {
    const buy = (commodity: string, amount: number) => ({ kind: 'buyCommodity', nationId: N1, commodity, amount }) as Order;
    const sell = (commodity: string, amount: number) => ({ kind: 'sellCommodity', nationId: N1, commodity, amount }) as Order;
    const log = [
      { turn: 1, nationId: N1, orders: [buy('coal', 1)] },
      { turn: 2, nationId: N2, orders: [buy('timber', 3)] },
      { turn: 2, nationId: N1, orders: [buy('coal', 1), sell('clothing', 2), buy('coal', 3), buy('timber', 1), buy('timber', 0), sell('clothing', 1)] },
    ];
    expect(lastTurnTrades(log, N1, 3)).toEqual([
      { side: 'bid', commodity: 'coal', amount: 3 },
      { side: 'offer', commodity: 'clothing', amount: 1 },
    ]);
    expect(lastTurnTrades(log, N1, 2)).toEqual([{ side: 'bid', commodity: 'coal', amount: 1 }]);
    expect(lastTurnTrades(log, N1, 4)).toEqual([]);
  });
});

// M13 FR-494 (card Q118 (a)): last turn's bids and offers of the Great Powers are public (FR-491, `market.lastOrders`), so
// each row says what another Great Power we may trade with bid or offered last turn; a row no minor sells may be bid toward
// it (refunded if it does not sell), and a row no minor buys may be offered once it bid for it last turn (FR-492).
// The Bid line is FR-494's "No minor nation sells this; money back if Valdoria does not sell." without its first
// clause on a row no minor trades: in full it takes 3 lines of the 104 px note, and on the 13 rows no minor sells it made a
// new game's board scroll by 109 px at 1280x720 (FR-257, e2e/m7-trade.spec.ts, measured); those rows' minors column
// already says "No minor trades this". On the clothing, furniture and hardware rows that column lists the minors that buy,
// so the line is in full there (M13 review UTH-2).
describe('M13 FR-494 the Board shows the other Great Power\'s last turn', () => {
  const RIVAL_BID = 'Money back if Valdoria does not sell.';
  /** Test setup: the Great Powers' bids and offers of the last trade phase (FR-491). */
  const withLastOrders = (s: GameState, orders: Record<string, { sell?: Record<string, number>; buy?: Record<string, number> }>): GameState => {
    const lastOrders = Object.fromEntries(Object.entries(orders).map(([id, o]) => [id, { sell: o.sell ?? {}, buy: o.buy ?? {} }]));
    return { ...s, market: { ...marketOf(s), lastOrders } as GameState['market'] };
  };
  const atWarWithValdoria = (s: GameState): GameState => setPair(s, N1, N2, { war: { aggressors: [N2], since: 1 } });
  // Re-targeted by M18c FR-575 (all of this describe): the last-turn line, "No minor trades this" and the line beside an
  // open "+" are on the row's Details; a refused "+" says why in its tooltip and description (see the FR-257 describe)
  const rivalLines = () => {
    openTab('Details');
    return within(dialog()).queryAllByTestId('rival-last-turn');
  };
  const rivalLine = (commodity: string) => within(detailRow(commodity)).queryByTestId('rival-last-turn');
  const show = (s: GameState) => act(() => useGameStore.setState({ game: s }));

  it('FR-494 FR-491 a row Valdoria bid for or offered last turn says so in one line: "Valdoria wanted to buy 2 last turn", "Valdoria wanted to sell 1 last turn"; the other rows have none', () => {
    openBoard(withLastOrders(start(), { [N2]: { buy: { steel: 2 }, sell: { coal: 1 } } }));
    expect(text(rivalLine('steel')!)).toBe('Valdoria wanted to buy 2 last turn');
    expect(text(rivalLine('coal')!)).toBe('Valdoria wanted to sell 1 last turn');
    expect(rivalLines()).toHaveLength(2);
    // The minors' lists and FR-254's line stay
    expect(detail('steel', 'no-minor')).toBe('No minor trades this');
    expect(partners('coal', 'sellers')[0]).toBe('Arvelia: 3 units (no consulate)');
    // FR-399's line stays first on the Details tab (old: first under the header)
    openTab('Details');
    expect(text(within(dialog()).getByTestId('board-duration'))).toBe(DURATION);
    // The Board tab has no such line
    openTab('Board');
    expect(within(dialog()).queryAllByTestId('rival-last-turn')).toEqual([]);
  });

  it('FR-494 no line without last turn\'s orders (a new game, a game saved before M13), for our own, or toward a Great Power we may not trade with (war, boycott)', () => {
    openBoard(start());
    expect(rivalLines()).toEqual([]);
    show(withLastOrders(start(), { [N1]: { buy: { steel: 2 } } }));
    expect(rivalLines()).toEqual([]);
    show(atWarWithValdoria(withLastOrders(start(), { [N2]: { buy: { steel: 2 } } })));
    expect(rivalLines()).toEqual([]);
    show(setPair(withLastOrders(start(), { [N2]: { buy: { steel: 2 } } }), N1, N2, { boycotts: [N2] }));
    expect(rivalLines()).toEqual([]);
  });

  // Re-recorded by M13 review UTH-2: 'clothing' left this list (its line is now in full, the test below)
  it('FR-494 FR-492 the Bid "+" of a row no minor trades is enabled with "Money back if Valdoria does not sell."; a press sends the bid', () => {
    openBoard(start());
    for (const [c, name] of [['lumber', 'Lumber'], ['steel', 'Steel'], ['armaments', 'Armaments'], ['oil', 'Oil']]) {
      expect(plus(c, `Buy one more ${name}`)).toEqual(OPEN);
      expect(detail(c, 'bid-note')).toBe(RIVAL_BID);
      expect(detail(c, 'no-minor')).toBe('No minor trades this');
    }
    fireEvent.click(button('steel', 'Buy one more Steel'));
    expect(submitted).toEqual([{ kind: 'buyCommodity', nationId: N1, commodity: 'steel', amount: 1 }]);
    expect(tradeOrdersOf(now(), N1).buy.steel).toBe(1);
    expect(detail('steel', 'bid-note')).toBe(RIVAL_BID);
    // A row a minor sells keeps its own reason (FR-252)
    expect(plus('coal', 'Buy one more Coal')).toEqual(refused('We need a consulate with a seller'));
  });

  it('FR-494 (M13 review UTH-2) the clothing, furniture and hardware rows list the minors that buy them, not "No minor trades this", so their Bid line is FR-494\'s in full: "No minor nation sells this; money back if Valdoria does not sell."', () => {
    const full = 'No minor nation sells this; money back if Valdoria does not sell.';
    openBoard(start());
    for (const [c, name] of [['clothing', 'Clothing'], ['furniture', 'Furniture'], ['hardware', 'Hardware']]) {
      expect(plus(c, `Buy one more ${name}`)).toEqual(OPEN);
      expect(detail(c, 'bid-note')).toBe(full);
      expect(partners(c, 'buyers').length).toBeGreaterThan(0);
      expect(detail(c, 'no-minor')).toBeNull();
      expect(within(row(c)).queryByTestId('no-minor-mark')).toBeNull();
    }
    const clothing = boardView(start(), start().nations[0]).rows.find((r) => r.commodity === 'clothing')!;
    expect(clothing.bidNote).toEqual({ text: full, tone: 'info' });
  });

  it('FR-494 FR-492 at war with Valdoria, a war declared on it this turn, or a boycott: that "+" is disabled and names the barrier', () => {
    openBoard(atWarWithValdoria(start()));
    const war = 'We are at war with every seller';
    expect(plus('steel', 'Buy one more Steel')).toEqual(refused(war));
    show(setPair(start(), N1, N2, { boycotts: [N2] }));
    expect(plus('steel', 'Buy one more Steel')).toEqual(refused('A boycott bars every seller'));
    show(start());
    expect(plus('steel', 'Buy one more Steel').disabled).toBe(false);
    order({ kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: N2 });
    expect(plus('steel', 'Buy one more Steel')).toEqual(refused(war));
  });

  it('FR-494 FR-492 the Offer "+" of a row no minor buys is enabled only after Valdoria bid for it last turn: "Only Valdoria may buy this"; not for its offer, nor at war', () => {
    const steel = () => setWarehouse(start(), N1, { steel: 3 });
    openBoard(steel());
    const none = 'No one buys this';
    choose('steel', 'Sell');
    expect(plus('steel', 'Sell one more Steel')).toEqual(refused(none));

    show(withLastOrders(steel(), { [N2]: { buy: { steel: 2 } } }));
    const only = 'Only Valdoria may buy this';
    expect(plus('steel', 'Sell one more Steel')).toEqual(OPEN);
    expect(detail('steel', 'offer-note')).toBe(only);
    fireEvent.click(button('steel', 'Sell one more Steel'));
    expect(submitted.at(-1)).toEqual({ kind: 'sellCommodity', nationId: N1, commodity: 'steel', amount: 1 });
    expect(cell('steel', 'offer')).toBe('1');

    // Valdoria's offer of steel last turn is not a bid; its bid for lumber is not one for steel
    show(withLastOrders(steel(), { [N2]: { sell: { steel: 2 }, buy: { lumber: 2 } } }));
    expect(plus('steel', 'Sell one more Steel')).toEqual(refused(none));
    show(atWarWithValdoria(withLastOrders(steel(), { [N2]: { buy: { steel: 2 } } })));
    expect(plus('steel', 'Sell one more Steel')).toEqual(refused('We are at war with every buyer'));
  });

  it('FR-494 boardView: the row\'s `rivalLastTurn` line and the bid note as info', () => {
    const s = withLastOrders(start(), { [N2]: { buy: { steel: 2 } } });
    const rows = boardView(s, s.nations[0]).rows;
    const steelRow = rows.find((r) => r.commodity === 'steel')!;
    expect(steelRow.rivalLastTurn).toBe('Valdoria wanted to buy 2 last turn');
    expect(steelRow.bidNote).toEqual({ text: RIVAL_BID, tone: 'info' });
    expect(rows.filter((r) => r.rivalLastTurn !== undefined).map((r) => r.commodity)).toEqual(['steel']);
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
    // Re-recorded by M18c FR-573: old holdsText "Holds: 4 of 4 free"; the bar's figures are new
    expect(view.holdsText).toBe('Holds: 0 of 4 used (1 Indiaman)');
    expect(view.bidsText).toBe('Buying 0 of 4 commodities');
    expect([view.cash, view.committed, view.treasury]).toEqual([10000, 0, 10000]);
    expect(view.bids).toEqual({ used: 0, max: 4 });
    expect(view.favouritesText).toBe(FAVOURITES_SEED_1);
    expect(view.rows.map((r) => r.commodity)).toEqual([...BOARD_ORDER]);
    const coal = view.rows.find((r) => r.commodity === 'coal')!;
    expect(coal.sellers.map((p) => p.minorId)).toEqual([ARVELIA, SUNDMARK, PELLIS]);
    // M18c FR-574: the name alone too, for the flag's tooltip
    expect(coal.sellers[0]).toEqual({ minorId: ARVELIA, name: 'Arvelia', text: 'Arvelia: 3 units', barrier: 'no consulate' });
    expect(coal.bidNote).toEqual({ text: 'We need a consulate with a seller', tone: 'refusal' });
    expect(coal.offerNote).toEqual({ text: 'No one buys this', tone: 'refusal' });
    expect(coal.noMinorText).toBeUndefined();
    expect(view.rows.find((r) => r.commodity === 'armaments')!.noMinorText).toBe('No minor trades this');
    expect(view.rows.find((r) => r.commodity === ResourceType.Coal)!.bidMoreRefusal).toBe('We need a consulate with a seller');
  });
});
