// @vitest-environment jsdom
// M12b (NR-034), task T2: the top bar (docs/specs/hud.md section 2a). FR-466 its content, left to right: the nation, the
// turn block, the cash with last turn's change, the score with its rank, then the buttons, Advance Turn last and the only
// one on the page (card Q113). FR-467 the fit rules jsdom can read (the boxes are measured in e2e/m13-hud.spec.ts).
// FR-468 the icon buttons, their names as labels hidden from sight below 1800 px. FR-469 the names and test ids kept.
// FR-477 the bar's share of "nothing lost". FR-480 New game's question as a panel under the bar.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TopBar } from '@/components/HUD/TopBar';
import Home from '@/page';
import { useGameStore } from '@/store/rootStore';
import type { TurnReport } from '@/store/gameSlice';
import { HOW_TO_PLAY_SEEN_KEY } from '@/store/persistence';
import { newGame, ordinal, resolveTurn, scoreTable } from '@/engine';
import { money } from '@/components/gameText';
import type { GameState } from '@/types/GameState';
import { emptyWarehouse, N1, N2, setPair, setTreasury } from '../engine/fixtures';
import { continent } from '../engine/armyFixtures';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

// The page test renders Home; the map is not under test here
vi.mock('@/components/MapView', () => ({ MapView: () => null }));

failOnActWarnings();

beforeEach(() => {
  // FR-430: this browser has seen "How to play", so Home does not open it
  window.localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
});

afterEach(() => {
  window.localStorage.clear();
});

const ROOT = join(__dirname, '..', '..');
const GLOBALS = () => readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
const MODULE = () => readFileSync(join(ROOT, 'src/app/components/HUD/TopBar.module.css'), 'utf8');

/** The text of a `@media (<query>) {` block, to its closing brace at the line start. */
function mediaBlock(css: string, query: string): string {
  const at = css.indexOf(`@media (${query}) {`);
  expect(at, query).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('\n}', at));
}
/** The declarations of the first `<selector> {` rule in `css`. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
}

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
}

const report = (turn: number, treasuries?: TurnReport['treasuries']): TurnReport => ({ turn, year: 1815, events: [], treasuries });
const gameOver = (): GameState => resolveTurn({ ...newGame({ seed: 1, world: 'continent' }), turnLimit: 1 }, {}, 1).state;

/** The bar's buttons in page order, each read as its visible text (the name: the label span, FR-468). */
const barButtons = () => within(screen.getByTestId('topbar-actions')).getAllByRole('button').map(text);

const DIALOGS = ['Open Warehouse', 'Open Capital', 'Open Market', 'Deal Book', 'Diplomacy', 'Transportation of Commodities'];
const BUTTONS = [...DIALOGS, 'Center', 'New game', 'About', 'Advance Turn'];

describe('FR-466 the top bar: nation, turn, cash, score, then the buttons, Advance Turn last', () => {
  it('FR-466 left to right: the nation (swatch, name), the turn block, the cash block, the score block; then the buttons in order', () => {
    show(continent());
    render(<TopBar />);
    const blocks = [...screen.getByTestId('topbar-status').children];
    expect(blocks.map((b) => b.getAttribute('data-testid'))).toEqual(['topbar-nation', 'topbar-turn', 'topbar-cash', 'topbar-score']);
    const [nation, turn, cash, score] = blocks;
    // The swatch first, then the name in the kept h2 .hud-title
    expect(nation.firstElementChild?.getAttribute('data-testid')).toBe('swatch');
    const title = within(nation as HTMLElement).getByRole('heading', { level: 2 });
    expect(title.classList.contains('hud-title')).toBe(true);
    expect(text(title)).toBe('Testland');
    // Turn line 1, the next Council line 2; cash, then (from turn 2) its change; the score, then its rank
    expect([...turn.children].map((c) => c.getAttribute('data-testid'))).toEqual(['turn-indicator', 'next-council']);
    expect([...cash.children].map((c) => c.className)).toEqual(['nation-stats']);
    expect([...score.children].map((c) => c.getAttribute('data-testid'))).toEqual(['hud-score', 'score-rank']);
    expect(barButtons()).toEqual(BUTTONS);
    for (const name of BUTTONS) expect(screen.getByRole('button', { name }), name).toBeTruthy();
  });

  it('FR-466 turn 1: "Turn: 1 of 40 Spring 1815", "Next Council: turn 10 (Summer 1817)", "Cash: $10,000" with no change line, the score and its rank', () => {
    const s = continent();
    expect(s.nations.find((n) => n.id === N1)!.treasury).toBe(10000);
    show(s);
    render(<TopBar />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 of 40 Spring 1815');
    expect(text(screen.getByTestId('next-council'))).toBe('Next Council: turn 10 (Summer 1817)');
    expect(text(screen.getByTestId('topbar-cash').querySelector('.nation-stats')!)).toBe('Cash: $10,000');
    expect(screen.queryByTestId('cash-change')).toBeNull();
    const table = scoreTable(s);
    expect(table).toHaveLength(2);
    const at = table.findIndex((row) => row.nationId === N1);
    expect(text(screen.getByTestId('hud-score'))).toBe(`Score: ${table[at].total}`);
    expect(text(screen.getByTestId('score-rank'))).toBe(`${ordinal(at + 1)} of 2`);
  });

  it('FR-466 from turn 2 the cash shows last turn\'s change from the last report: "-$100 last turn", "+$1,250 last turn", "$0 last turn"', () => {
    const s = { ...continent(), turn: 2 };
    show(s, { eventLog: [report(1, { [N1]: { start: 10000, end: 9900 }, [N2]: { start: 10000, end: 12000 } })] });
    render(<TopBar />);
    expect(text(screen.getByTestId('cash-change'))).toBe('-$100 last turn');
    // In the cash block, after the cash line; never inside .nation-stats, whose text the e2e suite reads as the cash
    const cash = screen.getByTestId('topbar-cash');
    expect([...cash.children].map((c) => c.getAttribute('data-testid') ?? c.className)).toEqual(['nation-stats', 'cash-change']);

    act(() => useGameStore.setState({ eventLog: [report(1, { [N1]: { start: 9000, end: 10250 } })] }));
    expect(text(screen.getByTestId('cash-change'))).toBe('+$1,250 last turn');

    act(() => useGameStore.setState({ eventLog: [report(1, { [N1]: { start: 9000, end: 9000 } })] }));
    expect(text(screen.getByTestId('cash-change'))).toBe('$0 last turn');

    // A report made by hand carries no treasuries (TurnReport): no line
    act(() => useGameStore.setState({ eventLog: [report(1)] }));
    expect(screen.queryByTestId('cash-change')).toBeNull();
  });

  it("FR-466 after a real End Turn the change is the report's end minus its start, and the cash line is that end", () => {
    show(continent());
    render(<TopBar />);
    act(() => useGameStore.getState().advanceTurn());
    const { treasuries } = useGameStore.getState().eventLog.at(-1)!;
    const { start, end } = treasuries![N1];
    const change = end - start;
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 2 of 40 Summer 1815');
    expect(text(screen.getByTestId('cash-change'))).toBe(`${change > 0 ? '+' : ''}${money(change)} last turn`);
    expect(text(screen.getByTestId('topbar-cash').querySelector('.nation-stats')!)).toBe(`Cash: ${money(end)}`);
  });

  it('FR-466 the rank follows the score: Testland the richer "1st of 2"; Valdoria made the richer, "2nd of 2"', () => {
    const ahead = setTreasury(setTreasury(continent(), N1, 100000), N2, 0);
    expect(scoreTable(ahead)[0].nationId).toBe(N1);
    show(ahead);
    render(<TopBar />);
    expect(text(screen.getByTestId('score-rank'))).toBe('1st of 2');

    const behind = setTreasury(setTreasury(continent(), N1, 0), N2, 100000);
    expect(scoreTable(behind)[1].nationId).toBe(N1);
    act(() => show(behind));
    expect(text(screen.getByTestId('score-rank'))).toBe('2nd of 2');
  });

  it('FR-466 FR-075 at game over: the game-over turn text, no Council line, Final scores right before Advance Turn, which is disabled', () => {
    // The game-over screen closed (Back to the map), so Final scores has something to bring back
    show(gameOver(), { isGameOverHidden: true });
    render(<TopBar />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Game over after turn 1 of 1 Spring 1815');
    expect(screen.queryByTestId('next-council')).toBeNull();
    expect(barButtons()).toEqual([...DIALOGS, 'Center', 'New game', 'About', 'Final scores', 'Advance Turn']);
    expect((screen.getByRole('button', { name: 'Advance Turn' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Final scores' }));
    expect(useGameStore.getState().isGameOverHidden).toBe(false);
  });

  it("FR-466 FR-086 Advance Turn is the bar's one primary button and its last element", () => {
    show(continent());
    render(<TopBar />);
    const bar = screen.getByTestId('topbar');
    const advance = screen.getByRole('button', { name: 'Advance Turn' });
    expect([...bar.querySelectorAll('.btn-primary')]).toEqual([advance]);
    const all = [...bar.querySelectorAll('button')];
    expect(all.at(-1)).toBe(advance);
  });

  // Card Q113 (Nathan): one static Advance Turn. Red until task T3 takes the pane's copy out of HUD.tsx (.gate/hud/T2-notes.md)
  it('FR-466 the page (Home) holds exactly one button named Advance Turn, in the top bar (card Q113)', () => {
    show(continent());
    render(<Home />);
    const advance = screen.getAllByRole('button', { name: /Advance Turn/ });
    expect(advance).toHaveLength(1);
    expect(screen.getByTestId('topbar').contains(advance[0])).toBe(true);
  });
});

describe('FR-467 the fit rules jsdom can read (the boxes: e2e/m13-hud.spec.ts)', () => {
  it('FR-467 Advance Turn stands outside the strip that scrolls sideways below 1024 px; the strip holds every other button', () => {
    show(gameOver());
    render(<TopBar />);
    const strip = screen.getByTestId('topbar-strip');
    const advance = screen.getByRole('button', { name: 'Advance Turn' });
    expect(strip.contains(advance)).toBe(false);
    expect(within(strip).getAllByRole('button').map(text)).toEqual([...DIALOGS, 'Center', 'New game', 'About', 'Final scores']);
    // Strip and Advance Turn are siblings, Advance Turn last
    expect(advance.parentElement).toBe(strip.parentElement);
    expect(advance.parentElement!.lastElementChild).toBe(advance);
  });

  it('FR-467 CSS: two rows of exactly 40 px below 1024 px (no border inside the 80 px), the strip scrolls sideways there and never wraps', () => {
    const bar = rule(MODULE(), '.bar');
    // The bottom line is a shadow, so the two 40 px rows fill the 80 px border-box (T1 notes, finding 4)
    expect(bar).not.toMatch(/border-bottom/);
    expect(bar).toMatch(/box-shadow: inset 0 -1px 0 var\(--color-border\)/);
    expect(mediaBlock(MODULE(), 'max-width: 1023.98px')).toMatch(/\.status,\s*\.actions \{[^}]*height: 40px;/);
    const css = GLOBALS();
    expect(rule(css, '.topbar-strip')).toMatch(/flex-wrap: nowrap;/);
    expect(rule(css, '.topbar-buttons')).toMatch(/flex-wrap: nowrap;/);
    const narrow = mediaBlock(css, 'max-width: 1023.98px');
    expect(narrow).toMatch(/\.topbar-strip \{[^}]*overflow-x: auto;/);
    // Advance Turn never shrinks or scrolls away
    expect(rule(css, '.btn.topbar-advance')).toMatch(/flex: none;/);
  });

  it('FR-467 below 700 px the nation name and the "Turn:", "Cash:", "Score:" prefixes are hidden from sight only: the text stays', () => {
    show(continent());
    render(<TopBar />);
    const hidden = [...screen.getByTestId('topbar').querySelectorAll('.topbar-wide-only')];
    expect(hidden.map((el) => text(el))).toEqual(['Testland', 'Turn:', 'Cash:', 'Score:']);
    expect(hidden[0]).toBe(screen.getByTestId('topbar-nation'));
    // The texts the e2e suite reads stay whole in the DOM
    expect(screen.getByTestId('turn-indicator').textContent).toContain('Turn: 1 of 40');
    expect(screen.getByTestId('hud-score').textContent).toMatch(/^Score: \d+$/);
    expect(screen.getByTestId('topbar-cash').querySelector('.nation-stats')!.textContent).toBe('Cash: $10,000');
    expect(mediaBlock(GLOBALS(), 'max-width: 699.98px')).toMatch(/\.topbar-wide-only \{[^}]*clip-path: inset\(50%\);/);
  });
});

describe('FR-468 the icon buttons', () => {
  /** Name, then the mouse tooltip: the name, except where e2e and older tests read a longer title (kept). */
  const ICON_BUTTONS: [string, string][] = [
    ...DIALOGS.map((name): [string, string] => [name, name]),
    ['Center', 'Center Camera'],
    ['New game', 'Start a new game'],
    ['About', 'About and credits'],
  ];

  it('FR-468 FR-349 FR-354 each icon button: the icon first, then its name as a .topbar-label span, nothing between; a title', () => {
    show(continent());
    render(<TopBar />);
    for (const [name, title] of ICON_BUTTONS) {
      const button = screen.getByRole('button', { name });
      expect(button.classList.contains('topbar-button'), name).toBe(true);
      expect([...button.childNodes].map((n) => (n.nodeType === 3 ? `text:${n.textContent}` : (n as Element).tagName.toLowerCase())), name).toEqual([
        name === 'Open Warehouse' || name === 'Open Capital' || name === 'Transportation of Commodities' ? 'img' : 'svg',
        'span',
      ]);
      const label = button.lastElementChild!;
      expect(label.className, name).toBe('topbar-label');
      expect(label.textContent, name).toBe(name);
      expect(button.getAttribute('title'), name).toBe(title);
    }
    // The six dialog buttons stay the .btn-plain children of .action-buttons-container (e2e FR-349, the 20 px box rule)
    const container = screen.getByTestId('topbar').querySelector('.action-buttons-container')!;
    expect([...container.querySelectorAll(':scope > .btn-plain')].map(text)).toEqual(DIALOGS);
  });

  it('FR-468 at game over Final scores is an icon button too, its Game Icon then its label', () => {
    show(gameOver());
    render(<TopBar />);
    const scores = screen.getByRole('button', { name: 'Final scores' });
    expect(scores.classList.contains('topbar-button')).toBe(true);
    expect(scores.firstElementChild?.getAttribute('data-icon')).toBe('GiCheckeredFlag');
    expect(scores.lastElementChild?.className).toBe('topbar-label');
    expect(scores.getAttribute('title')).toBe('Final scores');
  });

  // The breakpoint is 1800 px, not the spec's 1600 px (FR-468 as written): measured in the running app on turn 2, the row
  // with labels needs 1746 px, and at 1600 px the score block ran 6 px into the buttons (.gate/hud/T2-notes.md)
  it('FR-468 CSS: below 1800 px the label is hidden from sight only (clip-path) and the button is 32 x 32; from 1800 px the label shows beside the icon', () => {
    const css = GLOBALS();
    const below = mediaBlock(css, 'max-width: 1799.98px');
    const hide = /\.topbar-label \{([^}]*)\}/.exec(below)?.[1] ?? '';
    for (const d of ['position: absolute;', 'width: 1px;', 'height: 1px;', 'overflow: hidden;', 'clip-path: inset(50%);', 'white-space: nowrap;'])
      expect(hide, d).toContain(d);
    // The only rule that hides the label is that one: from 1800 px it is an ordinary inline span
    expect(css.match(/\.topbar-label \{/g)).toHaveLength(1);
    // 32 x 32 below 1800 px; from 1800 px as wide as icon and label
    const button = rule(css, '.btn.topbar-button');
    expect(button).toMatch(/width: 32px;/);
    expect(button).toMatch(/height: 32px;/);
    expect(mediaBlock(css, 'min-width: 1800px')).toMatch(/\.btn\.topbar-button \{[^}]*width: auto;/);
    // The icon keeps FR-349's 20 px box (tests/ui/inkPicture.test.tsx pins it); alone, below 1800 px, it has no gap after it
    expect(below).toMatch(/\.topbar-strip \.btn\.topbar-button > :is\(svg\[data-icon\], img\[data-art-inline\]\) \{[^}]*margin: 0;/);
    expect(rule(css, '.btn.topbar-button > :is(svg[data-icon], img[data-art-inline])')).toMatch(/width: 20px;[\s\S]*height: 20px;/);
  });
});

describe('FR-469 the names and test ids kept (the bar\'s share)', () => {
  it('FR-469 the bar holds the kept ids and classes, and no button name but the kept ones', () => {
    show(continent());
    render(<TopBar />);
    const bar = screen.getByTestId('topbar');
    for (const selector of ['.hud-title', '[data-testid="turn-indicator"].turn-indicator', '.turn-date', '[data-testid="next-council"]', '.nation-stats', '[data-testid="hud-score"]', '.action-buttons-container'])
      expect(bar.querySelectorAll(selector), selector).toHaveLength(1);
    // Score parts on focus (FR-404 unchanged)
    act(() => screen.getByTestId('hud-score').focus());
    expect(within(bar).getByTestId('score-parts')).toBeTruthy();
    // Every control of the bar has one of the kept names: no new name holds About, Center, Open, Advance Turn, Deal Book or Diplomacy
    expect(within(bar).getAllByRole('button').map(text)).toEqual(BUTTONS);
  });
});

describe("FR-477 nothing lost: the bar's share", () => {
  it('FR-477 the six dialog buttons open their dialogs, Center stays, and the score parts, New game and About work from the bar', () => {
    show(continent());
    render(<TopBar />);
    const flags: [string, keyof ReturnType<typeof useGameStore.getState>][] = [
      ['Open Warehouse', 'isWarehouseOpen'],
      ['Open Capital', 'isCapitalOpen'],
      ['Open Market', 'isMarketOpen'],
      ['Deal Book', 'isDealBookOpen'],
      ['Diplomacy', 'isDiplomacyOpen'],
      ['Transportation of Commodities', 'isTransportAllocationOpen'],
    ];
    for (const [name, flag] of flags) {
      expect(useGameStore.getState()[flag], name).toBe(false);
      fireEvent.click(screen.getByRole('button', { name }));
      expect(useGameStore.getState()[flag], name).toBe(true);
    }
    expect(screen.getByTitle('Center Camera')).toBe(screen.getByRole('button', { name: 'Center' }));
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByRole('dialog', { name: 'About' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close about' }));
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('group', { name: 'Confirm new game' })).toBeTruthy();
  });
});

describe('FR-480 New game in the bar', () => {
  it('FR-480 FR-109 FR-111 New game opens the question as a panel outside the bar, the focus on it; Keep playing closes it, the focus back on New game', () => {
    show(continent());
    render(<TopBar />);
    const toggle = screen.getByRole('button', { name: 'New game' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.hasAttribute('aria-controls')).toBe(false);

    fireEvent.click(toggle);
    const panel = screen.getByRole('group', { name: 'Confirm new game' });
    expect(panel.id).toBe('confirm-new-game');
    expect(text(panel)).toBe('Start a new game? This game will be lost. Start new game Keep playing');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('confirm-new-game');
    expect(document.activeElement).toBe(panel);
    // Rendered into the body, so it lies above the pane (the bar's own stacking context would put it under the pane)
    expect(screen.getByTestId('topbar').contains(panel)).toBe(false);
    expect(panel.parentElement).toBe(document.body);
    // A pointer over it never scrolls the map (FR-366), as over the bar
    expect(panel.hasAttribute('data-edge-scroll')).toBe(true);

    fireEvent.click(within(panel).getByRole('button', { name: 'Keep playing' }));
    expect(screen.queryByRole('group', { name: 'Confirm new game' })).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('FR-480 FR-109 Start new game goes back to turn 1 and closes the question', () => {
    show(continent());
    render(<TopBar />);
    act(() => useGameStore.getState().advanceTurn());
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 2 of 40 Summer 1815');
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Confirm new game' })).getByRole('button', { name: 'Start new game' }));
    expect(useGameStore.getState().game.turn).toBe(1);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 of 40 Spring 1815');
    expect(screen.queryByRole('group', { name: 'Confirm new game' })).toBeNull();
  });

  it('FR-480 CSS: the panel is fixed under the bar at its right, above the pane and the FR-429 line (z 20), below the dialogs (the lowest, Capital, is 60)', () => {
    const panel = rule(GLOBALS(), '.confirm-panel');
    expect(panel).toMatch(/position: fixed;/);
    expect(panel).toMatch(/top: calc\(var\(--topbar-height\) \+ 4px\);/);
    expect(panel).toMatch(/right: 8px;/);
    const z = Number(/z-index: (\d+);/.exec(panel)?.[1]);
    expect(z).toBeGreaterThan(20);
    expect(z).toBeLessThan(60);
  });
});

// M12b T4 (the gate): FR-477's verify asks for one test of the whole page; T2 and T3 each tested their share (the bar's
// above, the pane's in tests/ui/hudGroups.test.tsx), so this one renders Home with both and finds every M12 HUD part once.
// Final scores exists only at game over: "FR-466 FR-075 at game over" above finds it right before Advance Turn.
describe('FR-477 nothing lost: the whole page', () => {
  it('FR-477 Home with all groups open, a war, idle civilians, short food and cash, a failed save, a selected tile, a refusal and a turn of news: every M12 HUD line and control is there once, none hidden', () => {
    show(continent());
    act(() => useGameStore.getState().advanceTurn());
    let g = setTreasury(useGameStore.getState().game, N1, 0);
    g = setPair(g, N1, N2, { war: { aggressors: [N2], since: 2 } });
    g = emptyWarehouse(g, N1);
    const capital = g.map.tiles.flat().find((t) => t.cityId === g.nations[0].cities[0])!;
    useGameStore.setState({ game: g, selectedTileId: capital.id });
    act(() => void useGameStore.getState().submitOrder({ kind: 'moveWorker', nationId: N1, workerId: capital.workers[0].id, toTileId: '0-0' }));
    expect(useGameStore.getState().lastRejection).not.toBeNull();
    // The page's autosave writes at once; a browser that refuses every write makes it say Not saved (FR-363)
    const refuse = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    render(<Home />);
    refuse.mockRestore();
    expect(useGameStore.getState().saveFailed).toBe(true);
    for (const name of ['Nation', /^Work in progress \(\d+\)$/, 'Details for bug reports']) {
      const button = screen.getByRole('button', { name });
      fireEvent.click(button);
      expect(button.getAttribute('aria-expanded')).toBe('true');
    }

    const ids = [
      // the top bar
      'topbar', 'turn-indicator', 'next-council', 'hud-score', 'score-rank', 'cash-change',
      // the pane: Tile Info, the alerts, the news
      'tile-info', 'tile-terrain', 'tile-owner', 'tile-province',
      'not-saved', 'food-warning', 'upkeep-warning', 'at-war', 'idle-civilians',
      'news-panel', 'order-refusal', 'news-list',
      // the groups
      'council-projection', 'nation-score-parts', 'score-table', `score-row-${N1}`, `score-row-${N2}`, 'upkeep-forecast', 'treasury-last-turn',
    ];
    for (const id of ids) {
      expect(screen.getAllByTestId(id), id).toHaveLength(1);
      expect(screen.getByTestId(id).closest('[hidden]'), `${id} hidden`).toBeNull();
    }
    for (const selector of ['.hud-title', '.turn-date', '.nation-stats', '.hud-debug-section', '.action-buttons-container']) {
      expect(document.querySelectorAll(selector), selector).toHaveLength(1);
    }
    expect(text(document.querySelector('.hud-title') as HTMLElement)).toBe('Testland');
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 2 of 40 Summer 1815');
    expect(text(document.querySelector('.nation-stats') as HTMLElement)).toBe('Cash: $0');
    expect(screen.getByRole('heading', { name: /^News from last turn \(turn 1, Spring 1815\)$/ })).toBeTruthy();
    const details = text(document.querySelector('.hud-debug-section') as HTMLElement);
    expect(details).toContain(`Tile: ${capital.x},${capital.y} (id ${capital.id})`);
    expect(details).toContain(`Seed: ${g.seed}`);
    // Every control, once: the six dialog buttons, Center, New game, About, Advance Turn and Tile Info's Close
    for (const name of [...BUTTONS, 'Close tile info']) expect(screen.getAllByRole('button', { name }), name).toHaveLength(1);
    // The score's parts on focus (FR-404) and New game's question (FR-109)
    act(() => screen.getByTestId('hud-score').focus());
    expect(screen.getAllByTestId('score-parts')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getAllByRole('group', { name: 'Confirm new game' })).toHaveLength(1);
  });
});
