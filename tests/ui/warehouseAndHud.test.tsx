// @vitest-environment jsdom
// FR-048 to FR-050: the warehouse dialog and the HUD show display names, the date and the food warning.
import { describe, it, expect } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { WarehouseModal } from '@/components/WarehouseModal';
import { FoodWarning, NewsPanel, TurnIndicator, UpkeepWarning } from '@/components/HUD/index';
import { useGameStore } from '@/store/rootStore';
import { councilVote, resolveTurn } from '@/engine';
import type { GameState } from '@/types/GameState';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { TileInfoPanel } from '@/components/TileInfoPanel';
import { emptyWarehouse, game, N1, N2, setIndustry, setPair, setTile, setTreasury, T } from '../engine/fixtures';
import { continent, N3, NE1, SUNDMARK, threePowers } from '../engine/armyFixtures';
import { transferProvince } from '@/engine/world/provinces';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';

// FR-110 (f): every test here fails on a React act() warning
failOnActWarnings();

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
}

describe('FR-050 warehouse dialog', () => {
  it('FR-056 lists every commodity but gold and gems by display name with its stock, grouped as resources, materials and goods', () => {
    show(emptyWarehouse(game(), N1, { cannedFood: 12, ironOre: 3, furniture: 1 }), { isWarehouseOpen: true });
    render(<WarehouseModal />);

    const groups = screen.getAllByRole('region').map(r => r.getAttribute('aria-label'));
    expect(groups).toEqual(['Resources', 'Materials', 'Goods']);
    const resources = within(screen.getByRole('region', { name: 'Resources' }));
    const materials = within(screen.getByRole('region', { name: 'Materials' }));
    const goods = within(screen.getByRole('region', { name: 'Goods' }));

    expect(text(materials.getByTestId('stock-cannedFood'))).toBe('Canned Food 12');
    expect(text(resources.getByTestId('stock-ironOre'))).toBe('Iron Ore 3');
    expect(text(goods.getByTestId('stock-furniture'))).toBe('Furniture 1');
    const rows = screen.getAllByTestId(/^stock-/);
    // Gold and gems never enter the warehouse (rules 05 section 2).
    expect(rows).toHaveLength(Object.values(ResourceType).length - 2 + Object.values(MaterialType).length + Object.values(GoodsType).length);
    expect(screen.queryByTestId('stock-gold')).toBeNull();
    expect(screen.queryByTestId('stock-gems')).toBeNull();
    for (const row of rows) expect(text(row)).not.toMatch(/[a-z][A-Z]/); // no camelCase key on screen
  });
});

describe('FR-261 the HUD upkeep warning (M8 review F2)', () => {
  it('FR-261 none while the cash covers the army upkeep, and none on two-islands (no army)', () => {
    show(continent());
    const { unmount } = render(<UpkeepWarning />);
    expect(screen.queryByTestId('upkeep-warning')).toBeNull();
    unmount();

    show(game());
    render(<UpkeepWarning />);
    expect(screen.queryByTestId('upkeep-warning')).toBeNull();
  });

  it('FR-261 shown while the cash End Turn will find is below the upkeep; none after game over', () => {
    const short = setTreasury(continent(), N1, 60);
    show(short);
    const { unmount } = render(<UpkeepWarning />);
    expect(screen.getByTestId('upkeep-warning').getAttribute('role')).toBe('status');
    expect(text(screen.getByTestId('upkeep-warning'))).toBe(
      "Cash is short of the army upkeep: $100 is due at End Turn and $60 will be left. Unless this turn's sales cover the rest, the newest regiments are disbanded."
    );
    unmount();

    show({ ...short, gameOver: { turn: 40, year: 1824, scores: [] } as unknown as GameState['gameOver'] });
    render(<UpkeepWarning />);
    expect(screen.queryByTestId('upkeep-warning')).toBeNull();
  });
});

describe('FR-048 FR-049 HUD', () => {
  it('FR-048 FR-075 shows the turn of the turn limit and the season and year', () => {
    const g = game();
    show(g);
    const { rerender } = render(<TurnIndicator />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 of 40 Spring 1815');

    act(() => show(resolveTurn(g, {}, 1).state));
    rerender(<TurnIndicator />);
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 2 of 40 Summer 1815');
  });

  it('FR-049 no food warning when the forecast feeds everyone', () => {
    show(game());
    render(<FoodWarning />);
    expect(screen.queryByTestId('food-warning')).toBeNull();
  });

  it('FR-049 a food warning when the coming meal is short', () => {
    let s = emptyWarehouse(game(), N1, { grain: 20 });
    for (const tileId of [T.farm1, T.dryPlains1, T.homeOrchard1, T.range1]) s = setTile(s, tileId, { resource: undefined });
    show(setIndustry(s, N1, { workers: { untrained: 4, trained: 2, expert: 1 } }));
    render(<FoodWarning />);
    expect(text(screen.getByTestId('food-warning'))).toBe(
      'Food is short: at the end of this turn 3 workers will eat the wrong food and fall sick.'
    );
  });

  it('FR-050 the news names goods by display name', () => {
    show(game(), {
      eventLog: [{ turn: 1, year: 1815, events: [{ type: 'goods-produced', nationId: N1, output: MaterialType.CannedFood, amount: 2 }] }],
    });
    render(<NewsPanel />);
    expect(text(screen.getByTestId('news-panel'))).toContain('Produced 2 Canned Food.');
  });
});

// M10 UI half. FR-301 (Imp1 Council Projection, rules 11 section 8.2; remake: the exact count): on a world with provinces the
// turn indicator shows "Next Council: turn 20 (Winter 1819)" ("Council: this turn" on a meeting turn), whose title and
// accessible description give the vote the Council would give now, first nominee first. Absent on two-islands, after
// the turn-40 meeting and after game over. QA fix round: the projection shown (FR-314), the player's nation first, a player
// that is not a nominee the standing order (FR-313).
describe('FR-301 the next Council in the HUD', () => {
  /** The text of the elements an element's aria-describedby names: its accessible description. */
  const description = (el: HTMLElement): string =>
    (el.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
  const PROJECTION = 'If it met now: Testland 4, Valdoria 4, abstain 4 of 12; 9 needed';

  it('FR-301 FR-314 a new continent game: "Next Council: turn 10 (Summer 1817)"; under it the projected vote, shown, which is also its description', () => {
    show(continent());
    render(<TurnIndicator />);
    const line = screen.getByTestId('next-council');
    expect(text(line)).toBe('Next Council: turn 10 (Summer 1817)');
    const projection = screen.getByTestId('council-projection');
    expect(text(projection)).toBe(PROJECTION);
    // Shown, not only a hover title (QA item 4): no title, not hidden, the line's accessible description
    expect(line.hasAttribute('title')).toBe(false);
    expect(projection.closest('[hidden]')).toBeNull();
    expect(description(line)).toBe(PROJECTION);
    expect(line.getAttribute('aria-describedby')).toBe(projection.id);
    // The turn indicator's own text is unchanged (FR-048)
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 of 40 Spring 1815');
  });

  it('FR-301 on turn 11 "Next Council: turn 20 (Winter 1819)"; on a meeting turn "Council: this turn"', () => {
    show({ ...continent(), turn: 11, year: 1817 });
    const { rerender } = render(<TurnIndicator />);
    expect(text(screen.getByTestId('next-council'))).toBe('Next Council: turn 20 (Winter 1819)');

    act(() => show({ ...continent(), turn: 10, year: 1817 }));
    rerender(<TurnIndicator />);
    expect(text(screen.getByTestId('next-council'))).toBe('Council: this turn');

    act(() => show({ ...continent(), turn: 40, year: 1824 }));
    rerender(<TurnIndicator />);
    expect(text(screen.getByTestId('next-council'))).toBe('Council: this turn');

    act(() => show({ ...continent(), turn: 31, year: 1822 }));
    rerender(<TurnIndicator />);
    expect(text(screen.getByTestId('next-council'))).toBe('Next Council: turn 40 (Winter 1824)');
  });

  it("FR-301 FR-313 the projection follows the game, the player's nation first: Valdoria, the 1st nominee holding Testland North-East, reads second", () => {
    show(transferProvince(continent(), NE1, N2));
    render(<TurnIndicator />);
    const line = screen.getByTestId('next-council');
    expect(text(screen.getByTestId('council-projection'))).toBe('If it met now: Testland 3, Valdoria 5, abstain 4 of 12; 9 needed');
    expect(description(line)).toBe(text(screen.getByTestId('council-projection')));
  });

  it('FR-313 a player that is not a nominee (three Great Powers, Carthia the third) sees the projection in standing order: Valdoria, the 1st nominee, first (review F2)', () => {
    // Valdoria holds Testland North-East (4 provinces to 3); Carthia's province abstains (the nominees are equally strong)
    const s = transferProvince(threePowers(continent()), NE1, N2);
    expect(councilVote(s)!.nominees.map((n) => n.nationId)).toEqual([N2, N1]);
    show(s, { activeNationId: N3 });
    render(<TurnIndicator />);
    const projection = screen.getByTestId('council-projection');
    expect(text(projection)).toBe('If it met now: Valdoria 4, Testland 3, abstain 5 of 12; 9 needed');
    expect(description(screen.getByTestId('next-council'))).toBe(text(projection));
  });

  it('FR-313 FR-314 the projection counts the abstentions: Sundmark at 52 with Testland votes, 3 abstain', () => {
    show(setPair(continent(), SUNDMARK, N1, { points: 52 }));
    render(<TurnIndicator />);
    expect(text(screen.getByTestId('council-projection'))).toBe('If it met now: Testland 5, Valdoria 4, abstain 3 of 12; 9 needed');
  });

  it('FR-301 when councilVote gives no vote (fewer than two Great Powers holding a province) the line shows without a tooltip or a description (review R7)', () => {
    // Hand-built: Testland holds all of Valdoria's provinces but the turn has not resolved, so the game is not over yet
    const alone = ['province-nation-2-nw', 'province-nation-2-ne', 'province-nation-2-sw', 'province-nation-2-se'].reduce(
      (s, provinceId) => transferProvince(s, provinceId, N1),
      continent()
    );
    show(alone);
    const { container } = render(<TurnIndicator />);
    const line = screen.getByTestId('next-council');
    expect(text(line)).toBe('Next Council: turn 10 (Summer 1817)');
    expect(line.hasAttribute('title')).toBe(false);
    expect(line.hasAttribute('aria-describedby')).toBe(false);
    expect(container.querySelectorAll('[hidden]')).toHaveLength(0);
    expect(screen.queryByTestId('council-projection')).toBeNull();
  });

  it('FR-301 absent on two-islands, after game over, and after the turn-40 meeting', () => {
    show(game());
    const { rerender } = render(<TurnIndicator />);
    expect(screen.queryByTestId('next-council')).toBeNull();

    act(() => show({ ...continent(), gameOver: { turn: 40, year: 1824, scores: [] } }));
    rerender(<TurnIndicator />);
    expect(screen.queryByTestId('next-council')).toBeNull();

    // A longer game past its last meeting (turn limit 45): no meeting is left
    act(() => show({ ...continent(), turn: 41, year: 1825, turnLimit: 45 }));
    rerender(<TurnIndicator />);
    expect(screen.queryByTestId('next-council')).toBeNull();
  });

  it('FR-301 after the turn-40 meeting of a real game the game is over: no line', () => {
    const s = { ...continent('world'), turn: 40, year: 1824 };
    const over = resolveTurn(s, {}, s.seed).state;
    expect(over.gameOver).toBeDefined();
    show(over);
    render(<TurnIndicator />);
    expect(screen.queryByTestId('next-council')).toBeNull();
  });
});

// M10 QA fix round. FR-315 (item 5): at game over the HUD has the Final scores button too, so the news list had no whole
// line left for the Council line (e2e/m10-council.spec.ts measures it). The HUD gives the news the height of the "No tile
// selected" line: with no tile selected the tile section shows nothing; and the game-over date line is a 16 px line.
describe('FR-315 HUD room for the news at game over', () => {
  it('FR-315 with no tile selected the tile section shows nothing: no "No tile selected" line', () => {
    show(continent());
    const { container } = render(<TileInfoPanel selectedTile={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('FR-315 the game-over turn indicator is marked as such (its date line is 16 px, globals.css), its text unchanged', () => {
    show({ ...continent(), gameOver: { turn: 40, year: 1824, scores: [] } });
    render(<TurnIndicator />);
    const indicator = screen.getByTestId('turn-indicator');
    expect(text(indicator)).toBe('Game over after turn 40 of 40 Winter 1824');
    expect(indicator.classList.contains('turn-indicator-over')).toBe(true);
  });
});
