// FR-244 (replaces FR-192): the Deal Book's lines as Imp1 wrote them ("Sold 1 Clothing to Arvelia @ $810"), from the engine's
// `dealBook` data; and the news lines of the M7 trade events (`eventText`).
import { describe, it, expect } from 'vitest';
import { dealBook, type GameEvent } from '@/engine';
import { dealBookView, dealLineText } from '@/components/market/dealBookView';
import { eventText } from '@/components/gameText';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';

const N1 = 'nation-1';
const NAMES: Record<string, string> = { 'nation-1': 'Testland', 'nation-2': 'Valdoria', 'minor-1': 'Arvelia' };
const nameOf = (id: string) => NAMES[id] ?? id;

/** A turn of Testland's: 1 clothing sold to Arvelia at $810, 2 coal bought at $110, no hold for its iron ore, 1 furniture unsold. */
const EVENTS: GameEvent[] = [
  { type: 'goods-sold', nationId: N1, commodity: GoodsType.Clothing, amount: 1, price: 810, income: 810, counterpartyId: 'minor-1' },
  { type: 'goods-bought', nationId: N1, commodity: ResourceType.Coal, amount: 2, price: 110, cost: 220, counterpartyId: 'minor-1' },
  { type: 'goods-bought', nationId: 'nation-2', commodity: ResourceType.Coal, amount: 1, price: 100, cost: 100, counterpartyId: 'minor-1' },
  { type: 'offer-missed', nationId: N1, counterpartyId: 'minor-1', commodity: ResourceType.IronOre, amount: 1, reason: 'no-hold' },
  { type: 'offer-unsold', nationId: N1, commodity: GoodsType.Furniture, amount: 1 },
  { type: 'turn-ended', turn: 2, year: 1815 },
];

describe('FR-244 the Deal Book lines', () => {
  it('FR-244 Sold, Bought and the missed offer in the Imp1 words, and the bottom line', () => {
    expect(dealBookView(dealBook(EVENTS, N1), nameOf)).toEqual({
      sold: ['Sold 1 Clothing to Arvelia @ $810', '1 Furniture not sold, back in the warehouse'],
      bought: ['Bought 2 Coal from Arvelia @ $110', 'Arvelia offered to sell us 1 Iron Ore (no free hold)'],
      bottomLine: [
        { label: 'Sold', amount: 810, text: '$810' },
        { label: 'Bought', amount: 220, text: '$220' },
        { label: 'Military upkeep', amount: 0, text: '$0' },
        { label: 'Net', amount: 590, text: '$590' },
      ],
      empty: false,
    });
  });

  it('FR-244 a missed offer for want of money, a Great Power counterparty, a world deal, a negative net', () => {
    expect(dealLineText({ kind: 'missed', commodity: ResourceType.Coal, amount: 2, counterpartyId: 'nation-2', reason: 'no-cash' }, nameOf)).toBe(
      'Valdoria offered to sell us 2 Coal (not enough money)'
    );
    expect(dealLineText({ kind: 'sold', commodity: MaterialType.Steel, amount: 2, price: 270, total: 540, counterpartyId: 'nation-1' }, nameOf)).toBe(
      'Sold 2 Steel to Testland @ $270'
    );
    expect(dealLineText({ kind: 'bought', commodity: ResourceType.Coal, amount: 2, price: 100, total: 200 }, nameOf)).toBe('Bought 2 Coal @ $100');
    const book = dealBook([{ type: 'goods-bought', nationId: N1, commodity: GoodsType.Hardware, amount: 1, price: 1369, cost: 1369, counterpartyId: 'nation-2' }], N1);
    expect(dealBookView(book, nameOf).bottomLine.at(-1)).toEqual({ label: 'Net', amount: -1369, text: '-$1,369' });
  });

  it('FR-244 FR-195 a turn without a deal is empty', () => {
    expect(dealBookView(dealBook([{ type: 'turn-ended', turn: 2, year: 1815 }], N1), nameOf)).toMatchObject({ sold: [], bought: [], empty: true });
  });

  it('FR-244 a bid nobody filled is the last line under Bought, so a turn with only that is not "No deals last turn."', () => {
    const events: GameEvent[] = [...EVENTS, { type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Timber, amount: 2 }];
    expect(dealBookView(dealBook(events, N1), nameOf).bought).toEqual([
      'Bought 2 Coal from Arvelia @ $110',
      'Arvelia offered to sell us 1 Iron Ore (no free hold)',
      'Nobody sold us 2 Timber (bid money back)',
    ]);
    const only = dealBookView(dealBook([{ type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Coal, amount: 2 }], N1), nameOf);
    expect(only).toMatchObject({ sold: [], bought: ['Nobody sold us 2 Coal (bid money back)'], empty: false });
    expect(only.bottomLine.at(-1)).toEqual({ label: 'Net', amount: 0, text: '$0' });
  });
});

describe('FR-244 the news lines of the trade events', () => {
  it('FR-244 a deal names its counterparty; a missed offer and an unsold offer have their own lines; v1 lines are unchanged', () => {
    expect(EVENTS.slice(0, 5).map(e => eventText(e, nameOf))).toEqual([
      'Sold 1 Clothing to Arvelia for $810.',
      'Bought 2 Coal from Arvelia for $220.',
      'Bought 1 Coal from Arvelia for $100.',
      'Arvelia offered to sell us 1 Iron Ore: no free hold.',
      '1 Furniture not sold; back in the warehouse.',
    ]);
    expect(eventText({ type: 'goods-sold', nationId: N1, commodity: GoodsType.Furniture, amount: 2, price: 900, income: 1800 })).toBe('Sold 2 Furniture for $1,800.');
  });

  it('FR-244 a bid nobody filled has its news line; a missed offer for want of money reads as in the Deal Book', () => {
    expect(eventText({ type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Coal, amount: 2 }, nameOf)).toBe('Nobody sold us 2 Coal; the bid money is back.');
    expect(eventText({ type: 'offer-missed', nationId: N1, counterpartyId: 'nation-2', commodity: ResourceType.Coal, amount: 1, reason: 'no-cash' }, nameOf)).toBe(
      'Valdoria offered to sell us 1 Coal: not enough money.'
    );
  });
});
