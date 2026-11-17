// @vitest-environment jsdom
// M12b (NR-034) task T3: the right pane's groups. FR-473: "Nation", "Work in progress" and "Details for bug reports", each
// a level-3 heading holding a native button (aria-expanded, aria-controls) and a region named by it, hidden while closed;
// all closed on page load; the open state lives in the HUD's component memory (End Turn and New game keep it, a remount
// closes them, nothing is saved). FR-474: the Nation group's lines. FR-475: the Work in progress rows and their click.
// FR-476: Details for bug reports, shown without ?debug (Nathan, card Q102), and its Copy details button.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { HUD } from '@/components/HUD';
import { detailLines } from '@/components/HUD/hudView';
import { COUNCIL_PROJECTION_ID } from '@/components/HUD/TurnIndicator';
import { cameraOnTileId } from '@/components/camera';
import { useGameStore } from '@/store/rootStore';
import { SAVE_VERSION } from '@/store/persistence';
import { scoreOf, upkeepForecast } from '@/engine';
import { DEVELOPMENT_COST } from '@/definisions/workPrices';
import type { GameState } from '@/types/GameState';
import { WorkerType } from '@/types/Workers';
import { emptyWarehouse, game, N1, N2, put, setPair, setTreasury, T, workerId } from '../engine/fixtures';
import { continent } from '../engine/armyFixtures';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
}

const FARMER = workerId(N1, WorkerType.Farmer);
const groups = () => screen.getByTestId('hud-groups');
/** The group's heading button, by the start of its name ("Work in progress (2)" by "Work in progress"). */
const groupButton = (name: string) => within(groups()).getByRole('button', { name: new RegExp(`^${name.replace(/[()]/g, '\\$&')}`) });
const panelOf = (button: HTMLElement) => document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement;
const openGroup = (name: string) => {
  const button = groupButton(name);
  if (button.getAttribute('aria-expanded') !== 'true') fireEvent.click(button);
  return panelOf(button);
};
const GROUP_NAMES = ['Nation', 'Work in progress', 'Details for bug reports'];

describe('FR-473 the right pane groups', () => {
  it('FR-473 three level-3 headings, each a native button with aria-expanded and aria-controls; the panel a region named by it, hidden; all closed', () => {
    show(continent());
    render(<HUD />);
    const headings = within(groups()).getAllByRole('heading', { level: 3 });
    expect(headings.map(text)).toEqual(['Nation', 'Work in progress (0)', 'Details for bug reports']);
    for (const heading of headings) {
      const button = within(heading).getByRole('button');
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      const panel = panelOf(button);
      expect(panel, text(heading)).not.toBeNull();
      expect(panel.getAttribute('role')).toBe('region');
      expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
      expect(panel.hidden).toBe(true);
    }
    // Hidden content is out of the accessible tree (and out of the page-wide e2e selectors), not out of the DOM
    expect(screen.queryByRole('table', { name: 'Scores' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy details' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Nation' })).toBeNull();
    expect(screen.getByTestId('score-table').closest('[hidden]')).not.toBeNull();
  });

  it('FR-473 a click opens one group (its region named by the button) and a second click closes it; the focus stays on the button', () => {
    show(continent());
    render(<HUD />);
    const nation = groupButton('Nation');
    nation.focus();
    fireEvent.click(nation);
    expect(nation.getAttribute('aria-expanded')).toBe('true');
    expect(panelOf(nation).hidden).toBe(false);
    expect(screen.getByRole('region', { name: 'Nation' })).toBe(panelOf(nation));
    expect(within(panelOf(nation)).getByRole('table', { name: 'Scores' })).toBeTruthy();
    expect(document.activeElement).toBe(nation);
    // The other groups stay closed
    expect(groupButton('Work in progress').getAttribute('aria-expanded')).toBe('false');
    expect(groupButton('Details for bug reports').getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(nation);
    expect(nation.getAttribute('aria-expanded')).toBe('false');
    expect(panelOf(nation).hidden).toBe(true);
    expect(document.activeElement).toBe(nation);
  });

  // M12b review ST-3: this test read `hasAttribute('onkeydown')`, which React never renders, so it could not fail. Now the
  // keys themselves: jsdom does not turn a key press into a click, so a key press that toggles here comes from a key
  // handler of the group's own, which in a browser would toggle twice (the handler, then the native click): Enter would
  // open and at once close the group. The browser's own Enter and Space: e2e/m13-hud.spec.ts FR-473.
  it('FR-473 Enter and Space: each heading button is a native <button>, no tabindex, and no key handler of its own (a key press alone toggles nothing), so the browser activates it once', () => {
    show(continent());
    render(<HUD />);
    for (const name of GROUP_NAMES) {
      const button = groupButton(name);
      expect(button.tagName, name).toBe('BUTTON');
      expect(button.hasAttribute('tabindex'), name).toBe(false);
      expect((button as HTMLButtonElement).disabled, name).toBe(false);
      button.focus();
      for (const key of ['Enter', ' ']) {
        fireEvent.keyDown(button, { key, code: key === ' ' ? 'Space' : key });
        fireEvent.keyPress(button, { key, code: key === ' ' ? 'Space' : key, charCode: key === ' ' ? 32 : 13 });
        fireEvent.keyUp(button, { key, code: key === ' ' ? 'Space' : key });
        expect(button.getAttribute('aria-expanded'), `${name} after ${key === ' ' ? 'Space' : key}`).toBe('false');
      }
      // A click still toggles it (the browser's Enter and Space end in one)
      fireEvent.click(button);
      expect(button.getAttribute('aria-expanded'), name).toBe('true');
    }
  });

  it('FR-473 the open groups stay open across End Turn and New game; a remount (a reload) closes them all', () => {
    show(continent());
    const first = render(<HUD />);
    fireEvent.click(groupButton('Nation'));
    fireEvent.click(groupButton('Details for bug reports'));
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().game.turn).toBe(2);
    expect(groupButton('Nation').getAttribute('aria-expanded')).toBe('true');
    expect(groupButton('Details for bug reports').getAttribute('aria-expanded')).toBe('true');
    expect(groupButton('Work in progress').getAttribute('aria-expanded')).toBe('false');

    act(() => useGameStore.getState().startNewGame({ seed: 7 }));
    expect(useGameStore.getState().game.turn).toBe(1);
    expect(groupButton('Nation').getAttribute('aria-expanded')).toBe('true');
    expect(groupButton('Details for bug reports').getAttribute('aria-expanded')).toBe('true');

    first.unmount();
    render(<HUD />);
    for (const name of GROUP_NAMES) expect(groupButton(name).getAttribute('aria-expanded'), name).toBe('false');
  });

  it('FR-473 FR-469 with every group open, no control in the groups has a name the page-wide e2e selectors look for', () => {
    show(put(game(), FARMER, T.farm1));
    render(<HUD />);
    act(() => void useGameStore.getState().submitOrder({ kind: 'startDevelopment', nationId: N1, workerId: FARMER, tileId: T.farm1 }));
    for (const name of GROUP_NAMES) openGroup(name);
    const names = within(groups()).getAllByRole('button').map((b) => text(b));
    // The three headings, the job's row and Copy details
    expect(names).toHaveLength(5);
    expect(names.filter((n) => /About|Center|Open|Advance Turn|Deal Book|Diplomacy/i.test(n))).toEqual([]);
  });
});

describe('FR-474 the Nation group', () => {
  const PROJECTION = 'If it met now: Testland 4, Valdoria 4, abstain 4 of 12; 9 needed';

  it('FR-474 the Council projection (the next-council line describes it by id), the score parts, the score table and the army upkeep', () => {
    const state = continent();
    show(state);
    render(<HUD />);
    const panel = openGroup('Nation');
    // The projection lives in the group (the bar's next-council line names it by id: tests/ui/warehouseAndHud.test.tsx FR-301)
    const projection = within(panel).getByTestId('council-projection');
    expect(text(projection)).toBe(PROJECTION);
    expect(projection.id).toBe(COUNCIL_PROJECTION_ID);
    expect(screen.getAllByTestId('council-projection')).toHaveLength(1);

    const { treasury, industry, development, workInProgress } = scoreOf(state, N1).points;
    expect(within(within(panel).getByTestId('nation-score-parts')).getAllByRole('listitem').map(text)).toEqual([
      `Treasury ${treasury}`,
      `Industry ${industry}`,
      `Development ${development}`,
      `Work in progress ${workInProgress}`,
    ]);
    expect(within(panel).getByTestId('score-table')).toBeTruthy();

    const forecast = upkeepForecast(state, N1);
    expect(forecast.due).toBe(100);
    expect(text(within(panel).getByTestId('upkeep-forecast'))).toBe(
      `Army upkeep at End Turn: $100; the treasury will then hold $${(forecast.cash - 100).toLocaleString('en-US')}`
    );
    // Nothing spent yet, no turn resolved yet
    expect(within(panel).queryByTestId('spent-this-turn')).toBeNull();
    expect(within(panel).queryByTestId('treasury-last-turn')).toBeNull();
  });

  it('FR-474 "No army upkeep." without an army; no projection on a world without provinces', () => {
    show(game());
    render(<HUD />);
    const panel = openGroup('Nation');
    expect(text(within(panel).getByTestId('upkeep-forecast'))).toBe('No army upkeep.');
    expect(screen.queryByTestId('council-projection')).toBeNull();
  });

  it('FR-474 "Spent this turn: $X" after a paid order; "Last turn: $A to $B" from the last report after End Turn', () => {
    const state = put(game(), FARMER, T.farm1);
    show(state);
    render(<HUD />);
    const panel = openGroup('Nation');
    const start = state.nations.find((n) => n.id === N1)!.treasury;
    act(() => void useGameStore.getState().submitOrder({ kind: 'startDevelopment', nationId: N1, workerId: FARMER, tileId: T.farm1 }));
    expect(useGameStore.getState().lastRejection).toBeNull();
    expect(text(within(panel).getByTestId('spent-this-turn'))).toBe(`Spent this turn: $${DEVELOPMENT_COST[1].toLocaleString('en-US')}`);

    act(() => useGameStore.getState().advanceTurn());
    const report = useGameStore.getState().eventLog.at(-1)!.treasuries![N1];
    expect(report.start).toBe(start);
    expect(text(within(panel).getByTestId('treasury-last-turn'))).toBe(
      `Last turn: $${report.start.toLocaleString('en-US')} to $${report.end.toLocaleString('en-US')}`
    );
    // A new turn: nothing spent in it yet
    expect(within(panel).queryByTestId('spent-this-turn')).toBeNull();
  });
});

describe('FR-475 the Work in progress group', () => {
  it('FR-475 "Work in progress (0)" and "Nothing in progress." in a new game', () => {
    show(game());
    render(<HUD />);
    const panel = openGroup('Work in progress');
    expect(text(groupButton('Work in progress'))).toBe('Work in progress (0)');
    expect(text(panel)).toBe('Nothing in progress.');
  });

  it('FR-475 a job is a row, counted in the heading; its click selects the tile (no civilian) and scrolls it into view as a news place line does', () => {
    show(put(game(), FARMER, T.farm1), { selectedWorkerId: FARMER });
    render(<HUD />);
    act(() => void useGameStore.getState().submitOrder({ kind: 'startDevelopment', nationId: N1, workerId: FARMER, tileId: T.farm1 }));
    act(() => void useGameStore.getState().submitOrder({ kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 }));
    const trained = useGameStore.getState().lastRejection === null;
    const panel = openGroup('Work in progress');
    expect(text(groupButton('Work in progress'))).toBe(`Work in progress (${trained ? 2 : 1})`);
    const row = within(panel).getByRole('button', { name: 'Farmer: grain to level 1 at 2-1, 3 turns left' });
    // Worker training has no tile: a line, not a button
    if (trained) {
      expect(within(panel).getByText('Training: 1 untrained worker to trained, done at End Turn').tagName).not.toBe('BUTTON');
    }
    const moves = useGameStore.getState().cameraMoves;
    fireEvent.click(row);
    const after = useGameStore.getState();
    expect(after.selectedTileId).toBe(T.farm1);
    expect(after.selectedWorkerId).toBeUndefined();
    expect(after.cameraMoves).toBe(moves + 1);
    const camera = cameraOnTileId(after.game, T.farm1);
    expect({ x: after.cameraX, y: after.cameraY }).toEqual({ x: camera!.x, y: camera!.y });
  });

  // M12b review A11Y-3: Tile Info scrolls the pane to its top when it opens (FR-463), so a row at the pane's bottom used
  // with the keyboard kept the focus out of sight, and nothing told a screen reader what opened. The focus now moves to
  // Tile Info's heading, the tile's panel at the pane's top.
  it('FR-475 a row used from the keyboard moves the focus to Tile Info\'s heading, where the pane scrolls to', () => {
    show(put(game(), FARMER, T.farm1));
    render(<HUD />);
    act(() => void useGameStore.getState().submitOrder({ kind: 'startDevelopment', nationId: N1, workerId: FARMER, tileId: T.farm1 }));
    const panel = openGroup('Work in progress');
    const row = within(panel).getByRole('button', { name: /^Farmer: grain to level 1 at 2-1/ });
    row.focus();
    fireEvent.click(row);
    const heading = within(screen.getByTestId('tile-info')).getByRole('heading', { level: 3 });
    expect(text(heading)).toBe('Tile Info ×');
    expect(document.activeElement).toBe(heading);
    // Focusable by script only: not a stop of its own in the Tab order
    expect(heading.getAttribute('tabindex')).toBe('-1');
  });
});

describe("FR-477 nothing lost: the pane's share", () => {
  it('FR-477 with all groups open, a war, idle civilians, short food and cash, a failed save, a selected tile, a refusal and a turn of news, every M12 pane line is there', () => {
    show(continent());
    act(() => useGameStore.getState().advanceTurn());
    const s = useGameStore.getState();
    let g = setTreasury(s.game, N1, 0);
    g = setPair(g, N1, N2, { war: { aggressors: [N2], since: 2 } });
    g = emptyWarehouse(g, N1);
    const capital = g.map.tiles.flat().find((t) => t.cityId === g.nations[0].cities[0])!;
    useGameStore.setState({ game: g, saveFailed: true, selectedTileId: capital.id });
    act(() => void useGameStore.getState().submitOrder({ kind: 'moveWorker', nationId: N1, workerId: capital.workers[0].id, toTileId: '0-0' }));
    expect(useGameStore.getState().lastRejection).not.toBeNull();
    render(<HUD />);
    for (const name of GROUP_NAMES) openGroup(name);

    const ids = [
      'tile-info', 'tile-terrain', 'tile-owner', 'tile-province',
      'not-saved', 'food-warning', 'upkeep-warning', 'at-war', 'idle-civilians',
      'news-panel', 'order-refusal', 'news-list',
      'council-projection', 'nation-score-parts', 'score-table', `score-row-${N1}`, `score-row-${N2}`, 'upkeep-forecast', 'treasury-last-turn',
    ];
    for (const id of ids) expect(screen.getAllByTestId(id), id).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Close tile info' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^News from last turn \(turn 1, Spring 1815\)$/ })).toBeTruthy();
    // The M12 Debug box's tile coordinates and seed, in the bug-report group
    const details = document.querySelector('.hud-debug-section') as HTMLElement;
    expect(text(details)).toContain(`Tile: ${capital.x},${capital.y} (id ${capital.id})`);
    expect(text(details)).toContain(`Seed: ${g.seed}`);
    // Every line in sight: none of these is inside a closed (hidden) panel
    for (const id of ids) expect(screen.getByTestId(id).closest('[hidden]'), id).toBeNull();
  });
});

describe('FR-476 Details for bug reports', () => {
  it('FR-476 shown without ?debug: the tile, seed, turn, nation, civilian, orders, refusal, zoom, camera, map and save version', () => {
    expect(window.location.search).toBe('');
    const state = continent();
    const capital = state.map.tiles.flat().find((t) => t.cityId === state.nations[0].cities[0])!;
    const farmer = capital.workers.find((w) => w.type === WorkerType.Farmer)!;
    show(state);
    render(<HUD />);
    const panel = openGroup('Details for bug reports');
    expect(panel.classList.contains('hud-debug-section')).toBe(true);
    const lines = () => [...panel.querySelectorAll('[data-testid="hud-debug-line"]')].map((el) => text(el));
    expect(lines()).toEqual([
      'Tile: none',
      'Seed: 1',
      'Turn: 1 (Spring 1815)',
      'Nation: nation-1',
      'Selected civilian: none',
      'Orders this turn: 0',
      'Last refusal: none',
      'Zoom: 100%',
      'Camera: 0, 0',
      'Map: 24 x 16',
      `Save version: ${SAVE_VERSION}`,
    ]);

    act(() => {
      useGameStore.getState().selectTile(capital.id);
      useGameStore.getState().selectWorker(farmer.id);
      useGameStore.getState().moveCamera(40, 84);
      // Refused: the farmer cannot walk into the sea
      useGameStore.getState().submitOrder({ kind: 'moveWorker', nationId: N1, workerId: farmer.id, toTileId: '0-0' });
    });
    const reason = useGameStore.getState().lastRejection?.reason;
    expect(reason).toMatch(/^[a-z-]+$/);
    expect(lines()).toEqual([
      `Tile: ${capital.x},${capital.y} (id ${capital.id})`,
      'Seed: 1',
      'Turn: 1 (Spring 1815)',
      'Nation: nation-1',
      `Selected civilian: ${farmer.id} (farmer)`,
      'Orders this turn: 0',
      `Last refusal: ${reason}`,
      'Zoom: 100%',
      'Camera: 40, 84',
      'Map: 24 x 16',
      `Save version: ${SAVE_VERSION}`,
    ]);
  });

  // Found in the running app (T3): the server and the browser each draw a new game's seed at random (FR-019), so a seed in
  // the server's HTML failed React's hydration ("Seed: 2910300" against "Seed: 2101030857"). The lines exist only while
  // the group is open, and every group is closed in the server render.
  it('FR-476 the server render (all groups closed) holds no detail line, so the random seed cannot differ at hydration', () => {
    show(continent());
    const html = renderToString(<HUD />);
    expect(html).toContain('Details for bug reports');
    expect(html).not.toContain('Seed:');
    expect(html).not.toContain('hud-debug-line');
  });

  it('FR-476 Copy details copies the lines as text and says "Copied" for 2 s', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(copied: string) => Promise<void>>(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const state = continent();
    show(state);
    render(<HUD />);
    const panel = openGroup('Details for bug reports');
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Copy details' }));
    });
    const s = useGameStore.getState();
    const expected = detailLines({
      game: s.game,
      nationId: N1,
      ordersThisTurn: 0,
      zoom: 1,
      camera: { x: 0, y: 0 },
      saveVersion: SAVE_VERSION,
    });
    expect(writeText).toHaveBeenCalledWith(expected.join('\n'));
    expect(text(within(panel).getByRole('status'))).toBe('Copied');
    act(() => vi.advanceTimersByTime(1999));
    expect(text(within(panel).getByRole('status'))).toBe('Copied');
    act(() => vi.advanceTimersByTime(1));
    expect(text(within(panel).getByRole('status'))).toBe('');
  });

  it('FR-476 a browser that refuses the copy (or has no clipboard) shows no "Copied"', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied');
    });
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    show(continent());
    const { unmount } = render(<HUD />);
    let panel = openGroup('Details for bug reports');
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Copy details' }));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(text(within(panel).getByRole('status'))).toBe('');
    unmount();

    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    render(<HUD />);
    panel = openGroup('Details for bug reports');
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Copy details' }));
    });
    expect(text(within(panel).getByRole('status'))).toBe('');
  });
});
