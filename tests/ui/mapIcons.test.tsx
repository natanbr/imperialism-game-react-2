// @vitest-environment jsdom
// M11 (NR-032) rewrote these FR-085 map tests for the art pack's pictures. FR-322: each land tile shows one pack picture
// (`tile-icon`, alt "", 40 x 40) for what it holds, the sea none; it never shrinks or moves for civilians, except on a
// capital or town (FR-346, QA, replacing FR-341's 24 px: 48 px, lifted 18 px, while civilians or a minor's name tag stand
// there, the civilians in the corner and the army chip low). FR-323:
// a known mineral or oil shows its goods picture as a 16 px mark at the bottom-left, the level badge "L1" stays, the
// river marker stays GiRiver beside the mark. FR-325: worker buttons, and another nation's lone civilian, show the
// civilian's figure; another nation's group keeps GiMeepleGroup; the selected button adds an accent outline.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, within } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import tileStyles from '@/components/Tile/Tile.module.css';
import { artFileOf, civilianArt, fortArt, goodsArt, tileArt } from '@/components/art/inkArt';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { TerrainType, type Tile } from '@/types/Tile';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';

const ROOT = join(__dirname, '..', '..');
const N = 'nation-1';
const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N, ...ui });
const tileOf = (game: GameState, id: string): Tile => game.map.tiles.flat().find((t) => t.id === id)!;
const isSea = (terrain: string | null) => terrain === TerrainType.Water || terrain === TerrainType.River || terrain === TerrainType.Coast;
/** The game with some tiles changed (hand-built tiles: the real worlds hold only eight terrains). */
const withTiles = (game: GameState, patches: Record<string, Partial<Tile>>): GameState => ({
  ...game,
  map: { ...game.map, tiles: game.map.tiles.map((row) => row.map((t) => (patches[t.id] ? { ...t, ...patches[t.id] } : t))) },
});
const css = readFileSync(join(ROOT, 'src/app/components/Tile/Tile.module.css'), 'utf8');
const rule = (name: string) => new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

describe('FR-322 the tile picture', () => {
  const game = newGame({ seed: 1, world: 'continent' });

  it('FR-322 on a new continent game the 226 land tiles each show one pack picture of what they hold, the sea none', () => {
    show(game);
    const { container, unmount } = render(<MapView />);
    const tiles = [...container.querySelectorAll('[data-testid="tile"]')];
    expect(tiles).toHaveLength(24 * 16);
    expect(tiles.filter((el) => !isSea(el.getAttribute('data-terrain')))).toHaveLength(226);
    const wrong = tiles.filter((el) => {
      const icons = [...el.querySelectorAll('[data-testid="tile-icon"]')];
      if (isSea(el.getAttribute('data-terrain'))) return icons.length !== 0;
      const expected = artFileOf(tileArt(tileOf(game, el.getAttribute('data-tile-id')!))!);
      return icons.length !== 1 || icons[0].tagName !== 'IMG' || icons[0].getAttribute('data-art') !== expected || icons[0].getAttribute('alt') !== '';
    });
    expect(wrong.map((el) => el.getAttribute('data-tile-id'))).toEqual([]);
    const art = (id: string) => container.querySelector(`[data-tile-id="${id}"] [data-testid="tile-icon"]`)?.getAttribute('data-art');
    expect(art('2-9')).toBe('terrain/capital.png');
    expect(art('3-9')).toBe('improvements/farm-1.png'); // grain at level 1
    expect(art('5-2')).toBe('terrain/barren-hills.png'); // coal not yet prospected
    expect(art('12-4')).toBe('improvements/mine-1.png'); // Arvelia's iron ore at level 1
    expect(art('7-5')).toBe('terrain/open-range.png'); // livestock at level 0
    // The old Game Icon is gone from the tile
    expect(container.querySelector('[data-testid="tile-icon"][data-icon]')).toBeNull();
    unmount();
  });

  it('FR-322 FR-346 the picture fills the 40 x 40 content box below the overlay; only a crowded capital or town draws it larger', () => {
    // A farm with one civilian keeps the whole box (FR-322); a capital or town with civilians or a minor's name tag draws
    // its picture at 48 px, lifted 18 px, with its civilians in the corner and its army chip low (FR-346, QA; FR-341's
    // 24 px left only a small dome)
    const farmhand = game.map.tiles.flat().find((t) => t.ownerNationId === N && t.terrain === TerrainType.Farm && t.workers.length === 0)!;
    const lone: Worker = { id: 'w-lone', type: WorkerType.Farmer, nationId: N, efficiency: 100, status: WorkerStatus.Available, justMoved: false };
    const town = game.map.tiles.flat().find((t) => t.ownerNationId === N && t.terrain === TerrainType.Orchard && t.workers.length === 0)!;
    show(
      withTiles(game, {
        [farmhand.id]: { workers: [lone] },
        [town.id]: { terrain: TerrainType.Town, resource: undefined, workers: [{ ...lone, id: 'w-town' }] },
        // Valdoria's capital, emptied of its civilians: nothing covers it
        [game.map.tiles.flat().find((t) => t.terrain === TerrainType.Capital && t.ownerNationId === 'nation-2')!.id]: { workers: [] },
      })
    );
    const { container, unmount } = render(<MapView />);
    const icon = (id: string) => container.querySelector(`[data-tile-id="${id}"] [data-testid="tile-icon"]`)!;
    const box = (id: string) => ({ size: `${icon(id).getAttribute('width')} x ${icon(id).getAttribute('height')}`, class: icon(id).getAttribute('class') });
    const whole = { size: '40 x 40', class: tileStyles.icon };
    const crowded = { size: '48 x 48', class: `${tileStyles.icon} ${tileStyles.iconCrowded}` };
    const emptyCapital = game.map.tiles.flat().find((t) => t.terrain === TerrainType.Capital && t.ownerNationId === 'nation-2')!.id;
    // 2-9 holds seven civilians, 11-4 is Arvelia's capital with its name tag, 3-9 holds neither
    expect(['2-9', '11-4', town.id, '3-9', farmhand.id, emptyCapital].map(box)).toEqual([crowded, crowded, crowded, whole, whole, whole]);
    const lifted = rule('iconCrowded');
    expect(lifted).toMatch(/width:\s*48px/);
    expect(lifted).toMatch(/height:\s*48px/);
    expect(lifted).toMatch(/left:\s*-4px/);
    // Lifted 18 px: capital.png's drawing (y 47 to 209 of 256) then spans -9.2 to 21.2 px, its top between the two pictures
    // of the row above, its foot above the civilians' button in the corner (from 16 px down)
    expect(lifted).toMatch(/top:\s*-18px/);
    const body = rule('icon');
    expect(body).toMatch(/width:\s*40px/);
    expect(body).toMatch(/height:\s*40px/);
    expect(body).toMatch(/left:\s*0/);
    expect(body).toMatch(/top:\s*0/);
    expect(body).not.toMatch(/transform/);
    // Below the border and rail overlay (MapView.module.css .railOverlay, z-index 1)
    expect(Number(/z-index:\s*(-?\d+)/.exec(body)?.[1])).toBe(0);
    // The civilians of a crowded capital or town sit in the content box's corner; elsewhere 5 px in, as before
    const workers = (id: string) => container.querySelector(`[data-tile-id="${id}"] [data-testid="worker-stack"], [data-tile-id="${id}"] [data-testid="worker-button"]`)!.parentElement!;
    expect([workers('2-9'), workers(town.id), workers(farmhand.id)].map((w) => w.classList.contains(tileStyles.workersCorner))).toEqual([true, true, false]);
    expect(rule('workersCorner')).toMatch(/right:\s*0;/);
    expect(rule('workersCorner')).toMatch(/bottom:\s*0;/);
    // The army chip: low on a crowded capital without a name tag, high on a minor's capital (FR-153 d)
    const armies = (id: string) => container.querySelector(`[data-tile-id="${id}"] [data-testid="army-marker"]`)!.closest(`.${tileStyles.armies}`)!;
    expect([armies('2-9').classList.contains(tileStyles.armiesLow), armies('11-4').classList.contains(tileStyles.armiesHigh)]).toEqual([true, true]);
    expect(armies('11-4').classList.contains(tileStyles.armiesLow)).toBe(false);
    expect(rule('armiesLow')).toMatch(/top:\s*16px/);
    unmount();
  });

  it('FR-322 hand-built tiles: desert, tundra, fertile hills with and without wool, and the other terrains; river and coast none', () => {
    const land = game.map.tiles.flat().filter((t) => t.ownerNationId === N && t.workers.length === 0 && t.terrain !== TerrainType.Capital);
    const cases: [Partial<Tile>, string | undefined][] = [
      [{ terrain: TerrainType.Desert, resource: undefined }, 'terrain/desert.png'],
      [{ terrain: TerrainType.Tundra, resource: undefined }, 'terrain/tundra.png'],
      [{ terrain: TerrainType.FertileHills, resource: { type: ResourceType.Wool, level: 0 } }, 'terrain/wool-pasture.png'],
      [{ terrain: TerrainType.FertileHills, resource: undefined }, 'terrain/fertile-hills.png'],
      [{ terrain: TerrainType.FertileHills, resource: { type: ResourceType.Wool, level: 2 } }, 'improvements/wool-2.png'],
      [{ terrain: TerrainType.Mountains, resource: { type: ResourceType.Gold, level: 3, discovered: true } }, 'improvements/mine-3.png'],
      [{ terrain: TerrainType.Mountains, resource: undefined }, 'terrain/mountains.png'],
      [{ terrain: TerrainType.Swamp, resource: { type: ResourceType.Oil, level: 0, discovered: false } }, 'terrain/swamp.png'],
      [{ terrain: TerrainType.Town, resource: undefined }, 'terrain/town.png'],
      [{ terrain: TerrainType.ScrubForest, resource: undefined }, 'terrain/scrub-forest.png'],
      [{ terrain: TerrainType.DryPlains, resource: undefined }, 'terrain/dry-plains.png'],
      [{ terrain: TerrainType.HorseRanch, resource: { type: ResourceType.Horses, level: 1 } }, 'terrain/horse-ranch.png'],
      [{ terrain: TerrainType.River, resource: undefined }, undefined],
      [{ terrain: TerrainType.Coast, resource: undefined }, undefined],
    ];
    const patches = Object.fromEntries(cases.map(([patch], i) => [land[i].id, patch]));
    show(withTiles(game, patches));
    const { container, unmount } = render(<MapView />);
    const drawn = cases.map((_, i) => {
      const icons = [...container.querySelectorAll(`[data-tile-id="${land[i].id}"] [data-testid="tile-icon"]`)];
      return icons.length === 0 ? undefined : icons.map((el) => el.getAttribute('data-art')).join(' ');
    });
    expect(drawn).toEqual(cases.map(([, file]) => file));
    unmount();
  });
});

describe('FR-323 which mineral, and the level', () => {
  const game = newGame({ seed: 1, world: 'continent' });
  const mark = (container: HTMLElement, id: string) => container.querySelector(`[data-tile-id="${id}"] [data-testid="resource-mark"]`);

  it('FR-323 a known coal or iron ore tile shows its goods picture as a 16 px mark; a hidden one and every other resource none', () => {
    show(game);
    const { container, unmount } = render(<MapView />);
    // Minor land starts with its minerals found (12-3 coal, 12-4 iron ore at level 1); Testland's 5-2 hides its coal
    expect(tileOf(game, '12-3').resource).toMatchObject({ type: ResourceType.Coal });
    expect(mark(container, '12-3')?.getAttribute('data-art')).toBe('goods/coal.png');
    expect(mark(container, '12-4')?.getAttribute('data-art')).toBe('goods/iron-ore.png');
    const m = mark(container, '12-4')!;
    expect([m.tagName, m.getAttribute('alt'), m.getAttribute('width'), m.getAttribute('height'), m.getAttribute('class')]).toEqual(['IMG', '', '16', '16', tileStyles.resourceMark]);
    expect(tileOf(game, '5-2').resource).toMatchObject({ type: ResourceType.Coal, discovered: false });
    expect(mark(container, '5-2')).toBeNull();
    // Exactly the tiles with a known coal, iron ore, gold, gems or oil carry a mark, each its own good's picture
    const minerals = new Set<string>([ResourceType.Coal, ResourceType.IronOre, ResourceType.Gold, ResourceType.Gems, ResourceType.Oil]);
    const expected = game.map.tiles
      .flat()
      .filter((t) => t.resource && t.resource.discovered !== false && minerals.has(t.resource.type))
      .map((t) => `${t.id} ${artFileOf(goodsArt(t.resource!.type))}`);
    expect(expected.length).toBeGreaterThan(0);
    const drawn = [...container.querySelectorAll('[data-testid="resource-mark"]')].map(
      (el) => `${el.closest('[data-testid="tile"]')!.getAttribute('data-tile-id')} ${el.getAttribute('data-art')}`
    );
    expect(drawn).toEqual(expected);
    // At the bottom-left
    expect(rule('resourceMark')).toMatch(/left:\s*1px/);
    expect(rule('resourceMark')).toMatch(/bottom:\s*1px/);
    unmount();
  });

  it('FR-323 the same hills once prospected show the coal mark; gold, gems and oil too', () => {
    const land = game.map.tiles.flat().filter((t) => t.ownerNationId === N && t.workers.length === 0 && t.terrain !== TerrainType.Capital);
    const hills = tileOf(game, '5-2');
    show(
      withTiles(game, {
        '5-2': { resource: { ...hills.resource!, discovered: true } },
        [land[0].id]: { terrain: TerrainType.Mountains, resource: { type: ResourceType.Gold, level: 0, discovered: true } },
        [land[1].id]: { terrain: TerrainType.Mountains, resource: { type: ResourceType.Gems, level: 1, discovered: true } },
        [land[2].id]: { terrain: TerrainType.Swamp, resource: { type: ResourceType.Oil, level: 2, discovered: true } },
        [land[3].id]: { terrain: TerrainType.Swamp, resource: { type: ResourceType.Oil, level: 0, discovered: false } },
      })
    );
    const { container, unmount } = render(<MapView />);
    expect(mark(container, '5-2')?.getAttribute('data-art')).toBe('goods/coal.png');
    // The picture stays the hills' at level 0 (FR-322)
    expect(container.querySelector('[data-tile-id="5-2"] [data-testid="tile-icon"]')?.getAttribute('data-art')).toBe('terrain/barren-hills.png');
    expect([0, 1, 2, 3].map((i) => mark(container, land[i].id)?.getAttribute('data-art') ?? null)).toEqual(['goods/gold.png', 'goods/gems.png', 'goods/oil.png', null]);
    unmount();
  });

  it('FR-323 FR-085 a resource at level 1 shows the badge "L1" with its name; level 0 shows none', () => {
    show(game);
    const { container, unmount } = render(<MapView />);
    const badge = (id: string) => container.querySelector(`[data-tile-id="${id}"] [data-testid="level-badge"]`);
    expect(tileOf(game, '3-9').resource?.level).toBe(1);
    expect(badge('3-9')?.textContent).toBe('L1');
    expect(badge('3-9')?.getAttribute('aria-label')).toBe('Development level 1');
    expect(tileOf(game, '7-5').resource?.level).toBe(0);
    expect(badge('7-5')).toBeNull();
    unmount();
  });

  it('FR-323 the river marker stays the Game Icon GiRiver, beside the mark when both show', () => {
    const land = game.map.tiles.flat().filter((t) => t.ownerNationId === N && t.workers.length === 0 && t.terrain !== TerrainType.Capital);
    show(
      withTiles(game, {
        [land[0].id]: { hasRiver: true },
        [land[1].id]: { hasRiver: true, terrain: TerrainType.BarrenHills, resource: { type: ResourceType.Coal, level: 0, discovered: true } },
      })
    );
    const { container, unmount } = render(<MapView />);
    const river = (id: string) => within(container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement).getByTitle('River');
    expect(river(land[0].id).querySelector('svg')?.getAttribute('data-icon')).toBe('GiRiver');
    expect(river(land[1].id).querySelector('svg')?.getAttribute('data-icon')).toBe('GiRiver');
    expect(river(land[0].id).classList.contains(tileStyles.riverBesideMark)).toBe(false);
    expect(river(land[1].id).classList.contains(tileStyles.riverBesideMark)).toBe(true);
    // Beside the 16 px mark at left 1px: from 18 px on
    expect(rule('riverBesideMark')).toMatch(/left:\s*18px/);
    unmount();
  });
});

describe('FR-325 civilians on the map', () => {
  // FR-110 (a): the capital's seven civilians are one stack button until the tile is selected, then a tray
  it('FR-325 FR-110 the capital\'s seven worker buttons each show their civilian\'s pack figure at 20 px', () => {
    show(newGame({ seed: 1, world: 'continent' }), { selectedTileId: '2-9' });
    const { container, unmount } = render(<MapView />);
    const buttons = [...container.querySelectorAll('[data-tile-id="2-9"] [data-testid="worker-button"]')];
    expect(buttons).toHaveLength(7);
    for (const b of buttons) {
      const type = b.getAttribute('data-worker-type') as WorkerType;
      const figure = b.querySelector('img')!;
      expect([figure.getAttribute('data-art'), figure.getAttribute('alt'), figure.getAttribute('width'), figure.getAttribute('data-art-anchor')]).toEqual([
        artFileOf(civilianArt(type)),
        '',
        '20',
        'bottom-center',
      ]);
      expect(b.querySelector('svg[data-icon]')).toBeNull();
      // Names unchanged (FR-336)
      expect(b.getAttribute('aria-label')).toBe(type);
    }
    unmount();
  });

  // Review R2: the clauses below had no test that would fail without them
  it("FR-325 another nation's lone civilian shows its figure (20 px, alt \"\") in its marker; a group of theirs keeps GiMeepleGroup", () => {
    const game = newGame({ seed: 1, world: 'continent' });
    const free = game.map.tiles.flat().filter((t) => t.ownerNationId === N && t.workers.length === 0 && t.terrain !== TerrainType.Capital);
    const theirs = (id: string, type: WorkerType): Worker => ({ id, type, nationId: 'nation-2', efficiency: 100, status: WorkerStatus.Available, justMoved: false });
    show(
      withTiles(game, {
        [free[0].id]: { workers: [theirs('w-lone', WorkerType.Forester)] },
        [free[1].id]: { workers: [theirs('w-a', WorkerType.Miner), theirs('w-b', WorkerType.Rancher)] },
      })
    );
    const { container, unmount } = render(<MapView />);
    const marker = (id: string) => container.querySelector(`[data-tile-id="${id}"] [data-testid="worker-marker"]`)!;
    const lone = marker(free[0].id);
    const figure = lone.querySelector('img')!;
    expect([figure.getAttribute('data-art'), figure.getAttribute('alt'), figure.getAttribute('width'), figure.getAttribute('height'), figure.getAttribute('class')]).toEqual([
      'workers/forester.png',
      '',
      '20',
      '20',
      tileStyles.workerFigure,
    ]);
    expect(lone.querySelector('svg[data-icon]')).toBeNull();
    // The marker still names them (FR-336)
    expect(lone.getAttribute('aria-label')).toBe('Valdoria: forester');
    const group = marker(free[1].id);
    expect(group.querySelector('svg[data-icon]')?.getAttribute('data-icon')).toBe('GiMeepleGroup');
    expect(group.querySelector('img')).toBeNull();
    expect([group.getAttribute('data-count'), group.getAttribute('aria-label'), group.textContent]).toEqual(['2', 'Valdoria: 2 civilians', '2']);
    unmount();
  });

  it('FR-325 a selected button keeps the accent background and adds a 2 px accent outline (a picture cannot be recoloured)', () => {
    const body = rule('workerButtonSelected');
    expect(body).toMatch(/background:\s*var\(--color-accent\)/);
    expect(body).toMatch(/outline:\s*2px solid var\(--color-accent\)/);
    // The selected civilian's stack button carries that class and shows its figure
    const game = newGame({ seed: 1, world: 'continent' });
    const forester = tileOf(game, '2-9').workers.find((w) => w.nationId === N && w.type === WorkerType.Forester)!;
    show(game, { selectedWorkerId: forester.id });
    const { container, unmount } = render(<MapView />);
    const stack = container.querySelector('[data-tile-id="2-9"] [data-testid="worker-stack"]')!;
    expect(stack.classList.contains(tileStyles.workerButtonSelected)).toBe(true);
    expect(stack.querySelector('img')?.getAttribute('data-art')).toBe('workers/forester.png');
    unmount();
  });
});

// M12 (NR-033), lane L2. FR-388 (ARMY-WAR-10, card Q88): a tile with a fort shows the pack's fort (`FortPicture`) as a
// 16 px mark, "Fort level 1" in its title, in a free top corner: the top-right, unless a depot or a port stands there or a
// stack's count reaches into it, then the top-left. The fort is the level the battle uses (`tile.fortLevel`, FR-203): on
// turn 1 the two Great Powers' capitals. Its name: tests/ui/accessibleNames.test.tsx; Tile Info: tileOffers.test.tsx.
describe('FR-388 forts can be seen', () => {
  const px = (body: string, prop: string) => Number(new RegExp(`(?:^|[;\\s])${prop}:\\s*(-?[\\d.]+)(?:px)?(?![\\w.%])`).exec(body)?.[1]);
  const marksOf = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>('[data-testid="fort-mark"]')].map((m) => ({
      tile: m.closest('[data-testid="tile"]')!.getAttribute('data-tile-id'),
      title: m.getAttribute('title'),
      side: m.classList.contains(tileStyles.fortMarkLeft) ? 'left' : m.classList.contains(tileStyles.fortMarkRight) ? 'right' : '?',
      art: m.querySelector('img')?.getAttribute('data-art'),
      alt: m.querySelector('img')?.getAttribute('alt'),
      size: [m.querySelector('img')?.getAttribute('width'), m.querySelector('img')?.getAttribute('height')],
    }));

  it('FR-388 on turn 1 the two capitals, and no other tile (no minor\'s capital), show the pack\'s fort at 16 px, alt "", titled "Fort level 1"', () => {
    const game = newGame({ seed: 1, world: 'continent' });
    show(game);
    const { container, unmount } = render(<MapView />);
    const fort = { title: 'Fort level 1', art: artFileOf(fortArt(1)!), alt: '', size: ['16', '16'] };
    // Each capital holds its seven civilians: their stack's count reaches into the top-right, so the fort takes the top-left
    expect(marksOf(container)).toEqual([
      { tile: '2-9', side: 'left', ...fort },
      { tile: '14-9', side: 'left', ...fort },
    ]);
    unmount();
  });

  it('FR-388 the top-right when free; the top-left beside a depot or under a count; level 2 titled "Fort level 2"', () => {
    const start = newGame({ seed: 1, world: 'continent' });
    const capital = tileOf(start, '2-9');
    show(
      withTiles(start, {
        '2-9': { workers: capital.workers.slice(0, 1) },
        '3-9': { fortLevel: 2, depot: true },
        '4-8': { fortLevel: 1 },
      })
    );
    const { container, unmount } = render(<MapView />);
    expect(marksOf(container).map(({ tile, side, title, art }) => ({ tile, side, title, art }))).toEqual([
      { tile: '4-8', side: 'right', title: 'Fort level 1', art: artFileOf(fortArt(1)!) },
      { tile: '2-9', side: 'right', title: 'Fort level 1', art: artFileOf(fortArt(1)!) },
      { tile: '3-9', side: 'left', title: 'Fort level 2', art: artFileOf(fortArt(2)!) },
      { tile: '14-9', side: 'left', title: 'Fort level 1', art: artFileOf(fortArt(1)!) },
    ]);
    unmount();
  });

  it('FR-388 the mark covers no other mark where it stands: 16 px on the top corner, clear of the low army chip, the count, a lone civilian and the capital picture\'s middle', () => {
    type Box = { x0: number; y0: number; x1: number; y1: number };
    const meet = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const mark = rule('fortMark');
    expect(mark).toMatch(/position:\s*absolute/);
    expect(mark).toMatch(/pointer-events:\s*none/);
    const size = px(mark, 'width');
    expect([size, px(mark, 'height')]).toEqual([16, 16]);
    const top = px(mark, 'top');
    const left: Box = { x0: px(rule('fortMarkLeft'), 'left'), y0: top, x1: px(rule('fortMarkLeft'), 'left') + size, y1: top + size };
    const right: Box = { x0: 40 - px(rule('fortMarkRight'), 'right') - size, y0: top, x1: 40 - px(rule('fortMarkRight'), 'right'), y1: top + size };
    // The army chip ends 13 px into the tile; on a crowded capital it stands 16 px down (24 px chips)
    expect(rule('armies')).toMatch(/right:\s*calc\(100% - 13px\)/);
    const armyLow: Box = { x0: 13 - 24, y0: px(rule('armiesLow'), 'top'), x1: 13, y1: px(rule('armiesLow'), 'top') + 24 };
    // The civilians' 24 px button in the corner, and 5 px in; the count 13 px high on its top-right, 5 px out
    const corner: Box = { x0: 40 - px(rule('workersCorner'), 'right') - 24, y0: 40 - px(rule('workersCorner'), 'bottom') - 24, x1: 40 - px(rule('workersCorner'), 'right'), y1: 40 - px(rule('workersCorner'), 'bottom') };
    const inset: Box = { x0: 40 - px(rule('workers'), 'right') - 24, y0: 40 - px(rule('workers'), 'bottom') - 24, x1: 40 - px(rule('workers'), 'right'), y1: 40 - px(rule('workers'), 'bottom') };
    const countOf = (b: Box): Box => ({ x0: b.x1 - px(rule('count'), 'right') - 13, y0: b.y0 + px(rule('count'), 'top'), x1: b.x1 - px(rule('count'), 'right'), y1: b.y0 + px(rule('count'), 'top') + 13 });
    // The top-left (a crowded capital with its stack): clear of the low chip and the count
    expect([meet(left, armyLow), meet(left, countOf(corner)), meet(left, corner)]).toEqual([0, 0, 0]);
    // The top-right: clear of a lone civilian in the corner or 5 px in; a count would reach into it, so it is not used then
    expect([meet(right, corner), meet(right, inset)]).toEqual([0, 0]);
    expect(meet(right, countOf(corner))).toBeGreaterThan(0);
    expect(meet(right, countOf(inset))).toBeGreaterThan(0);
    // FR-341, FR-346: the large capital picture's middle (x 20, y 6) stays the picture's
    const middle: Box = { x0: 20, y0: 6, x1: 20.01, y1: 6.01 };
    expect([meet(left, middle), meet(right, middle)]).toEqual([0, 0]);
  });
});
