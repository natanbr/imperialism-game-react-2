// @vitest-environment jsdom
// M18b FR-563 (owner feedback 2026-11-23: "rename bid and offer to buy and sell"): the Market and trade screens say "Buy"
// and "Sell" where they said "Bid" and "Offer", in every label, button name, title, note, news line and Deal Book line.
// Engine names (`bid-unfilled`, `offer-missed`, `buyCommodity`) stay. Diplomacy's offers (an alliance or peace offer, the
// Accept Offer screen) are not trade and keep their word.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MarketModal } from '@/components/MarketModal';
import { MORE_REFUSAL_TEXT, repeatTrades, rivalSellerText } from '@/components/market/boardView';
import { dealBookView } from '@/components/market/dealBookView';
import { eventText, MISSED_TEXT, refusalText, REFUSAL_TEXT } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { dealBook, newGame, type GameEvent, type RejectReason } from '@/engine';
import type { GameState } from '@/types/GameState';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { emptyWarehouse, game, N1, setTreasury, setWarehouse } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

/** The old trade words, in any form a player could read. */
const OLD_WORDS = /\b(bid|bids|bidder|bidders|bidding|offer|offers|offered|offering)\b/i;

const N2 = 'nation-2';
const NAMES: Record<string, string> = { 'nation-1': 'Testland', 'nation-2': 'Valdoria', 'minor-1': 'Arvelia', 'minor-3': 'Lorran' };
const nameOf = (id: string) => NAMES[id] ?? id;

/** Everything a player or a screen reader meets in `root`: its text, every name, title and placeholder. */
function readable(root: HTMLElement): string[] {
  const out = [root.textContent ?? ''];
  for (const el of root.querySelectorAll('*')) {
    for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
      const value = el.getAttribute(attr);
      if (value) out.push(value);
    }
  }
  return out;
}

const leftovers = (texts: readonly string[]) => texts.filter((t) => OLD_WORDS.test(t));

function open(state: GameState) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, isMarketOpen: true });
  return render(<MarketModal />);
}

describe('FR-563 the Market says Buy and Sell', () => {
  // Re-targeted by M18c FR-574 to FR-577: the heads were Commodity, Price, In warehouse, Buy, Sell, Minor nations; now Buy
  // and Sell are the choice in each row's Order column (its buttons' visible text), and the rival lines and FR-399's line
  // are on the Details tab. Every tab is read for the old words, not only the Board.
  it('FR-563 the Board of Trade: Buy and Sell in each row, buttons "Buy one more Coal" and "Sell one more Clothing", no Bid or Offer on any tab', () => {
    // Valdoria bought steel and sold coal last turn (FR-491), so the rival lines show too
    const start = newGame({ seed: 1, world: 'continent' });
    const state: GameState = {
      ...start,
      market: { ...start.market!, lastOrders: { [N2]: { buy: { [MaterialType.Steel]: 2 }, sell: { [ResourceType.Coal]: 1 } } } },
    };
    open(state);
    const dialog = screen.getByRole('dialog', { name: 'Board of Trade — Testland' });
    expect(within(dialog).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Commodity', 'Price', 'Available', 'Order', 'Quantity', 'Market']);
    const coal = within(dialog).getByTestId('trade-row-coal');
    // M18c review round: Buy and Sell are radios (were toggle buttons); a refused "+" keeps its plain name, the reason its
    // description (was "Buy one more Coal: We need a consulate with a seller")
    expect(within(coal).getAllByRole('radio', { name: /^(Buy|Sell) Coal$/ }).map((b) => b.textContent)).toEqual(['Buy', 'Sell']);
    fireEvent.click(within(coal).getByRole('button', { name: 'Buy one more Coal' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Sell Clothing' }));
    expect(within(dialog).getByRole('button', { name: 'Sell one more Clothing' })).toBeTruthy();
    expect(within(dialog).getByTestId('market-bids').textContent).toMatch(/^Buying [01] of 4 commodities$/);
    expect(leftovers(readable(dialog))).toEqual([]);

    fireEvent.click(within(dialog).getByRole('tab', { name: 'Details' }));
    expect(within(dialog).getByTestId('board-duration').textContent).toBe('Buy and sell orders last one turn; production orders in the Capital stay.');
    expect(within(within(dialog).getByTestId('detail-row-steel')).getByTestId('rival-last-turn').textContent).toBe('Valdoria wanted to buy 2 last turn');
    expect(within(within(dialog).getByTestId('detail-row-coal')).getByTestId('rival-last-turn').textContent).toBe('Valdoria wanted to sell 1 last turn');
    expect(leftovers(readable(dialog))).toEqual([]);

    fireEvent.click(within(dialog).getByRole('tab', { name: 'Trade policies' }));
    expect(within(dialog).getAllByRole('button', { name: '5%' }).length).toBeGreaterThan(0);
    expect(leftovers(readable(dialog))).toEqual([]);
  });

  it('FR-563 the World market: "Buying: 0 of 4" and no Bid or Offer anywhere', () => {
    open(emptyWarehouse(game(), N1, { furniture: 3, lumber: 2, coal: 7 }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('market-bids').textContent).toBe('Buying: 0 of 4');
    expect(leftovers(readable(dialog))).toEqual([]);
  });

  // Re-recorded by M18c FR-574: the narrow cells were labelled "Buy" and "Sell" (one stepper each); now one cell holds the
  // Buy/Sell choice ("Order") and one the stepper ("Quantity"), and the words Buy and Sell are the choice's own text
  it('FR-563 FR-574 the narrow Board labels its cells Order and Quantity, never Bid or Offer (Market.module.css, below 600 px)', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/components/market/Market.module.css'), 'utf8');
    const contents = [...css.matchAll(/content:\s*"([^"]*)"/g)].map((m) => m[1]);
    expect(contents).toContain('Order');
    expect(contents).toContain('Quantity');
    expect(leftovers(contents)).toEqual([]);
  });
});

describe('FR-563 trade texts: news, Deal Book, refusals and notes', () => {
  const events: GameEvent[] = [
    { type: 'goods-sold', nationId: N1, commodity: GoodsType.Clothing, amount: 1, price: 810, income: 810, counterpartyId: 'minor-1' },
    { type: 'goods-bought', nationId: N1, commodity: ResourceType.Coal, amount: 2, price: 110, cost: 220, counterpartyId: 'minor-1' },
    { type: 'offer-missed', nationId: N1, counterpartyId: 'minor-1', commodity: ResourceType.IronOre, amount: 1, reason: 'no-hold' },
    { type: 'offer-missed', nationId: N1, counterpartyId: N2, commodity: ResourceType.Coal, amount: 1, reason: 'no-cash' },
    { type: 'offer-unsold', nationId: N1, commodity: GoodsType.Furniture, amount: 1 },
    { type: 'offer-unsold', nationId: N1, commodity: GoodsType.Furniture, amount: 1, cause: { kind: 'nobody' } },
    { type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Coal, amount: 2 },
    { type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Timber, amount: 1, cause: { kind: 'barred', barred: [{ countryId: 'minor-3', barrier: 'no-consulate' }] } },
  ];

  it('FR-563 the news lines of every trade event say who wanted to sell, and "the money is back"', () => {
    const lines = events.map((e) => eventText(e, nameOf) ?? '');
    expect(lines).toContain('Arvelia wanted to sell us 1 Iron Ore: no free hold.');
    expect(lines).toContain('Nobody sold us 2 Coal; the money is back.');
    expect(leftovers(lines)).toEqual([]);
  });

  it('FR-563 the Deal Book lines: "wanted to sell us", "(money back)"', () => {
    const view = dealBookView(dealBook(events, N1), nameOf);
    const lines = [...view.sold, ...view.bought, ...view.notTraded];
    expect(lines).toContain('Arvelia wanted to sell us 1 Iron Ore (no free hold)');
    expect(lines).toContain('Nobody sold us 2 Coal (money back)');
    expect(leftovers(lines)).toEqual([]);
  });

  it('FR-563 every refusal of a purchase or sale, the "+" notes and the missed-deal reasons', () => {
    const reasons = Object.keys(REFUSAL_TEXT) as RejectReason[];
    const refusals = reasons.flatMap((reason) => [
      refusalText({ order: { kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 }, reason }),
      refusalText({ order: { kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 }, reason }),
    ]);
    const notes = [...Object.values(MORE_REFUSAL_TEXT), ...Object.values(MISSED_TEXT), rivalSellerText(['Valdoria'], true), rivalSellerText(['Valdoria'], false)];
    expect(MORE_REFUSAL_TEXT.bids).toBe('Already buying 4 commodities this turn, the most');
    expect(rivalSellerText(['Valdoria'], false)).toBe('Money back if Valdoria does not sell.');
    expect(leftovers([...refusals, ...notes])).toEqual([]);
  });

  it('FR-563 Repeat last turn\'s trades names a refused unit as a purchase or a sale, never by the engine\'s side name (review 2026-11-23)', () => {
    // No money and no clothing: the coal purchase and the clothing sale are both refused, each named in the line
    const state = setWarehouse(setTreasury(newGame({ seed: 1, world: 'continent' }), N1, 0), N1, { clothing: 0 });
    const outcome = repeatTrades(
      [
        { side: 'bid', commodity: ResourceType.Coal, amount: 2 },
        { side: 'offer', commodity: GoodsType.Clothing, amount: 1 },
      ],
      N1,
      () => state,
      () => ({ ok: true })
    );
    expect(outcome.text).toMatch(/Coal purchase: [a-z]/);
    expect(outcome.text).toMatch(/Clothing sale: [a-z]/);
    expect(leftovers([outcome.text])).toEqual([]);
  });
});
