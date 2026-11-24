// @vitest-environment jsdom
// M18b FR-569 (owner feedback 2026-11-23: "better errors display, avoid the huge inline at top, maybe a slide-in message
// like a toast"): a refused order shows as a toast that slides in, stays about 6 seconds or until closed, never pushes the
// page down (fixed, over the page), stacks with the next one, and reaches screen readers through a live region
// (assertive for errors, polite for the rest). The inline refusal lines (the news panel's and each dialog's) are gone.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HUD } from '@/components/HUD';
import { MarketModal } from '@/components/MarketModal';
import { Toasts, TOAST_MS } from '@/components/Toasts';
import { MAX_TOASTS } from '@/store/controls/toastSlice';
import { refusalText } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { newGame, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { game, setTreasury } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';

function show(game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1, ...ui });
}

/** A worker of the capital sent to a far tile: refused ("not possible on that tile"). */
function refusedMove(): Order {
  const game = useGameStore.getState().game;
  const capital = game.map.tiles.flat().find((t) => t.cityId === game.nations[0].cities[0])!;
  return { kind: 'moveWorker', nationId: N1, workerId: capital.workers[0].id, toTileId: '0-0' };
}

const submit = (order: Order) => act(() => void useGameStore.getState().submitOrder(order));

afterEach(() => {
  vi.useRealTimers();
});

describe('FR-569 a refused order is a toast', () => {
  it('FR-569 a refusal shows as a toast in the assertive live region; the news panel shows no inline refusal line', () => {
    show(newGame({ seed: 1, world: 'continent' }));
    render(<><HUD /><Toasts /></>);
    const alerts = screen.getByTestId('toast-alerts');
    expect(alerts.getAttribute('aria-live')).toBe('assertive');
    expect(within(alerts).queryAllByTestId('toast')).toHaveLength(0);
    const order = refusedMove();
    submit(order);
    const rejection = useGameStore.getState().lastRejection!;
    expect(rejection).not.toBeNull();
    const toasts = within(alerts).getAllByTestId('toast');
    expect(toasts).toHaveLength(1);
    expect(text(within(toasts[0]).getByTestId('toast-text'))).toBe(refusalText(rejection));
    expect(screen.queryByTestId('order-refusal')).toBeNull();
    expect(within(screen.getByTestId('news-panel')).queryByText(refusalText(rejection))).toBeNull();
  });

  it('FR-569 the Market\'s refused purchase is a toast, not a line at the top of the dialog', () => {
    show(setTreasury(newGame({ seed: 1, world: 'continent' }), N1, 0), { isMarketOpen: true });
    render(<><MarketModal /><Toasts /></>);
    submit({ kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 });
    expect(useGameStore.getState().lastRejection).not.toBeNull();
    expect(screen.queryByTestId('market-refusal')).toBeNull();
    expect(within(screen.getByTestId('toast-alerts')).getAllByTestId('toast')).toHaveLength(1);
  });

  it('FR-569 a message that is not an error stays 6 seconds, then goes', () => {
    vi.useFakeTimers();
    show(game());
    render(<Toasts />);
    expect(TOAST_MS).toBe(6000);
    act(() => useGameStore.getState().showToast('Game saved.', 'info'));
    act(() => vi.advanceTimersByTime(TOAST_MS - 1));
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryAllByTestId('toast')).toHaveLength(0);
  });

  // Review 2026-11-23: inside a dialog the keyboard cannot leave the dialog's focus trap to reach a toast's Close, so an
  // error that left after 6 s could go unread; it stays until Close or until the next accepted order
  it('FR-569 an error toast stays past 6 s; two refusals stack; Close takes one; the next accepted order takes the rest', () => {
    vi.useFakeTimers();
    show(game());
    render(<Toasts />);
    const tooMany: Order = { kind: 'sellCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 999 };
    submit(tooMany);
    submit(tooMany);
    act(() => vi.advanceTimersByTime(TOAST_MS * 3));
    expect(screen.getAllByTestId('toast')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Close message' })[0]);
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
    submit({ kind: 'buyCommodity', nationId: N1, commodity: ResourceType.Coal, amount: 1 });
    expect(useGameStore.getState().lastRejection).toBeNull();
    expect(screen.queryAllByTestId('toast')).toHaveLength(0);
  });

  it('FR-569 at most MAX_TOASTS show at once: a newer one pushes the oldest out', () => {
    show(game());
    render(<Toasts />);
    for (let n = 1; n <= MAX_TOASTS + 1; n++) act(() => useGameStore.getState().showToast(`Message ${n}`, 'info'));
    expect(screen.getAllByTestId('toast-text').map(text)).toEqual(Array.from({ length: MAX_TOASTS }, (_, i) => `Message ${i + 2}`));
  });

  it('FR-569 a stack taken off the page leaves no timer behind', () => {
    vi.useFakeTimers();
    show(game());
    const { unmount } = render(<Toasts />);
    act(() => useGameStore.getState().showToast('Game saved.', 'info'));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(useGameStore.getState().toasts).toHaveLength(1);
  });

  it('FR-569 a message that is not an error goes to the polite live region', () => {
    show(newGame({ seed: 1, world: 'continent' }));
    render(<Toasts />);
    act(() => useGameStore.getState().showToast('Game saved.', 'info'));
    const polite = screen.getByTestId('toast-notes');
    expect(polite.getAttribute('aria-live')).toBe('polite');
    expect(text(within(polite).getByTestId('toast-text'))).toBe('Game saved.');
    expect(within(screen.getByTestId('toast-alerts')).queryAllByTestId('toast')).toHaveLength(0);
  });

  it('FR-569 CSS: the stack is fixed over the page (never pushes it down), slides in, and holds still under prefers-reduced-motion', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/components/Toasts.module.css'), 'utf8');
    expect(css).toMatch(/\.stack \{[^}]*position: fixed;/);
    expect(css).toMatch(/\.toast \{[^}]*animation: toast-in /);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.toast \{\s*animation: none;/);
  });
});
