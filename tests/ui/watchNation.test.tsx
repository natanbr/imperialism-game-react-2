// @vitest-environment jsdom
// M4 part B: the player watches nation 2 (Valdoria, scripted) grow and cannot act for it. FR-106 the
// score table, FR-107 the news per nation, FR-108 no orders for another nation, FR-109 New game,
// FR-110 (a, b) 24 px worker buttons and the selection ring above the borders. Real newGame(): nation 1
// "Testland" (human, capital 2-9), nation 2 "Valdoria" (scripted, capital 14-9), seven civilians each.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/page';
import { HUD } from '@/components/HUD';
import { MapView } from '@/components/MapView';
import { NewsPanel, ScoreTable } from '@/components/HUD/index';
import { GameOverModal } from '@/components/GameOverModal';
import { WORKER_ICONS } from '@/components/icons';
import { eventText, newsLines } from '@/components/gameText';
import tileStyles from '@/components/Tile/Tile.module.css';
import { useGameStore } from '@/store/rootStore';
import { newGame, resolveTurn, scoreTable, type GameEvent, type Order, type ValidationResult } from '@/engine';
import { START_CIVILIANS } from '@/engine/world/startWorld';
import { NATION_COLORS } from '@/styles/theme';
import type { GameState } from '@/types/GameState';
import { MaterialType } from '@/types/Resource';
import { WorkerType } from '@/types/Workers';
import { setTreasury } from '../engine/fixtures';
import { text } from './domText';

const ROOT = join(__dirname, '..', '..');
const N1 = 'nation-1';
const N2 = 'nation-2';
const NAMES: Record<string, string> = { [N1]: 'Testland', [N2]: 'Valdoria' };
const nameOf = (id: string) => NAMES[id] ?? id;

const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1, ...ui });
const tileEl = (container: HTMLElement, id: string) => container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
const css = (file: string) => readFileSync(join(ROOT, file), 'utf8');
const rule = (source: string, name: string) => new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';
const px = (body: string, prop: string) => Number(new RegExp(`(?:^|[;\\s])${prop}:\\s*(\\d+)px`).exec(body)?.[1] ?? NaN);

/** The real game played to its end after one turn. */
const finished = (): GameState => resolveTurn({ ...newGame({ seed: 1 }), turnLimit: 1 }, {}, 1).state;

describe('FR-106 score table', () => {
  it('FR-106 the HUD table ranks both nations with a colour swatch beside each name and the score; a tie keeps the founding order', () => {
    show(newGame({ seed: 1 }));
    render(<ScoreTable />);

    const table = screen.getByRole('table', { name: 'Scores' });
    const rows = within(table).getAllByTestId(/^score-row-/);
    expect(rows.map((r) => r.dataset.testid)).toEqual([`score-row-${N1}`, `score-row-${N2}`]);
    // FR-104: equal start scores
    expect(rows.map(text)).toEqual(['1 Testland (you) 240', '2 Valdoria 240']);
    const swatches = rows.map((r) => within(r).getByTestId('swatch'));
    expect(swatches.map((s) => s.getAttribute('aria-hidden'))).toEqual(['true', 'true']);
    expect(swatches.map((s) => s.style.backgroundColor)).toEqual([NATION_COLORS[0], NATION_COLORS[1]]);
    // The name is text, never only the colour
    expect(text(within(rows[1]).getByTestId('nation'))).toBe('Valdoria');
  });

  it('FR-106 the ranking follows the scores: a richer Valdoria is first', () => {
    const g = setTreasury(newGame({ seed: 1 }), N2, 50000);
    show(g);
    render(<ScoreTable />);
    const rows = screen.getAllByTestId(/^score-row-/);
    expect(rows.map((r) => r.dataset.testid)).toEqual([`score-row-${N2}`, `score-row-${N1}`]);
    const totals = scoreTable(g).map((s) => String(s.total));
    expect(rows.map((r) => text(within(r).getByTestId('total')))).toEqual(totals);
    expect(rows.map((r) => text(within(r).getByTestId('rank')))).toEqual(['1', '2']);
    // The swatch keeps the nation's slot colour whatever its rank (FR-097)
    expect(within(rows[0]).getByTestId('swatch').style.backgroundColor).toBe(NATION_COLORS[1]);
  });

  it("FR-106 the HUD shows the player's score and the table", () => {
    show(newGame({ seed: 1 }));
    render(<HUD />);
    expect(text(screen.getByTestId('hud-score'))).toBe('Score: 240');
    expect(screen.getByRole('table', { name: 'Scores' })).toBeTruthy();
  });

  it('FR-106 the game-over screen lists both nations of the real game with rank, swatch and name', () => {
    show(finished());
    render(<GameOverModal />);
    const dialog = screen.getByRole('dialog', { name: 'Game over' });
    const rows = within(dialog).getAllByTestId(/^final-score-/);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => text(within(r).getByTestId('rank')))).toEqual(['1', '2']);
    for (const row of rows) {
      const id = row.dataset.testid!.replace('final-score-', '');
      const nation = within(row).getByTestId('nation');
      expect(text(nation)).toBe(id === N1 ? 'Testland (you)' : 'Valdoria');
      const swatch = within(nation).getByTestId('swatch');
      expect(swatch.getAttribute('aria-hidden')).toBe('true');
      expect(swatch.style.backgroundColor).toBe(id === N1 ? NATION_COLORS[0] : NATION_COLORS[1]);
    }
  });
});

describe('FR-107 news per nation', () => {
  it("FR-107 the player's lines come first without a prefix, then other nations' lines named, then lines without a nation", () => {
    const events: GameEvent[] = [
      { type: 'construction-completed', tileId: '15-8', nationId: N2, structure: 'rail' },
      { type: 'goods-produced', nationId: N1, output: MaterialType.CannedFood, amount: 2 },
      { type: 'goods-produced', nationId: N2, output: MaterialType.Lumber, amount: 3 },
      { type: 'resource-discovered', tileId: '5-2', nationId: N1, resource: undefined },
      { type: 'turn-ended', turn: 1, year: 1815 },
      { type: 'game-over', turn: 1, year: 1815, scores: [] },
    ];
    expect(newsLines(events, N1, nameOf)).toEqual([
      'Produced 2 Canned Food.',
      'Prospectors found nothing at 5-2.',
      'Valdoria: Rail finished at 15-8.',
      'Valdoria: Produced 3 Lumber.',
      'Game over at the end of Spring 1815.',
    ]);
  });

  it('FR-107 after End Turns of the real game the panel names Valdoria on each of its lines and never the player', () => {
    show(newGame({ seed: 1 }));
    render(<NewsPanel />);
    act(() => {
      for (let i = 0; i < 3; i++) useGameStore.getState().advanceTurn();
    });

    const lines = within(screen.getByTestId('news-panel')).getAllByRole('listitem').map(text);
    const report = useGameStore.getState().eventLog.at(-1)!;
    const theirs = report.events.filter((e) => 'nationId' in e && e.nationId === N2 && eventText(e) !== null);
    expect(theirs.length).toBeGreaterThan(0);
    expect(lines.filter((l) => l.startsWith('Valdoria: '))).toHaveLength(theirs.length);
    expect(lines.filter((l) => l.startsWith('Testland'))).toEqual([]);
  });
});

describe('FR-108 no orders for another nation', () => {
  it("FR-108 Valdoria's civilians are a marker, not buttons; the player's are a button", () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);

    const theirs = tileEl(container, '14-9');
    expect(theirs.querySelectorAll('button')).toHaveLength(0);
    expect(within(theirs).getByRole('img', { name: 'Valdoria: 7 civilians' })).toBeTruthy();
    expect(tileEl(container, '2-9').querySelectorAll('button[data-testid="worker-stack"]')).toHaveLength(1);
  });

  it('FR-108 the store will not select a worker of another nation', () => {
    show(newGame({ seed: 1 }));
    const store = useGameStore.getState();
    store.selectWorker('worker-nation-2-7');
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    store.setSelectedWorkerId('worker-nation-2-1');
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    store.selectWorker('worker-nation-1-7');
    expect(useGameStore.getState().selectedWorkerId).toBe('worker-nation-1-7');
    store.selectWorker(undefined);
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
  });

  it("FR-108 a click on Valdoria's capital shows it read-only: owner name, terrain, civilians, no order control", () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<Home />);

    fireEvent.click(tileEl(container, '14-9'));
    expect(useGameStore.getState().selectedTileId).toBe('14-9');
    const panel = screen.getByTestId('tile-info');
    expect(text(within(panel).getByTestId('tile-owner'))).toBe('Owner: Valdoria');
    expect(text(panel)).toContain('Capital');
    expect(within(panel).getAllByRole('listitem')).toHaveLength(7);
    expect(within(panel).queryAllByRole('button')).toEqual([]);

    // Clicking a listed civilian of Valdoria selects nothing
    fireEvent.click(within(panel).getAllByRole('listitem')[0]);
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    expect(within(screen.getByTestId('tile-info')).queryAllByRole('button')).toEqual([]);

    // Display names; a resource not yet prospected is not named (as in the tile's name, FR-095)
    fireEvent.click(tileEl(container, '17-2'));
    const hills = screen.getByTestId('tile-info');
    expect(text(hills)).toContain('Terrain: Barren hills');
    expect(text(hills)).toContain('Resource: Not yet prospected');
    expect(text(hills)).not.toMatch(/coal|iron/i);
  });

  it("FR-108 the player's own tile still offers its order controls", () => {
    show(newGame({ seed: 1 }), { selectedTileId: '2-9', selectedWorkerId: 'worker-nation-1-7' });
    render(<HUD />);
    const panel = screen.getByTestId('tile-info');
    expect(text(within(panel).getByTestId('tile-owner'))).toBe('Owner: Testland (you)');
    expect(within(panel).getAllByRole('button').length).toBeGreaterThan(0);
  });

  it("FR-108 every order the UI builds carries the player's nation id, also when the clicks are on Valdoria's land", () => {
    show(newGame({ seed: 1 }));
    const submitted: Order[] = [];
    const real = useGameStore.getState().submitOrder;
    useGameStore.setState({
      submitOrder: (order: Order): ValidationResult => {
        submitted.push(order);
        return real(order);
      },
    });
    const { container } = render(<Home />);
    const openTray = () => fireEvent.click(within(tileEl(container, '2-9')).getByTestId('worker-stack'));
    const pick = (type: WorkerType) =>
      fireEvent.click(container.querySelector(`[data-tile-id="2-9"] button[data-worker-type="${type}"]`)!);

    // Valdoria's civilians' marker on its capital
    fireEvent.click(within(tileEl(container, '14-9')).getByRole('img', { name: 'Valdoria: 7 civilians' }));
    expect(useGameStore.getState().selectedWorkerId).toBeUndefined();
    // The player's engineer sent onto Valdoria's land, then the farmer to the player's own farm
    openTray();
    pick(WorkerType.Engineer);
    expect(useGameStore.getState().selectedWorkerId).toBe('worker-nation-1-7');
    fireEvent.click(tileEl(container, '14-8'));
    openTray();
    pick(WorkerType.Farmer);
    fireEvent.click(tileEl(container, '3-9'));
    // Every button the HUD's tile panel offers on Valdoria's capital (there are none)
    fireEvent.click(tileEl(container, '14-9'));
    for (const button of within(screen.getByTestId('tile-info')).queryAllByRole('button')) fireEvent.click(button);

    expect(submitted.length).toBeGreaterThan(0);
    expect(submitted.filter((o) => o.nationId !== N1)).toEqual([]);
    // The farmer's job was accepted; the engineer did not land on Valdoria's tile
    expect(useGameStore.getState().game.map.tiles[9][3].workers.map((w) => w.id)).toEqual(['worker-nation-1-2']);
    expect(useGameStore.getState().game.map.tiles[8][14].workers).toEqual([]);
  });
});

describe('FR-109 New game', () => {
  it('FR-109 the HUD asks in place; Keep playing changes nothing; Start new game replaces the game and clears the session', () => {
    show(newGame({ seed: 1 }));
    render(<HUD />);
    act(() => useGameStore.getState().advanceTurn());
    act(() => useGameStore.setState({ selectedTileId: '3-9', isCapitalOpen: true, isMarketOpen: true }));
    const before = useGameStore.getState();
    expect(before.game.turn).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: /New game/ }));
    const confirm = screen.getByRole('group', { name: 'Confirm new game' });
    expect(text(confirm)).toContain('Start a new game? This game will be lost.');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Keep playing' }));
    expect(screen.queryByRole('group', { name: 'Confirm new game' })).toBeNull();
    expect(useGameStore.getState().game).toBe(before.game);

    fireEvent.click(screen.getByRole('button', { name: /New game/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start new game' }));
    const after = useGameStore.getState();
    expect(after.game).not.toBe(before.game);
    expect(after.game.turn).toBe(1);
    expect(after.eventLog).toEqual([]);
    expect(after.selectedTileId).toBeUndefined();
    expect(after.isCapitalOpen).toBe(false);
    expect(after.isMarketOpen).toBe(false);
    // The map is centred on the new capital (FR-083)
    expect(after.cameraMoves).toBe(before.cameraMoves + 1);
    expect(screen.queryByRole('group', { name: 'Confirm new game' })).toBeNull();
  });

  it('FR-109 the game-over screen starts a new game at once', () => {
    show(finished(), { selectedTileId: '3-9' });
    render(<GameOverModal />);
    const dialog = screen.getByRole('dialog', { name: 'Game over' });
    fireEvent.click(within(dialog).getByRole('button', { name: /New game/ }));

    const after = useGameStore.getState();
    expect(after.game.gameOver).toBeUndefined();
    expect(after.game.turn).toBe(1);
    expect(after.isGameOverHidden).toBe(false);
    expect(after.selectedTileId).toBeUndefined();
    expect(screen.queryByRole('dialog', { name: 'Game over' })).toBeNull();
  });
});

describe('FR-110 (a) worker buttons are at least 24 px', () => {
  it('FR-110 the worker buttons and the stack button share a 24 x 24 px target', () => {
    const body = rule(css('src/app/components/Tile/Tile.module.css'), 'workerTarget');
    expect(px(body, 'width')).toBeGreaterThanOrEqual(24);
    expect(px(body, 'height')).toBeGreaterThanOrEqual(24);
  });

  it('FR-110 several civilians show as one stack button with their count; selecting the tile opens a tray of worker buttons', () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    const capital = () => tileEl(container, '2-9');

    const stack = within(capital()).getByTestId('worker-stack');
    expect(stack.tagName).toBe('BUTTON');
    expect(stack.classList.contains(tileStyles.workerTarget)).toBe(true);
    expect(stack.getAttribute('data-count')).toBe('7');
    expect(stack.getAttribute('aria-expanded')).toBe('false');
    expect(capital().querySelectorAll('[data-testid="worker-button"]')).toHaveLength(0);

    fireEvent.click(stack);
    expect(useGameStore.getState().selectedTileId).toBe('2-9');
    const tray = within(capital()).getByRole('group', { name: 'Civilians on this tile' });
    const buttons = within(tray).getAllByTestId('worker-button');
    expect(buttons.map((b) => b.getAttribute('data-worker-type'))).toEqual([...START_CIVILIANS]);
    for (const b of buttons) {
      expect(b.classList.contains(tileStyles.workerTarget)).toBe(true);
      expect(b.querySelector('svg')?.getAttribute('data-icon')).toBe(WORKER_ICONS[b.getAttribute('data-worker-type') as WorkerType]);
    }
    expect(within(capital()).getByTestId('worker-stack').getAttribute('aria-expanded')).toBe('true');

    // Picking one selects it and closes the tray; the stack shows the selected worker
    fireEvent.click(buttons[1]);
    expect(useGameStore.getState().selectedWorkerId).toBe('worker-nation-1-2');
    expect(within(capital()).queryByRole('group', { name: 'Civilians on this tile' })).toBeNull();
    expect(within(capital()).getByTestId('worker-stack').getAttribute('data-selected-worker')).toBe(WorkerType.Farmer);
  });

  it('FR-110 a tile with one civilian of the player shows it as its own 24 px button', () => {
    show(newGame({ seed: 1 }));
    const { container } = render(<MapView />);
    act(() => {
      useGameStore.getState().submitOrder({ kind: 'moveWorker', nationId: N1, workerId: 'worker-nation-1-2', toTileId: '3-9' });
    });
    const farm = tileEl(container, '3-9');
    const button = within(farm).getByTestId('worker-button');
    expect(button.getAttribute('data-worker-type')).toBe(WorkerType.Farmer);
    expect(button.classList.contains(tileStyles.workerTarget)).toBe(true);
    expect(farm.querySelectorAll('[data-testid="worker-stack"]')).toHaveLength(0);
    expect(within(tileEl(container, '2-9')).getByTestId('worker-stack').getAttribute('data-count')).toBe('6');
  });
});

describe('FR-110 (b) the selection ring is drawn above the borders and the rail', () => {
  it('FR-110 the selected shore tile alone has the ring element, and it sits above the overlay', () => {
    show(newGame({ seed: 1 }), { selectedTileId: '2-8' });
    const { container } = render(<MapView />);
    const rings = [...container.querySelectorAll('[data-testid="selection-ring"]')];
    expect(rings).toHaveLength(1);
    expect(rings[0].closest('[data-testid="tile"]')?.getAttribute('data-tile-id')).toBe('2-8');
    expect(rings[0].getAttribute('aria-hidden')).toBe('true');

    const ring = rule(css('src/app/components/Tile/Tile.module.css'), 'selectionRing');
    const overlay = rule(css('src/app/components/MapView.module.css'), 'railOverlay');
    const z = (body: string) => Number(/z-index:\s*(\d+)/.exec(body)?.[1] ?? NaN);
    expect(z(ring)).toBeGreaterThan(z(overlay));
    expect(ring).toMatch(/box-shadow:\s*inset 0 0 0 3px var\(--color-selected\)/);
    expect(ring).toMatch(/pointer-events:\s*none/);
    expect(css('src/app/styles/tokens.css')).toMatch(/--color-selected:\s*var\(--color-accent\);/);
  });
});
