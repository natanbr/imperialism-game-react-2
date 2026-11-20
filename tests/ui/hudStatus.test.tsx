// @vitest-environment jsdom
// M12 T7 to T9 (card Q95): the HUD says what the player should know. FR-423 Advance Turn cannot run twice by accident (a
// 600 ms lock after each End Turn, the button and the key "n" alike, the button aria-busy meanwhile); FR-432 the civilians
// without orders are counted under the turn line; FR-412 one "At war with ..." line per enemy under the turn line.
// M12b FR-471: those lines and the warnings are the right pane's alerts block now.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ActionButtons, NOT_SAVED_TEXT } from '@/components/HUD/index';
import { HUD } from '@/components/HUD';
import { useGameStore } from '@/store/rootStore';
import { END_TURN_LOCK_MS } from '@/store/gameSlice';
import { HOW_TO_PLAY_SEEN_KEY } from '@/store/persistence';
import { adjacentProvinces, defenceOf, newGame, strengthIn, warBetween } from '@/engine';
import { borderThreat, borderThreatText } from '@/components/HUD/hudView';
import Home from '@/page';
import { WorkerStatus } from '@/types/Workers';
import type { GameState } from '@/types/GameState';
import { emptyWarehouse, N1, N2, setPair, setTreasury } from '../engine/fixtures';
import { addRegiments, ARVELIA, ARVELIA_P, clearArmy, NE1, SE1 } from '../engine/armyFixtures';
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

it('FR-506 the HUD Council line describes both ways to win, also readable in Nation', () => {
  show({ ...continent(), turnLimit: 35 });
  render(<Home />);
  const rule = '7 of 12 votes wins at any meeting. At the last meeting (turn 30) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).';
  const line = screen.getByTestId('next-council');
  expect(text(line)).toMatch(/^7 of 12 votes wins · Council: turn 10/);
  expect(text(line)).toContain('This threshold applies at any meeting. At the last meeting (turn 30)');
  expect(line.title).toBe(text(line));
  fireEvent.click(screen.getByRole('button', { name: 'Nation' }));
  const disclosure = screen.getByText('Council voting rules').closest('details')!;
  expect(disclosure.open).toBe(false);
  fireEvent.click(screen.getByText('Council voting rules'));
  expect(disclosure.open).toBe(true);
  expect(text(disclosure)).toContain(rule);
});

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

// M12b FR-471: the war and idle lines left the turn line for the right pane's alerts block (under Tile Info, above the
// news, never in a group), so these cases render the HUD, not TurnIndicator; their texts are unchanged.
const alerts = () => screen.getByTestId('hud-alerts');

describe('FR-432 idle civilians are counted', () => {
  it('FR-432 FR-471 a new game: "7 civilians without orders" in the alerts', () => {
    show(continent());
    render(<HUD />);
    expect(text(within(alerts()).getByTestId('idle-civilians'))).toBe('7 civilians without orders');
  });

  it('FR-432 a civilian that moved or works is not counted; one left says "1 civilian"; none left, no line', () => {
    show(withStatus(continent(), WorkerStatus.Moved, 4));
    const { rerender } = render(<HUD />);
    expect(text(screen.getByTestId('idle-civilians'))).toBe('3 civilians without orders');

    act(() => show(withStatus(continent(), WorkerStatus.Working, 6)));
    rerender(<HUD />);
    expect(text(screen.getByTestId('idle-civilians'))).toBe('1 civilian without orders');

    act(() => show(withStatus(continent(), WorkerStatus.Working, 7)));
    rerender(<HUD />);
    expect(screen.queryByTestId('idle-civilians')).toBeNull();
  });

  it('FR-432 an order given counts at once: a move leaves 6', () => {
    show(continent());
    render(<HUD />);
    const capital = useGameStore.getState().game.map.tiles.flat().find((t) => t.workers.some((w) => w.nationId === N1))!;
    const farmer = capital.workers.find((w) => w.type === 'farmer')!;
    act(() => void useGameStore.getState().submitOrder({ kind: 'moveWorker', nationId: N1, workerId: farmer.id, toTileId: '3-9' }));
    expect(useGameStore.getState().lastRejection).toBeNull();
    expect(text(screen.getByTestId('idle-civilians'))).toBe('6 civilians without orders');
  });

  it('FR-432 none after game over (nor a war line)', () => {
    show(setPair({ ...continent(), gameOver: { turn: 40, year: 1824, scores: [] } }, N1, N2, { war: { aggressors: [N2], since: 3 } }));
    render(<HUD />);
    expect(screen.queryByTestId('idle-civilians')).toBeNull();
    expect(screen.queryByTestId('at-war')).toBeNull();
  });
});

describe('FR-412 the HUD says we are at war', () => {
  it('FR-412 FR-471 one line per enemy in the alerts, "At war with Valdoria (since turn 3)", the Great Power first; under Tile Info, above the news', () => {
    let g = { ...continent(), turn: 5 };
    g = setPair(g, N1, 'minor-2', { war: { aggressors: [N1], since: 4 } });
    g = setPair(g, N1, N2, { war: { aggressors: [N2], since: 3 } });
    show(g);
    render(<HUD />);

    const lines = within(alerts()).getAllByTestId('at-war').map(text);
    expect(lines).toEqual(['At war with Valdoria (since turn 3)', 'At war with Sundmark (since turn 4)']);
    // In page order: the Tile Info placeholder, the war lines, the news (M12 had them under the turn line)
    const war = screen.getAllByTestId('at-war')[0];
    expect(screen.getByTestId('tile-info-none').compareDocumentPosition(war) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(war.compareDocumentPosition(screen.getByTestId('news-panel')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('FR-412 at peace with everyone: no war line', () => {
    show(continent());
    render(<HUD />);
    expect(screen.queryByTestId('at-war')).toBeNull();
  });

  it('FR-412 a war between two other countries is not ours', () => {
    show(setPair(continent(), N2, 'minor-1', { war: { aggressors: [N2], since: 1 } }));
    render(<HUD />);
    expect(screen.queryByTestId('at-war')).toBeNull();
  });
});

// M13 FR-495 (Imp1's Defense Minister, "Strengthen the Army" when a rival army is more than twice ours [08:W26]): another
// Great Power's regiments in a province bordering one of ours, with a strength (FR-204) above twice that province's
// defence (FR-226), make one line in the alerts (where M12b put the lines under the turn line), also at peace.
describe('FR-495 the Defense Minister warns', () => {
  /** Valdoria's army in Arvelia, which borders Testland North-East: 3 Cuirassiers and Regulars at `health`, 52 at 70. */
  const threat = (s: GameState = continent(), health = 70): GameState =>
    addRegiments(addRegiments(s, N2, ARVELIA_P, ['cuirassiers', 'cuirassiers', 'cuirassiers']), N2, ARVELIA_P, ['regulars'], health);
  const LINE = "Valdoria's army at our border: Testland North-East (52 against our 25)";
  const borderLines = () => screen.queryAllByTestId('border-threat').map(text);

  it('FR-495 the example: Valdoria 52 in Arvelia against our 25 in Testland North-East, at peace, is one line in the alerts, under Tile Info and above the news', () => {
    const g = threat();
    // The setup's numbers, so a change of the start garrison shows here first
    expect(strengthIn(g, N2, ARVELIA_P)).toBe(52);
    expect(defenceOf(g, NE1)).toBe(25);
    expect(adjacentProvinces(g, NE1).map((p) => p.id)).toContain(ARVELIA_P);
    expect(warBetween(g, N1, N2)).toBeUndefined();
    show(g);
    render(<HUD />);
    expect(within(alerts()).getAllByTestId('border-threat').map(text)).toEqual([LINE]);
    const line = screen.getByTestId('border-threat');
    expect(line.closest('[data-testid="hud-groups"]')).toBeNull();
    expect(screen.getByTestId('tile-info-none').compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.compareDocumentPosition(screen.getByTestId('news-panel')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('FR-495 exactly twice is not more than twice: 50 against 25 is no line', () => {
    const g = threat(continent(), 50);
    expect(strengthIn(g, N2, ARVELIA_P)).toBe(50);
    show(g);
    render(<HUD />);
    expect(borderLines()).toEqual([]);
  });

  it('FR-495 one line, for the strongest such border: Valdoria 60 in Testland South-East (hand-built, its province) over 52 in Arvelia', () => {
    let g = threat();
    g = { ...g, provinces: g.provinces.map((p) => (p.id === SE1 ? { ...p, ownerId: N2 } : p)) };
    g = addRegiments(clearArmy(g, N1, SE1), N2, SE1, ['cuirassiers', 'cuirassiers', 'cuirassiers', 'cuirassiers']);
    expect(strengthIn(g, N2, SE1)).toBe(60);
    show(g);
    render(<HUD />);
    expect(borderLines()).toEqual(["Valdoria's army at our border: Testland North-East (60 against our 25)"]);
  });

  it("FR-495 only a Great Power's army counts: Arvelia's own of 60, or ours there, is no line; nor is a weaker one", () => {
    show(addRegiments(continent(), ARVELIA, ARVELIA_P, ['cuirassiers', 'cuirassiers', 'cuirassiers', 'cuirassiers']));
    const { rerender } = render(<HUD />);
    expect(borderLines()).toEqual([]);
    act(() => show(addRegiments(continent(), N1, ARVELIA_P, ['cuirassiers', 'cuirassiers', 'cuirassiers', 'cuirassiers'])));
    rerender(<HUD />);
    expect(borderLines()).toEqual([]);
    act(() => show(addRegiments(continent(), N2, ARVELIA_P, ['cuirassiers'])));
    rerender(<HUD />);
    expect(borderLines()).toEqual([]);
  });

  it('FR-495 at war too, beside the war line; none after game over; none on two-islands (no provinces)', () => {
    show(setPair(threat(), N1, N2, { war: { aggressors: [N2], since: 3 } }));
    const { rerender } = render(<HUD />);
    expect(borderLines()).toEqual([LINE]);
    expect(screen.getAllByTestId('at-war').map(text)).toEqual(['At war with Valdoria (since turn 3)']);
    act(() => show({ ...threat(), gameOver: { turn: 40, year: 1824, scores: [] } }));
    rerender(<HUD />);
    expect(borderLines()).toEqual([]);
    act(() => show(newGame({ seed: 1 })));
    rerender(<HUD />);
    expect(borderLines()).toEqual([]);
  });

  it('FR-495 FR-471 with only this line the alerts block shows, holding it', () => {
    show(withStatus(threat(), WorkerStatus.Working, 7));
    render(<HUD />);
    expect(within(alerts()).getAllByTestId('border-threat').map(text)).toEqual([LINE]);
    expect(screen.queryByTestId('idle-civilians')).toBeNull();
  });

  it('FR-495 borderThreat reads the strongest border as data; the numbers keep one decimal', () => {
    expect(borderThreat(threat(), N1)).toEqual({ nationId: N2, name: 'Valdoria', provinceId: NE1, provinceName: 'Testland North-East', strength: 52, defence: 25 });
    expect(borderThreat(continent(), N1)).toBeUndefined();
    expect(borderThreatText({ name: 'Valdoria', provinceName: 'Testland North-East', strength: 52.25, defence: 18.75 })).toBe(
      "Valdoria's army at our border: Testland North-East (52.3 against our 18.8)"
    );
  });
});

describe('FR-471 the alerts stay in sight', () => {
  it('FR-471 Not saved, the food and upkeep warnings, the wars and the idle civilians are all in the alerts block, none in a group; texts and roles unchanged', () => {
    let g = setTreasury({ ...continent(), turn: 5 }, N1, 0);
    g = setPair(g, N1, N2, { war: { aggressors: [N2], since: 3 } });
    // A short meal: no food in the warehouse
    g = emptyWarehouse(g, N1);
    show(g);
    useGameStore.setState({ saveFailed: true });
    render(<HUD />);
    const block = alerts();
    for (const id of ['not-saved', 'food-warning', 'upkeep-warning', 'at-war', 'idle-civilians']) {
      const line = within(block).getByTestId(id);
      expect(line.closest('[data-testid="hud-groups"]'), id).toBeNull();
    }
    expect(text(within(block).getByTestId('not-saved'))).toBe(NOT_SAVED_TEXT);
    for (const id of ['not-saved', 'food-warning', 'upkeep-warning']) expect(within(block).getByTestId(id).getAttribute('role'), id).toBe('status');
    expect(text(within(block).getByTestId('food-warning'))).toMatch(/^Food is short: at the end of this turn /);
    expect(text(within(block).getByTestId('upkeep-warning'))).toMatch(/^Army upkeep of \$100 is due at End Turn and the treasury will hold \$0: \$100 short\./);
    // One of each on the page
    for (const id of ['not-saved', 'food-warning', 'upkeep-warning', 'idle-civilians']) expect(screen.getAllByTestId(id), id).toHaveLength(1);
  });

  it('FR-471 FR-466 on the whole page (Home) one Not saved line, in the alerts; the pane holds no Advance Turn (card Q113: the top bar\'s is the only one)', () => {
    show(continent());
    // The page's autosave writes at once; a browser that refuses every write (storage full) makes it say Not saved
    const refuse = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    render(<Home />);
    refuse.mockRestore();
    expect(useGameStore.getState().saveFailed).toBe(true);
    const notSaved = screen.getAllByTestId('not-saved');
    expect(notSaved).toHaveLength(1);
    expect(alerts().contains(notSaved[0])).toBe(true);
    expect(within(document.querySelector('.hud-container') as HTMLElement).queryByRole('button', { name: /Advance Turn/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /Advance Turn/ })).toHaveLength(1);
  });

  it('FR-471 with none of them the alerts block is absent', () => {
    show(withStatus(continent(), WorkerStatus.Working, 7));
    render(<HUD />);
    expect(screen.queryByTestId('hud-alerts')).toBeNull();
  });
});
