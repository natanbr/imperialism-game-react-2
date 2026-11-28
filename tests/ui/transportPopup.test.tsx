// @vitest-environment jsdom
// M4.3 (NR-024, NR-025) and M4.4 (NR-027): the Transportation of Commodities popup. FR-133 each commodity's
// picture before its name (M11 FR-331: the art pack's goods picture); FR-134 the groups by kind; FR-135 the popup lists the commodities by group in as many
// CSS columns as groups shown (at most 3; the columns drawn are checked in the running app,
// e2e/m4-3.spec.ts); FR-141 only what the network can carry; FR-142 a group all 0 / 0 is hidden.
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TransportAllocationModal from '@/components/TransportAllocationModal';
import { COMMODITY_KINDS, NEVER_SHIPPED, SHIPPABLE_KINDS, transportKinds } from '@/components/commodityKinds';
import { artFileOf, goodsArt } from '@/components/art/inkArt';
import { commodityName } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { isOcean } from '@/engine/map/mapHelpers';
import type { GameState } from '@/types/GameState';
import { TerrainType } from '@/types/Tile';
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from '@/types/Resource';
import { setTile, tileAt } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const ALL = [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)];
// FR-616: the adjacent fishing ground adds Fish after Fruit. Food has 3 -> 4 rows,
// the opening popup 7 -> 8, and the horse fixture 10 -> 11. Unsourced Wool and Oil stay hidden.
const START_KEYS = ['grain', 'livestock', 'fruit', 'fish', 'cotton', 'timber', 'coal', 'ironOre'];

function show(game: GameState = newGame({ seed: 1 })) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: 'nation-1' });
  return render(<TransportAllocationModal capacity={15} onClose={() => {}} />);
}
const dialog = () => screen.getByRole('dialog', { name: 'Transportation of Commodities' });
const shownRows = () => [...dialog().querySelectorAll('[data-testid^="transport-row-"]')].map(r => r.getAttribute('data-testid')!.replace('transport-row-', ''));
const shownGroups = () => within(dialog()).queryAllByRole('region').map(s => s.getAttribute('aria-label'));
/** Dry land around the capital with no resources or fishing grounds. */
const bareGame = () => {
  const s = newGame({ seed: 1 });
  const tiles = s.map.tiles.map(row => row.map(t => {
    if (isOcean(t)) return { ...t, terrain: TerrainType.DryPlains };
    return t.ownerNationId === 'nation-1' ? { ...t, resource: undefined, hasRiver: false } : t;
  }));
  return { ...s, map: { ...s.map, tiles } };
};
/** Horses (level 0 gives 1 a turn) on 3-9, next to nation 1's capital. */
const withHorses = () => {
  const s = newGame({ seed: 1 });
  expect(tileAt(s, '3-9').ownerNationId).toBe('nation-1');
  return setTile(s, '3-9', { resource: { type: ResourceType.Horses, level: 0, discovered: true } });
};

describe('FR-134 commodity kinds', () => {
  it('FR-134 every resource, material and good is in exactly one group', () => {
    const listed = COMMODITY_KINDS.flatMap(k => k.keys);
    expect([...listed].sort()).toEqual([...ALL].sort());
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('FR-134 the groups, in order, derived from the food system, the recipes and the commodity types', () => {
    expect(COMMODITY_KINDS.map(k => [k.title, k.keys])).toEqual([
      ['Food', ['grain', 'livestock', 'fruit', 'fish']],
      ['Raw materials', ['cotton', 'wool', 'timber', 'coal', 'ironOre', 'oil']],
      ['Other resources', ['horses', 'gold', 'gems']],
      ['Materials', Object.values(MaterialType)],
      ['Goods', Object.values(GoodsType)],
    ]);
  });
});

describe('FR-141 FR-142 what the popup lists', () => {
  it('FR-141 never shipped (rules 04 section 5): paper, canned food, fuel and armaments; the groups keep their order without them', () => {
    expect([...NEVER_SHIPPED].sort()).toEqual(['armaments', 'cannedFood', 'fuel', 'paper']);
    expect(SHIPPABLE_KINDS.map(k => [k.title, k.keys])).toEqual([
      ['Food', ['grain', 'livestock', 'fruit', 'fish']],
      ['Raw materials', ['cotton', 'wool', 'timber', 'coal', 'ironOre', 'oil']],
      ['Other resources', ['horses', 'gold', 'gems']],
      ['Materials', ['fabric', 'lumber', 'steel']],
      ['Goods', ['clothing', 'furniture', 'hardware']],
    ]);
  });

  it('FR-142 FR-607 a group shows its ordinary rows and in-use candidate rows; an idle group is hidden', () => {
    expect(transportKinds(() => false)).toEqual([]);
    expect(transportKinds(() => true)).toEqual(SHIPPABLE_KINDS);
    // FR-607: Horses used to appear beside collected gold even without an allocation or horse collection.
    expect(transportKinds(k => k === 'gold')).toEqual([{ title: 'Other resources', keys: ['gold', 'gems'] }]);
    expect(transportKinds(k => k === 'steel')).toEqual([{ title: 'Materials', keys: ['fabric', 'lumber', 'steel'] }]);
    expect(transportKinds(k => k === 'paper' || k === 'armaments')).toEqual([]);
  });

  it('FR-142 a new game shows Food and Raw materials only; Other resources, Materials and Goods are 0 / 0 and hidden', () => {
    show();
    expect(shownGroups()).toEqual(['Food', 'Raw materials']);
    expect(shownRows()).toEqual(START_KEYS);
    for (const key of ['horses', 'steel', 'clothing', 'paper', 'cannedFood', 'fuel', 'armaments']) expect(screen.queryByTestId(`transport-row-${key}`), key).toBeNull();
    expect(text(screen.getByTestId('transport-row-fish'))).toBe('Fish Auto: 1');
    for (const name of ['Wool', 'Oil']) expect(screen.queryByRole('slider', { name })).toBeNull();
  });

  it('FR-142 a group appears as soon as one of its commodities has something to ship', () => {
    show(withHorses());
    expect(shownGroups()).toEqual(['Food', 'Raw materials', 'Other resources']);
    expect(shownRows()).toEqual([...START_KEYS, 'horses', 'gold', 'gems']);
    // M12 FR-390: automatic, the 1 horse a turn ships (it read "0 / 1")
    expect(text(screen.getByTestId('transport-row-horses'))).toContain('Auto: 1');
  });

  it('FR-142 with nothing to ship at all, the popup says so instead of an empty list', () => {
    show(bareGame());
    expect(shownGroups()).toEqual([]);
    expect(text(dialog())).toContain('Nothing to ship this turn.');
  });

  it('FR-607 a saved explicit zero keeps its otherwise empty group until Auto clears the order', () => {
    show({ ...bareGame(), transportAllocationsByNation: { 'nation-1': { oil: 0 } } });
    expect(shownGroups()).toEqual(['Raw materials']);
    expect(text(screen.getByTestId('transport-row-oil'))).toBe('Oil 0 / 0 Auto');
    const auto = screen.getByRole('button', { name: 'Auto Oil' });
    auto.focus();
    fireEvent.click(auto);
    expect(useGameStore.getState().ordersThisTurn.at(-1)).toEqual({ kind: 'setTransportAllocations', nationId: 'nation-1', allocations: {} });
    expect(shownGroups()).toEqual([]);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close transport' }));
  });

  it('FR-607 a connected custom resource is listed even when absent from the ordinary maps', () => {
    show(setTile(bareGame(), '3-9', { resource: { type: ResourceType.Fish, level: 0, discovered: true } }));
    expect(shownGroups()).toEqual(['Food']);
    expect(text(screen.getByTestId('transport-row-fish'))).toBe('Fish Auto: 1');
  });

  it('FR-607 editing another slider preserves a saved positive allocation whose collection has stopped', () => {
    show({ ...newGame({ seed: 1 }), transportAllocationsByNation: { 'nation-1': { wool: 2 } } });
    fireEvent.change(screen.getByRole('slider', { name: 'Grain' }), { target: { value: '1' } });
    const plan = () => useGameStore.getState().game.transportAllocationsByNation?.['nation-1'];
    expect(plan()).toEqual({ wool: 2, grain: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Auto Wool' }));
    expect(plan()).toEqual({ grain: 1 });
    expect(screen.queryByRole('slider', { name: 'Wool' })).toBeNull();
  });
});

describe('FR-390 the popup shows set and automatic (M12, card Q80, audit ECONOMY-01, ECONOMY-25)', () => {
  const row = (key: string) => screen.getByTestId(`transport-row-${key}`);
  const plan = () => useGameStore.getState().game.transportAllocationsByNation?.['nation-1'];
  const infoBar = () => text(dialog().querySelector('.modal-info-bar')!);

  // FR-646 replaces FR-390's header sentence (M18k play-test F5): "Allocated" counts every row that ships, set or
  // automatic, and "Remaining" is the capacity left over. Before, a new game read "Allocated: 0 Remaining: 15".
  it('FR-390 FR-646 a new game: every row automatic, reading what it ships this turn; Allocated counts what they ship (11 of 15); no Auto button', () => {
    show();
    expect(text(row('grain'))).toBe('Grain Auto: 4');
    expect(text(row('fruit'))).toBe('Fruit Auto: 4');
    expect(text(row('cotton'))).toBe('Cotton Auto: 2');
    expect(infoBar()).toBe('Capacity: 15 Allocated: 11 Remaining: 4');
    expect(screen.queryByRole('button', { name: /^Auto / })).toBeNull();
    // The slider of an automatic row stands at what it ships
    expect((screen.getByRole('slider', { name: 'Grain' }) as HTMLInputElement).value).toBe('4');
  });

  it('FR-390 the fixed note says when shipped goods arrive', () => {
    show();
    expect(text(dialog())).toContain("Goods shipped this turn reach the warehouse after this turn's production.");
  });

  it('FR-390 FR-389 moving a slider sets that commodity: "n / max" and an Auto button; the plan holds it; the others stay automatic', () => {
    show();
    fireEvent.change(screen.getByRole('slider', { name: 'Grain' }), { target: { value: '1' } });

    expect(plan()).toEqual({ grain: 1 });
    expect(text(row('grain'))).toBe('Grain 1 / 4 Auto');
    expect(within(row('grain')).getByRole('button', { name: 'Auto Grain' })).toBeTruthy();
    expect(text(row('fruit'))).toBe('Fruit Auto: 4');
    expect(infoBar()).toBe('Capacity: 15 Allocated: 8 Remaining: 7');
  });

  it('FR-390 FR-389 a slider set to 0 is set (ships nothing), not automatic', () => {
    show();
    fireEvent.change(screen.getByRole('slider', { name: 'Grain' }), { target: { value: '0' } });

    expect(plan()).toEqual({ grain: 0 });
    expect(text(row('grain'))).toBe('Grain 0 / 4 Auto');
  });

  it('FR-390 the Auto button returns the commodity to automatic: the plan drops it', () => {
    show({ ...newGame({ seed: 1 }), transportAllocationsByNation: { 'nation-1': { grain: 1, fruit: 0 } } });
    expect(text(row('grain'))).toBe('Grain 1 / 4 Auto');

    fireEvent.click(within(row('grain')).getByRole('button', { name: 'Auto Grain' }));

    expect(plan()).toEqual({ fruit: 0 });
    expect(text(row('grain'))).toBe('Grain Auto: 4');
    expect(text(row('fruit'))).toBe('Fruit 0 / 4 Auto');
    expect(infoBar()).toBe('Capacity: 15 Allocated: 7 Remaining: 8');
  });

  it('FR-607 a rejected Auto order leaves focus on the next slider the player edits', () => {
    // The invalid saved Fruit allocation makes the complete plan fail until the player repairs it.
    show({ ...newGame({ seed: 1 }), transportAllocationsByNation: { 'nation-1': { grain: 1, fruit: -1 } } });
    const auto = screen.getByRole('button', { name: 'Auto Grain' });
    auto.focus();
    fireEvent.click(auto);
    expect(useGameStore.getState().lastRejection).toMatchObject({ reason: 'invalid-amount' });
    expect(document.activeElement).toBe(auto);

    const fruit = screen.getByRole('slider', { name: 'Fruit' });
    fruit.focus();
    fireEvent.change(fruit, { target: { value: '2' } });
    expect(plan()).toEqual({ grain: 1, fruit: 2 });
    expect(document.activeElement).toBe(fruit);
  });

  it('FR-390 automatic rows share what the set ones leave: capacity 15 with grain set to 4 and fruit to 4 leaves cotton its 2', () => {
    show({ ...newGame({ seed: 1 }), transportAllocationsByNation: { 'nation-1': { grain: 4, fruit: 4 } } });
    expect(infoBar()).toBe('Capacity: 15 Allocated: 11 Remaining: 4');
    expect(text(row('cotton'))).toBe('Cotton Auto: 2');
  });

  /** What each shown row ships this turn: "Auto: 4" or "1 / 4". */
  const shippedByRows = () => shownRows().reduce((sum, key) => {
    const found = text(row(key)).match(/Auto: (\d+)$|(\d+) \/ \d+/);
    return sum + Number(found?.[1] ?? found?.[2] ?? 0);
  }, 0);
  const header = () => infoBar().match(/^Capacity: (\d+) Allocated: (\d+) Remaining: (\d+)$/)!.slice(1).map(Number);

  it('FR-646 Allocated counts every row that ships, so Remaining is the capacity actually spare', () => {
    show();
    const [capacity, allocated, remaining] = header();
    expect(shippedByRows()).toBe(11);
    expect(allocated).toBe(shippedByRows());
    expect(allocated + remaining).toBe(capacity);
    fireEvent.change(screen.getByRole('slider', { name: 'Grain' }), { target: { value: '1' } });
    expect(header()[1]).toBe(shippedByRows());
  });

  it('FR-646 a network full with automatic goods: "Capacity: 3 Allocated: 3 Remaining: 0"', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
    render(<TransportAllocationModal capacity={3} onClose={() => {}} />);
    expect(infoBar()).toBe('Capacity: 3 Allocated: 3 Remaining: 0');
    expect(shippedByRows()).toBe(3);
  });

  // M18k review: FR-646 keeps the clamp of FR-389, so "Remaining: 0" does not stop a slider; the set one takes its
  // share from the automatic rows.
  it('FR-646 FR-389 at "Remaining: 0" a slider still rises against the set rows alone: Cotton to 2 takes from the Auto rows', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
    render(<TransportAllocationModal capacity={3} onClose={() => {}} />);
    expect(infoBar()).toBe('Capacity: 3 Allocated: 3 Remaining: 0');
    fireEvent.change(screen.getByRole('slider', { name: 'Cotton' }), { target: { value: '2' } });
    expect(plan()).toEqual({ cotton: 2 });
    expect(text(row('cotton'))).toBe('Cotton 2 / 2 Auto');
    expect(infoBar()).toBe('Capacity: 3 Allocated: 3 Remaining: 0');
    expect(shippedByRows()).toBe(3);
  });
});

describe('FR-133 FR-135 the transport popup', () => {
  it('FR-133 is a dialog named "Transportation of Commodities"', () => {
    show();
    expect(dialog()).toBeTruthy();
    expect(text(dialog())).not.toContain('Nothing to ship');
  });

  // M11 FR-331 (replaces FR-133's Game Icon): the goods picture from the art pack, decorative (alt "")
  it('FR-133 FR-331 every row shows the commodity\'s goods picture before its display name, decorative', () => {
    show(withHorses());
    for (const key of shownRows() as WarehouseCommodities[]) {
      const name = within(screen.getByTestId(`transport-row-${key}`)).getByTestId('name');
      const picture = name.firstElementChild;
      expect(picture?.tagName.toLowerCase(), key).toBe('img');
      expect(picture?.getAttribute('data-art'), key).toBe(artFileOf(goodsArt(key)));
      expect(picture?.getAttribute('alt'), key).toBe('');
      expect(name.querySelector('svg'), key).toBeNull();
      expect(text(name), key).toBe(commodityName(key));
    }
    expect(within(screen.getByTestId('transport-row-ironOre')).getByTestId('name').firstElementChild?.getAttribute('data-art')).toBe('goods/iron-ore.png');
    // The display names, not the keys
    expect(text(within(screen.getByTestId('transport-row-ironOre')).getByTestId('name'))).toBe('Iron Ore');
  });

  it('FR-133 each slider is named by its commodity', () => {
    show();
    for (const key of shownRows()) expect(screen.getByRole('slider', { name: commodityName(key) })).toBeTruthy();
    // Grain next to the capital: the start game gathers 4 a turn
    expect(screen.getByRole('slider', { name: 'Grain' }).getAttribute('max')).toBe('4');
  });

  it('FR-135 the commodities are listed by kind, each group a section under its heading, in FR-134 order', () => {
    show(withHorses());
    const sections = within(dialog()).getAllByRole('region');
    const kinds = SHIPPABLE_KINDS.slice(0, 3);
    expect(sections.map(s => s.getAttribute('aria-label'))).toEqual(kinds.map(k => k.title));
    for (const [i, kind] of kinds.entries()) {
      expect(text(within(sections[i]).getByRole('heading'))).toBe(kind.title);
      const rows = [...sections[i].querySelectorAll('[data-testid^="transport-row-"]')].map(r => r.getAttribute('data-testid'));
      // FR-607: previously all shippable keys, now exactly the collected/saved candidate rows plus ordinary rows.
      expect(rows).toEqual(kind.keys.filter(k => [...START_KEYS, 'horses', 'gold', 'gems'].includes(k)).map(k => `transport-row-${k}`));
    }
    expect(dialog().querySelector('.transport-groups')?.children).toHaveLength(kinds.length);
  });

  // The columns are the groups shown, not a fixed 3: two groups share the width instead of leaving a third
  // column empty (FR-135, FR-142). v1 can show at most 3 groups (nothing makes materials or goods to ship),
  // so the cap of 3 itself cannot be reached from the popup yet.
  it.each([
    ['a new game shows 2 groups', () => newGame({ seed: 1 }), 2, '2'],
    ['a horses tile shows 3 groups', withHorses, 3, '3'],
    ['nothing to ship shows no group and still 1 column', bareGame, 0, '1'],
  ])('FR-135 the groups share the width in one column each, at most 3: %s', (_name, game, groups, columns) => {
    show(game());
    const list = dialog().querySelector('.transport-groups') as HTMLElement;
    expect(list.children).toHaveLength(groups);
    expect(list.style.columnCount).toBe(columns);
  });
});
