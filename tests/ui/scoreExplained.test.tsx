// @vitest-environment jsdom
// M12 FR-404: the HUD's score explains itself: its parts as visible text on hover and on focus, not only a `title`.
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScoreIndicator } from '@/components/HUD/index';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine/newGame';
import { applyOrder } from '@/engine/orders/apply';
import type { GameState } from '@/types/GameState';
import { game, N1 } from '../engine/fixtures';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

const LINE = 'Investments count at their price until they are done.';

function show(state: GameState) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1 });
  render(<ScoreIndicator />);
  return screen.getByTestId('hud-score');
}

describe('M12 FR-404 the score explains itself', () => {
  it('FR-404 hovering the score shows its four parts and the line as visible text; leaving hides them', () => {
    const score = show(game());
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(score);
    const parts = screen.getByRole('tooltip');
    expect(text(parts)).toBe(`Treasury 100 Industry 90 Development 30 Work in progress 0 ${LINE}`);
    expect(score.getAttribute('aria-describedby')).toBe(parts.id);

    fireEvent.mouseLeave(score);
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(text(score)).toBe('Score: 220');
  });

  it('FR-404 the score takes the keyboard focus and shows the parts on focus; blur and Escape hide them', () => {
    const score = show(game());
    expect(score.tabIndex).toBe(0);

    fireEvent.focus(score);
    expect(text(screen.getByRole('tooltip'))).toContain(LINE);
    fireEvent.blur(score);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(score);
    fireEvent.keyDown(score, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('FR-402 FR-404 a $1,000 development order on turn 1 shows as 10 points of work in progress; the total stays 240', () => {
    const ordered = applyOrder(newGame({ seed: 1 }), { kind: 'moveAndStartDevelopment', nationId: N1, workerId: 'worker-nation-1-2', toTileId: '2-8' });
    const score = show(ordered);
    expect(text(score)).toBe('Score: 240');
    expect(score.getAttribute('title')).toBe('Treasury 90 + industry 90 + development 50 + work in progress 10');

    fireEvent.mouseEnter(score);
    expect(text(screen.getByRole('tooltip'))).toBe(`Treasury 90 Industry 90 Development 50 Work in progress 10 ${LINE}`);
    // the visible parts replace the browser's title tooltip while they show, so the two never stack
    expect(score.getAttribute('title')).toBeNull();
  });
});
