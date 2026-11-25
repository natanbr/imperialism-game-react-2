// @vitest-environment jsdom
// FR-048 to FR-050: the warehouse dialog and the HUD show display names, the date and the food warning.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { WarehouseModal } from '@/components/WarehouseModal';
import { CouncilProjection, FoodWarning, NewsPanel, NextCouncil, TurnIndicator, UpkeepWarning } from '@/components/HUD/index';
import { useGameStore } from '@/store/rootStore';
import { councilVote, newGame, resolveTurn } from '@/engine';
import type { GameState } from '@/types/GameState';
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from '@/types/Resource';
import { TileInfoPanel } from '@/components/TileInfoPanel';
import { artFileOf, goodsArt } from '@/components/art/inkArt';
import { emptyWarehouse, game, N1, N2, setIndustry, setPair, setTile, setTreasury, T } from '../engine/fixtures';
import { continent, N3, NE1, SUNDMARK, threePowers } from '../engine/armyFixtures';
import { transferProvince } from '@/engine/world/provinces';
import { text } from './domText';
import { failOnActWarnings } from './actWarnings';
import { readFileSync } from 'fs';
import { join } from 'path';
import { HUD } from '@/components/HUD';
import { TopBar } from '@/components/HUD/TopBar';
import { TERRAIN_TEXT } from '@/components/gameText';
import { WorkerStatus } from '@/types/Workers';

// FR-110 (f): every test here fails on a React act() warning
failOnActWarnings();

function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
}

describe('FR-050 warehouse dialog', () => {
  it('FR-606 keeps starting, imported and saved stocks alongside the public source on the active map', () => {
    const islands = newGame({ seed: 1, world: 'two-islands' });
    // Keep opening Wool; represent previously received and saved stocks independently of domestic production.
    const state = { ...islands, nations: islands.nations.map(n => n.id === N1 ? {
      ...n, technologies: ['oilDrilling' as const], warehouse: { ...n.warehouse, fish: 3, oil: 2, fuel: 1 },
    } : n) };
    show(state, { isWarehouseOpen: true });
    render(<WarehouseModal />);
    const stock = (key: string) => text(screen.getByTestId(`stock-${key}`));
    for (const [key, amount, source] of [
      ['wool', '10', 'World market sells this'], ['fish', '3', 'No known supply'],
      ['oil', '2', 'No known supply'], ['fuel', '1', 'World market sells this'], ['horses', '0', 'World market sells this'],
    ]) {
      expect(stock(key), key).toContain(amount);
      expect(stock(key), key).toContain(`No known local source · ${source}`);
    }
    act(() => show(newGame({ seed: 1, world: 'continent' }), { isWarehouseOpen: true }));
    expect(stock('horses')).toBe('Horses 4');
    expect(stock('wool')).toContain('No known local source · Another power may offer this');
    act(() => show(newGame({ seed: 1, world: 'random' }), { isWarehouseOpen: true }));
    expect(stock('horses')).toContain('No known local source');
    expect(stock('horses')).toContain('4');
  });

  it('FR-606 a known productive site can be disconnected; hidden and foreign sites cannot explain our stock', () => {
    const oil = { type: ResourceType.Oil, level: 1 };
    const hidden = setTile(game(), T.orchard1, { resource: { ...oil, discovered: false } });
    show(hidden, { isWarehouseOpen: true });
    render(<WarehouseModal />);
    const note = () => text(screen.getByTestId('stock-oil'));
    expect(note()).toContain('No known local source');
    const known = setTile(hidden, T.orchard1, { resource: { ...oil, discovered: true } });
    act(() => show(known, { isWarehouseOpen: true }));
    expect(note()).toBe('Oil 0');
    act(() => show(known, { isWarehouseOpen: true, activeNationId: N2 }));
    expect(note()).toContain('No known local source');
  });

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

  // M11 FR-331 (Q75): a picture the Warehouse had none of before; FR-334 its title shows the warehouse building
  it("FR-331 FR-334 each of the 21 rows shows its commodity's goods picture before the name, decorative; the row's text is unchanged", () => {
    show(emptyWarehouse(game(), N1, { cannedFood: 12, ironOre: 3, furniture: 1 }), { isWarehouseOpen: true });
    render(<WarehouseModal />);
    const rows = screen.getAllByTestId(/^stock-/);
    expect(rows).toHaveLength(21);
    for (const row of rows) {
      const key = row.getAttribute('data-testid')!.replace('stock-', '') as WarehouseCommodities;
      const pictures = [...row.querySelectorAll('img')];
      expect(pictures.map((img) => img.getAttribute('data-art')), key).toEqual([artFileOf(goodsArt(key))]);
      expect(pictures[0].getAttribute('alt'), key).toBe('');
      expect(pictures[0].hasAttribute('data-art-inline'), key).toBe(true);
    }
    expect(text(screen.getByTestId('stock-cannedFood'))).toBe('Canned Food 12');
    expect(screen.getByTestId('stock-cannedFood').querySelector('img')?.getAttribute('data-art')).toBe('goods/canned-food.png');
    expect(text(screen.getByTestId('stock-ironOre'))).toBe('Iron Ore 3');
    // The fixture's nation 1 is Britannia
    const dialog = screen.getByRole('dialog', { name: 'Warehouse — Britannia' });
    const title = within(dialog).getByRole('heading', { level: 3, name: 'Warehouse — Britannia' });
    expect(title.firstElementChild?.getAttribute('data-art')).toBe('buildings/warehouse.png');
    expect(title.querySelector('svg')).toBeNull();
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
    // M12 FR-393: the warning names the shortfall and the regiments it would disband (the M8 wording was "Cash is short
    // of the army upkeep: ... the newest regiments are disbanded.")
    expect(text(screen.getByTestId('upkeep-warning'))).toBe(
      "Army upkeep of $100 is due at End Turn and the treasury will hold $60: $40 short. Unless this turn's sales bring in $40, 1 regiment is disbanded (1st Artillery)."
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
  // FR-503/506: on two-power worlds nine votes became seven. Show that threshold before the date; preserve both in the title.
  /** The text of the elements an element's aria-describedby names: its accessible description. */
  const description = (el: HTMLElement): string =>
    (el.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
  const PROJECTION = 'If it met now: Testland 4, Valdoria 4, abstain 4 of 12; 7 needed';
  // M12b T2 (docs/specs/hud.md section 2b): the line goes to the top bar's turn block and the projection to the pane's Nation
  // group, so they are two components now; these tests render both (was <NextCouncil /> alone), assertions unchanged
  const Council = () => (
    <>
      <NextCouncil />
      <CouncilProjection />
    </>
  );

  it('FR-301 FR-314 a new continent game: "Next Council: turn 10 (Summer 1817)"; under it the projected vote, shown, which is also its description', () => {
    show(continent());
    render(<><TurnIndicator /><Council /></>);
    const line = screen.getByTestId('next-council');
    expect(text(line)).toBe('7 of 12 votes wins · Council: turn 10 (Summer 1817). This threshold applies at any meeting. At the last meeting (turn 40) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).');
    const projection = screen.getByTestId('council-projection');
    expect(text(projection)).toBe(PROJECTION);
    // Shown, not only a hover title (QA item 4): not in a title, not hidden, the line's accessible description. Pin moved
    // (M12b review A11Y-5, old -> new): "the line has no title" -> "its title is its own text, never the projection": in a
    // narrow top bar the line ends in an ellipsis, and the title gives the cut text back
    expect(line.getAttribute('title')).toBe('7 of 12 votes wins · Council: turn 10 (Summer 1817). This threshold applies at any meeting. At the last meeting (turn 40) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).');
    expect(line.getAttribute('title')).not.toContain('If it met now');
    expect(projection.closest('[hidden]')).toBeNull();
    expect(description(line)).toBe(PROJECTION);
    expect(line.getAttribute('aria-describedby')).toBe(projection.id);
    // The turn indicator's own text is unchanged (FR-048)
    expect(text(screen.getByTestId('turn-indicator'))).toBe('Turn: 1 of 40 Spring 1815');
  });

  it('FR-301 on turn 11 "Next Council: turn 20 (Winter 1819)"; on a meeting turn "Council: this turn"', () => {
    show({ ...continent(), turn: 11, year: 1817 });
    const { rerender } = render(<NextCouncil />);
    expect(text(screen.getByTestId('next-council'))).toBe('7 of 12 votes wins · Council: turn 20 (Winter 1819). This threshold applies at any meeting. At the last meeting (turn 40) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).');

    act(() => show({ ...continent(), turn: 10, year: 1817 }));
    rerender(<NextCouncil />);
    expect(text(screen.getByTestId('next-council'))).toBe('7 of 12 votes wins · Council: this turn. This threshold applies at any meeting. At the last meeting (turn 40) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).');

    act(() => show({ ...continent(), turn: 40, year: 1824 }));
    rerender(<NextCouncil />);
    expect(text(screen.getByTestId('next-council'))).toBe('7 of 12 votes wins · Council: this turn. This threshold applies at any meeting. At the last meeting (turn 40) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).');

    act(() => show({ ...continent(), turn: 31, year: 1822 }));
    rerender(<NextCouncil />);
    expect(text(screen.getByTestId('next-council'))).toBe('7 of 12 votes wins · Council: turn 40 (Winter 1824). This threshold applies at any meeting. At the last meeting (turn 40) a free minor votes unless it is at war with both nominees, and the nominee with more votes wins (equal votes: higher standing).');
  });

  it("FR-301 FR-313 the projection follows the game, the player's nation first: Valdoria, the 1st nominee holding Testland North-East, reads second", () => {
    show(transferProvince(continent(), NE1, N2));
    render(<Council />);
    const line = screen.getByTestId('next-council');
    expect(text(screen.getByTestId('council-projection'))).toBe('If it met now: Testland 3, Valdoria 5, abstain 4 of 12; 7 needed');
    expect(description(line)).toBe(text(screen.getByTestId('council-projection')));
  });

  it('FR-313 a player that is not a nominee (three Great Powers, Carthia the third) sees the projection in standing order: Valdoria, the 1st nominee, first (review F2)', () => {
    // Valdoria holds Testland North-East (4 provinces to 3); Carthia's province abstains (the nominees are equally strong)
    const s = transferProvince(threePowers(continent()), NE1, N2);
    expect(councilVote(s)!.nominees.map((n) => n.nationId)).toEqual([N2, N1]);
    show(s, { activeNationId: N3 });
    render(<Council />);
    const projection = screen.getByTestId('council-projection');
    expect(text(projection)).toBe('If it met now: Valdoria 4, Testland 3, abstain 5 of 12; 9 needed');
    expect(description(screen.getByTestId('next-council'))).toBe(text(projection));
  });

  it('FR-313 FR-314 the projection counts the abstentions: Sundmark at 52 with Testland votes, 3 abstain', () => {
    show(setPair(continent(), SUNDMARK, N1, { points: 52 }));
    render(<Council />);
    expect(text(screen.getByTestId('council-projection'))).toBe('If it met now: Testland 5, Valdoria 4, abstain 3 of 12; 7 needed');
  });

  it('FR-501 FR-502 FR-543 the final forecast explains a 5–4 win with three abstentions below the seven-vote threshold', () => {
    let state = setPair(continent(), SUNDMARK, N1, { points: 52 });
    for (const minor of state.minorNations.filter(m => m.id !== SUNDMARK)) {
      for (const nominee of [N1, N2]) {
        state = setPair(state, minor.id, nominee, { war: { aggressors: [nominee], since: 1 } });
      }
    }
    show({ ...state, turn: 30 });
    render(<Council />);
    const projection = screen.getByTestId('council-projection');
    expect(text(projection)).toBe('If it met now: Testland 5, Valdoria 4, abstain 3 of 12; 7 needed');

    act(() => show({ ...state, turn: 31 }));
    expect(text(projection)).toBe('If it met now: Testland 5, Valdoria 4, abstain 3 of 12; Testland wins on votes');
    expect(description(screen.getByTestId('next-council'))).toBe(text(projection));
  });

  it('FR-502 FR-543 a tied final forecast names the winner by standing or turn order', () => {
    let state = continent();
    for (const [index, minor] of state.minorNations.entries()) {
      state = setPair(state, minor.id, index < 2 ? N1 : N2, { points: 40 });
    }
    show({ ...setTreasury(state, N2, 100_000), turn: 40 });
    render(<Council />);
    const projection = screen.getByTestId('council-projection');
    expect(text(projection)).toBe('If it met now: Testland 6, Valdoria 6, abstain 0 of 12; Valdoria wins on standing');

    act(() => show({ ...state, turn: 40 }));
    expect(text(projection)).toBe('If it met now: Testland 6, Valdoria 6, abstain 0 of 12; Valdoria wins by turn order');
  });

  it('FR-503 FR-543 an outright win names the nominee who reaches the threshold at either meeting', () => {
    let state = continent();
    for (const minor of state.minorNations.slice(0, 3)) {
      state = setPair(state, minor.id, N1, { points: 55 });
    }
    show({ ...state, turn: 30 });
    render(<Council />);
    const projection = screen.getByTestId('council-projection');
    expect(text(projection)).toMatch(/Testland reaches the 7-vote threshold$/);
    act(() => show({ ...state, turn: 31 }));
    expect(text(projection)).toMatch(/Testland reaches the 7-vote threshold$/);
  });

  it('FR-301 when councilVote gives no vote (fewer than two Great Powers holding a province) the line shows without a tooltip or a description (review R7)', () => {
    // Hand-built: Testland holds all of Valdoria's provinces but the turn has not resolved, so the game is not over yet
    const alone = ['province-nation-2-nw', 'province-nation-2-ne', 'province-nation-2-sw', 'province-nation-2-se'].reduce(
      (s, provinceId) => transferProvince(s, provinceId, N1),
      continent()
    );
    show(alone);
    const { container } = render(<Council />);
    const line = screen.getByTestId('next-council');
    expect(text(line)).toBe('Next Council: turn 10 (Summer 1817)');
    // Pin moved (M12b review A11Y-5, old -> new): "no title" -> "the title is the line's own text" (no projection in it)
    expect(line.getAttribute('title')).toBe(text(line));
    expect(line.hasAttribute('aria-describedby')).toBe(false);
    expect(container.querySelectorAll('[hidden]')).toHaveLength(0);
    expect(screen.queryByTestId('council-projection')).toBeNull();
  });

  it('FR-301 absent on two-islands, after game over, and after the turn-40 meeting', () => {
    show(game());
    const { rerender } = render(<NextCouncil />);
    expect(screen.queryByTestId('next-council')).toBeNull();

    act(() => show({ ...continent(), gameOver: { turn: 40, year: 1824, scores: [] } }));
    rerender(<NextCouncil />);
    expect(screen.queryByTestId('next-council')).toBeNull();

    // A longer game past its last meeting (turn limit 45): no meeting is left
    act(() => show({ ...continent(), turn: 41, year: 1825, turnLimit: 45 }));
    rerender(<NextCouncil />);
    expect(screen.queryByTestId('next-council')).toBeNull();
  });

  it('FR-301 after the turn-40 meeting of a real game the game is over: no line', () => {
    const s = { ...continent('world'), turn: 40, year: 1824 };
    const over = resolveTurn(s, {}, s.seed).state;
    expect(over.gameOver).toBeDefined();
    show(over);
    render(<NextCouncil />);
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

// M12 (NR-033), lane L2. FR-371 (UIV-04, card Q81): a selected tile's Tile Info comes right under the turn, cash and
// score lines, before the score table, the warnings and the news, and it is a line shorter (the river is on the terrain
// line). FR-377 (ECONOMY-18, UIV-07, card Q102): the Debug box shows only with `debug` in the URL's query. FR-424
// (UIV-06): below 500 px of window height the action buttons are a two-column grid and the header's New game and About
// show their icons only (names unchanged), so the turn, the date, the cash and the score fit at 640x360.
describe('FR-371 FR-377 FR-424 the HUD column', () => {
  const capitalTile = (state: GameState) => {
    const cityId = state.nations.find((n) => n.id === N1)!.cities[0];
    return state.map.tiles.flat().find((t) => t.cityId === cityId)!;
  };
  const parts = (container: HTMLElement) =>
    [...container.querySelector('.hud-content')!.children].map((el) => el.getAttribute('data-testid') ?? el.className);

  // M12b FR-470 (replaces the FR-371 order test, whose "right after the score line" order was
  // [turn, cash, score, tile-info, score-table, next-council, council-projection, warnings, news]: the turn, cash and
  // score went to the top bar, the score table and the projection to the Nation group, so Tile Info comes first)
  it('FR-470 the pane holds, in order, Tile Info, the alerts, the news and the groups', () => {
    // No cash: the upkeep warning shows too
    const state = setTreasury(continent(), N1, 0);
    show(state, { selectedTileId: capitalTile(state).id });
    const { container } = render(<HUD />);
    expect(parts(container)).toEqual(['tile-info', 'hud-alerts', 'news-panel', 'hud-groups']);
    expect(screen.getByTestId('upkeep-warning').closest('[data-testid="hud-alerts"]')).not.toBeNull();
    expect(screen.queryByTestId('tile-info-none')).toBeNull();
  });

  it('FR-470 with no tile selected a placeholder line stands first (TileInfoPanel itself still draws nothing, FR-315); no alert, no alerts block', () => {
    // Every civilian of the player at work, no army (two-islands), the meal covered: nothing to alert
    const state = game();
    const busy = {
      ...state,
      map: {
        ...state.map,
        tiles: state.map.tiles.map((row) =>
          row.map((t) => ({ ...t, workers: t.workers.map((w) => (w.nationId === N1 ? { ...w, status: WorkerStatus.Working } : w)) }))
        ),
      },
    };
    show(busy);
    const { container } = render(<HUD />);
    expect(parts(container)).toEqual(['tile-info-none', 'news-panel', 'hud-groups']);
    expect(text(screen.getByTestId('tile-info-none'))).toBe('No tile selected: click a tile on the map.');
    expect(screen.queryByTestId('tile-info')).toBeNull();
  });

  it('FR-371 the river is on the terrain line, not a line of its own: "Terrain: <terrain>, river"', () => {
    const plain = continent();
    const capital = capitalTile(plain);
    const state = setTile(plain, capital.id, { hasRiver: true });
    show(state);
    const tile = state.map.tiles.flat().find((t) => t.id === capital.id)!;
    const { rerender } = render(<TileInfoPanel selectedTile={tile} />);
    const info = screen.getByTestId('tile-info');
    expect(text(screen.getByTestId('tile-terrain'))).toBe(`Terrain: ${TERRAIN_TEXT[tile.terrain]}, river`);
    expect([...info.querySelectorAll('p')].map(text).filter((line) => line.startsWith('River'))).toEqual([]);
    rerender(<TileInfoPanel selectedTile={{ ...tile, hasRiver: false }} />);
    expect(text(screen.getByTestId('tile-terrain'))).toBe(`Terrain: ${TERRAIN_TEXT[tile.terrain]}`);
  });

  // M12b FR-476 (replaces FR-377's test, "no Debug box without ?debug; with it 'Debug Tile: x,y (id …) Seed: N'"):
  // Nathan kept the details for everyone (card Q102), in the closed group "Details for bug reports", with more lines
  it('FR-476 with or without ?debug the Details for bug reports group holds the tile and the seed, closed until opened', () => {
    const state = continent();
    const capital = capitalTile(state);
    show(state, { selectedTileId: capital.id });
    for (const path of ['/', '/?debug']) {
      window.history.replaceState(null, '', path);
      try {
        const { container, unmount } = render(<HUD />);
        const debug = container.querySelector('.hud-debug-section') as HTMLElement;
        expect(debug, path).not.toBeNull();
        expect(debug.hidden, path).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Details for bug reports' }));
        expect(debug.hidden, path).toBe(false);
        const lines = [...debug.querySelectorAll('[data-testid="hud-debug-line"]')].map((el) => text(el));
        expect(lines.slice(0, 2), path).toEqual([`Tile: ${capital.x},${capital.y} (id ${capital.id})`, `Seed: ${state.seed}`]);
        unmount();
      } finally {
        window.history.replaceState(null, '', '/');
      }
    }
  });

  // M12b T2 re-recorded (FR-467, FR-468; docs/specs/hud.md section 5). Old: under max-height 499.98px the action buttons
  // were a 1fr 1fr grid with the Center/Advance Turn row across, the header one row and .hud-header-label clipped. New: the
  // header and the buttons left the pane for the top bar, which keeps the turn, date, cash and score in sight at 640x360
  // (two 40 px rows, e2e/m13-hud.spec.ts), so no window-height rule is left for them; the labels are .topbar-label spans,
  // hidden from sight (clip-path, still the name) below 1800 px of width (measured: the row with labels needs 1746 px).
  it('FR-424 FR-468 no window-height rule is left for the old header and button grid; the bar\'s labels are hidden from sight only, below 1800 px of width', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'src/app/globals.css'), 'utf8');
    const blocks: string[] = [];
    for (let at = css.indexOf('@media (max-height: 499.98px) {'); at >= 0; at = css.indexOf('@media (max-height: 499.98px) {', at + 1))
      blocks.push(css.slice(at, css.indexOf('\n}', at)));
    for (const block of blocks) expect(block).not.toMatch(/action-buttons-container|hud-header|btn-group/);
    const at = css.indexOf('@media (max-width: 1799.98px) {');
    expect(at).toBeGreaterThanOrEqual(0);
    // The label is hidden from sight only: it still names the button
    expect(css.slice(at, css.indexOf('\n}', at))).toMatch(/\.topbar-label \{[^}]*clip-path: inset\(50%\);/);
  });

  // M12b T2 re-recorded: New game and About are in the top bar (was the pane's header): rendered from <TopBar />, their
  // label span is .topbar-label (was .hud-header-label); the names are unchanged
  it('FR-424 New game and About keep their names (the label is a span the bar hides from sight only)', () => {
    show(continent());
    render(<TopBar />);
    for (const name of ['New game', 'About']) {
      const button = screen.getByRole('button', { name });
      expect(text(button.querySelector('.topbar-label') as HTMLElement)).toBe(name);
    }
  });
});
