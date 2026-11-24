// @vitest-environment jsdom
// M18a FR-562: the debug dashboard of the Demo level. A "Dashboard" button in the top bar, on Demo only, opens a dialog
// with one card per Great Power in its nation colour (FR-097) and a row of section buttons (Economy, Military, Trade,
// Diplomacy, Council, Bug report; no drop-downs): every nation's cash, stock, army, fleet, buy and sell orders, relations
// and Council forecast. "Details for bug reports" moves from the right pane into it on Demo; on every other level the
// pane keeps it and there is no Dashboard (NR-037). FR-497: the dashboard reads and never writes, so the computer's
// orders on a Demo game are the same with and without it open.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TopBar } from '@/components/HUD/TopBar';
import { HUD } from '@/components/HUD';
import { dashboardCards, DASHBOARD_SECTIONS } from '@/components/HUD/dashboardView';
import { useGameStore } from '@/store/rootStore';
import { computerOrders, councilVote, newGame, regimentsOf, relationLevel } from '@/engine';
import { money } from '@/components/gameText';
import { relationText } from '@/components/diplomacy/diplomacyView';
import { nationColor } from '@/styles/theme';
import type { GameState } from '@/types/GameState';
import { N1, N2, setTreasury } from '../engine/fixtures';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A cash no screen of a Normal game shows for the rival: only the dashboard reveals it. */
const RIVAL_CASH = 77_777;

/** A Demo game on the continent with the rival's cash and its buy and sell orders, this turn's and last turn's. */
function demoGame(difficulty: 'demo' | 'normal' = 'demo'): GameState {
  const start = setTreasury(newGame({ seed: 1, world: 'continent', difficulty }), N2, RIVAL_CASH);
  const market = start.market!;
  return {
    ...start,
    market: {
      ...market,
      orders: { ...market.orders, [N2]: { buy: { lumber: 3 }, sell: { wool: 5 } } },
      lastOrders: { ...(market.lastOrders ?? {}), [N2]: { buy: { coal: 2 }, sell: { fabric: 4 } } },
    },
  };
}

function show(game: GameState) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1 });
}

const Screen = () => (
  <>
    <TopBar />
    <HUD />
  </>
);

const dashboardButton = () => screen.queryByRole('button', { name: 'Dashboard' });
const openDashboard = () => {
  fireEvent.click(dashboardButton()!);
  return screen.getByRole('dialog', { name: 'Dashboard' });
};
const section = (dialog: HTMLElement, name: string) => {
  fireEvent.click(within(within(dialog).getByRole('group', { name: 'Dashboard sections' })).getByRole('button', { name }));
};
const card = (dialog: HTMLElement, nationId: string) => within(dialog).getByTestId(`dashboard-card-${nationId}`);

/** Freezes the state all the way down, so any write into it throws (ES modules run in strict mode). */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

describe('FR-562 the debug dashboard on the Demo level', () => {
  it('FR-562 on Demo the top bar has a Dashboard button that opens a dialog with one card per Great Power, each in its nation colour', () => {
    const game = demoGame();
    show(game);
    render(<Screen />);
    expect(dashboardButton()).not.toBeNull();
    const dialog = openDashboard();
    for (const nation of game.nations) {
      const c = card(dialog, nation.id);
      expect(text(c)).toContain(nation.name);
      expect(c.style.getPropertyValue('--nation-colour')).toBe(nationColor(nation.colorSlot));
      expect((within(c).getByTestId('swatch') as HTMLElement).style.backgroundColor).toBe(nationColor(nation.colorSlot));
    }
    // The player's own card first, marked as ours
    expect(within(dialog).getAllByTestId(/^dashboard-card-/)[0].getAttribute('data-testid')).toBe(`dashboard-card-${N1}`);
    expect(text(card(dialog, N1))).toContain('(you)');
  });

  it('FR-562 section buttons, not drop-downs: Economy, Military, Trade, Diplomacy, Council, Bug report; Economy first, one pressed at a time', () => {
    show(demoGame());
    render(<Screen />);
    const dialog = openDashboard();
    const group = within(dialog).getByRole('group', { name: 'Dashboard sections' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map(text)).toEqual(['Economy', 'Military', 'Trade', 'Diplomacy', 'Council', 'Bug report']);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false', 'false']);
    fireEvent.click(buttons[2]);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false', 'false', 'false']);
    expect(within(dialog).queryAllByRole('combobox')).toHaveLength(0);
    expect(within(dialog).queryAllByRole('listbox')).toHaveLength(0);
    expect(dialog.querySelectorAll('select, details')).toHaveLength(0);
    expect(DASHBOARD_SECTIONS.map((s) => s.label)).toEqual(['Economy', 'Military', 'Trade', 'Diplomacy', 'Council', 'Bug report']);
  });

  it("FR-562 Economy shows a rival's hidden cash and stock", () => {
    const game = demoGame();
    show(game);
    render(<Screen />);
    const dialog = openDashboard();
    const rival = text(card(dialog, N2));
    expect(rival).toContain(`Cash ${money(RIVAL_CASH)}`);
    expect(rival).toMatch(/Stock .*\d/);
    expect(text(card(dialog, N1))).toContain(`Cash ${money(game.nations.find((n) => n.id === N1)!.treasury)}`);
  });

  it("FR-562 Military shows a rival's army (regiments and strength) and every nation's fleet", () => {
    const game = demoGame();
    show(game);
    render(<Screen />);
    const dialog = openDashboard();
    section(dialog, 'Military');
    const rival = text(card(dialog, N2));
    expect(rival).toContain(`Regiments ${regimentsOf(game, N2).length}`);
    expect(rival).toMatch(/Strength \d/);
    expect(rival).toMatch(/Fleet /);
    // The Demo kit's Frigate (FR-561) is the player's
    expect(text(card(dialog, N1))).toMatch(/Fleet .*Frigate/);
    // The Economy section's lines are gone
    expect(rival).not.toContain('Cash');
  });

  it("FR-562 Trade shows a rival's buy and sell orders, this turn's and last turn's", () => {
    show(demoGame());
    render(<Screen />);
    const dialog = openDashboard();
    section(dialog, 'Trade');
    const rival = text(card(dialog, N2));
    expect(rival).toContain('Buy this turn Lumber 3');
    expect(rival).toContain('Sell this turn Wool 5');
    expect(rival).toContain('Buy last turn Coal 2');
    expect(rival).toContain('Sell last turn Fabric 4');
    expect(text(card(dialog, N1))).toContain('Buy this turn none');
  });

  it("FR-562 Diplomacy shows each nation's relation with every other country; Council the forecast", () => {
    const game = demoGame();
    show(game);
    render(<Screen />);
    const dialog = openDashboard();
    section(dialog, 'Diplomacy');
    const player = game.nations.find((n) => n.id === N1)!;
    expect(text(card(dialog, N2))).toContain(`${player.name} ${relationText(relationLevel(game, N2, N1)!)}`);
    for (const minor of game.minorNations) expect(text(card(dialog, N1))).toContain(minor.name);

    section(dialog, 'Council');
    const vote = councilVote(game)!;
    const nominee = vote.nominees.find((n) => n.nationId === N1)!;
    expect(text(within(dialog).getByTestId('dashboard-council-forecast'))).toMatch(/^If it met now: /);
    expect(text(card(dialog, N1))).toContain(`Votes if it met now ${nominee.total}`);
  });

  it('FR-562 FR-476 the bug-report details sit in the dashboard on Demo, and no longer in the right pane', () => {
    const game = demoGame();
    show(game);
    render(<Screen />);
    // The pane keeps Nation and Work in progress; Details for bug reports moved
    expect(screen.queryByRole('button', { name: 'Details for bug reports' })).toBeNull();
    expect(within(screen.getByTestId('hud-groups')).getAllByRole('heading', { level: 3 }).map(text)).toEqual(['Nation', 'Work in progress (0)']);
    const dialog = openDashboard();
    section(dialog, 'Bug report');
    const lines = within(dialog).getAllByTestId('hud-debug-line').map(text);
    expect(lines).toContain(`Seed: ${game.seed}`);
    expect(lines).toContain(`Nation: ${N1}`);
    expect(within(dialog).getByRole('button', { name: 'Copy details' })).not.toBeNull();
  });

  it('FR-562 Close and Escape close the dashboard', () => {
    show(demoGame());
    render(<Screen />);
    let dialog = openDashboard();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dashboard' }));
    expect(screen.queryByRole('dialog', { name: 'Dashboard' })).toBeNull();
    dialog = openDashboard();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Dashboard' })).toBeNull();
    expect(dialog.isConnected).toBe(false);
  });
});

describe('NR-037 FR-562 the other levels are unchanged', () => {
  it('NR-037 on Normal: no Dashboard button, no rival cash anywhere, Details for bug reports still in the right pane', () => {
    show(demoGame('normal'));
    render(<Screen />);
    expect(dashboardButton()).toBeNull();
    expect(within(screen.getByTestId('hud-groups')).getAllByRole('heading', { level: 3 }).map(text)).toEqual([
      'Nation',
      'Work in progress (0)',
      'Details for bug reports',
    ]);
    // Every group open: still no rival cash
    for (const name of ['Nation', /^Work in progress/, 'Details for bug reports']) fireEvent.click(screen.getByRole('button', { name }));
    expect(document.body.textContent).not.toContain(money(RIVAL_CASH));
    expect(screen.queryByTestId(/^dashboard-card-/)).toBeNull();
  });
});

describe('FR-497 NR-037 the dashboard only reads', () => {
  it('FR-497 the computer orders on a Demo game are identical with and without the dashboard open and its view called', () => {
    const game = demoGame();
    const snapshot = structuredClone(game);
    const before = computerOrders(structuredClone(game));
    deepFreeze(game);
    show(game);
    render(<Screen />);
    const dialog = openDashboard();
    for (const { label } of DASHBOARD_SECTIONS) section(dialog, label);
    for (const nation of game.nations) dashboardCards(game, nation.id);

    expect(useGameStore.getState().game).toBe(game);
    expect(useGameStore.getState().ordersThisTurn).toEqual([]);
    expect(game).toEqual(snapshot);
    expect(computerOrders(structuredClone(useGameStore.getState().game))).toEqual(before);
  });
});
