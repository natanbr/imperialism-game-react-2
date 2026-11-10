// @vitest-environment jsdom
// M4.1 FR-121 (NR-021): every warehouse commodity has a Game Icon; the market dialog and the capital's
// production cards show it before the commodity's name, decorative (aria-hidden), the name stays text.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import * as gi from 'react-icons/gi';
import { MarketModal } from '@/components/MarketModal';
import { CapitalModal } from '@/components/CapitalModal';
import { COMMODITY_ICONS, GI, RESOURCE_ICONS, type IconName } from '@/components/icons';
import { commodityName } from '@/components/gameText';
import { TRADE_COMMODITIES } from '@/definisions/marketPrices';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { GoodsType, MaterialType, ResourceType } from '@/types/Resource';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const isGameIcon = (name: IconName) => typeof gi[name as keyof typeof gi] === 'function' && GI[name] === gi[name as keyof typeof gi];
const iconOf = (el: Element) => el.querySelector('svg')?.getAttribute('data-icon');

describe('FR-121 commodity icons', () => {
  it('FR-121 every resource, material and good has a Game Icon; resources keep the map icons', () => {
    const all = [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)];
    expect(Object.keys(COMMODITY_ICONS).sort()).toEqual([...all].sort());
    for (const name of Object.values(COMMODITY_ICONS)) expect(isGameIcon(name), name).toBe(true);
    for (const type of Object.values(ResourceType)) expect(COMMODITY_ICONS[type]).toBe(RESOURCE_ICONS[type]);
    // The made goods each get their own icon, none borrowed from a resource
    const made = [...Object.values(MaterialType), ...Object.values(GoodsType)].map((c) => COMMODITY_ICONS[c]);
    expect(new Set(made).size).toBe(made.length);
    for (const icon of made) expect(Object.values(RESOURCE_ICONS)).not.toContain(icon);
  });

  it('FR-121 the market shows each commodity\'s icon before its name, hidden from assistive technology', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: N1, isMarketOpen: true });
    render(<MarketModal />);
    for (const commodity of TRADE_COMMODITIES) {
      const cell = within(screen.getByTestId(`trade-row-${commodity}`)).getByTestId('name');
      expect(iconOf(cell)).toBe(COMMODITY_ICONS[commodity]);
      expect(cell.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(cell.firstElementChild?.tagName.toLowerCase()).toBe('svg');
      expect(text(cell)).toBe(commodityName(commodity));
    }
  });

  it('FR-121 the capital\'s production cards show the icon of each output and of each input', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: N1, isCapitalOpen: true });
    render(<CapitalModal />);
    const steel = screen.getByTestId('output-steel');
    const name = within(steel).getByTestId('output-name');
    expect(iconOf(name)).toBe(COMMODITY_ICONS.steel);
    expect(text(name)).toBe('Steel');
    expect(iconOf(within(steel).getByTestId('input-coal'))).toBe(COMMODITY_ICONS.coal);
    expect(iconOf(within(steel).getByTestId('input-ironOre'))).toBe(COMMODITY_ICONS.ironOre);
    // A mixed input shows one icon per commodity it may be made from
    const cotton = within(screen.getByTestId('output-fabric')).getByTestId('input-cotton');
    expect([...cotton.querySelectorAll('svg')].map((s) => s.getAttribute('data-icon'))).toEqual([COMMODITY_ICONS.cotton, COMMODITY_ICONS.wool]);
    expect(text(cotton)).toBe('2 Cotton or Wool (20)');
    for (const svg of screen.getByRole('main', { name: 'Industry' }).querySelectorAll('svg')) expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
