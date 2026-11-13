// @vitest-environment jsdom
// M8 QA fix round, item 6. FR-268: the HUD's news list shows the player's own lines first (FR-107) and is its own scroll
// region, named by its heading and reachable with the keyboard, so every line can be read without the HUD's fade
// (FR-235) hiding one. The layout (whole lines, above the fade, scrolled to the last line) is checked in the running
// app: e2e/m8-qa.spec.ts.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NewsPanel } from '@/components/HUD/index';
import { useGameStore } from '@/store/rootStore';
import type { GameEvent } from '@/engine';
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

  it('FR-268 the list is its own scroll region: named by the heading "News, turn 3 (1815)" and reachable with Tab', () => {
    showNews(EVENTS);
    const list = screen.getByRole('list', { name: 'News, turn 3 (1815)' });
    expect(list.dataset.testid).toBe('news-list');
    expect(list.tabIndex).toBe(0);
    expect(text(screen.getByRole('heading', { name: 'News, turn 3 (1815)' }))).toBe('News, turn 3 (1815)');
  });
});
