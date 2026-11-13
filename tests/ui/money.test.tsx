// @vitest-environment jsdom
// M7 QA fix round, FR-258: one money format. The HUD's cash reads "Cash: $10,000", in the format of the Board of Trade and
// the Deal Book: `money` in components/gameText.ts, the one place that formats dollars (a loss's minus sign in front).
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { NationStats } from '@/components/HUD/NationStats';
import { MarketModal } from '@/components/MarketModal';
import { money } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import type { GameState } from '@/types/GameState';
import { setTreasury } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';
import { dollarFormatting } from './dollarScan';

failOnActWarnings();

const N1 = 'nation-1';
const ROOT = join(__dirname, '..', '..');

const show = (game: GameState) => {
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1, isMarketOpen: true });
  return render(<><NationStats /><MarketModal /></>);
};

/** Every source file under a folder. */
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe('FR-258 one money format', () => {
  it('FR-258 the HUD shows "Cash: $10,000" on a new game, the Board of Trade\'s "Cash: $10,000" beside it', () => {
    const view = show(newGame({ seed: 1, world: 'continent' }));
    expect(text(view.container.querySelector('.nation-stats')!)).toBe('Cash: $10,000');
    expect(text(within(screen.getByRole('dialog', { name: /Board of Trade/ })).getByTestId('market-cash'))).toBe('Cash: $10,000');
  });

  it('FR-258 thousands separators and a loss with its minus sign in front: "$9,200", "-$1,369"', () => {
    const view = show(setTreasury(newGame({ seed: 1, world: 'continent' }), N1, 9200));
    expect(text(view.container.querySelector('.nation-stats')!)).toBe('Cash: $9,200');
    expect([money(9200), money(-1369), money(0), money(1234567)]).toEqual(['$9,200', '-$1,369', '$0', '$1,234,567']);
  });

  it('FR-258 money is the one formatter: no other source file formats dollars', () => {
    const files = sources(join(ROOT, 'src', 'app'));
    const formatting = files.filter((f) => dollarFormatting(readFileSync(f, 'utf8'), f).length > 0).map((f) => f.slice(ROOT.length + 1).replace(/\\/g, '/'));
    expect(formatting).toEqual(['src/app/components/gameText.ts']);
  });

  it('FR-258 the guard finds every hand-made dollar amount: the three of TileInfoPanel before the fix, "$" joined with +, JSX "$" before {…}, NumberFormat, toLocaleString', () => {
    const caught = [
      // TileInfoPanel.tsx before 4d62a0b (lines 81, 101, 105): no thousands separator, missed by the first guard
      'const title = `Cost: $${PROSPECT_COST}`;',
      'let titleMessage = `${jobLabel} ($${DEVELOPMENT_COST[nextLevel]})`;',
      'titleMessage = `Not enough funds (need $${DEVELOPMENT_COST[nextLevel]})`;',
      'const a = "$" + cost;',
      "const b = 'Cost: $' + cost;",
      'const c = `Cost: $` + cost;',
      'const d = <span>Cost: ${cost}</span>;',
      'const e = <b>$ {cost}</b>;',
      'const f = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cost);',
      'const g = cost.toLocaleString("en-US");',
    ];
    for (const line of caught) expect({ line, found: dollarFormatting(line).length > 0 }).toEqual({ line, found: true });

    const clean = [
      'const h = `${a} and ${b}`;',
      'const i = `Cost: ${money(cost)}`;',
      'const j = <span>Cost: {money(cost)}</span>;',
      'const k = <th>Price ($)</th>;',
      "const l = '$' === sign;",
      'const m = /^\\$/.test(s);',
    ];
    for (const line of clean) expect({ line, found: dollarFormatting(line) }).toEqual({ line, found: [] });
  });
});
