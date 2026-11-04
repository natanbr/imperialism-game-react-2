// @vitest-environment jsdom
// FR-089: the CC BY 3.0 attribution for Game Icons, in an About panel opened from the HUD.
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HUD } from '@/components/HUD';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { text } from './domText';

describe('FR-089 credits', () => {
  it('FR-089 the HUD About button opens the attribution with links to game-icons.net and the licence; Close hides it', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
    render(<HUD />);
    expect(screen.queryByRole('dialog', { name: 'About' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /About/ }));
    const about = screen.getByRole('dialog', { name: 'About' });
    expect(text(about)).toContain('Icons by game-icons.net contributors, CC BY 3.0');
    const links = within(about).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('https://game-icons.net');
    expect(links).toContain('https://creativecommons.org/licenses/by/3.0/');

    fireEvent.click(within(about).getByRole('button', { name: 'Close about' }));
    expect(screen.queryByRole('dialog', { name: 'About' })).toBeNull();
  });
});
