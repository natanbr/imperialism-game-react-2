// @vitest-environment jsdom
// M4.3 (NR-024, NR-025): the Transportation of Commodities popup. FR-133 each commodity's icon before its
// name; FR-134 the groups by kind; FR-135 the popup lists the commodities by group (the columns themselves
// are checked in the running app, e2e/m4-3.spec.ts).
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TransportAllocationModal from '@/components/TransportAllocationModal';
import { COMMODITY_KINDS } from '@/components/commodityKinds';
import { COMMODITY_ICONS } from '@/components/icons';
import { commodityName } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const ALL = [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)];

function show() {
  useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: 'nation-1' });
  return render(<TransportAllocationModal capacity={15} onClose={() => {}} />);
}

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

describe('FR-133 FR-135 the transport popup', () => {
  it('FR-133 is a dialog named "Transportation of Commodities"', () => {
    show();
    expect(screen.getByRole('dialog', { name: 'Transportation of Commodities' })).toBeTruthy();
  });

  it('FR-133 every row shows the commodity\'s icon before its display name, hidden from assistive technology', () => {
    show();
    for (const key of ALL) {
      const name = within(screen.getByTestId(`transport-row-${key}`)).getByTestId('name');
      const icon = name.firstElementChild;
      expect(icon?.tagName.toLowerCase(), key).toBe('svg');
      expect(icon?.getAttribute('data-icon'), key).toBe(COMMODITY_ICONS[key]);
      expect(icon?.getAttribute('aria-hidden'), key).toBe('true');
      expect(text(name), key).toBe(commodityName(key));
    }
    // The display names, not the keys
    expect(text(within(screen.getByTestId('transport-row-ironOre')).getByTestId('name'))).toBe('Iron Ore');
    expect(text(within(screen.getByTestId('transport-row-cannedFood')).getByTestId('name'))).toBe('Canned Food');
  });

  it('FR-133 each slider is named by its commodity', () => {
    show();
    for (const key of ALL) expect(screen.getByRole('slider', { name: commodityName(key) })).toBeTruthy();
    // Grain next to the capital: the start game gathers 4 a turn
    expect(screen.getByRole('slider', { name: 'Grain' }).getAttribute('max')).toBe('4');
  });

  it('FR-135 the commodities are listed by kind, each group a section under its heading, in FR-134 order', () => {
    show();
    const dialog = screen.getByRole('dialog', { name: 'Transportation of Commodities' });
    const sections = within(dialog).getAllByRole('region');
    expect(sections.map(s => s.getAttribute('aria-label'))).toEqual(COMMODITY_KINDS.map(k => k.title));
    for (const [i, kind] of COMMODITY_KINDS.entries()) {
      expect(text(within(sections[i]).getByRole('heading'))).toBe(kind.title);
      const rows = [...sections[i].querySelectorAll('[data-testid^="transport-row-"]')].map(r => r.getAttribute('data-testid'));
      expect(rows).toEqual(kind.keys.map(k => `transport-row-${k}`));
    }
    expect(dialog.querySelector('.transport-groups')?.children).toHaveLength(COMMODITY_KINDS.length);
  });
});
