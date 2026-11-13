// @vitest-environment jsdom
// M7 UI half. FR-195 (Imp1 Deal Book, rules 11 section 2): the HUD's "Deal Book" button opens a dialog named "Deal Book"
// with the last resolved turn's deals for the player (the engine's `dealBook`, in the words of
// components/market/dealBookView.ts, FR-244) in two lists, "Sold" and "Bought" (missed offers and bids nobody filled under
// Bought), the turn it shows (FR-248) and the
// bottom line (Sold, Bought, Military upkeep, Net); with no deal it says "No deals last turn.". FR-197 in the store: a
// consulate with Arvelia and a bid of 2 coal on turn 1 end the turn as "Bought 2 Coal from Arvelia @ $100".
// QA fix round: what was not traded is a third list, "Not traded", each line with its cause (FR-255); the bottom line
// ends in the Trade net and the Treasury table beside it adds the diplomacy costs and the rest up to the treasury's
// change over the turn, from the store's turn report (FR-256).
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { DealBookModal } from '@/components/DealBookModal';
import { ActionButtons } from '@/components/HUD/index';
import { useGameStore, type TurnReport } from '@/store/rootStore';
import { newGame, type GameEvent, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { GoodsType, ResourceType } from '@/types/Resource';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const N2 = 'nation-2';
const ARVELIA = 'minor-1';
const DEAL_BOOK = 'Deal Book — Testland';

const start = (): GameState => newGame({ seed: 1, world: 'continent' });

/** Testland's turn 1: 1 clothing sold to Arvelia at $810, 2 coal bought at $110, no hold for 1 iron ore, 1 furniture unsold. */
const EVENTS: GameEvent[] = [
  { type: 'goods-sold', nationId: N1, commodity: GoodsType.Clothing, amount: 1, price: 810, income: 810, counterpartyId: ARVELIA },
  { type: 'goods-bought', nationId: N1, commodity: ResourceType.Coal, amount: 2, price: 110, cost: 220, counterpartyId: ARVELIA },
  { type: 'goods-bought', nationId: N2, commodity: ResourceType.Coal, amount: 1, price: 100, cost: 100, counterpartyId: ARVELIA },
  { type: 'offer-missed', nationId: N1, counterpartyId: ARVELIA, commodity: ResourceType.IronOre, amount: 1, reason: 'no-hold' },
  { type: 'offer-unsold', nationId: N1, commodity: GoodsType.Furniture, amount: 1 },
  { type: 'turn-ended', turn: 1, year: 1815 },
];

/** Opens the Deal Book on `state` with these resolved turns in the event log. */
function openDealBook(eventLog: TurnReport[], state: GameState = start()) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, eventLog, isDealBookOpen: true });
  return render(<DealBookModal />);
}

const dialog = () => screen.getByRole('dialog', { name: DEAL_BOOK });
const lines = (name: 'Sold' | 'Bought' | 'Not traded') =>
  within(within(dialog()).getByRole('list', { name })).getAllByRole('listitem').map((li) => text(li));
const bottomLine = () =>
  within(within(dialog()).getByRole('table', { name: 'Bottom line' })).getAllByRole('row').map((r) => text(r));
const treasuryLines = () =>
  within(within(dialog()).getByRole('table', { name: 'Treasury' })).getAllByRole('row').map((r) => text(r));

describe('FR-195 the Deal Book', () => {
  it('FR-195 is closed until opened; the HUD button "Deal Book" opens it', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: start(), activeNationId: N1 });
    render(<><ActionButtons /><DealBookModal /></>);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Deal Book' }));
    expect(useGameStore.getState().isDealBookOpen).toBe(true);
    expect(dialog()).toBeTruthy();
    expect(text(within(dialog()).getByRole('heading', { level: 2 }))).toBe(DEAL_BOOK);
  });

  it('FR-195 FR-244 FR-248 FR-255 the last turn\'s deals: Sold and Bought, then Not traded (the unsold unit, the missed offer), the turn and the bottom line', () => {
    openDealBook([{ turn: 1, year: 1815, events: EVENTS }]);
    expect(lines('Sold')).toEqual(['Sold 1 Clothing to Arvelia @ $810']);
    expect(lines('Bought')).toEqual(['Bought 2 Coal from Arvelia @ $110']);
    expect(lines('Not traded')).toEqual(['1 Furniture not sold, back in the warehouse', 'Arvelia offered to sell us 1 Iron Ore (no free hold)']);
    expect(bottomLine()).toEqual(['Sold $810', 'Bought $220', 'Military upkeep $0', 'Trade net $590']);
    // A report made by hand has no treasuries: no Treasury table
    expect(within(dialog()).queryByRole('table', { name: 'Treasury' })).toBeNull();
    expect(text(within(dialog()).getByTestId('deal-book-turn'))).toBe('Turn 1, Spring 1815');
    expect(within(dialog()).queryByText('No deals last turn.')).toBeNull();
    // Each line shows its commodity's icon, decorative (FR-121)
    const sold = within(within(dialog()).getByRole('list', { name: 'Sold' })).getAllByRole('listitem');
    expect(sold[0].querySelector('svg')?.getAttribute('data-icon')).toBe('GiShirt');
    expect(sold[0].querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('FR-195 only the last resolved turn counts; a loss shows as a negative net', () => {
    const later: GameEvent[] = [
      { type: 'goods-bought', nationId: N1, commodity: GoodsType.Hardware, amount: 1, price: 1369, cost: 1369, counterpartyId: N2 },
      { type: 'turn-ended', turn: 2, year: 1815 },
    ];
    openDealBook([{ turn: 1, year: 1815, events: EVENTS }, { turn: 2, year: 1815, events: later }]);
    expect(lines('Bought')).toEqual(['Bought 1 Hardware from Valdoria @ $1,369']);
    // Nothing sold: the Sold page says so instead of an empty list
    expect(within(dialog()).queryByRole('list', { name: 'Sold' })).toBeNull();
    expect(text(within(dialog()).getByTestId('sold-none'))).toBe('Nothing sold.');
    expect(bottomLine()).toEqual(['Sold $0', 'Bought $1,369', 'Military upkeep $0', 'Trade net -$1,369']);
    // Everything traded: no Not traded list
    expect(within(dialog()).queryByRole('list', { name: 'Not traded' })).toBeNull();
    expect(text(within(dialog()).getByTestId('deal-book-turn'))).toBe('Turn 2, Summer 1815');
  });

  it('FR-244 FR-195 FR-255 a turn whose only trade is a bid nobody filled says so under Not traded, with its cause, not "No deals last turn."', () => {
    const cause = { kind: 'barred', barred: [{ countryId: 'minor-3', barrier: 'no-consulate' }] } as const;
    openDealBook([{ turn: 1, year: 1815, events: [{ type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Coal, amount: 2, cause: { ...cause, barred: [...cause.barred] } }, EVENTS[5]] }]);
    expect(lines('Not traded')).toEqual(['Nobody sold us 2 Coal (no consulate with Lorran; bid money back)']);
    expect(text(within(dialog()).getByTestId('bought-none'))).toBe('Nothing bought.');
    expect(within(dialog()).queryByTestId('deal-book-empty')).toBeNull();
    expect(bottomLine()).toEqual(['Sold $0', 'Bought $0', 'Military upkeep $0', 'Trade net $0']);
  });

  it('FR-195 a turn without a deal, and a game before its first End Turn, say "No deals last turn."', () => {
    const view = openDealBook([{ turn: 1, year: 1815, events: [{ type: 'turn-ended', turn: 1, year: 1815 }] }]);
    expect(text(within(dialog()).getByTestId('deal-book-empty'))).toBe('No deals last turn.');
    expect(within(dialog()).queryByRole('list')).toBeNull();
    expect(within(dialog()).queryByRole('table')).toBeNull();
    view.unmount();

    openDealBook([]);
    expect(text(within(dialog()).getByTestId('deal-book-empty'))).toBe('No deals last turn.');
    expect(within(dialog()).queryByTestId('deal-book-turn')).toBeNull();
  });

  it("FR-195 another nation's deals are not ours", () => {
    openDealBook([{ turn: 1, year: 1815, events: [EVENTS[2], EVENTS[5]] }]);
    expect(text(within(dialog()).getByTestId('deal-book-empty'))).toBe('No deals last turn.');
  });

  it('FR-195 Close closes it, and a new game closes it too', () => {
    openDealBook([{ turn: 1, year: 1815, events: EVENTS }]);
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close Deal Book' }));
    expect(useGameStore.getState().isDealBookOpen).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => useGameStore.getState().openDealBook());
    expect(dialog()).toBeTruthy();
    act(() => useGameStore.getState().startNewGame({ seed: 2 }));
    expect(useGameStore.getState().isDealBookOpen).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('FR-197 FR-195 in the store: a consulate and a bid on turn 1, then End Turn', () => {
  it('FR-197 a consulate with Arvelia and 2 coal bid: the Deal Book reads "Bought 2 Coal from Arvelia @ $100"', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: start(), activeNationId: N1 });
    const orders: Order[] = [
      { kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: ARVELIA },
      { kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 2 },
    ];
    for (const order of orders) expect(useGameStore.getState().submitOrder(order)).toEqual({ ok: true });
    useGameStore.getState().advanceTurn();
    useGameStore.getState().openDealBook();

    render(<DealBookModal />);
    expect(lines('Bought')).toEqual(['Bought 2 Coal from Arvelia @ $100']);
    // FR-202: the start army's $100 upkeep is in the bottom line
    expect(bottomLine()).toEqual(['Sold $0', 'Bought $200', 'Military upkeep $100', 'Trade net -$300']);
    expect(text(within(dialog()).getByTestId('deal-book-turn'))).toBe('Turn 1, Spring 1815');
    // FR-256: the consulate's $500 and the trade net explain the whole change of the treasury, $10,000 to $9,200
    expect(treasuryLines()).toEqual(['Trade net -$300', 'Consulate in Arvelia -$500', 'Treasury change -$800']);
    expect(text(within(dialog()).getByTestId('treasury'))).toMatch(/From \$10,000 to \$9,200$/);
    expect(useGameStore.getState().game.nations[0].treasury).toBe(9200);
  });

  it('FR-256 the store\'s turn report holds each nation\'s treasury at the turn\'s start (before the first order) and after it', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: start(), activeNationId: N1 });
    expect(useGameStore.getState().submitOrder({ kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: ARVELIA })).toEqual({ ok: true });
    // A refused order changes nothing
    expect(useGameStore.getState().submitOrder({ kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Wool, amount: 1 }).ok).toBe(false);
    const before = useGameStore.getState().game;
    useGameStore.getState().advanceTurn();
    const report = useGameStore.getState().eventLog.at(-1)!;
    const end = (id: string) => useGameStore.getState().game.nations.find((n) => n.id === id)!.treasury;
    // Valdoria's orders apply inside End Turn: its start is its treasury when the turn was ended
    expect(report.treasuries).toEqual({
      [N1]: { start: 10000, end: end(N1) },
      [N2]: { start: before.nations[1].treasury, end: end(N2) },
    });
    // the consulate's $500 and the start army's $100 upkeep (FR-202)
    expect(report.treasuries![N1].end).toBe(9400);

    // A turn without an order of ours starts where the last one ended
    useGameStore.getState().advanceTurn();
    expect(useGameStore.getState().eventLog.at(-1)!.treasuries![N1].start).toBe(9400);
  });

  it('FR-262 review R5: 1 Regulars ordered in the Armoury on turn 1, then End Turn: the Treasury table names it, "1 Regulars recruited -$500", not "Other"', () => {
    const armed = start();
    const withArmaments: GameState = { ...armed, nations: armed.nations.map((n) => (n.id === N1 ? { ...n, warehouse: { ...n.warehouse, armaments: 1 } } : n)) };
    useGameStore.setState({ ...useGameStore.getInitialState(), game: withArmaments, activeNationId: N1 });
    expect(useGameStore.getState().submitOrder({ kind: 'setRecruitment', nationId: N1, regiment: 'regulars', count: 1 })).toEqual({ ok: true });
    useGameStore.getState().advanceTurn();
    useGameStore.getState().openDealBook();

    render(<DealBookModal />);
    // $10,000 - $500 (the recruit, paid when ordered) - $100 (the start army's upkeep)
    expect(treasuryLines()).toEqual(['Trade net -$100', '1 Regulars recruited -$500', 'Treasury change -$600']);
    expect(text(within(dialog()).getByTestId('treasury'))).toMatch(/From \$10,000 to \$9,400$/);
  });

  it('FR-256 a turn with only a consulate: "No deals last turn." and the Treasury table, which explains the $500', () => {
    const events: GameEvent[] = [{ type: 'overture-done', nationId: N1, overture: 'consulate', targetId: ARVELIA }, EVENTS[5]];
    openDealBook([{ turn: 1, year: 1815, events, treasuries: { [N1]: { start: 10000, end: 9500 } } }]);
    expect(text(within(dialog()).getByTestId('deal-book-empty'))).toBe('No deals last turn.');
    expect(within(dialog()).queryByRole('table', { name: 'Bottom line' })).toBeNull();
    expect(treasuryLines()).toEqual(['Trade net $0', 'Consulate in Arvelia -$500', 'Treasury change -$500']);
  });
});
