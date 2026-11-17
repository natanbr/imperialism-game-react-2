// @vitest-environment jsdom
// M12 T7 to T9 (card Q95): the HUD says what the player should know. FR-423 Advance Turn cannot run twice by accident (a
// 600 ms lock after each End Turn, the button and the key "n" alike, the button aria-busy meanwhile); FR-432 the civilians
// without orders are counted under the turn line; FR-412 one "At war with ..." line per enemy under the turn line.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ActionButtons, TurnIndicator } from '@/components/HUD/index';
import { useGameStore } from '@/store/rootStore';
import { END_TURN_LOCK_MS } from '@/store/gameSlice';
import { HOW_TO_PLAY_SEEN_KEY } from '@/store/persistence';
import { newGame } from '@/engine';
import Home from '@/page';
import { WorkerStatus } from '@/types/Workers';
import type { GameState } from '@/types/GameState';
import { N1, N2, setPair } from '../engine/fixtures';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

vi.mock('@/components/MapView', () => ({ MapView: () => null }));

failOnActWarnings();

// FR-430: this browser has seen "How to play", so the page (Home) does not open it over these tests
beforeEach(() => {
  window.localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
});

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

function show(state: GameState) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1 });
}

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const turn = () => useGameStore.getState().game.turn;
const advanceButton = () => screen.getByRole('button', { name: /Advance Turn/ });

/** The player's civilians with the given status; the first `count` of them, the rest as they are. */
function withStatus(state: GameState, status: WorkerStatus, count: number): GameState {
  let left = count;
  const tiles = state.map.tiles.map((row) =>
    row.map((tile) => ({
      ...tile,
      workers: tile.workers.map((w) => (w.nationId === N1 && left-- > 0 ? { ...w, status } : w)),
    }))
  );
  return { ...state, map: { ...state.map, tiles } };
}

describe('FR-423 Advance Turn cannot run twice by accident', () => {
  it('FR-423 a double click ends one turn; the button is aria-busy until 600 ms after the turn, then ends the next', () => {
    vi.useFakeTimers();
    show(continent());
    render(<ActionButtons />);

    fireEvent.click(advanceButton());
    fireEvent.click(advanceButton());

    expect(turn()).toBe(2);
    expect(END_TURN_LOCK_MS).toBe(600);
    expect(advanceButton().getAttribute('aria-busy')).toBe('true');
    // Playwright and assistive technology treat it as not available meanwhile; it keeps the focus (not `disabled`)
    expect(advanceButton().getAttribute('aria-disabled')).toBe('true');
    expect((advanceButton() as HTMLButtonElement).disabled).toBe(false);

    act(() => vi.advanceTimersByTime(END_TURN_LOCK_MS - 1));
    fireEvent.click(advanceButton());
    expect(turn()).toBe(2);

    act(() => vi.advanceTimersByTime(1));
    expect(advanceButton().hasAttribute('aria-busy')).toBe(false);
    expect(advanceButton().hasAttribute('aria-disabled')).toBe(false);
    fireEvent.click(advanceButton());
    expect(turn()).toBe(3);
  });

  it('FR-423 the key "n" is locked the same way, and shares the lock with the button', () => {
    vi.useFakeTimers();
    show(continent());
    render(<Home />);
    const n = () => fireEvent.keyDown(document.body, { key: 'n' });

    n();
    n();
    expect(turn()).toBe(2);
    fireEvent.click(advanceButton());
    expect(turn()).toBe(2);

    act(() => vi.advanceTimersByTime(END_TURN_LOCK_MS));
    fireEvent.click(advanceButton());
    expect(turn()).toBe(3);
    n();
    expect(turn()).toBe(3);

    act(() => vi.advanceTimersByTime(END_TURN_LOCK_MS));
    n();
    expect(turn()).toBe(4);
  });

  it('FR-423 the store\'s advanceTurn itself stays unguarded (tests and the scripted runs call it in loops)', () => {
    show(continent());
    for (let i = 0; i < 3; i++) useGameStore.getState().advanceTurn();
    expect(turn()).toBe(4);
  });
});

describe('FR-432 idle civilians are counted', () => {
  it('FR-432 a new game: "7 civilians without orders" under the turn line', () => {
    show(continent());
    render(<TurnIndicator />);
    expect(text(screen.getByTestId('idle-civilians'))).toBe('7 civilians without orders');
  });

  it('FR-432 a civilian that moved or works is not counted; one left says "1 civilian"; none left, no line', () => {
    show(withStatus(continent(), WorkerStatus.Moved, 4));
    const { rerender } = render(<TurnIndicator />);
    expect(text(screen.getByTestId('idle-civilians'))).toBe('3 civilians without orders');

    act(() => show(withStatus(continent(), WorkerStatus.Working, 6)));
    rerender(<TurnIndicator />);
    expect(text(screen.getByTestId('idle-civilians'))).toBe('1 civilian without orders');

    act(() => show(withStatus(continent(), WorkerStatus.Working, 7)));
    rerender(<TurnIndicator />);
    expect(screen.queryByTestId('idle-civilians')).toBeNull();
  });

  it('FR-432 an order given counts at once: a move leaves 6', () => {
    show(continent());
    render(<TurnIndicator />);
    const capital = useGameStore.getState().game.map.tiles.flat().find((t) => t.workers.some((w) => w.nationId === N1))!;
    const farmer = capital.workers.find((w) => w.type === 'farmer')!;
    act(() => void useGameStore.getState().submitOrder({ kind: 'moveWorker', nationId: N1, workerId: farmer.id, toTileId: '3-9' }));
    expect(useGameStore.getState().lastRejection).toBeNull();
    expect(text(screen.getByTestId('idle-civilians'))).toBe('6 civilians without orders');
  });

  it('FR-432 none after game over', () => {
    show({ ...continent(), gameOver: { turn: 40, year: 1824, scores: [] } });
    render(<TurnIndicator />);
    expect(screen.queryByTestId('idle-civilians')).toBeNull();
  });
});

describe('FR-412 the HUD says we are at war', () => {
  it('FR-412 one line per enemy under the turn line, "At war with Valdoria (since turn 3)", the Great Power first', () => {
    let g = { ...continent(), turn: 5 };
    g = setPair(g, N1, 'minor-2', { war: { aggressors: [N1], since: 4 } });
    g = setPair(g, N1, N2, { war: { aggressors: [N2], since: 3 } });
    show(g);
    render(<TurnIndicator />);

    const lines = screen.getAllByTestId('at-war').map(text);
    expect(lines).toEqual(['At war with Valdoria (since turn 3)', 'At war with Sundmark (since turn 4)']);
    // Under the turn line, in page order
    const turnLine = screen.getByTestId('turn-indicator');
    expect(turnLine.compareDocumentPosition(screen.getAllByTestId('at-war')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('FR-412 at peace with everyone: no war line', () => {
    show(continent());
    render(<TurnIndicator />);
    expect(screen.queryByTestId('at-war')).toBeNull();
  });

  it('FR-412 a war between two other countries is not ours', () => {
    show(setPair(continent(), N2, 'minor-1', { war: { aggressors: [N2], since: 1 } }));
    render(<TurnIndicator />);
    expect(screen.queryByTestId('at-war')).toBeNull();
  });
});
