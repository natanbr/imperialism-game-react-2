// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TopBar } from '@/components/HUD/TopBar';
import { newGame } from '@/engine';
import { useGameStore } from '@/store/rootStore';
import { failOnActWarnings } from './actWarnings';

failOnActWarnings();

function openOptions() {
  const initial = useGameStore.getInitialState();
  const running = newGame({ seed: 73, world: 'two-islands' });
  const start = vi.fn(initial.startNewGame);
  useGameStore.setState({ ...initial, game: running, startNewGame: start });
  render(<TopBar />);
  const toggle = screen.getByRole('button', { name: 'New game' });
  fireEvent.click(toggle);
  const panel = screen.getByRole('group', { name: 'Confirm new game' });
  const form = within(panel);
  function choose(name: RegExp, choice: string) {
    const field = form.getByRole('combobox', { name });
    const option = within(field).getByRole<HTMLOptionElement>('option', { name: choice });
    fireEvent.change(field, { target: { value: option.value } });
  }
  return { running, start, toggle, panel, form, choose };
}

it('FR-595 defaults to Continent/Normal, offers only the three maps and two difficulties, and draws the empty seed at Start', () => {
  const { running, start, form, choose } = openOptions();
  const map = form.getByRole('combobox', { name: 'Map' });
  const difficulty = form.getByRole('combobox', { name: 'Difficulty' });
  const choices = (field: HTMLElement) => within(field).getAllByRole('option').map(el => el.textContent);
  expect(choices(map)).toEqual(['Continent', 'Two islands', 'Random']);
  expect(choices(difficulty)).toEqual(['Normal', 'Demo']);
  expect(within(map).getByRole('option', { selected: true }).textContent).toBe('Continent');
  expect(within(difficulty).getByRole('option', { selected: true }).textContent).toBe('Normal');
  expect(form.queryByLabelText(/length|turn limit/i)).toBeNull();
  expect(form.queryByRole('textbox', { name: /seed/i })).toBeNull();
  expect(form.queryByRole('combobox', { name: /size/i })).toBeNull();
  const draw = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  try {
    choose(/^Map$/, 'Random');
    const size = form.getByRole('combobox', { name: /size/i });
    expect(choices(size)).toEqual(['Standard', 'Large']);
    expect(within(size).getByRole('option', { selected: true }).textContent).toBe('Standard');
    expect(form.getByRole<HTMLInputElement>('textbox', { name: /seed/i }).value).toBe('');
    choose(/size/i, 'Large');
    fireEvent.change(form.getByRole('textbox', { name: /seed/i }), { target: { value: 'Brete' } });
    choose(/^Map$/, 'Continent');
    expect(form.queryByRole('textbox', { name: /seed/i })).toBeNull();
    expect(form.queryByRole('combobox', { name: /size/i })).toBeNull();
    expect(useGameStore.getState().game).toBe(running);
    expect(start).not.toHaveBeenCalled();
    expect(draw).not.toHaveBeenCalled();
    fireEvent.click(form.getByRole('button', { name: 'Start new game' }));
    expect(start).toHaveBeenCalledTimes(1);
    expect(start.mock.calls[0][0]?.seed).toBeUndefined();
    expect(start.mock.calls[0][0]?.randomMapSize).toBeUndefined();
    expect(draw).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().game).toMatchObject({ worldId: 'continent', difficulty: 'normal', turnLimit: 40 });
  } finally {
    draw.mockRestore();
  }
});

it.each([
  ['Start new game', 'Demo', 'demo'],
  ['Start Demo game', 'Normal', 'demo'],
  ['Start new game', 'Normal', 'normal'],
])('FR-595 %s with %s staged sends the parsed word and Random/Large to the store exactly once', (button, level, expected) => {
  const { running, start, form, choose } = openOptions();
  choose(/^Map$/, 'Random');
  choose(/size/i, 'Large');
  fireEvent.change(form.getByRole('textbox', { name: /seed/i }), { target: { value: '  Brete  ' } });
  choose(/^Difficulty$/, level);
  expect(useGameStore.getState().game).toBe(running);
  expect(start).not.toHaveBeenCalled();
  fireEvent.click(form.getByRole('button', { name: button }));
  expect(start).toHaveBeenCalledTimes(1);
  expect(start.mock.calls[0][0]).toMatchObject({ world: 'random', randomMapSize: 'large', seed: 2813929771, difficulty: expected });
  expect(useGameStore.getState().game).toMatchObject({ worldId: 'random', randomMapSize: 'large', seed: 2813929771, difficulty: expected });
  expect(screen.queryByRole('group', { name: 'Confirm new game' })).toBeNull();
});

it('FR-588 FR-595 invalid input has an inline accessible error, blocks both starts and clears when a valid decimal is entered', () => {
  const { running, start, panel, form, choose } = openOptions();
  choose(/^Map$/, 'Random');
  const seed = form.getByRole('textbox', { name: /seed/i });
  const buttons = ['Start new game', 'Start Demo game'].map(name => form.getByRole<HTMLButtonElement>('button', { name }));
  for (const invalid of ['4294967296', 'sea!']) {
    fireEvent.change(seed, { target: { value: invalid } });
    expect(seed.getAttribute('aria-invalid')).toBe('true');
    const described = (seed.getAttribute('aria-describedby') ?? '').split(/\s+/).map(id => document.getElementById(id));
    expect(described.some(el => el && panel.contains(el) && !el.hidden && /seed|number|word|digit|letter/i.test(el.textContent ?? ''))).toBe(true);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
    }
  }
  expect(start).not.toHaveBeenCalled();
  expect(useGameStore.getState().game).toBe(running);
  fireEvent.change(seed, { target: { value: ' 0000 ' } });
  expect(seed.getAttribute('aria-invalid')).not.toBe('true');
  for (const button of buttons) expect(button.disabled).toBe(false);
  fireEvent.click(buttons[0]);
  expect(start).toHaveBeenCalledTimes(1);
  expect(start.mock.calls[0][0]?.seed).toBe(0);
  expect(useGameStore.getState().game.seed).toBe(0);
});

it('FR-595 a fixed map can use its replay seed and cannot inherit a staged Large size', () => {
  const { start, form, choose } = openOptions();
  choose(/^Map$/, 'Random');
  choose(/size/i, 'Large');
  choose(/^Map$/, 'Two islands');
  expect(form.queryByLabelText(/size/i)).toBeNull();
  expect(form.queryByRole('textbox', { name: /seed/i })).toBeNull();
  fireEvent.click(form.getByRole('button', { name: 'Set replay seed' }));
  fireEvent.change(form.getByRole('textbox', { name: /seed/i }), { target: { value: '4294967295' } });
  fireEvent.click(form.getByRole('button', { name: 'Start new game' }));
  expect(start).toHaveBeenCalledTimes(1);
  expect(start.mock.calls[0][0]?.randomMapSize).toBeUndefined();
  expect(useGameStore.getState().game).toMatchObject({ worldId: 'two-islands', seed: 4294967295, difficulty: 'normal' });
  expect(useGameStore.getState().game).not.toHaveProperty('randomMapSize');
});

it.each(['Escape', 'Keep playing'])('FR-595 %s discards staged choices and returns focus to New game', (cancel) => {
  const { running, start, toggle, form, choose } = openOptions();
  choose(/^Map$/, 'Random');
  choose(/size/i, 'Large');
  const seed = form.getByRole('textbox', { name: /seed/i });
  fireEvent.change(seed, { target: { value: 'bad!' } });
  if (cancel === 'Escape') fireEvent.keyDown(seed, { key: 'Escape' });
  else fireEvent.click(form.getByRole('button', { name: cancel }));
  expect(screen.queryByRole('group', { name: 'Confirm new game' })).toBeNull();
  expect(document.activeElement).toBe(toggle);
  expect(start).not.toHaveBeenCalled();
  expect(useGameStore.getState().game).toBe(running);
  fireEvent.click(toggle);
  expect(screen.queryByRole('textbox', { name: /seed/i })).toBeNull();
  expect(within(screen.getByRole('combobox', { name: 'Map' })).getByRole('option', { selected: true }).textContent).toBe('Continent');
});
