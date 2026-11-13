// @vitest-environment jsdom
// FR-089: the CC BY 3.0 attribution for Game Icons, in an About panel opened from the HUD.
// FR-235 (M5 QA fix round): the About panel also holds a map legend, one row per border line with a
// small sample drawn in the map's own colour token and line style (the MapView.module.css class).
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HUD } from '@/components/HUD';
import { MapView } from '@/components/MapView';
import mapStyles from '@/components/MapView.module.css';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { NATION_COLORS, THEME } from '@/styles/theme';
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

describe('FR-235 map legend in the About panel', () => {
  const openLegend = (activeNationId: string) => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'continent' }), activeNationId });
    render(<HUD />);
    fireEvent.click(screen.getByRole('button', { name: /About/ }));
    return within(screen.getByRole('dialog', { name: 'About' })).getByRole('list', { name: 'Map legend' });
  };
  /** Each legend row's sample: its lines' stroke and class, and whether the sample is hidden from screen readers. */
  const samples = (legend: HTMLElement) =>
    within(legend)
      .getAllByRole('listitem')
      .map((row) => {
        const svgs = [...row.querySelectorAll('svg')];
        return {
          text: text(row),
          svgs: svgs.map((svg) => ({
            hidden: svg.getAttribute('aria-hidden'),
            lines: [...svg.querySelectorAll('line')].map((l) => ({ stroke: l.getAttribute('stroke'), class: l.getAttribute('class') })),
          })),
        };
      });

  it('FR-235 three rows: solid Great Power, dashed slate minor, dotted province, each with a sample in the map\'s token and line class', () => {
    expect(samples(openLegend('nation-1'))).toEqual([
      { text: 'Solid line: Great Power border', svgs: [{ hidden: 'true', lines: [{ stroke: NATION_COLORS[0], class: mapStyles.territoryBorder }] }] },
      { text: 'Dashed slate line: minor nation border', svgs: [{ hidden: 'true', lines: [{ stroke: THEME.minor, class: mapStyles.minorBorder }] }] },
      { text: 'Dotted line: province border', svgs: [{ hidden: 'true', lines: [{ stroke: THEME.provinceBorder, class: mapStyles.provinceBorder }] }] },
    ]);
  });

  it('FR-235 the Great Power sample is in the colour of the nation being viewed (Valdoria when watching it)', () => {
    const [greatPower] = samples(openLegend('nation-2'));
    expect(greatPower.svgs[0].lines[0].stroke).toBe(NATION_COLORS[1]);
  });

  it('FR-235 the legend\'s classes and colours are the ones the map draws with (FR-153)', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'continent' }), activeNationId: 'nation-1' });
    const { container } = render(<MapView />);
    const drawn = (id: string) => {
      const path = container.querySelector(`[data-testid="${id}"]`)!;
      return { stroke: path.getAttribute('stroke'), class: path.getAttribute('class') };
    };
    expect([drawn('territory-border'), drawn('minor-border'), drawn('province-border')]).toEqual([
      { stroke: NATION_COLORS[0], class: mapStyles.territoryBorder },
      { stroke: THEME.minor, class: mapStyles.minorBorder },
      { stroke: THEME.provinceBorder, class: mapStyles.provinceBorder },
    ]);
  });
});
