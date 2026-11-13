// @vitest-environment jsdom
// FR-176: the HUD's news panel names the countries a diplomacy line mentions, minor nations included (the
// panel's name lookup used to know the Great Powers only, so Arvelia read "minor-1").
import { describe, it, expect } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { NewsPanel } from '@/components/HUD/index';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { text } from './domText';

describe('FR-176 diplomacy lines in the news panel', () => {
  it('FR-176 FR-163 after End Turn the panel reads "Consulate opened in Arvelia."', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'continent' }), activeNationId: 'nation-1' });
    render(<NewsPanel />);

    act(() => {
      useGameStore.getState().submitOrder({ kind: 'proposeOverture', nationId: 'nation-1', overture: 'consulate', targetId: 'minor-1' });
      useGameStore.getState().advanceTurn();
    });

    const lines = within(screen.getByTestId('news-panel')).getAllByRole('listitem').map(text);
    expect(lines).toContain('Consulate opened in Arvelia.');
  });
});
