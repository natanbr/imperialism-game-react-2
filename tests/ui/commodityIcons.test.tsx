// @vitest-environment jsdom
// M11 FR-331 (NR-032; replaces FR-121's Game Icons, M4.1 NR-021): each warehouse commodity's goods picture from the art pack
// stands before its name, decorative (an img with alt ""), in the World market's and the Board of Trade's rows and on the
// capital's production cards (the output and each input; cotton or wool shows both pictures); the name stays text.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MarketModal } from '@/components/MarketModal';
import { CapitalModal } from '@/components/CapitalModal';
import { artFileOf, artInfoOf, goodsArt } from '@/components/art/inkArt';
import { commodityName } from '@/components/gameText';
import { TRADE_COMMODITIES } from '@/definisions/marketPrices';
import { useGameStore } from '@/store/rootStore';
import { newGame } from '@/engine';
import { GoodsType, MaterialType, ResourceType, type WarehouseCommodities } from '@/types/Resource';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const fileOf = (c: WarehouseCommodities) => artFileOf(goodsArt(c));
/** The pack file of each picture inside an element, in document order. */
const pictures = (el: Element) => [...el.querySelectorAll('img')].map((img) => img.getAttribute('data-art'));

describe('FR-331 goods pictures', () => {
  it('FR-331 every resource, material and good has its own goods picture (FR-318 (c))', () => {
    const all = [...Object.values(ResourceType), ...Object.values(MaterialType), ...Object.values(GoodsType)];
    expect(all).toHaveLength(23);
    const files = all.map(fileOf);
    expect(new Set(files).size).toBe(all.length);
    for (const c of all) expect(artInfoOf(goodsArt(c))?.family, c).toBe('goods');
  });

  it.each([
    ['the World market (market mode "world")', () => newGame({ seed: 1 })],
    ['the Board of Trade (the continent, "partners")', () => newGame({ seed: 1, world: 'continent' })],
  ])("FR-331 %s shows each commodity's picture before its name, decorative; the name stays text", (_name, game) => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: game(), activeNationId: N1, isMarketOpen: true });
    render(<MarketModal />);
    expect(TRADE_COMMODITIES).toHaveLength(17);
    for (const commodity of TRADE_COMMODITIES) {
      const cell = within(screen.getByTestId(`trade-row-${commodity}`)).getByTestId('name');
      const first = cell.firstElementChild;
      expect(first?.tagName.toLowerCase(), commodity).toBe('img');
      expect(first?.getAttribute('data-art'), commodity).toBe(fileOf(commodity));
      expect(first?.getAttribute('alt'), commodity).toBe('');
      expect(first?.hasAttribute('data-art-inline'), commodity).toBe(true);
      expect(cell.querySelector('svg'), commodity).toBeNull();
      expect(text(cell)).toBe(commodityName(commodity));
    }
  });

  it("FR-331 the capital's production cards show the picture of each output and of each input", () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1 }), activeNationId: N1, isCapitalOpen: true });
    render(<CapitalModal />);
    const steel = screen.getByTestId('output-steel');
    const name = within(steel).getByTestId('output-name');
    expect(name.firstElementChild?.getAttribute('data-art')).toBe('goods/steel.png');
    expect(text(name)).toBe('Steel');
    expect(pictures(within(steel).getByTestId('input-coal'))).toEqual(['goods/coal.png']);
    expect(pictures(within(steel).getByTestId('input-ironOre'))).toEqual(['goods/iron-ore.png']);
    // A mixed input shows one picture per commodity it may be made from
    const cotton = within(screen.getByTestId('output-fabric')).getByTestId('input-cotton');
    expect(pictures(cotton)).toEqual([fileOf(ResourceType.Cotton), fileOf(ResourceType.Wool)]);
    expect(text(cotton)).toBe('2 Cotton or Wool (20)');
    // Every picture in the Industry region is decorative, and no commodity Game Icon is left there
    const industry = screen.getByRole('main', { name: 'Industry' });
    const imgs = [...industry.querySelectorAll('img')];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) expect(img.getAttribute('alt'), img.getAttribute('data-art') ?? '').toBe('');
    expect(industry.querySelectorAll('svg[data-icon]')).toHaveLength(0);
  });
});
