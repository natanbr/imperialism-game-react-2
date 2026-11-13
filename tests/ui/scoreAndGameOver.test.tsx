// @vitest-environment jsdom
// FR-075, FR-076: the HUD shows the score and the game length; the game-over screen shows the final
// ranked scores and the Advance Turn button is disabled after the end.
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ActionButtons, FoodWarning, ScoreIndicator, TurnIndicator } from '@/components/HUD/index';
import { GameOverModal } from '@/components/GameOverModal';
import { useGameStore } from '@/store/rootStore';
import { resolveTurn, scoreOf } from '@/engine';
import type { GameState } from '@/types/GameState';
import { emptyWarehouse, game, N1, N2, setIndustry, setPair, setTile, setTreasury, T } from '../engine/fixtures';
import { clearArmy, continent, NW2, relocate, SW2 } from '../engine/armyFixtures';
import { applyOrder } from '@/engine/orders/apply';
import { transferProvince } from '@/engine/world/provinces';
import { text } from './domText';
import { actWarnings, failOnActWarnings } from './actWarnings';

// FR-110 (f): every test here fails on a React act() warning
failOnActWarnings();

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
}

/** The fixture game played to its end after one turn; nation-2 richer so the ranking is not nation order. */
const finished = (): GameState => resolveTurn({ ...setTreasury(game(), N2, 50000), turnLimit: 1 }, {}, 1).state;

describe('FR-075 HUD score and game length', () => {
  it("FR-075 shows the active nation's score total, its three parts on hover", () => {
    const g = game();
    show(g);
    render(<ScoreIndicator />);

    const score = scoreOf(g, N1);
    expect(score.total).toBe(220);
    const el = screen.getByTestId('hud-score');
    expect(text(el)).toBe('Score: 220');
    expect(el.getAttribute('title')).toBe('Treasury 100 + industry 90 + development 30');
  });

  it('FR-075 the score follows the game (cash spent lowers the treasury points)', () => {
    show(setTreasury(game(), N1, 2500));
    render(<ScoreIndicator />);
    expect(text(screen.getByTestId('hud-score'))).toBe('Score: 145');
  });

  it('FR-048 FR-075 the turn shows as "Turn: N of L" with the date', () => {
    show(game());
    const { rerender } = render(<TurnIndicator />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 of 40 Spring 1815');

    act(() => show({ ...game(), turnLimit: 7 }));
    rerender(<TurnIndicator />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 of 7 Spring 1815');
  });

  it('FR-075 after game over the turn shows "Game over" and the date of the last turn', () => {
    show(finished());
    render(<TurnIndicator />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Game over after turn 1 of 1 Spring 1815');
  });
});

describe('FR-075 food warning after the end', () => {
  it('FR-075 the food warning is not shown after game over', () => {
    let s = emptyWarehouse(game(), N1, { grain: 20 });
    for (const tileId of [T.farm1, T.dryPlains1, T.homeOrchard1, T.range1]) s = setTile(s, tileId, { resource: undefined });
    const short = setIndustry(s, N1, { workers: { untrained: 4, trained: 2, expert: 1 } });
    show(short);
    const { rerender } = render(<FoodWarning />);
    expect(screen.getByTestId('food-warning')).toBeTruthy();

    act(() => show({ ...short, gameOver: { turn: 40, year: 1824, scores: [] } }));
    rerender(<FoodWarning />);
    expect(screen.queryByTestId('food-warning')).toBeNull();
  });
});

describe('FR-076 game-over screen', () => {
  it('FR-076 is not shown while the game goes on', () => {
    show(game());
    render(<GameOverModal />);
    expect(screen.queryByRole('dialog', { name: 'Game over' })).toBeNull();
  });

  it('FR-076 shows the date of the last turn and the final scores ranked, each with its three parts', () => {
    const over = finished();
    show(over);
    render(<GameOverModal />);

    const dialog = screen.getByRole('dialog', { name: 'Game over' });
    expect(text(within(dialog).getByRole('heading', { level: 2 }))).toBe('Game over');
    expect(text(within(dialog).getByTestId('game-over-date'))).toBe('The game ended after Spring 1815 (turn 1).');

    const scores = over.gameOver!.scores;
    expect(scores.map(s => s.nationId)).toEqual([N2, N1]);
    const rows = within(dialog).getAllByTestId(/^final-score-/);
    expect(rows.map(r => r.dataset.testid)).toEqual(scores.map(s => `final-score-${s.nationId}`));

    const name = (id: string) => over.nations.find(n => n.id === id)!.name;
    scores.forEach((s, i) => {
      const cells = within(rows[i]);
      expect(text(cells.getByTestId('rank'))).toBe(String(i + 1));
      expect(text(cells.getByTestId('nation'))).toContain(name(s.nationId));
      expect(text(cells.getByTestId('treasury'))).toBe(String(s.points.treasury));
      expect(text(cells.getByTestId('industry'))).toBe(String(s.points.industry));
      expect(text(cells.getByTestId('development'))).toBe(String(s.points.development));
      expect(text(cells.getByTestId('total'))).toBe(String(s.total));
    });
    expect(text(within(rows[1]).getByTestId('nation'))).toBe(`${name(N1)} (you)`);
    expect(text(within(rows[0]).getByTestId('nation'))).toBe(name(N2));
  });

  it('FR-223 a game won by conquest says so: "Testland has conquered Valdoria."; a game ended by the turn limit does not', () => {
    // Testland holds Valdoria North-West (hand-built) and takes Valdoria's undefended capital province (FR-217, FR-223)
    let s = transferProvince(continent('world'), NW2, N1);
    s = relocate(clearArmy(clearArmy(s, N2, NW2), N2, SW2), ['regiment-1'], NW2);
    s = setPair(s, N1, N2, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [] });
    s = applyOrder(s, { kind: 'moveArmy', nationId: N1, fromProvinceId: NW2, regimentIds: ['regiment-1'], toProvinceId: SW2 });
    const over = resolveTurn(s, {}, s.seed).state;
    expect(over.gameOver).toMatchObject({ reason: 'conquest', winnerId: N1 });
    show(over);
    render(<GameOverModal />);
    expect(text(screen.getByTestId('game-over-conquest'))).toBe('Testland has conquered Valdoria.');
  });

  it('FR-223 FR-076 the turn limit\'s game-over screen has no conquest line', () => {
    show(finished());
    render(<GameOverModal />);
    expect(screen.queryByTestId('game-over-conquest')).toBeNull();
  });

  it('FR-076 shows the recorded final scores, not a fresh score of the state', () => {
    const over = finished();
    const recorded = over.gameOver!.scores.find(s => s.nationId === N1)!;
    // A later change of cash (none can happen in play, FR-069) must not change the final table.
    show(setTreasury(over, N1, 999999));
    render(<GameOverModal />);
    expect(text(within(screen.getByTestId(`final-score-${N1}`)).getByTestId('total'))).toBe(String(recorded.total));
  });

  it('FR-076 can be closed to see the map and reopened from the HUD', () => {
    show(finished());
    render(<><GameOverModal /><ActionButtons /></>);

    fireEvent.click(screen.getByRole('button', { name: 'Back to the map' }));
    expect(screen.queryByRole('dialog', { name: 'Game over' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Final scores/ }));
    expect(screen.getByRole('dialog', { name: 'Game over' })).toBeTruthy();
  });

  it('FR-076 the Advance Turn button is enabled during the game and disabled after game over', () => {
    show(game());
    const { rerender } = render(<ActionButtons />);
    expect((screen.getByRole('button', { name: /Advance Turn/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: /Final scores/ })).toBeNull();

    act(() => show(finished()));
    rerender(<ActionButtons />);
    expect((screen.getByRole('button', { name: /Advance Turn/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('FR-110 (f) no act() warning in the M3 UI tests', () => {
  it("FR-110 (f) the check recognises React's act() warning and ignores other errors", () => {
    const spy = vi.fn<typeof console.error>();
    spy('An update to %s inside a test was not wrapped in act(...).', 'HUD');
    spy('Warning: something else');
    expect(actWarnings(spy as never)).toEqual(['An update to %s inside a test was not wrapped in act(...). HUD']);
  });
});
