// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CapitalModal } from '@/components/CapitalModal';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import type { GameState } from '@/types/GameState';
import { N1 } from '../engine/fixtures';

function open(cash = 10000, rulesRevision?: GameState['rulesRevision']) {
  const state = newGame({ seed: 1, rulesRevision });
  state.nations.find(n => n.id === N1)!.treasury = cash;
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, isCapitalOpen: true });
  render(<CapitalModal />);
  const trigger = screen.getByRole('button', { name: 'Technology' }) as HTMLButtonElement;
  expect(trigger.disabled).toBe(false);
  fireEvent.click(trigger);
  return within(screen.getByRole('dialog', { name: 'Invest in Technology' }));
}

it('FR-526 lists all 28 technologies, their effects, prices, arrival turns and missing prerequisites', () => {
  const dialog = open();
  const available = within(dialog.getByRole('region', { name: 'Available' }));
  const owned = within(dialog.getByRole('region', { name: 'Owned' }));
  const coming = within(dialog.getByRole('region', { name: 'Coming' }));
  expect(dialog.queryByText(/Resource improvements are already available/)).toBeNull();
  expect(dialog.getAllByRole('listitem')).toHaveLength(28);
  expect(available.getAllByRole('listitem')).toHaveLength(1);
  expect(available.getByRole('listitem').textContent).toMatch(/cotton.*level 1/i);
  expect(available.getByRole('listitem').textContent).toContain('$1,000');
  expect(owned.getAllByRole('listitem')).toHaveLength(5);
  expect(owned.getByText('Seed Drill')).toBeTruthy();
  const jenny = coming.getByText('Spinning Jenny').closest('li')!;
  expect(jenny.textContent).toMatch(/turn 5/i);
  expect(jenny.textContent).toMatch(/Needs .*Feed Grasses/);
  expect(jenny.textContent).toContain('Cotton Gin');
});

it('FR-526 Buy and Cancel update cash, pending control and treasury through the real store', () => {
  const dialog = open();
  fireEvent.click(dialog.getByRole('button', { name: 'Buy Cotton Gin' }));
  const cash = () => useGameStore.getState().game.nations.find(n => n.id === N1)!.treasury;
  expect(cash()).toBe(9000);
  expect(dialog.getByText('$9,000')).toBeTruthy();
  expect(within(dialog.getByRole('region', { name: 'Owned' })).queryByText('Cotton Gin')).toBeNull();
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel Cotton Gin' }));
  expect(cash()).toBe(10000);
  expect(dialog.getByRole('button', { name: 'Buy Cotton Gin' })).toBeTruthy();
});

it('FR-526 explains the resource rules in a saved game using M16 part 1 rules', () => {
  const dialog = open(10000, 'm16.1');
  expect(dialog.getByText('Resource improvements are already available in this saved game.')).toBeTruthy();
});

it('FR-526 keeps an unaffordable invention available and explains its disabled Buy control', () => {
  const dialog = open(999);
  const buy = dialog.getByRole('button', { name: 'Buy Cotton Gin' }) as HTMLButtonElement;
  expect(buy.disabled).toBe(true);
  expect(document.getElementById(buy.getAttribute('aria-describedby')!)?.textContent).toMatch(/not enough money/i);
});
