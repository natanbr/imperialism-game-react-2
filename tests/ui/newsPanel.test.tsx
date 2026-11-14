// @vitest-environment jsdom
// M8 QA fix round, item 6. FR-268: the HUD's news list shows the player's own lines first (FR-107) and is its own scroll
// region, named by its heading and reachable with the keyboard, so every line can be read without the HUD's fade
// (FR-235) hiding one. The layout (whole lines, above the fade, scrolled to the last line) is checked in the running
// app: e2e/m8-qa.spec.ts.
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CouncilModal } from '@/components/CouncilModal';
import { NewsPanel, TurnIndicator } from '@/components/HUD/index';
import { useGameStore } from '@/store/rootStore';
import { councilVote, type GameEvent } from '@/engine';
import { continent } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const N2 = 'nation-2';

function showNews(events: GameEvent[]) {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    game: continent(),
    activeNationId: N1,
    eventLog: [{ turn: 3, year: 1815, events, treasuries: {} } as never],
  });
  return render(<NewsPanel />);
}

// Valdoria's events first, as the turn resolves them; then ours; then the game over (no nation)
const EVENTS = [
  { type: 'army-upkeep', nationId: N2, amount: 100 },
  { type: 'goods-produced', nationId: N2, output: 'armaments', amount: 2 },
  { type: 'army-upkeep', nationId: N1, amount: 125 },
  { type: 'army-moved', nationId: N1, fromProvinceId: 'province-nation-1-sw', toProvinceId: 'province-nation-1-nw', count: 1 },
  { type: 'regiments-recruited', nationId: N2, regiment: 'regulars', count: 1 },
  { type: 'goods-produced', nationId: N1, output: 'armaments', amount: 1 },
] as unknown as GameEvent[];

describe('FR-268 the HUD news list', () => {
  it("FR-268 FR-107 the player's own lines come first, in event order; then the other nation's, each under its name", () => {
    showNews(EVENTS);
    const lines = within(screen.getByTestId('news-panel')).getAllByRole('listitem').map(text);
    expect(lines).toEqual([
      'Army upkeep: $125.',
      '1 regiment marched from Testland South-West to Testland North-West.',
      'Produced 1 Armaments.',
      'Valdoria: Army upkeep: $100.',
      'Valdoria: Produced 2 Armaments.',
      'Valdoria: 1 Regulars recruited.',
    ]);
  });

  it('FR-268 FR-280 the list is its own scroll region: named by the heading "News from last turn (turn 3, Fall 1815)" and reachable with Tab', () => {
    showNews(EVENTS);
    const list = screen.getByRole('list', { name: 'News from last turn (turn 3, Fall 1815)' });
    expect(list.dataset.testid).toBe('news-list');
    expect(list.tabIndex).toBe(0);
    expect(text(screen.getByRole('heading', { name: 'News from last turn (turn 3, Fall 1815)' }))).toBe('News from last turn (turn 3, Fall 1815)');
  });
});

// M9 QA fix round, item 5. FR-280: the news are those of the turn just resolved, so their heading says so, with that
// turn's number and date: on turn 3 of 40 (Fall 1815) it reads "News from last turn (turn 2, Summer 1815)", not "News,
// turn 2 (1815)", which read as a mismatch with the HUD's turn.
describe('FR-280 the news heading names the last turn', () => {
  it('FR-280 on turn 3 the HUD reads "Turn: 3 of 40" and "Fall 1815", the news heading "News from last turn (turn 2, Summer 1815)"', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: { ...continent(), turn: 3 },
      activeNationId: N1,
      eventLog: [{ turn: 2, year: 1815, events: EVENTS, treasuries: {} } as never],
    });
    render(
      <>
        <TurnIndicator />
        <NewsPanel />
      </>
    );
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 3 of 40 Fall 1815');
    expect(text(screen.getByRole('heading', { level: 3 }))).toBe('News from last turn (turn 2, Summer 1815)');
  });

  it('FR-280 the last turn of a year names its own season and year: "News from last turn (turn 4, Winter 1815)"', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: { ...continent(), turn: 5, year: 1816 },
      activeNationId: N1,
      eventLog: [{ turn: 4, year: 1815, events: [], treasuries: {} } as never],
    });
    render(<NewsPanel />);
    expect(text(screen.getByRole('heading', { level: 3 }))).toBe('News from last turn (turn 4, Winter 1815)');
  });
});

// M10 UI half. FR-297: the Council's news line opens the Council screen of that meeting (FR-298), as a battle's line opens
// its Battle screen (FR-232). FR-306 (review R1): it is the first line of the list, so it shows without scrolling. FR-316
// (QA fix round): the screen's date line reads "Met at the end of turn 10 (Summer 1817)".
describe('FR-297 the Council in the news', () => {
  it('FR-297 FR-306 FR-316 the line "Council of Governors: Testland 4, Valdoria 4 of 12 votes; no winner (9 needed).", first in the list, opens the Council screen of that meeting', () => {
    const council = { type: 'council-met', turn: 10, year: 1817, ...councilVote(continent())! } as GameEvent;
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      game: { ...continent(), turn: 11 },
      activeNationId: N1,
      eventLog: [{ turn: 10, year: 1817, events: [EVENTS[0], { type: 'turn-ended', turn: 10, year: 1817 }, council], treasuries: {} } as never],
    });
    render(
      <>
        <NewsPanel />
        <CouncilModal />
      </>
    );
    const list = screen.getByTestId('news-list');
    expect(within(list).getAllByRole('listitem').map(text)).toEqual([
      'Council of Governors: Testland 4, Valdoria 4 of 12 votes; no winner (9 needed).',
      'Valdoria: Army upkeep: $100.',
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(within(list).getByRole('button', { name: 'Council of Governors: Testland 4, Valdoria 4 of 12 votes; no winner (9 needed).' }));
    expect(useGameStore.getState().councilShown).toEqual(council);
    const dialog = screen.getByRole('dialog', { name: 'Council of Governors' });
    expect(text(within(dialog).getByTestId('council-date'))).toBe('Met at the end of turn 10 (Summer 1817)');
    expect(text(within(dialog).getByTestId('council-result'))).toBe('No winner. The Council meets again on turn 20.');
  });
});
