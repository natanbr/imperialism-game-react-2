// @vitest-environment jsdom
// M18c FR-572 (owner play-test 2026-11-24): the Capitol section merged into the Trade School, one section with training
// (Untrained → Trained, Trained → Expert) and recruiting migrants. Each action shows its grade pictures and, like an
// industry card's inputs, each cost with what one more needs and what we hold, marked when short, and the cash. The order
// buttons are FR-047's (tests/ui/capitalDialog.test.tsx); the five sections FR-565's (tests/ui/capitalSections.test.tsx).
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CapitalModal } from '@/components/CapitalModal';
import { applyOrder } from '@/engine';
import { useGameStore } from '@/store/rootStore';
import type { GameState } from '@/types/GameState';
import { emptyWarehouse, game, N1, setTreasury } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

function openSchool(state: GameState) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, isCapitalOpen: true, lastRejection: null });
  render(<CapitalModal />);
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Capital sections' })).getByRole('button', { name: 'Trade School' }));
  return screen.getByRole('region', { name: 'Trade School' });
}

const stocked = () => emptyWarehouse(game(), N1, { paper: 5, cannedFood: 3, clothing: 3, furniture: 3 });
const action = (school: HTMLElement, id: 'untrained' | 'trained' | 'migrant') => within(school).getByTestId(`school-${id}`);
const costs = (el: HTMLElement) => within(el).getAllByRole('listitem').map((li) => text(li));
const art = (el: Element) => [...el.querySelectorAll('img')].map((img) => img.getAttribute('data-art') ?? '');

describe('FR-572 the Trade School holds the Capitol', () => {
  it('FR-605 training costs use buying power when the credit line is open', () => {
    const state = applyOrder(setTreasury(stocked(), N1, 20), { kind: 'openCredit', nationId: N1 });
    const school = openSchool(state);
    expect(costs(action(school, 'untrained'))[0]).toMatch(/\$100 needed, \$220 buying power/);
    expect(costs(action(school, 'untrained'))[0]).not.toContain('short');
    expect(costs(action(school, 'trained'))[0]).toMatch(/\$1,000 needed, \$220 buying power.*short/);
  });
  it('FR-572 one section with the two trainings and the migrants, each with its pictures and its buttons; no Capitol section', () => {
    const school = openSchool(stocked());
    expect(screen.queryByRole('region', { name: 'Capitol', hidden: true })).toBeNull();
    expect(within(screen.getByRole('navigation', { name: 'Capital sections' })).queryByRole('button', { name: 'Capitol' })).toBeNull();
    const names = (['untrained', 'trained', 'migrant'] as const).map((id) => text(action(school, id).firstElementChild!));
    expect(names).toEqual(['Untrained → Trained', 'Trained → Expert', 'Migrant → Untrained']);
    // Two pictures before each name: the grade (or the capitol, for a migrant) and the grade it becomes
    const head = (id: 'untrained' | 'trained' | 'migrant') => art(action(school, id).firstElementChild!);
    expect(head('untrained')).toHaveLength(2);
    expect(head('trained')).toHaveLength(2);
    expect(head('migrant')).toEqual(['buildings/capitol.png', head('untrained')[0]]);
    expect(head('trained')[0]).toBe(head('untrained')[1]);
    for (const name of ['Train an untrained worker', 'Cancel an untrained trainee', 'Train a trained worker', 'Cancel a trained trainee', 'Recruit a migrant', 'Cancel a migrant']) {
      expect(within(school).getByRole('button', { name }), name).toBeTruthy();
    }
    expect(text(within(school).getByTestId('recruits'))).toBe('0 of 1 migrants this turn');
  });

  it('FR-572 each cost as needed against held: the cash in the treasury, the goods in the warehouse with their pictures', () => {
    const school = openSchool(stocked());
    expect(costs(action(school, 'untrained'))).toEqual(['Cash: $100 needed, $10,000 in treasury', 'Paper: 1 needed, 5 in warehouse']);
    expect(costs(action(school, 'trained'))).toEqual(['Cash: $1,000 needed, $10,000 in treasury', 'Paper: 2 needed, 5 in warehouse']);
    expect(costs(action(school, 'migrant'))).toEqual([
      'Canned Food: 1 needed, 3 in warehouse',
      'Clothing: 1 needed, 3 in warehouse',
      'Furniture: 1 needed, 3 in warehouse',
    ]);
    expect(art(within(action(school, 'untrained')).getByTestId('cost-cash'))).toEqual([]);
    for (const [id, key] of [['untrained', 'paper'], ['migrant', 'cannedFood'], ['migrant', 'clothing'], ['migrant', 'furniture']] as const) {
      const pictures = art(within(action(school, id)).getByTestId(`cost-${key}`));
      expect(pictures, key).toHaveLength(1);
      expect(pictures[0], key).not.toBe('');
    }
    expect(school.querySelectorAll('[data-missing]')).toHaveLength(0);
  });

  it('FR-572 a cost we cannot meet is marked missing: ✗, "(short)" and its tooltip; the others are not', () => {
    const school = openSchool(setTreasury(emptyWarehouse(game(), N1, { paper: 1, cannedFood: 1, clothing: 1 }), N1, 500));
    expect(costs(action(school, 'untrained'))).toEqual(['Cash: $100 needed, $500 in treasury', 'Paper: 1 needed, 1 in warehouse']);
    expect(costs(action(school, 'trained'))).toEqual(['✗ Cash: $1,000 needed, $500 in treasury (short)', '✗ Paper: 2 needed, 1 in warehouse (short)']);
    expect(costs(action(school, 'migrant'))).toEqual([
      'Canned Food: 1 needed, 1 in warehouse',
      'Clothing: 1 needed, 1 in warehouse',
      '✗ Furniture: 1 needed, 0 in warehouse (short)',
    ]);
    const short = [...school.querySelectorAll('[data-missing="true"]')] as HTMLElement[];
    expect(short.map((li) => li.dataset.testid)).toEqual(['cost-cash', 'cost-paper', 'cost-furniture']);
    for (const li of short) {
      expect(li.title).toBe('Not enough for one more');
      // The mark is decorative; "(short)" is what a screen reader hears
      expect(li.querySelector('[aria-hidden="true"]')!.textContent).toBe('✗ ');
    }
  });

  it('FR-572 the figures follow this turn\'s orders: a trainee takes its cash and paper at once, a migrant its goods', () => {
    const school = openSchool(stocked());
    fireEvent.click(within(school).getByRole('button', { name: 'Train an untrained worker' }));
    expect(costs(action(school, 'untrained'))).toEqual(['Cash: $100 needed, $9,900 in treasury', 'Paper: 1 needed, 4 in warehouse']);
    fireEvent.click(within(school).getByRole('button', { name: 'Recruit a migrant' }));
    expect(costs(action(school, 'migrant'))).toEqual([
      'Canned Food: 1 needed, 2 in warehouse',
      'Clothing: 1 needed, 2 in warehouse',
      'Furniture: 1 needed, 2 in warehouse',
    ]);
    expect(text(within(school).getByTestId('recruits'))).toBe('1 of 1 migrants this turn');
  });
});
