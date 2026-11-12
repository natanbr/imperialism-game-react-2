// @vitest-environment jsdom
// M4.3 (NR-024, NR-025) and M4.4 (NR-027): the Transportation of Commodities popup. FR-133 each commodity's
// icon before its name; FR-134 the groups by kind; FR-135 the popup lists the commodities by group (the
// columns themselves are checked in the running app, e2e/m4-3.spec.ts); FR-141 only what the network can
// carry; FR-142 a group all 0 / 0 is hidden.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TransportAllocationModal from '@/components/TransportAllocationModal';
import { COMMODITY_KINDS, NEVER_SHIPPED, SHIPPABLE_KINDS, transportKinds } from '@/components/commodityKinds';
import { COMMODITY_ICONS } from '@/components/icons';
import { commodityName } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import type { GameState } from '@/types/GameState';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { setTile, tileAt } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const ALL = [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)];
/** Seed 1, nation 1: the capital 2-9 and its tiles deliver grain 4, fruit 4 and cotton 2 a turn. */
const START_KEYS = ['grain', 'livestock', 'fruit', 'fish', 'cotton', 'wool', 'timber', 'coal', 'ironOre', 'oil'];

function show(game: GameState = newGame({ seed: 1 })) {
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: 'nation-1' });
  return render(<TransportAllocationModal capacity={15} onClose={() => {}} />);
}
const dialog = () => screen.getByRole('dialog', { name: 'Transportation of Commodities' });
const shownRows = () => [...dialog().querySelectorAll('[data-testid^="transport-row-"]')].map(r => r.getAttribute('data-testid')!.replace('transport-row-', ''));
const shownGroups = () => within(dialog()).queryAllByRole('region').map(s => s.getAttribute('aria-label'));
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

  it('FR-142 a group shows while one of its commodities is in use, with all it lists; a group all 0 / 0 is hidden', () => {
    expect(transportKinds(() => false)).toEqual([]);
    expect(transportKinds(() => true)).toEqual(SHIPPABLE_KINDS);
    // One commodity in use shows its whole group; a never-shipped one shows nothing
    expect(transportKinds(k => k === 'gold')).toEqual([{ title: 'Other resources', keys: ['horses', 'gold', 'gems'] }]);
    expect(transportKinds(k => k === 'steel')).toEqual([{ title: 'Materials', keys: ['fabric', 'lumber', 'steel'] }]);
    expect(transportKinds(k => k === 'paper' || k === 'armaments')).toEqual([]);
  });

  it('FR-142 a new game shows Food and Raw materials only; Other resources, Materials and Goods are 0 / 0 and hidden', () => {
    show();
    expect(shownGroups()).toEqual(['Food', 'Raw materials']);
    expect(shownRows()).toEqual(START_KEYS);
    for (const key of ['horses', 'steel', 'clothing', 'paper', 'cannedFood', 'fuel', 'armaments']) expect(screen.queryByTestId(`transport-row-${key}`), key).toBeNull();
    // A shown group keeps its 0 / 0 rows: fish and oil are in groups with something to ship
    expect(text(screen.getByTestId('transport-row-fish'))).toContain('0 / 0');
  });

  it('FR-142 a group appears as soon as one of its commodities has something to ship', () => {
    show(withHorses());
    expect(shownGroups()).toEqual(['Food', 'Raw materials', 'Other resources']);
    expect(shownRows()).toEqual([...START_KEYS, 'horses', 'gold', 'gems']);
    expect(text(screen.getByTestId('transport-row-horses'))).toContain('0 / 1');
  });

  it('FR-142 with nothing to ship at all, the popup says so instead of an empty list', () => {
    const s = newGame({ seed: 1 });
    const bare = { ...s, map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => (t.ownerNationId === 'nation-1' ? { ...t, resource: undefined } : t))) } };
    show(bare);
    expect(shownGroups()).toEqual([]);
    expect(text(dialog())).toContain('Nothing to ship this turn.');
  });
});

describe('FR-133 FR-135 the transport popup', () => {
  it('FR-133 is a dialog named "Transportation of Commodities"', () => {
    show();
    expect(dialog()).toBeTruthy();
    expect(text(dialog())).not.toContain('Nothing to ship');
  });

  it('FR-133 every row shows the commodity\'s icon before its display name, hidden from assistive technology', () => {
    show(withHorses());
    for (const key of shownRows() as (keyof typeof COMMODITY_ICONS)[]) {
      const name = within(screen.getByTestId(`transport-row-${key}`)).getByTestId('name');
      const icon = name.firstElementChild;
      expect(icon?.tagName.toLowerCase(), key).toBe('svg');
      expect(icon?.getAttribute('data-icon'), key).toBe(COMMODITY_ICONS[key]);
      expect(icon?.getAttribute('aria-hidden'), key).toBe('true');
      expect(text(name), key).toBe(commodityName(key));
    }
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
      expect(rows).toEqual(kind.keys.map(k => `transport-row-${k}`));
    }
    expect(dialog().querySelector('.transport-groups')?.children).toHaveLength(kinds.length);
  });
});
