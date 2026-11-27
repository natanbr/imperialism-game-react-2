// @vitest-environment jsdom
// M18j T-06: the Developer's views. FR-639: the map draws a held tile's flag in the holder's colour and pattern and names
// the holder ("held by Valdoria") for every viewer; Tile Info shows a tile the viewer could buy (the price with its
// formula, the units and profit a turn at the current share, the work it needs), the viewer's own holding (level, units,
// share, last turn's profit) and only the holder of a rival's; with the Developer selected, a valid tile offers "Buy land"
// with its price, from Tile Info and from a map click, both through the spend question; Cancel on a buying Developer
// asks with the refund; the Deal Book lists the Overseas Profits by commodity and Minor Nation and counts them in the
// treasury, the trade net unchanged; the News tells the owner. FR-640: paired states that differ only in a rival's
// pending purchase, Developer move, profit or refusal give the viewer the same map, Tile Info, News and Deal Book.
// Continent seed 1: Arvelia (minor-1) holds timber at 10-3, 11-3, 13-3 and 13-4, coal at 12-3, 10-4 and 12-5, horses at
// 10-5, all at level 1.
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/page';
import { useGameStore, type TurnReport } from '@/store/rootStore';
import { newGame, type GameEvent, type Order } from '@/engine';
import { dealBook } from '@/engine/market/dealBook';
import { clickCursors } from '@/hooks/tileClickOrders';
import { cancelQuestion, holdingView } from '@/components/tileSiteText';
import { dealBookView } from '@/components/market/dealBookView';
import { nationMark } from '@/components/nationMark';
import { newsLines, tileLabel } from '@/components/gameText';
import type { GameState } from '@/types/GameState';
import { tryApplyOrder } from '@/engine/orders/apply';
import { isBuyLandIntent } from '@/engine/overseas/holdings';
import type { TradeCommodity } from '@/types/Market';
import { GoodsType, ResourceType } from '@/types/Resource';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';
import { N1, N2, setPair, setTile, tileAt } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const ARVELIA = 'minor-1';
const FOR_SALE = '10-3';
const OUR_HOLDING = '11-3';
const THEIR_HOLDING = '13-4';
const COAL = '12-3';
const HORSES = '10-5';
const RIVAL_DEVELOPER_TILE = '10-4';
const OUR_DEVELOPER = 'developer-nation-1-20';
const THEIR_DEVELOPER = 'developer-nation-2-20';

const capitalOf = (state: GameState, nationId: string) => {
  const nation = state.nations.find(n => n.id === nationId)!;
  return state.map.tiles.flat().find(t => t.cityId === nation.cities[0] && t.ownerNationId === nationId)!.id;
};

function setPrice(state: GameState, commodity: TradeCommodity, price: number): GameState {
  return { ...state, market: { ...state.market!, prices: { ...state.market!.prices, [commodity]: price } } };
}

function hold(state: GameState, tileId: string, holderId: string, level = 0): GameState {
  const tile = tileAt(state, tileId);
  const held = setTile(state, tileId, { resource: { ...tile.resource!, level } });
  return { ...held, overseasLand: { ...held.overseasLand, [tileId]: { tileId, holderId, minorId: ARVELIA, turn: 1, price: 2220 } } };
}

const developer = (id: string, nationId: string, tileId: string, patch: Partial<Worker> = {}): Worker =>
  ({ id, type: WorkerType.Developer, nationId, assignedTileId: tileId, efficiency: 100, status: WorkerStatus.Available, justMoved: false, ...patch });

const place = (state: GameState, tileId: string, worker: Worker): GameState =>
  setTile(state, tileId, { workers: [...tileAt(state, tileId).workers, worker] });

/** Both Great Powers at 60 points (level 6, a 75% share) with an embassy in Arvelia; each holds a timber tile at level 0. */
function world(): GameState {
  let s = newGame({ seed: 1, world: 'continent' });
  s = setPrice(setPrice(s, ResourceType.Timber, 111), ResourceType.Coal, 116);
  s = setPair(s, N1, ARVELIA, { points: 60, consulates: [N1], embassies: [N1] });
  s = setPair(s, N2, ARVELIA, { points: 60, consulates: [N2], embassies: [N2] });
  s = hold(hold(s, OUR_HOLDING, N1), THEIR_HOLDING, N2);
  return place(s, capitalOf(s, N1), developer(OUR_DEVELOPER, N1, capitalOf(s, N1)));
}

const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1, ...ui });
const tileEl = (container: HTMLElement, id: string) => container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
const panel = () => screen.getByTestId('tile-info');

const profit = (nationId: string, commodity: string, units: number, price: number, amount: number): GameEvent =>
  ({ type: 'overseas-profit', nationId, minorId: ARVELIA, commodity, units, price, sharePercent: 75, amount } as GameEvent);
const report = (events: GameEvent[], treasuries?: TurnReport['treasuries']): TurnReport => ({ turn: 20, year: 1824, events, ...(treasuries && { treasuries }) });

describe('FR-639 the map flag of a held tile', () => {
  it('FR-639 draws the holder\'s flag in its colour and pattern and names the holder, the same for every viewer, with no picture file', () => {
    const game = world();
    for (const viewer of [N1, N2]) {
      show(game, { activeNationId: viewer });
      const { container, unmount } = render(<Home />);
      for (const [tileId, holderId, name] of [[OUR_HOLDING, N1, 'Testland'], [THEIR_HOLDING, N2, 'Valdoria']]) {
        const flag = within(tileEl(container, tileId)).getByTestId('holding-flag');
        const cloth = within(flag).getByTestId('nation-flag');
        expect({ viewer, tileId, nation: cloth.getAttribute('data-nation-id'), pattern: cloth.getAttribute('data-pattern') })
          .toEqual({ viewer, tileId, nation: holderId, pattern: nationMark(game, holderId).pattern });
        expect(cloth.style.color).toBe(nationMark(game, holderId).colour);
        // FR-339: an inline drawing, no image request
        expect(flag.querySelector('img')).toBeNull();
        expect(tileEl(container, tileId).getAttribute('aria-label')).toBe(`Hardwood forest, timber, level 0, owned by Arvelia, held by ${name}`);
      }
      expect(within(tileEl(container, FOR_SALE)).queryByTestId('holding-flag')).toBeNull();
      expect(tileEl(container, FOR_SALE).getAttribute('aria-label')).toBe('Hardwood forest, timber, level 1, owned by Arvelia');
      unmount();
    }
  });

  it('FR-639 the tile label names the holder after the owner', () => {
    const tile = tileAt(world(), THEIR_HOLDING);
    expect(tileLabel(tile, 'Arvelia', 'Valdoria')).toBe('Hardwood forest, timber, level 0, owned by Arvelia, held by Valdoria');
    expect(tileLabel(tile, 'Arvelia')).toBe('Hardwood forest, timber, level 0, owned by Arvelia');
  });
});

describe('FR-639 Tile Info of Minor Nation land', () => {
  it('FR-639 a tile the viewer could buy shows the price with its formula, the units and profit at the share and the work it needs', () => {
    show(world(), { selectedTileId: FOR_SALE });
    const { rerender } = render(<Home />);
    expect(text(within(panel()).getByTestId('tile-for-sale'))).toBe('For sale: $2,220 (20 × $111) 1 Timber a turn: $83 at a 75% share');

    act(() => useGameStore.setState({ selectedTileId: COAL }));
    rerender(<Home />);
    expect(text(within(panel()).getByTestId('tile-for-sale'))).toBe(
      'For sale: $2,320 (20 × $116) Needs a Miner ($100 for level 1), then 2 Coal a turn: $174 at a 75% share');

    // Horses and the Minor Nation's capital are not for sale; nor is anything without an embassy
    act(() => useGameStore.setState({ selectedTileId: HORSES }));
    rerender(<Home />);
    expect(within(panel()).queryByTestId('tile-for-sale')).toBeNull();
    act(() => useGameStore.setState({ game: setPair(world(), N1, ARVELIA, { points: 60, consulates: [N1], embassies: [] }), selectedTileId: FOR_SALE }));
    rerender(<Home />);
    expect(within(panel()).queryByTestId('tile-for-sale')).toBeNull();
  });

  it('FR-639 the viewer\'s own holding shows its level, units, share and last turn\'s profit; a rival\'s only its holder', () => {
    show(world(), { selectedTileId: OUR_HOLDING, eventLog: [report([profit(N1, 'timber', 1, 111, 83), profit(N2, 'timber', 1, 111, 83)])] });
    const { rerender } = render(<Home />);
    expect(text(within(panel()).getByTestId('tile-holding'))).toBe(
      'Held by: you, since turn 1 Level 0: 1 Timber a turn at a 75% share Last turn\'s profit: $83 from 1 Timber in Arvelia');
    expect(within(panel()).queryByTestId('tile-for-sale')).toBeNull();

    act(() => useGameStore.setState({ selectedTileId: THEIR_HOLDING }));
    rerender(<Home />);
    expect(text(within(panel()).getByTestId('tile-holding'))).toBe('Held by: Valdoria');
    for (const word of ['share', 'profit', 'For sale', '$']) expect(text(within(panel()).getByTestId('tile-holding'))).not.toContain(word);
    expect(within(panel()).queryByTestId('tile-for-sale')).toBeNull();

    // No profit last turn (a new holding, or a mine not yet open)
    act(() => useGameStore.setState({ selectedTileId: OUR_HOLDING, eventLog: [] }));
    rerender(<Home />);
    expect(text(within(panel()).getByTestId('tile-holding'))).toContain('Last turn\'s profit: none');
  });

  it('FR-639 with two held tiles of one commodity in a Minor Nation, each tile says its last profit is that of all of them', () => {
    // The trade phase pays per Minor Nation and commodity, summed before rounding down (FR-636)
    const game = hold(world(), FOR_SALE, N1);
    const paid = [profit(N1, 'timber', 2, 111, 166)];
    for (const tileId of [OUR_HOLDING, FOR_SALE]) {
      expect(holdingView(game, N1, tileAt(game, tileId), paid)!.details).toEqual([
        'Level 0: 1 Timber a turn at a 75% share',
        'Last turn\'s profit: $166 from 2 Timber on all your land in Arvelia',
      ]);
    }
    // One tile alone keeps the plain line
    expect(holdingView(world(), N1, tileAt(world(), OUR_HOLDING), [profit(N1, 'timber', 1, 111, 83)])!.details[1])
      .toBe('Last turn\'s profit: $83 from 1 Timber in Arvelia');
  });
});

describe('FR-639 Buy land with the Developer selected', () => {
  it('FR-639 Tile Info offers Buy land with its price where the engine would take it, and Spend sends buyLand', () => {
    const game = world();
    show(game, { selectedWorkerId: OUR_DEVELOPER, selectedTileId: FOR_SALE });
    const { rerender } = render(<Home />);
    const offer = within(panel()).getByTestId('job-offer');
    const button = within(offer).getByRole('button', { name: 'Buy land' });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(text(within(offer).getByTestId('job-price'))).toBe('$2,220');

    fireEvent.click(button);
    const dialog = screen.getByRole('dialog', { name: 'Spend $2,220?' });
    expect(text(dialog)).toContain(`Buy ${FOR_SALE} from Arvelia for $2,220 (20 × $111)? The sale is settled at End Turn; cancelled before then, the money comes back.`);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Spend $2,220' }));
    const after = useGameStore.getState().game;
    expect(after.intents.filter(i => i.kind === 'buy-land')).toEqual([
      expect.objectContaining({ kind: 'buy-land', nationId: N1, targetId: ARVELIA, workerId: OUR_DEVELOPER, tileId: FOR_SALE, cost: 2220 })]);
    expect(after.nations.find(n => n.id === N1)!.treasury).toBe(game.nations.find(n => n.id === N1)!.treasury - 2220);

    // Horses: the offer stays, refused, with the engine's reason
    act(() => useGameStore.setState({ game, selectedWorkerId: OUR_DEVELOPER, selectedTileId: HORSES }));
    rerender(<Home />);
    const refused = within(panel()).getByTestId('job-offer');
    expect((within(refused).getByRole('button', { name: 'Buy land' }) as HTMLButtonElement).disabled).toBe(true);
    expect(text(within(refused).getByTestId('job-reason'))).toBe('Food and horses are never for sale.');
  });

  it('FR-639 a map click on a valid tile asks to buy it; the cursor shows the Developer there and a move where it may only stand', () => {
    const game = world();
    const cursors = clickCursors(game, N1, OUR_DEVELOPER);
    expect(cursors.get(FOR_SALE)).toEqual({ type: 'buy-land' });
    expect(cursors.get(COAL)).toEqual({ type: 'buy-land' });
    expect(cursors.get(HORSES)).toEqual({ type: 'move' });
    expect(cursors.get(THEIR_HOLDING)).toEqual({ type: 'move' });
    expect(cursors.has(capitalOf(game, N2))).toBe(false);

    show(game, { selectedWorkerId: OUR_DEVELOPER });
    const submitted: Order[] = [];
    const store = useGameStore.getState();
    useGameStore.setState({ submitOrder: order => (submitted.push(order), store.submitOrder(order)) });
    const { container } = render(<Home />);
    fireEvent.click(tileEl(container, FOR_SALE));
    expect(submitted).toEqual([]);
    expect(useGameStore.getState().pendingSpend?.order).toEqual({ kind: 'buyLand', nationId: N1, workerId: OUR_DEVELOPER, tileId: FOR_SALE });
  });

  it('FR-639 the holder\'s improver may be sent to its held tile by a click; a rival\'s held tile stays closed', () => {
    const game = world();
    const miner = tileAt(game, capitalOf(game, N1)).workers.find(w => w.type === WorkerType.Miner)
      ?? game.map.tiles.flat().flatMap(t => t.workers).find(w => w.nationId === N1 && w.type === WorkerType.Forester)!;
    const cursors = clickCursors(game, N1, miner.id);
    expect(cursors.get(OUR_HOLDING)).toEqual({ type: 'move' });
    expect(cursors.has(THEIR_HOLDING)).toBe(false);
    expect(cursors.has(FOR_SALE)).toBe(false);
  });

  it('FR-639 Cancel on a buying Developer asks with the full refund and sends it back', () => {
    const game = world();
    show(game);
    expect(useGameStore.getState().submitOrder({ kind: 'buyLand', nationId: N1, workerId: OUR_DEVELOPER, tileId: FOR_SALE })).toEqual({ ok: true });
    const after = useGameStore.getState().game;
    const buyer = tileAt(after, FOR_SALE).workers.find(w => w.id === OUR_DEVELOPER)!;
    const cancel = { kind: 'cancelWorkerAction', nationId: N1, workerId: OUR_DEVELOPER, tileId: FOR_SALE };
    expect(cancelQuestion(after, N1, buyer, tileAt(after, FOR_SALE))).toEqual({
      title: 'Cancel the land purchase?',
      consequence: `The $2,220 comes back. The developer goes back to ${capitalOf(game, N1)}.`,
      confirm: 'Cancel the purchase',
      keep: 'Keep buying',
      orders: [cancel, cancel],
    });
  });
});

describe('FR-639 the Deal Book\'s Overseas Profits', () => {
  const events: GameEvent[] = [
    { type: 'goods-sold', nationId: N1, commodity: GoodsType.Clothing, amount: 1, price: 810, income: 810, counterpartyId: ARVELIA },
    profit(N1, 'coal', 2, 116, 174),
    profit(N1, 'timber', 1, 111, 83),
    profit(N2, 'timber', 1, 111, 83),
  ];
  const nameOf = (id: string) => (id === ARVELIA ? 'Arvelia' : id);

  it('FR-639 lists them by commodity and Minor Nation in dollars and counts them in the treasury; the trade net is unchanged', () => {
    const view = dealBookView(dealBook(events, N1, { start: 10000, end: 11067 }), nameOf);
    expect(view.overseas).toEqual(['2 Coal from Arvelia @ $116 × 75%: $174', '1 Timber from Arvelia @ $111 × 75%: $83']);
    expect(view.bottomLine.map(l => [l.label, l.amount])).toEqual([['Sold', 810], ['Bought', 0], ['Trade net', 810]]);
    expect(view.treasury!.map(l => [l.label, l.amount])).toEqual([['Trade net', 810], ['Overseas profits', 257], ['Treasury change', 1067]]);
    // The lines above the change add up to it
    expect(view.treasury!.slice(0, -1).reduce((sum, l) => sum + l.amount, 0)).toBe(1067);
  });

  it('FR-639 the screen shows the Overseas Profits page, on a turn without deals too', () => {
    show(world(), { isDealBookOpen: true, eventLog: [report(events, { [N1]: { start: 10000, end: 11067 } })] });
    const { rerender } = render(<Home />);
    const page = within(screen.getByRole('dialog', { name: /Deal Book/ })).getByTestId('overseas-profits');
    expect(text(page)).toBe('Overseas Profits 2 Coal from Arvelia @ $116 × 75%: $174 1 Timber from Arvelia @ $111 × 75%: $83');
    expect(text(within(screen.getByRole('dialog', { name: /Deal Book/ })).getByTestId('treasury'))).toContain('Overseas profits $257');

    act(() => useGameStore.setState({ eventLog: [report([profit(N1, 'timber', 1, 111, 83)], { [N1]: { start: 10000, end: 10083 } })] }));
    rerender(<Home />);
    const book = screen.getByRole('dialog', { name: /Deal Book/ });
    expect(within(book).getByTestId('deal-book-empty')).toBeTruthy();
    expect(text(within(book).getByTestId('overseas-profits'))).toBe('Overseas Profits 1 Timber from Arvelia @ $111 × 75%: $83');
    expect(text(within(book).getByTestId('treasury'))).not.toContain('Other');
  });
});

describe('FR-639 FR-640 the News of the Developer', () => {
  const ownEvents = (nationId: string): GameEvent[] => [
    { type: 'developer-arrived', nationId, workerId: OUR_DEVELOPER, tileId: '2-9', minorId: ARVELIA } as GameEvent,
    { type: 'land-purchased', nationId, workerId: OUR_DEVELOPER, tileId: FOR_SALE, minorId: ARVELIA, cost: 2220 } as GameEvent,
    { type: 'land-purchase-refused', nationId, workerId: OUR_DEVELOPER, tileId: COAL, minorId: ARVELIA, cost: 2320, reason: 'outbid' } as GameEvent,
    { type: 'overseas-land-lost', nationId, tileId: OUR_HOLDING, minorId: ARVELIA, cause: 'conquest', byId: N2 } as GameEvent,
    profit(nationId, 'timber', 1, 111, 83),
  ];
  const nameOf = (id: string) => ({ [ARVELIA]: 'Arvelia', [N1]: 'Testland', [N2]: 'Valdoria' } as Record<string, string>)[id] ?? id;

  it('FR-639 the owner reads the arrival, a purchase, a refusal with its reason and a lost holding with its cause; FR-640 no other nation does', () => {
    expect(newsLines(ownEvents(N1), N1, nameOf)).toEqual([
      'A Developer arrived at 2-9: our relations with Arvelia earned it.',
      `Our Developer bought ${FOR_SALE} in Arvelia for $2,220.`,
      `Arvelia did not sell ${COAL}: it sold to a partner it favours more. $2,320 refunded.`,
      `Our holding at ${OUR_HOLDING} in Arvelia ended: its province was conquered by Valdoria.`,
    ]);
    expect(newsLines(ownEvents(N2), N1, nameOf)).toEqual([]);
  });

  it('FR-639 each line leads to its tile in the News panel', () => {
    show(world(), { eventLog: [report(ownEvents(N1))] });
    render(<Home />);
    const news = screen.getByTestId('news-list');
    expect(within(news).getAllByRole('button').map(b => text(b))).toEqual([
      'A Developer arrived at 2-9 in Testland South-West: our relations with Arvelia earned it.',
      `Our Developer bought ${FOR_SALE} in Arvelia for $2,220.`,
      `Arvelia did not sell ${COAL}: it sold to a partner it favours more. $2,320 refunded.`,
      `Our holding at ${OUR_HOLDING} in Arvelia ended: its province was conquered by Valdoria.`,
    ]);
  });
});

describe('FR-640 a rival\'s private facts change none of the viewer\'s views', () => {
  // useId values count up across renders; only their place matters
  const stable = (html: string) => html.replace(/«r[0-9a-z]+»|:r[0-9a-z]+:/g, 'id').replace(/\b(flag|ground)-r[0-9a-z]+/g, '$1-id');

  /** Testland's map, Tile Info of the rival Developer's tile, News and Deal Book, and the names a screen reader hears. */
  function views(game: GameState, eventLog: TurnReport[]) {
    show(game, { selectedTileId: RIVAL_DEVELOPER_TILE, isDealBookOpen: true, eventLog });
    const { container, unmount } = render(<Home />);
    const seen = {
      map: stable(screen.getByTestId('map-viewport').innerHTML),
      tileInfo: stable(panel().outerHTML),
      news: stable(screen.getByTestId('news-panel').outerHTML),
      dealBook: stable(screen.getByRole('dialog', { name: /Deal Book/ }).outerHTML),
      names: [...container.querySelectorAll('[aria-label]')].map(el => el.getAttribute('aria-label')).join('|'),
    };
    unmount();
    return seen;
  }

  /** View by view, so a failure names the view that differs. */
  function expectSame(seen: ReturnType<typeof views>, expected: ReturnType<typeof views>) {
    for (const key of Object.keys(expected) as (keyof typeof expected)[]) expect({ key, view: seen[key] }).toEqual({ key, view: expected[key] });
  }

  const base = world();
  const theirCapital = capitalOf(base, N2);
  const standing = place(base, RIVAL_DEVELOPER_TILE, developer(THEIR_DEVELOPER, N2, RIVAL_DEVELOPER_TILE));
  const lastTurn = [report([profit(N1, 'timber', 1, 111, 83)], { [N1]: { start: 10000, end: 10083 } })];

  it('FR-640 a pending purchase, with its price paid, is not seen', () => {
    // The engine's own order: the Developer Working, the price charged, the private intent
    const { state: paid, result } = tryApplyOrder(standing, { kind: 'buyLand', nationId: N2, workerId: THEIR_DEVELOPER, tileId: RIVAL_DEVELOPER_TILE });
    expect(result).toEqual({ ok: true });
    expect(paid.intents.filter(isBuyLandIntent).map(i => [i.nationId, i.tileId, i.cost])).toEqual([[N2, RIVAL_DEVELOPER_TILE, 2320]]);
    expectSame(views(paid, lastTurn), views(standing, lastTurn));
  });

  it('FR-640 a Developer move of this turn is not told apart from one standing there', () => {
    const moved = place(base, RIVAL_DEVELOPER_TILE, developer(THEIR_DEVELOPER, N2, RIVAL_DEVELOPER_TILE,
      { status: WorkerStatus.Moved, justMoved: true, previousTileId: theirCapital }));
    expectSame(views(moved, lastTurn), views(standing, lastTurn));
  });

  it('FR-640 a rival\'s profit and refusal are not seen', () => {
    const theirs = [report([
      profit(N1, 'timber', 1, 111, 83),
      profit(N2, 'timber', 1, 111, 83),
      { type: 'land-purchase-refused', nationId: N2, workerId: THEIR_DEVELOPER, tileId: COAL, minorId: ARVELIA, cost: 2320, reason: 'outbid' } as GameEvent,
      { type: 'land-purchased', nationId: N2, workerId: THEIR_DEVELOPER, tileId: THEIR_HOLDING, minorId: ARVELIA, cost: 2220 } as GameEvent,
    ], { [N1]: { start: 10000, end: 10083 }, [N2]: { start: 9000, end: 6863 } })];
    expectSame(views(standing, theirs), views(standing, lastTurn));
  });
});
