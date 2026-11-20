// @vitest-environment jsdom
// FR-089: the CC BY 3.0 attribution for Game Icons, in an About panel opened from the top bar (M12b; was the HUD).
// FR-235 (M5 QA fix round): the About panel also holds a map legend, one row per border line with a
// small sample drawn in the map's own colour token and line style (the MapView.module.css class).
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
// M12b (FR-466): About moved from the right pane's header to the top bar, so these tests render <TopBar /> (was <HUD />)
import { TopBar } from '@/components/HUD/TopBar';
import { MapView } from '@/components/MapView';
import mapStyles from '@/components/MapView.module.css';
import { useGameStore } from '@/store/rootStore';
import { COUNCIL, newGame, OVERTURE_COST, votesNeeded } from '@/engine';
import { HowToPlay, howToPlayText } from '@/components/HowToPlay';
import { money } from '@/components/gameText';
import { NATION_COLORS, THEME } from '@/styles/theme';
import { text } from './domText';

describe('FR-089 credits', () => {
  it('FR-089 the HUD About button opens the attribution with links to game-icons.net and the licence; Close hides it', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
    render(<TopBar />);
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
    render(<TopBar />);
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

  // FR-327 (M11): each sample lies on the map's pale halo, as the borders on the map do
  const halo = { stroke: THEME.mapHalo, class: mapStyles.borderHalo };

  it('FR-235 FR-327 three rows: solid Great Power, dashed slate minor, dotted province, each sample in the map\'s token and line class on its halo', () => {
    expect(samples(openLegend('nation-1'))).toEqual([
      { text: 'Solid line: Great Power border', svgs: [{ hidden: 'true', lines: [halo, { stroke: NATION_COLORS[0], class: mapStyles.territoryBorder }] }] },
      { text: 'Dashed slate line: minor nation border', svgs: [{ hidden: 'true', lines: [halo, { stroke: THEME.minor, class: mapStyles.minorBorder }] }] },
      { text: 'Dotted line: province border', svgs: [{ hidden: 'true', lines: [halo, { stroke: THEME.provinceBorder, class: mapStyles.provinceBorder }] }] },
    ]);
  });

  it('FR-235 the Great Power sample is in the colour of the nation being viewed (Valdoria when watching it)', () => {
    const [greatPower] = samples(openLegend('nation-2'));
    expect(greatPower.svgs[0].lines[1].stroke).toBe(NATION_COLORS[1]);
  });

  it('FR-235 FR-327 the legend\'s classes and colours are the ones the map draws with (FR-153), halo included', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'continent' }), activeNationId: 'nation-1' });
    const { container } = render(<MapView />);
    const drawn = (id: string) => {
      const path = container.querySelector(`[data-testid="${id}"]`)!;
      return { stroke: path.getAttribute('stroke'), class: path.getAttribute('class') };
    };
    expect([drawn('territory-border'), drawn('minor-border'), drawn('province-border'), drawn('border-halo')]).toEqual([
      { stroke: NATION_COLORS[0], class: mapStyles.territoryBorder },
      { stroke: THEME.minor, class: mapStyles.minorBorder },
      { stroke: THEME.provinceBorder, class: mapStyles.provinceBorder },
      halo,
    ]);
  });
});

// FR-430, FR-431 (card Q98): "How to play" from About at any time, and what it says, its numbers from the game's rules
describe('FR-430 FR-431 How to play', () => {
  const continentGame = (patch: Partial<ReturnType<typeof newGame>> = {}) => ({ ...newGame({ seed: 1, world: 'continent' }), ...patch });

  it('FR-430 About holds a "How to play" button: it closes About and opens How to play', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: continentGame(), activeNationId: 'nation-1' });
    render(<TopBar />);
    fireEvent.click(screen.getByRole('button', { name: /About/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'About' })).getByRole('button', { name: 'How to play' }));
    expect(screen.queryByRole('dialog', { name: 'About' })).toBeNull();
    expect(useGameStore.getState().isHowToPlayOpen).toBe(true);
  });

  // FR-506 replaces the old score-or-nine-votes goal. The last Council now elects a winner, even below seven votes.
  it('FR-506 FR-431 the goal, how money is made and a first turn, in that order, with the numbers of a 40-turn continent game', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: continentGame(), activeNationId: 'nation-1' });
    render(<HowToPlay onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'How to play' });
    expect(within(dialog).getAllByRole('heading', { level: 3 }).map((h) => text(h))).toEqual(['The goal', 'Making money', 'Your first turn']);
    expect(text(within(dialog).getByTestId('howto-goal'))).toBe(
      'The Council of Governors meets on turns 10, 20, 30 and 40. 7 of 12 votes wins at any meeting. At the last meeting (turn 40) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).'
    );
    expect(text(within(dialog).getByTestId('howto-money'))).toBe(
      'Open a consulate with a minor nation in Diplomacy ($500). Once it opens at End Turn, that minor buys clothing, furniture and hardware from you on the Board of Trade.'
    );
    expect(within(within(dialog).getByTestId('howto-first-turn')).getAllByRole('listitem').map((li) => text(li))).toEqual([
      'Pick a civilian from the stack at your capital and click a tile to send it there or set it to work.',
      'Open Capital and set what your mills and factories make.',
      'End the turn with Advance Turn or the key "n".',
    ]);
  });

  it('FR-431 the numbers come from the game: a 60-turn game says 60 turns and six Council meetings', () => {
    const text60 = howToPlayText(continentGame({ turnLimit: 60 }));
    expect(text60.goal).toBe('The Council of Governors meets on turns 10, 20, 30, 40, 50 and 60. 7 of 12 votes wins at any meeting. At the last meeting (turn 60) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).');
  });

  it('FR-431 the votes and the consulate price are the rules\' (votesNeeded, OVERTURE_COST)', () => {
    const t = howToPlayText(continentGame());
    expect(t.goal).toContain(`${votesNeeded(12, 2)} of 12 votes`);
    expect(t.money).toContain(`(${money(OVERTURE_COST.consulate)})`);
    expect(t.goal).toContain(`turns ${COUNCIL.firstTurn}, ${COUNCIL.firstTurn + COUNCIL.interval}`);
  });

  it('FR-431 a world without provinces has no Council: the goal is the score alone', () => {
    expect(howToPlayText(newGame({ seed: 1, world: 'two-islands' })).goal).toBe('Have the best score after 40 turns.');
  });

  it('FR-431 Close and Escape call onClose', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: continentGame(), activeNationId: 'nation-1' });
    let closed = 0;
    render(<HowToPlay onClose={() => (closed += 1)} />);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'How to play' })).getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(closed).toBe(2);
  });
});
