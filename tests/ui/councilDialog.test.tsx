// @vitest-environment jsdom
// M10 UI half. FR-298 (rules 11 section 8.1; Imp1 vote screen): a dialog named "Council of Governors" in the shared Modal
// shows one `council-met` event: the meeting date, the pack's capitol picture (decorative, at most 96 px high), a table
// named "Votes" (the first nominee, the row names, the second nominee; each nominee's head its swatch and name; the rows
// Controlled, Colonies, Other Great Powers, Other Minor Nations and Total), each number cell naming the provinces behind it
// as its title and accessible description, the abstentions, the votes needed, and the result ("No winner. The Council
// meets again on turn 20.", "No winner. This was the last Council; the game ends on points.", or the heading "Testland
// Wins!"). The player does not vote: the screen is a report. FR-299: after End Turn it opens by itself once, after the
// Battle screens; Close, Escape and the backdrop close it and the focus goes back; on a winning meeting it opens before
// the game-over screen, with "See the final scores" in place of "Close". Store: `councilShown`, `showCouncil`, `closeCouncil`.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { BattleModal } from '@/components/BattleModal';
import { CouncilModal } from '@/components/CouncilModal';
import { GameOverModal } from '@/components/GameOverModal';
import { useGameStore } from '@/store/rootStore';
import { councilVote, type CouncilMetEvent, type Order } from '@/engine';
import { transferProvince } from '@/engine/world/provinces';
import type { GameState } from '@/types/GameState';
import { N1, N2, setPair } from '../engine/fixtures';
import { ARVELIA, ARVELIA_P, continent, NE1, NE2, relocate, SUNDMARK } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const LORRAN = 'minor-3';
const PELLIS = 'minor-4';
const FIELD = ['regiment-1', 'regiment-2', 'regiment-3'];

/** The continent on the world market (no trade moves a relation), on this turn and year. */
const onTurn = (turn: number, year: number, s: GameState = continent('world')): GameState => ({ ...s, turn, year });

/** Sundmark at 52 and Lorran at 55 with Testland: they vote for it (FR-293); Arvelia and Pellis abstain. */
const twoIslands = (s: GameState = continent('world')): GameState => setPair(setPair(s, SUNDMARK, N1, { points: 52 }), LORRAN, N1, { points: 55 });

/** FR-294's winning example: Testland holds Valdoria North-East, has colonised Arvelia, and the three island minors are at 60 with it. */
function winning(s: GameState = continent('world')): GameState {
  let t = transferProvince(transferProvince(s, NE2, N1), ARVELIA_P, N1);
  t = { ...t, minorNations: t.minorNations.map((m) => (m.id === ARVELIA ? { ...m, colonyOf: N1 } : m)) };
  return [SUNDMARK, LORRAN, PELLIS].reduce((acc, minorId) => setPair(acc, minorId, N1, { points: 60 }), t);
}

/** The `council-met` event a meeting on this state would give (FR-296). */
function meeting(s: GameState, turn = 10, year = 1817): CouncilMetEvent {
  const vote = councilVote(s);
  if (!vote) throw new Error('no meeting');
  return { type: 'council-met', turn, year, ...vote };
}

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
}

/** The Council screen of this meeting, on `state` (the current game). */
function open(event: CouncilMetEvent, state: GameState = continent('world')) {
  show(state, { councilShown: event });
  return render(<CouncilModal />);
}

const dialog = () => screen.getByRole('dialog', { name: 'Council of Governors' });
const button = (name: string) => within(dialog()).getByRole('button', { name }) as HTMLButtonElement;
const table = () => within(dialog()).getByRole('table', { name: 'Votes' });
const cell = (nationId: string, row: string) => within(table()).getByTestId(`council-cell-${nationId}-${row}`);
/** The text of the elements an element's aria-describedby names: its accessible description. */
const description = (el: HTMLElement): string =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');

describe('FR-298 the Council screen: what it shows', () => {
  it('FR-298 a dialog named "Council of Governors" (the shared Modal) with the meeting date "Turn 10, Summer 1817"', () => {
    open(meeting(continent('world')));
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(text(within(dialog()).getByRole('heading', { level: 2 }))).toBe('Council of Governors');
    expect(text(within(dialog()).getByTestId('council-date'))).toBe('Turn 10, Summer 1817');
  });

  it("FR-298 the pack's buildings/capitol.png as a decorative header picture, at most 96 px high", () => {
    open(meeting(continent('world')));
    const pictures = dialog().querySelectorAll('img');
    expect(pictures).toHaveLength(1);
    const img = pictures[0];
    expect([img.getAttribute('src'), img.getAttribute('alt')]).toEqual(['/assets/ink-and-wash/buildings/capitol.png', '']);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    expect(Number(img.getAttribute('height'))).toBeLessThanOrEqual(96);
  });

  it('FR-298 a table named "Votes": the first nominee, the row names, the second nominee; each nominee\'s head its swatch and name', () => {
    open(meeting(twoIslands()));
    const heads = within(table()).getAllByRole('columnheader');
    expect(heads.map((h) => text(h))).toEqual(['Testland', 'Valdoria']);
    expect(heads.map((h) => h.getAttribute('scope'))).toEqual(['col', 'col']);
    for (const head of heads) expect(within(head).getByTestId('swatch').getAttribute('aria-hidden')).toBe('true');
    expect((within(heads[0]).getByTestId('swatch') as HTMLElement).style.backgroundColor).toBe('var(--color-nation-1)');
    expect((within(heads[1]).getByTestId('swatch') as HTMLElement).style.backgroundColor).toBe('var(--color-nation-2)');

    const rowHeads = within(table()).getAllByRole('rowheader');
    expect(rowHeads.map((h) => text(h))).toEqual(['Controlled', 'Colonies', 'Other Great Powers', 'Other Minor Nations', 'Total']);
    expect(rowHeads.map((h) => h.getAttribute('scope'))).toEqual(['row', 'row', 'row', 'row', 'row']);
    // Each row reads left nominee, row name, right nominee
    const rows = within(table()).getAllByRole('row').slice(1).map((r) => text(r));
    expect(rows).toEqual(['4 Controlled 4', '0 Colonies 0', '0 Other Great Powers 0', '2 Other Minor Nations 0', '6 Total 4']);
  });

  it('FR-298 the first nominee (the higher standing) is the left column: Valdoria holding Testland North-East is first', () => {
    open(meeting(transferProvince(continent('world'), NE1, N2)));
    expect(within(table()).getAllByRole('columnheader').map((h) => text(h))).toEqual(['Valdoria', 'Testland']);
    expect(text(within(table()).getAllByRole('row').at(-1)!)).toBe('5 Total 3');
  });

  it('FR-298 each number cell names the provinces behind it, as its title and its accessible description', () => {
    open(meeting(twoIslands()));
    const minors = cell(N1, 'otherMinorNations');
    expect(text(minors)).toBe('2');
    expect(minors.getAttribute('title')).toBe('Sundmark, Lorran');
    expect(description(minors)).toBe('Sundmark, Lorran');
    const controlled = cell(N2, 'controlled');
    expect(controlled.getAttribute('title')).toBe('Valdoria North-West, Valdoria North-East, Valdoria South-West, Valdoria South-East');
    expect(description(controlled)).toBe(controlled.getAttribute('title'));
    // The Total names every province voting for the nominee, in state order; an empty cell says "none"
    expect(cell(N1, 'total').getAttribute('title')).toBe(
      'Testland North-West, Testland North-East, Testland South-West, Testland South-East, Sundmark, Lorran'
    );
    expect([cell(N1, 'colonies').getAttribute('title'), description(cell(N1, 'colonies'))]).toEqual(['none', 'none']);
    // Every number cell has both
    const cells = within(table()).getAllByTestId(/^council-cell-/);
    expect(cells).toHaveLength(10);
    for (const c of cells) expect([c.getAttribute('title'), description(c)]).toEqual([c.getAttribute('title'), c.getAttribute('title')]);
  });

  it('FR-298 under the table "Abstained: 2 (Arvelia, Pellis)" and "A winner needs more than two thirds of the 12 votes: 9."', () => {
    open(meeting(twoIslands()));
    expect(text(within(dialog()).getByTestId('council-abstained'))).toBe('Abstained: 2 (Arvelia, Pellis)');
    expect(text(within(dialog()).getByTestId('council-needed'))).toBe('A winner needs more than two thirds of the 12 votes: 9.');
  });

  it('FR-298 the start of a game: 4 and 4, "Abstained: 4 (Arvelia, Sundmark, Lorran, Pellis)", no winner, the next meeting on turn 20', () => {
    open(meeting(continent('world')));
    expect(text(within(table()).getAllByRole('row').at(-1)!)).toBe('4 Total 4');
    expect(text(within(dialog()).getByTestId('council-abstained'))).toBe('Abstained: 4 (Arvelia, Sundmark, Lorran, Pellis)');
    expect(text(within(dialog()).getByTestId('council-result'))).toBe('No winner. The Council meets again on turn 20.');
    expect(within(dialog()).queryByRole('heading', { level: 3 })).toBeNull();
  });

  it('FR-298 on turn 40 (the last meeting of a 40-turn game): "No winner. This was the last Council; the game ends on points."', () => {
    open(meeting(continent('world'), 40, 1824), onTurn(40, 1824));
    expect(text(within(dialog()).getByTestId('council-date'))).toBe('Turn 40, Winter 1824');
    expect(text(within(dialog()).getByTestId('council-result'))).toBe('No winner. This was the last Council; the game ends on points.');
  });

  it('FR-298 with a longer game the turn-40 meeting is not the last: "The Council meets again on turn 50."', () => {
    open(meeting(continent('world'), 40, 1824), { ...onTurn(40, 1824), turnLimit: 60 });
    expect(text(within(dialog()).getByTestId('council-result'))).toBe('No winner. The Council meets again on turn 50.');
  });

  it('FR-298 a winning meeting: the heading "Testland Wins!" (Imp1 wording), Controlled 5, Colonies 1, Other Minor Nations 3, "Abstained: none"', () => {
    const event = meeting(winning());
    expect(event.winnerId).toBe(N1);
    open(event);
    expect(text(within(dialog()).getByRole('heading', { level: 3 }))).toBe('Testland Wins!');
    expect(text(within(dialog()).getByTestId('council-result'))).toBe('Testland Wins!');
    const rows = within(table()).getAllByRole('row').slice(1).map((r) => text(r));
    expect(rows).toEqual(['5 Controlled 3', '1 Colonies 0', '0 Other Great Powers 0', '3 Other Minor Nations 0', '9 Total 3']);
    expect(cell(N1, 'colonies').getAttribute('title')).toBe('Arvelia');
    expect(cell(N1, 'controlled').getAttribute('title')).toContain('Valdoria North-East');
    expect(text(within(dialog()).getByTestId('council-abstained'))).toBe('Abstained: none');
  });

  it('FR-298 the player does not vote: the screen has no control but its close button', () => {
    open(meeting(twoIslands()));
    expect(within(dialog()).getAllByRole('button').map((b) => text(b))).toEqual(['Close']);
    expect(within(dialog()).queryAllByRole('checkbox')).toEqual([]);
    expect(within(dialog()).queryAllByRole('combobox')).toEqual([]);
  });

  it('FR-298 the screen reads only the event: a later change of the game does not change the numbers', () => {
    const event = meeting(twoIslands());
    // The game moved on: Valdoria now holds Testland North-East and the minors are back at 30
    open(event, transferProvince(continent('world'), NE1, N2));
    expect(text(within(table()).getAllByRole('row').at(-1)!)).toBe('6 Total 4');
  });
});

describe('FR-299 the Council screen: when it opens and how it closes', () => {
  it('FR-299 End Turn on a meeting turn opens the Council screen by itself, with that meeting; once only', () => {
    show(onTurn(10, 1817));
    const { rerender } = render(<CouncilModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().game.turn).toBe(11);
    const shown = useGameStore.getState().councilShown;
    expect(shown && [shown.type, shown.turn, shown.year, shown.totalVotes]).toEqual(['council-met', 10, 1817, 12]);
    expect(text(within(dialog()).getByTestId('council-date'))).toBe('Turn 10, Summer 1817');

    fireEvent.click(button('Close'));
    expect(useGameStore.getState().councilShown).toBeNull();
    rerender(<CouncilModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
    // The next End Turn holds no meeting: nothing opens
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().game.turn).toBe(12);
    expect(useGameStore.getState().councilShown).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FR-299 an End Turn without a meeting opens nothing', () => {
    show(onTurn(3, 1815));
    render(<CouncilModal />);
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().councilShown).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FR-299 FR-232 after the Battle screens of that End Turn: the battle first, the Council once it is closed', () => {
    let s = relocate(onTurn(10, 1817), FIELD, NE1);
    s = setPair(s, N1, ARVELIA, { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [], pact: false, alliance: false });
    show(s);
    render(
      <>
        <CouncilModal />
        <BattleModal />
      </>
    );
    const attack: Order = { kind: 'moveArmy', nationId: N1, fromProvinceId: NE1, regimentIds: FIELD, toProvinceId: ARVELIA_P };
    act(() => {
      expect(useGameStore.getState().submitOrder(attack)).toEqual({ ok: true });
    });
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().battleQueue).toHaveLength(1);
    expect(useGameStore.getState().councilShown).not.toBeNull();
    // One dialog at a time: the Battle screen only
    expect(screen.getAllByRole('dialog').map((d) => text(within(d).getByRole('heading', { level: 2 })))).toEqual(['Battle at Arvelia']);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Battle at Arvelia' })).getByRole('button', { name: 'Close' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(dialog()).toBeTruthy();
  });

  it('FR-299 Escape and a click on the backdrop close it', () => {
    const first = open(meeting(continent('world')));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useGameStore.getState().councilShown).toBeNull();
    first.unmount();

    open(meeting(continent('world')));
    const backdrop = screen.getByTestId('dialog-backdrop');
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FR-299 the focus goes back where it was when it closes', () => {
    show(continent('world'));
    render(
      <>
        <button type="button">Advance Turn</button>
        <CouncilModal />
      </>
    );
    const opener = screen.getByRole('button', { name: 'Advance Turn' });
    opener.focus();
    act(() => useGameStore.getState().showCouncil(meeting(continent('world'))));
    expect(dialog().contains(document.activeElement)).toBe(true);
    fireEvent.click(button('Close'));
    expect(document.activeElement).toBe(opener);
  });

  it('FR-299 FR-295 a winning meeting opens before the game-over screen, with "See the final scores" in place of "Close"; the game-over screen shows once it is closed', () => {
    show(onTurn(10, 1817, winning()));
    render(
      <>
        <GameOverModal />
        <CouncilModal />
      </>
    );
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().game.gameOver).toMatchObject({ reason: 'council', winnerId: N1 });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(text(within(dialog()).getByRole('heading', { level: 3 }))).toBe('Testland Wins!');
    expect(within(dialog()).queryByRole('button', { name: 'Close' })).toBeNull();
    fireEvent.click(button('See the final scores'));
    expect(screen.queryByRole('dialog', { name: 'Council of Governors' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Game over' })).toBeTruthy();
  });

  it('FR-299 on a winning meeting Escape and the backdrop do the same as "See the final scores"', () => {
    show(onTurn(10, 1817, winning()));
    act(() => useGameStore.getState().advanceTurn());
    const { game: over, councilShown } = useGameStore.getState();
    expect(councilShown?.winnerId).toBe(N1);
    const titles = () => screen.getAllByRole('dialog').map((d) => text(within(d).getByRole('heading', { level: 2 })));

    show(over, { councilShown });
    const first = render(
      <>
        <GameOverModal />
        <CouncilModal />
      </>
    );
    expect(titles()).toEqual(['Council of Governors']);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(titles()).toEqual(['Game over']);
    first.unmount();

    show(over, { councilShown });
    render(
      <>
        <GameOverModal />
        <CouncilModal />
      </>
    );
    // The game-over screen is not rendered while the Council screen is shown: one backdrop, the Council's
    const backdrop = screen.getByTestId('dialog-backdrop');
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(titles()).toEqual(['Game over']);
  });

  it('FR-299 reopened from the news after "Back to the map", "See the final scores" brings the game-over screen back', () => {
    show(onTurn(10, 1817, winning()));
    act(() => useGameStore.getState().advanceTurn());
    const event = useGameStore.getState().councilShown!;
    render(
      <>
        <GameOverModal />
        <CouncilModal />
      </>
    );
    fireEvent.click(button('See the final scores'));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Game over' })).getByRole('button', { name: 'Back to the map' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useGameStore.getState().showCouncil(event));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(button('See the final scores'));
    expect(screen.getByRole('dialog', { name: 'Game over' })).toBeTruthy();
  });

  it('FR-299 a new game drops the Council screen still to see', () => {
    show(continent('world'), { councilShown: meeting(continent('world')) });
    act(() => useGameStore.getState().startNewGame({ seed: 2 }));
    expect(useGameStore.getState().councilShown).toBeNull();
  });
});
