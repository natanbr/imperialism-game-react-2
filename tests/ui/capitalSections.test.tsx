// @vitest-environment jsdom
// M18b FR-565: the Capital keeps one section open at a time (Industry, Trade School, Transport, University, Shipyard;
// M18c FR-572 merged the Capitol into the Trade School, so five, was six), chosen with real buttons (aria-expanded, aria-controls), Industry open when the dialog opens; the industry
// cards draw their buildings at 44 px. FR-566: the city's labour (workers by grade, labour, food) is a bar that stays in
// the dialog's HUD column whatever section is open, and the four other sections sit on the left with Industry.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CapitalModal } from '@/components/CapitalModal';
import { useGameStore } from '@/store/rootStore';
import { foodForecast, newGame } from '@/engine';
import type { GameState } from '@/types/GameState';
import { emptyWarehouse, game, N1, nationOf, setIndustry, setTile, T } from '../engine/fixtures';
import { text } from './domText';

const ROOT = join(__dirname, '..', '..');
// Re-recorded by M18c FR-572: old ['Industry', 'Trade School', 'Capitol', 'Transport', 'University', 'Shipyard']
const SECTIONS = ['Industry', 'Trade School', 'Transport', 'University', 'Shipyard'];

function openCapital(state: GameState) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, isCapitalOpen: true, lastRejection: null });
  return render(<CapitalModal />);
}

const stocked = () =>
  emptyWarehouse(game(), N1, {
    grain: 20, fruit: 10, livestock: 10, timber: 10, cotton: 10, coal: 10, ironOre: 10, lumber: 10, steel: 10, paper: 5,
    cannedFood: 3, clothing: 3, furniture: 3, fabric: 4,
  });

const sectionButtons = () => within(screen.getByRole('navigation', { name: 'Capital sections' })).getAllByRole('button') as HTMLButtonElement[];
const sectionButton = (name: string) => sectionButtons().find((b) => b.textContent === name)!;
const openName = () => sectionButtons().find((b) => b.getAttribute('aria-expanded') === 'true')?.textContent ?? null;
const panelOf = (button: HTMLButtonElement) => document.getElementById(button.getAttribute('aria-controls')!)!;
const open = (name: string) => fireEvent.click(sectionButton(name));

describe('FR-565 the Capital shows one section at a time', () => {
  it('FR-565 FR-572 five section buttons, each a real button that names the panel it opens; Industry open by default', () => {
    openCapital(stocked());
    const buttons = sectionButtons();
    expect(buttons.map((b) => b.textContent)).toEqual(SECTIONS);
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('aria-controls'), button.textContent!).toBeTruthy();
      expect(panelOf(button), button.textContent!).toBeTruthy();
    }
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    expect(panelOf(buttons[0]).hidden).toBe(false);
    expect(panelOf(buttons[0])).toBe(screen.getByRole('main', { name: 'Industry' }));
    expect(buttons.slice(1).map((b) => panelOf(b).hidden)).toEqual([true, true, true, true]);
  });

  it('FR-565 opening a section closes the one that was open; pressing the open one keeps it open', () => {
    openCapital(stocked());
    for (const name of [...SECTIONS.slice(1), 'Industry', 'Shipyard', 'Shipyard']) {
      open(name);
      const buttons = sectionButtons();
      expect(buttons.filter((b) => b.getAttribute('aria-expanded') === 'true').map((b) => b.textContent), name).toEqual([name]);
      expect(buttons.filter((b) => !panelOf(b).hidden).map((b) => b.textContent), name).toEqual([name]);
    }
    expect(sectionButton('Shipyard').getAttribute('aria-expanded')).toBe('true');
  });

  it('FR-565 each former control is reachable once its section is open, and only then', () => {
    const s = newGame({ seed: 1, world: 'continent' });
    Object.assign(nationOf(s, N1).warehouse, { armaments: 5, fabric: 3, paper: 4 });
    openCapital(s);
    const controls: Record<string, string[]> = {
      Industry: ['More Steel', 'Less Steel', 'Expand Steel mill', 'Cancel expansion of Steel mill'],
      // M18c FR-572: the Capitol's two buttons are in the Trade School now (old: a section of their own)
      'Trade School': [
        'Train an untrained worker',
        'Train a trained worker',
        'Cancel an untrained trainee',
        'Cancel a trained trainee',
        'Recruit a migrant',
        'Cancel a migrant',
      ],
      Transport: ['Order a freight car', 'Cancel a freight car', 'Transportation of Commodities'],
      University: ['Train one more Engineer', 'Train one less Engineer'],
      Shipyard: ['Build one more Trader', 'Build one less Trader', 'Build one more Ship-of-the-Line'],
    };
    for (const [section, names] of Object.entries(controls)) {
      open(section);
      for (const name of names) expect(screen.queryByRole('button', { name }), `${section}: ${name}`).not.toBeNull();
      for (const [other, otherNames] of Object.entries(controls)) {
        if (other === section) continue;
        for (const name of otherNames) expect(screen.queryByRole('button', { name }), `${section} open, ${other}: ${name}`).toBeNull();
      }
    }
    // The header's buttons stay whatever section is open
    for (const name of ['Warehouse', 'Trade', 'Diplomacy', 'Armoury', 'Technology', 'Close capital']) {
      expect(screen.queryByRole('button', { name }), name).not.toBeNull();
    }
  });

  it('FR-565 an order from a section goes through as before: Trade School trains an untrained worker', () => {
    openCapital(stocked());
    open('Trade School');
    fireEvent.click(screen.getByRole('button', { name: 'Train an untrained worker' }));
    expect(useGameStore.getState().game.nations[0].industry.training.untrained).toBe(1);
    expect(text(screen.getByTestId('grade-untrained'))).toContain('1 in training');
  });

  it('FR-565 the dialog opens on Industry again after it was closed on another section', () => {
    const view = openCapital(stocked());
    open('University');
    expect(openName()).toBe('University');
    act(() => useGameStore.getState().closeCapital());
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useGameStore.getState().openCapital());
    expect(openName()).toBe('Industry');
    view.unmount();
  });

  it('FR-565 the industry cards draw their buildings at 44 px (about 40 to 48 px, was 30 px)', () => {
    const css = readFileSync(join(ROOT, 'src/app/components/capital/Capital.module.css'), 'utf8');
    const rule = /\.cardTitle \.buildingPicture\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    const size = (prop: string) => Number(new RegExp(`(?:^|[;\\s])${prop}:\\s*(\\d+)px`).exec(rule)?.[1] ?? NaN);
    expect(size('width')).toBeGreaterThanOrEqual(40);
    expect(size('width')).toBeLessThanOrEqual(48);
    expect(size('height')).toBe(size('width'));
  });
});

describe('FR-566 the city labour bar', () => {
  const workforce = () =>
    setIndustry(stocked(), N1, {
      workers: { untrained: 4, trained: 2, expert: 1 },
      sick: { untrained: 1, trained: 0, expert: 0 },
      training: { untrained: 1, trained: 0, expert: 0 },
    });

  it('FR-566 the bar shows labour, workers by grade, the sick, the trainees and the food, with the same selectors as before', () => {
    const s = workforce();
    openCapital(s);
    const bar = screen.getByTestId('labour-panel');
    expect(text(within(bar).getByTestId('labour'))).toBe('Labour 10 total, 0 committed, 10 free');
    expect(text(within(bar).getByTestId('grade-untrained'))).toBe('Untrained 4 1 sick 1 in training');
    expect(text(within(bar).getByTestId('grade-trained'))).toBe('Trained 2');
    expect(text(within(bar).getByTestId('grade-expert'))).toBe('Expert 1');
    const meal = foodForecast(s, N1);
    expect(meal.mouths).toBeGreaterThan(0);
    expect(text(within(bar).getByTestId('food'))).toMatch(new RegExp(`^Food ${meal.fed} of ${meal.mouths} fed`));
  });

  it('FR-566 the bar stays in the HUD column, visible whatever section is open; the four other sections sit on the left with Industry', () => {
    openCapital(workforce());
    const bar = screen.getByTestId('labour-panel');
    const hud = screen.getByRole('complementary', { name: 'City' });
    expect(hud.contains(bar)).toBe(true);
    const left = screen.getByRole('navigation', { name: 'Capital sections' }).parentElement!;
    for (const button of sectionButtons()) {
      expect(left.contains(panelOf(button)), button.textContent!).toBe(true);
      expect(hud.contains(panelOf(button)), button.textContent!).toBe(false);
    }
    for (const name of SECTIONS) {
      open(name);
      const isHidden = (el: HTMLElement | null): boolean => !!el && (el.hidden || isHidden(el.parentElement));
      expect(isHidden(bar), name).toBe(false);
      expect(text(within(bar).getByTestId('labour')), name).toBe('Labour 10 total, 0 committed, 10 free');
    }
  });

  it('FR-566 the food line shows who would fall sick or starve when food is short', () => {
    // As tests/engine/foodForecast.test.ts: grain only, no food tiles by the capital, so the fruit and meat eaters fall sick
    let s = emptyWarehouse(game(), N1, { grain: 3 });
    for (const tileId of [T.farm1, T.dryPlains1, T.homeOrchard1, T.range1]) s = setTile(s, tileId, { resource: undefined });
    const meal = foodForecast(s, N1);
    expect(meal.short).toBe(true);
    openCapital(s);
    const food = text(screen.getByTestId('food'));
    expect(food).toContain(`Food ${meal.fed} of ${meal.mouths} fed`);
    if (meal.sick > 0) expect(food).toContain(`${meal.sick} sick`);
    if (meal.starved > 0) expect(food).toContain(`${meal.starved} starve`);
  });
});
