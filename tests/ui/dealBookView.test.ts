// FR-244 (replaces FR-192): the Deal Book's lines as Imp1 wrote them ("Sold 1 Clothing to Arvelia @ $810"), from the engine's
// `dealBook` data; and the news lines of the M7 trade events (`eventText`).
// QA fix round: what was not traded is its own list, each line with its cause (FR-255); the bottom line ends in the Trade
// net and the Treasury lines add the diplomacy costs and the rest up to the treasury's change (FR-256); one money format
// with a loss's minus sign in front (FR-258).
import { describe, it, expect } from 'vitest';
import { dealBook, type GameEvent } from '@/engine';
import { causeText, dealBookView, dealLineText, namesText } from '@/components/market/dealBookView';
import { eventText, money } from '@/components/gameText';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';

const N1 = 'nation-1';
const NAMES: Record<string, string> = { 'nation-1': 'Testland', 'nation-2': 'Valdoria', 'minor-1': 'Arvelia', 'minor-2': 'Sundmark', 'minor-3': 'Lorran', 'minor-4': 'Pellis' };
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

describe('FR-244 FR-255 the Deal Book lines', () => {
  it('FR-244 FR-255 Sold and Bought hold only the deals; the missed offer and the unsold unit are under Not traded; the bottom line ends in the Trade net', () => {
    expect(dealBookView(dealBook(EVENTS, N1), nameOf)).toEqual({
      sold: ['Sold 1 Clothing to Arvelia @ $810'],
      bought: ['Bought 2 Coal from Arvelia @ $110'],
      notTraded: ['1 Furniture not sold, back in the warehouse', 'Arvelia offered to sell us 1 Iron Ore (no free hold)'],
      bottomLine: [
        { label: 'Sold', amount: 810, text: '$810' },
        { label: 'Bought', amount: 220, text: '$220' },
        { label: 'Military upkeep', amount: 0, text: '$0' },
        { label: 'Trade net', amount: 590, text: '$590' },
      ],
      empty: false,
    });
  });

  it('FR-244 FR-258 a missed offer for want of money, a Great Power counterparty, a world deal, a negative net', () => {
    expect(dealLineText({ kind: 'missed', commodity: ResourceType.Coal, amount: 2, counterpartyId: 'nation-2', reason: 'no-cash' }, nameOf)).toBe(
      'Valdoria offered to sell us 2 Coal (not enough money)'
    );
    expect(dealLineText({ kind: 'sold', commodity: MaterialType.Steel, amount: 2, price: 270, total: 540, counterpartyId: 'nation-1' }, nameOf)).toBe(
      'Sold 2 Steel to Testland @ $270'
    );
    expect(dealLineText({ kind: 'bought', commodity: ResourceType.Coal, amount: 2, price: 100, total: 200 }, nameOf)).toBe('Bought 2 Coal @ $100');
    const book = dealBook([{ type: 'goods-bought', nationId: N1, commodity: GoodsType.Hardware, amount: 1, price: 1369, cost: 1369, counterpartyId: 'nation-2' }], N1);
    expect(dealBookView(book, nameOf).bottomLine.at(-1)).toEqual({ label: 'Trade net', amount: -1369, text: '-$1,369' });
    expect([money(-1369), money(10000), money(0)]).toEqual(['-$1,369', '$10,000', '$0']);
  });

  it('FR-244 FR-195 a turn without a deal is empty', () => {
    expect(dealBookView(dealBook([{ type: 'turn-ended', turn: 2, year: 1815 }], N1), nameOf)).toMatchObject({ sold: [], bought: [], notTraded: [], empty: true });
  });

  it('FR-244 FR-255 a bid nobody filled is the last line under Not traded, so a turn with only that is not "No deals last turn."', () => {
    const events: GameEvent[] = [...EVENTS, { type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Timber, amount: 2 }];
    expect(dealBookView(dealBook(events, N1), nameOf).notTraded).toEqual([
      '1 Furniture not sold, back in the warehouse',
      'Arvelia offered to sell us 1 Iron Ore (no free hold)',
      'Nobody sold us 2 Timber (bid money back)',
    ]);
    const only = dealBookView(dealBook([{ type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Coal, amount: 2 }], N1), nameOf);
    expect(only).toMatchObject({ sold: [], bought: [], notTraded: ['Nobody sold us 2 Coal (bid money back)'], empty: false });
    expect(only.bottomLine.at(-1)).toEqual({ label: 'Trade net', amount: 0, text: '$0' });
  });
});

describe('FR-255 the cause of what was not traded', () => {
  it('FR-255 each cause in words: "no seller", "no buyer", "no consulate with Lorran", "Valdoria was served first", "the sellers had no more", "no free hold"', () => {
    expect(causeText({ kind: 'nobody' }, 'bid', nameOf)).toBe('no seller');
    expect(causeText({ kind: 'nobody' }, 'offer', nameOf)).toBe('no buyer');
    expect(causeText({ kind: 'barred', barred: [{ countryId: 'minor-3', barrier: 'no-consulate' }] }, 'bid', nameOf)).toBe('no consulate with Lorran');
    expect(
      causeText(
        { kind: 'barred', barred: [{ countryId: 'minor-1', barrier: 'at-war' }, { countryId: 'minor-3', barrier: 'no-consulate' }, { countryId: 'minor-4', barrier: 'no-consulate' }] },
        'offer',
        nameOf
      )
    ).toBe('at war with Arvelia; no consulate with Lorran and Pellis');
    expect(causeText({ kind: 'barred', barred: [{ countryId: 'nation-2', barrier: 'boycott' }] }, 'offer', nameOf)).toBe('boycott with Valdoria');
    expect(causeText({ kind: 'served-first', rivalIds: ['nation-2'] }, 'bid', nameOf)).toBe('Valdoria was served first');
    expect(causeText({ kind: 'used-up' }, 'bid', nameOf)).toBe('the sellers had no more');
    expect(causeText({ kind: 'used-up' }, 'offer', nameOf)).toBe('the buyers wanted no more');
    expect(causeText({ kind: 'no-hold' }, 'offer', nameOf)).toBe('no free hold');
    expect([namesText(['A']), namesText(['A', 'B']), namesText(['A', 'B', 'C'])]).toEqual(['A', 'A and B', 'A, B and C']);
  });

  it('FR-259 the barred counterparties that still had units come first, then what the open ones did: "the other sellers had no more"', () => {
    const barred = [{ countryId: 'minor-2', barrier: 'no-consulate' as const }, { countryId: 'minor-4', barrier: 'no-consulate' as const }];
    expect(causeText({ kind: 'used-up', barred }, 'bid', nameOf)).toBe('no consulate with Sundmark and Pellis; the other sellers had no more');
    expect(causeText({ kind: 'used-up', barred: [{ countryId: 'minor-3', barrier: 'no-consulate' }, { countryId: 'nation-2', barrier: 'at-war' }] }, 'offer', nameOf)).toBe(
      'no consulate with Lorran; at war with Valdoria; the other buyers wanted no more'
    );
    expect(causeText({ kind: 'served-first', rivalIds: ['nation-2'], barred }, 'bid', nameOf)).toBe('no consulate with Sundmark and Pellis; Valdoria was served first');
    // The review's case (Deal Book after a consulate with Arvelia and a bid of 4 coal)
    const events: GameEvent[] = [{ type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Coal, amount: 1, cause: { kind: 'used-up', barred } }];
    expect(dealBookView(dealBook(events, N1), nameOf).notTraded).toEqual(['Nobody sold us 1 Coal (no consulate with Sundmark and Pellis; the other sellers had no more; bid money back)']);
  });

  it('FR-255 the lines of the QA example: an unsold offer "(no buyer)" and an unfilled bid "(no consulate with Lorran; bid money back)"', () => {
    const events: GameEvent[] = [
      { type: 'offer-unsold', nationId: N1, commodity: MaterialType.CannedFood, amount: 2, cause: { kind: 'nobody' } },
      { type: 'bid-unfilled', nationId: N1, commodity: ResourceType.Timber, amount: 1, cause: { kind: 'barred', barred: [{ countryId: 'minor-3', barrier: 'no-consulate' }] } },
    ];
    expect(dealBookView(dealBook(events, N1), nameOf).notTraded).toEqual([
      '2 Canned Food not sold (no buyer), back in the warehouse',
      'Nobody sold us 1 Timber (no consulate with Lorran; bid money back)',
    ]);
  });
});

describe('FR-256 the Treasury lines: the trade net, the diplomacy costs and the rest add up to the treasury\'s change', () => {
  const TURN: GameEvent[] = [
    { type: 'goods-bought', nationId: N1, commodity: ResourceType.Coal, amount: 2, price: 100, cost: 200, counterpartyId: 'minor-1' },
    { type: 'overture-done', nationId: N1, overture: 'consulate', targetId: 'minor-1' },
    { type: 'grant-paid', nationId: N1, targetId: 'minor-4', amount: 1000 },
  ];

  it('FR-256 with the treasuries: Trade net, each cost, Other only when not 0, Treasury change, and "From $10,000 to $8,300"', () => {
    const view = dealBookView(dealBook(TURN, N1, { start: 10000, end: 8300 }), nameOf);
    expect(view.treasury).toEqual([
      { label: 'Trade net', amount: -200, text: '-$200' },
      { label: 'Consulate in Arvelia', amount: -500, text: '-$500' },
      { label: 'Grant to Pellis', amount: -1000, text: '-$1,000' },
      { label: 'Treasury change', amount: -1700, text: '-$1,700' },
    ]);
    expect(view.cash).toBe('From $10,000 to $8,300');

    // $100 a development cost, say: the rest is named
    const other = dealBookView(dealBook(TURN, N1, { start: 10000, end: 8200 }), nameOf).treasury!;
    expect(other.slice(-2)).toEqual([
      { label: 'Other (building, workers, gold, gems)', amount: -100, text: '-$100' },
      { label: 'Treasury change', amount: -1800, text: '-$1,800' },
    ]);
    // The lines add up: the change is the sum of the others
    expect(other.slice(0, -1).reduce((sum, l) => sum + l.amount, 0)).toBe(other.at(-1)!.amount);
  });

  it('FR-256 without the treasuries (a report made by hand) there are no Treasury lines', () => {
    expect(dealBookView(dealBook(TURN, N1), nameOf).treasury).toBeUndefined();
    expect(dealBookView(dealBook(TURN, N1), nameOf).cash).toBeUndefined();
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
