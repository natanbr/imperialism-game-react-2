// @vitest-environment jsdom
// M18b FR-568 (owner feedback 2026-11-23: "move the nation information to stats page button, I don't care about votes,
// score etc on the main screen"): the score, the standing ("1st of 2"), the next Council line and the Council projection
// leave the top bar and the pane's Nation group for a Stats dialog opened from the top bar. The dialog shows the same
// numbers from the same functions (councilVote, selectScoreTable, selectActiveScore). Turn, date and cash stay in the bar.
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TopBar } from '@/components/HUD/TopBar';
import { HudGroups } from '@/components/HUD/HudGroups';
import { councilVote, newGame, ordinal, scoreTable } from '@/engine';
import { councilProjectionText } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import type { GameState } from '@/types/GameState';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';

function show(game: GameState) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1 });
}

const VOTE_OR_SCORE = ['hud-score', 'score-rank', 'next-council', 'council-projection', 'score-table', 'nation-score-parts'];

describe('FR-568 votes, score and standing on a Stats page', () => {
  it('FR-568 the top bar keeps the nation, turn, date and cash, and shows no score, standing or Council line', () => {
    show(newGame({ seed: 1, world: 'continent' }));
    render(<TopBar />);
    const blocks = [...screen.getByTestId('topbar-status').children].map((b) => b.getAttribute('data-testid'));
    expect(blocks).toEqual(['topbar-nation', 'topbar-turn', 'topbar-cash']);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 of 40 Spring 1815');
    expect(text(screen.getByTestId('topbar-cash').querySelector('.nation-stats')!)).toBe('Cash: $10,000');
    for (const id of VOTE_OR_SCORE) expect(screen.queryByTestId(id), id).toBeNull();
    expect(screen.queryByText(/votes wins|Score:/)).toBeNull();
  });

  it('FR-568 the pane\'s Nation group keeps the money lines and holds no vote or score line', () => {
    show(newGame({ seed: 1, world: 'continent' }));
    render(<HudGroups open={{ nation: true, work: false, details: false }} onToggle={() => {}} />);
    const panel = screen.getByRole('region', { name: 'Nation' });
    expect(within(panel).getByTestId('upkeep-forecast')).toBeTruthy();
    for (const id of VOTE_OR_SCORE) expect(within(panel).queryByTestId(id), id).toBeNull();
  });

  it('FR-568 Stats in the top bar opens a dialog with the score, its parts, the standing, the score table, the next Council and its projection; Close shuts it', () => {
    const game = newGame({ seed: 1, world: 'continent' });
    show(game);
    render(<TopBar />);
    const stats = screen.getByRole('button', { name: 'Stats' });
    expect(stats.getAttribute('aria-haspopup')).toBe('dialog');
    fireEvent.click(stats);
    const dialog = screen.getByRole('dialog', { name: 'Stats' });
    const table = scoreTable(game);
    const at = table.findIndex((row) => row.nationId === N1);
    expect(text(within(dialog).getByTestId('hud-score'))).toBe(`Score: ${table[at].total}`);
    expect(text(within(dialog).getByTestId('score-rank'))).toBe(`${ordinal(at + 1)} of 2`);
    expect(within(dialog).getAllByTestId(/^score-row-/)).toHaveLength(2);
    expect(within(within(dialog).getByTestId('nation-score-parts')).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(text(within(dialog).getByTestId('next-council'))).toMatch(/^7 of 12 votes wins · Council: turn 10 \(Summer 1817\)\./);
    // The Council's own numbers: the projection is councilVote's, word for word
    const nameOf = (id: string) => game.nations.find((n) => n.id === id)?.name ?? id;
    expect(text(within(dialog).getByTestId('council-projection'))).toBe(councilProjectionText(councilVote(game)!, N1, nameOf));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close stats' }));
    expect(screen.queryByRole('dialog', { name: 'Stats' })).toBeNull();
  });
});
