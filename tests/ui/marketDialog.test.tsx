// @vitest-environment jsdom
// FR-073, FR-074: the market dialog lists every tradeable commodity with its price, stock, offer and
// bid, the cargo holds and the buy bids; every button sends one order through submitOrder.
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MarketModal } from '@/components/MarketModal';
import { ActionButtons } from '@/components/HUD/index';
import { CapitalModal } from '@/components/CapitalModal';
import { useGameStore } from '@/store/rootStore';
import { marketOf, tradeOrdersOf, type Order } from '@/engine';
import { MAX_BUY_BIDS, START_PRICES, TRADE_COMMODITIES } from '@/definisions/marketPrices';
import type { GameState } from '@/types/GameState';
import { emptyWarehouse, game, N1, stockOf, treasury } from '../engine/fixtures';
import { text } from './domText';

let submitted: Order[] = [];

/** Opens the market on `state` and records every order the dialog submits. */
function openMarket(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, isMarketOpen: true, ...ui });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
  return render(<MarketModal />);
}

const stocked = () => emptyWarehouse(game(), N1, { furniture: 3, lumber: 2, coal: 7 });
const row = (commodity: string) => screen.getByTestId(`trade-row-${commodity}`);
const cell = (commodity: string, part: string) => text(within(row(commodity)).getByTestId(part));
const now = () => useGameStore.getState().game;

beforeEach(() => {
  submitted = [];
});

describe('FR-073 market dialog: what it shows', () => {
  it('is closed until opened', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: game(), activeNationId: N1 });
    render(<MarketModal />);
    expect(screen.queryByRole('dialog', { name: 'Market' })).toBeNull();
  });

  it('FR-073 one row per tradeable commodity in TRADE_COMMODITIES order, by display name', () => {
    openMarket(stocked());

    const rows = screen.getAllByTestId(/^trade-row-/).map(el => el.dataset.testid);
    expect(rows).toEqual(TRADE_COMMODITIES.map(c => `trade-row-${c}`));
    expect(text(within(row('ironOre')).getByTestId('name'))).toBe('Iron Ore');
    expect(text(within(row('cannedFood')).getByTestId('name'))).toBe('Canned Food');
    expect(screen.queryByTestId("trade-row-grain")).toBeNull();
    expect(screen.queryByTestId("trade-row-gold")).toBeNull();
  });

  it('FR-073 each row shows the world price, the warehouse stock, the offer and the bid', () => {
    openMarket(stocked());

    expect(cell('furniture', 'price')).toBe(`$${START_PRICES.furniture}`);
    expect(cell('furniture', 'stock')).toBe('3');
    expect(cell('coal', 'price')).toBe('$100');
    expect(cell('coal', 'stock')).toBe('7');
    expect(cell('steel', 'stock')).toBe('0');
    expect(cell('furniture', 'sell')).toBe('0');
    expect(cell('furniture', 'buy')).toBe('0');
  });

  it('FR-073 shows a drifted price from the market, not the start price', () => {
    const s = stocked();
    const market = marketOf(s);
    openMarket({ ...s, market: { ...market, prices: { ...market.prices, furniture: 1234 } } });
    expect(cell('furniture', 'price')).toBe('$1,234');
  });

  it('FR-073 shows the cash, the cargo holds and the buy bids used', () => {
    openMarket(stocked());

    expect(text(screen.getByTestId('market-cash'))).toBe('Cash: $10,000');
    expect(text(screen.getByTestId('market-holds'))).toBe('Cargo holds: 0 used, 5 free of 5');
    expect(text(screen.getByTestId('market-bids'))).toBe(`Buy bids: 0 of ${MAX_BUY_BIDS}`);
  });
});

describe('FR-074 market dialog: orders', () => {
  it('FR-074 Sell + sends sellCommodity one higher; the offer, stock and holds update', () => {
    openMarket(stocked());

    fireEvent.click(within(row('furniture')).getByRole('button', { name: 'Sell one more Furniture' }));

    expect(submitted).toEqual([{ kind: 'sellCommodity', nationId: N1, commodity: 'furniture', amount: 1 }]);
    expect(tradeOrdersOf(now(), N1).sell.furniture).toBe(1);
    expect(cell('furniture', 'sell')).toBe('1');
    expect(cell('furniture', 'stock')).toBe('2');
    expect(text(screen.getByTestId('market-holds'))).toBe('Cargo holds: 1 used, 4 free of 5');
  });

  it('FR-074 Sell − sends sellCommodity one lower and returns the unit', () => {
    openMarket(stocked());
    const sellMore = within(row('furniture')).getByRole('button', { name: 'Sell one more Furniture' });
    fireEvent.click(sellMore);
    fireEvent.click(sellMore);

    fireEvent.click(within(row('furniture')).getByRole('button', { name: 'Sell one less Furniture' }));

    expect(submitted.at(-1)).toEqual({ kind: 'sellCommodity', nationId: N1, commodity: 'furniture', amount: 1 });
    expect(stockOf(now(), N1, 'furniture')).toBe(2);
    expect(cell('furniture', 'sell')).toBe('1');
  });

  it('FR-074 Buy + sends buyCommodity one higher; the cash and the bids update', () => {
    openMarket(stocked());

    fireEvent.click(within(row('coal')).getByRole('button', { name: 'Buy one more Coal' }));

    expect(submitted).toEqual([{ kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 1 }]);
    expect(treasury(now(), N1)).toBe(10000 - 100);
    expect(cell('coal', 'buy')).toBe('1');
    expect(text(screen.getByTestId('market-cash'))).toBe('Cash: $9,900');
    expect(text(screen.getByTestId('market-bids'))).toBe(`Buy bids: 1 of ${MAX_BUY_BIDS}`);
    expect(text(screen.getByTestId('market-holds'))).toBe('Cargo holds: 1 used, 4 free of 5');
  });

  it('FR-074 Buy − sends buyCommodity one lower and refunds', () => {
    openMarket(stocked());
    fireEvent.click(within(row('coal')).getByRole('button', { name: 'Buy one more Coal' }));

    fireEvent.click(within(row('coal')).getByRole('button', { name: 'Buy one less Coal' }));

    expect(submitted.at(-1)).toEqual({ kind: 'buyCommodity', nationId: N1, commodity: 'coal', amount: 0 });
    expect(treasury(now(), N1)).toBe(10000);
    expect(cell('coal', 'buy')).toBe('0');
  });

  it('FR-074 the − buttons are disabled at 0', () => {
    openMarket(stocked());
    const r = within(row('furniture'));
    expect((r.getByRole('button', { name: 'Sell one less Furniture' }) as HTMLButtonElement).disabled).toBe(true);
    expect((r.getByRole('button', { name: 'Buy one less Furniture' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('FR-074 a refused order shows its reason in plain words in the dialog and changes nothing', () => {
    openMarket(stocked());
    const before = now();

    fireEvent.click(within(row('steel')).getByRole('button', { name: 'Sell one more Steel' }));

    expect(submitted).toEqual([{ kind: 'sellCommodity', nationId: N1, commodity: 'steel', amount: 1 }]);
    expect(now()).toBe(before);
    expect(text(screen.getByTestId('market-refusal'))).toBe('Sale refused: not enough goods in the warehouse.');
  });

  it('FR-074 more units than the holds are refused as over the limit', () => {
    openMarket(emptyWarehouse(game(), N1, { coal: 9 }));
    const sellMore = within(row('coal')).getByRole('button', { name: 'Sell one more Coal' });
    for (let i = 0; i < 6; i++) fireEvent.click(sellMore);

    expect(cell('coal', 'sell')).toBe('5');
    expect(text(screen.getByTestId('market-refusal'))).toBe('Sale refused: over the limit.');
  });

  it('FR-074 opening the market clears a refusal from elsewhere (as FR-055)', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: game(),
      activeNationId: N1,
      lastRejection: { order: { kind: 'moveWorker', nationId: N1, workerId: 'x', toTileId: 'y' }, reason: 'unknown-worker' },
    });

    useGameStore.getState().openMarket();

    expect(useGameStore.getState().isMarketOpen).toBe(true);
    expect(useGameStore.getState().lastRejection).toBeNull();
  });

  it('FR-073 Close closes the dialog', () => {
    openMarket(stocked());
    fireEvent.click(screen.getByRole('button', { name: 'Close market' }));
    expect(useGameStore.getState().isMarketOpen).toBe(false);
  });
});

describe('FR-073 where the market opens from', () => {
  it("FR-073 the HUD's Open Market button opens it", () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: game(), activeNationId: N1 });
    render(<ActionButtons />);
    fireEvent.click(screen.getByRole('button', { name: /Open Market/ }));
    expect(useGameStore.getState().isMarketOpen).toBe(true);
  });

  it("FR-073 the capital's Trade button opens it", () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: game(), activeNationId: N1, isCapitalOpen: true });
    render(<CapitalModal />);
    const trade = screen.getByRole('button', { name: 'Trade' }) as HTMLButtonElement;
    expect(trade.disabled).toBe(false);
    fireEvent.click(trade);
    expect(useGameStore.getState().isMarketOpen).toBe(true);
  });
});
