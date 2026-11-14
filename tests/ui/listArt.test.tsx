// @vitest-environment jsdom
// M11 (NR-032), the art pack in the dialogs, the HUD and the tile info panel; every picture decorative (alt ""), every name,
// title and text unchanged (FR-336).
// FR-333 (Q73): each production card's head shows its building before the name; the Transport panel's heading the
// railyard; the Labour panel's "Trade School" and "Capitol" headings their buildings; the Capital dialog's title the
// capitol (in place of GiCapitol) and its buttons Warehouse, Armoury and the disabled Technology their buildings; Trade
// and Diplomacy keep their Game Icons.
// FR-334: the HUD's Capital, Warehouse and Transport buttons show the capitol, the warehouse and the railyard; the
// Construction options' title the engineer and its Build Depot and Build Port buttons the depot and the port; every other
// HUD glyph stays a Game Icon (FR-335). The Transportation of Commodities popup's title shows the railyard, as the HUD
// button that opens it (FR-335 removes the Game Icon it had).
// FR-332: the tile info panel's civilians show their figures (in place of the Game Icons) and its Prospect button the
// prospector; FR-331: its Resource line the goods picture of a known resource (Q75).
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CapitalModal } from '@/components/CapitalModal';
import { ConstructionOptionsModal } from '@/components/ConstructionOptionsModal';
import TransportAllocationModal from '@/components/TransportAllocationModal';
import { TileInfoPanel } from '@/components/TileInfoPanel';
import { HUD } from '@/components/HUD';
import { artFileOf, buildingArt, civilianArt } from '@/components/art/inkArt';
import { BUILDING_TEXT } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { newGame, resolveTurn } from '@/engine';
import type { GameState } from '@/types/GameState';
import type { BuildingType } from '@/types/Industry';
import { WorkerType } from '@/types/Workers';
import { tileAt } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const show = (game: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) =>
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1, ...ui });

/** The pack files of the pictures inside an element, in document order. */
const art = (el: Element) => [...el.querySelectorAll('img')].map((img) => img.getAttribute('data-art'));
/** The Game Icons inside an element. */
const icons = (el: Element) => [...el.querySelectorAll('svg[data-icon]')].map((svg) => svg.getAttribute('data-icon'));
/** Every picture inside is decorative. */
const allDecorative = (el: Element) => [...el.querySelectorAll('img')].every((img) => img.getAttribute('alt') === '');

describe('FR-333 the capital\'s buildings', () => {
  it("FR-333 each production card's head shows its building's picture before the name, decorative", () => {
    const s = continent();
    show({ ...s, technologyState: { ...s.technologyState, oilDrillingTechUnlocked: true } }, { isCapitalOpen: true });
    render(<CapitalModal />);
    const cards = screen.getAllByTestId(/^building-/);
    expect(cards.length).toBe(8);
    for (const card of cards) {
      const building = card.getAttribute('data-testid')!.replace('building-', '') as BuildingType;
      const head = within(card).getByRole('heading', { level: 4 });
      expect(head.firstElementChild?.tagName.toLowerCase(), building).toBe('img');
      expect(art(head), building).toEqual([artFileOf(buildingArt(building))]);
      expect(allDecorative(head), building).toBe(true);
      expect(text(head), building).toBe(BUILDING_TEXT[building]);
      // The card keeps its name
      expect(card.getAttribute('aria-label'), building).toBe(BUILDING_TEXT[building]);
    }
    expect(art(within(screen.getByTestId('building-refinery')).getByRole('heading', { level: 4 }))).toEqual(['buildings/oil-refinery.png']);
    expect(art(within(screen.getByTestId('building-steelMill')).getByRole('heading', { level: 4 }))).toEqual(['buildings/steel-mill.png']);
  });

  it('FR-333 the Transport panel shows the railyard, the Trade School and Capitol headings their buildings', () => {
    show(continent(), { isCapitalOpen: true });
    render(<CapitalModal />);
    const transport = within(screen.getByTestId('freight-cars')).getByRole('heading', { level: 3 });
    expect(art(transport)).toEqual(['buildings/railyard.png']);
    expect(text(transport)).toBe('Transport');
    const labour = screen.getByTestId('labour-panel');
    const school = within(labour).getByRole('heading', { level: 4, name: 'Trade School' });
    expect(art(school)).toEqual(['buildings/trade-school.png']);
    const capitol = within(labour).getByRole('heading', { level: 4, name: 'Capitol' });
    expect(art(capitol)).toEqual(['buildings/capitol.png']);
    expect(allDecorative(labour)).toBe(true);
  });

  it("FR-333 the Capital dialog's title shows the capitol; Warehouse, Armoury and Technology their buildings; Trade and Diplomacy keep their Game Icons", () => {
    show(continent(), { isCapitalOpen: true });
    render(<CapitalModal />);
    const dialog = screen.getByRole('dialog', { name: 'Capital — Testland' });
    const title = within(dialog).getByRole('heading', { level: 2 });
    expect(title.firstElementChild?.tagName.toLowerCase()).toBe('img');
    expect(art(title)).toEqual(['buildings/capitol.png']);
    expect(icons(title)).toEqual([]);
    expect(text(title)).toBe('Capital — Testland');
    const button = (name: string) => within(dialog).getByRole('button', { name });
    expect([art(button('Warehouse')), icons(button('Warehouse'))]).toEqual([['buildings/warehouse.png'], []]);
    expect([art(button('Armoury')), icons(button('Armoury'))]).toEqual([['buildings/armory.png'], []]);
    expect([art(button('Technology')), icons(button('Technology'))]).toEqual([['buildings/university.png'], []]);
    expect((button('Technology') as HTMLButtonElement).disabled).toBe(true);
    expect(button('Technology').getAttribute('title')).toBe('Coming in a later milestone');
    expect([art(button('Trade')), icons(button('Trade'))]).toEqual([[], ['GiScales']]);
    expect([art(button('Diplomacy')), icons(button('Diplomacy'))]).toEqual([[], ['GiScrollUnfurled']]);
    expect(allDecorative(dialog)).toBe(true);
  });
});

describe('FR-334 HUD and dialog titles', () => {
  it('FR-334 the HUD\'s Capital, Warehouse and Transport buttons show their buildings; every other glyph stays; the names are exactly as before', () => {
    show(continent());
    render(<HUD />);
    const button = (name: string | RegExp) => screen.getByRole('button', { name });
    expect([art(button('Open Warehouse')), icons(button('Open Warehouse'))]).toEqual([['buildings/warehouse.png'], []]);
    expect([art(button('Open Capital')), icons(button('Open Capital'))]).toEqual([['buildings/capitol.png'], []]);
    expect([art(button('Transportation of Commodities')), icons(button('Transportation of Commodities'))]).toEqual([['buildings/railyard.png'], []]);
    // FR-335: no pack picture for these, so they keep their Game Icons
    expect([art(button('Open Market')), icons(button('Open Market'))]).toEqual([[], ['GiScales']]);
    expect([art(button('Deal Book')), icons(button('Deal Book'))]).toEqual([[], ['GiOpenBook']]);
    expect([art(button('Diplomacy')), icons(button('Diplomacy'))]).toEqual([[], ['GiScrollUnfurled']]);
    expect([art(button('Center')), icons(button('Center'))]).toEqual([[], ['GiCrosshair']]);
    expect([art(button('Advance Turn')), icons(button('Advance Turn'))]).toEqual([[], ['GiPlayButton']]);
    // The names of FR-336, exactly
    expect(button(/^About$/)).toBeTruthy();
    expect(button(/Open Capital/)).toBe(button('Open Capital'));
    for (const name of ['Open Warehouse', 'Open Capital', 'Transportation of Commodities']) {
      const img = button(name).querySelector('img')!;
      expect(img.getAttribute('alt'), name).toBe('');
      expect(img.hasAttribute('data-art-inline'), name).toBe(true);
      expect(text(button(name)), name).toBe(name);
    }
  });

  it('FR-334 after the game the Final scores button keeps its Game Icon', () => {
    const over = resolveTurn({ ...newGame({ seed: 1 }), turnLimit: 1 }, {}, 1).state;
    show(over);
    render(<HUD />);
    const scores = screen.getByRole('button', { name: 'Final scores' });
    expect([art(scores), icons(scores)]).toEqual([[], ['GiCheckeredFlag']]);
  });

  it("FR-334 Construction Options: the title shows the engineer, Build Depot the depot and Build Port the port; the names stay", () => {
    // 3-1 is a coastal timber tile of Testland: a port site, so both buttons show
    show(continent(), { isConstructionModalOpen: true, constructionModalTileId: '3-1', constructionModalWorkerId: 'worker-nation-1-7' });
    render(<ConstructionOptionsModal />);
    const dialog = screen.getByRole('dialog', { name: 'Construction Options' });
    const title = within(dialog).getByRole('heading', { level: 2 });
    expect(art(title)).toEqual([artFileOf(civilianArt(WorkerType.Engineer))]);
    expect(art(title)).toEqual(['workers/engineer.png']);
    expect(icons(title)).toEqual([]);
    expect(text(title)).toBe('Construction Options');
    expect(art(within(dialog).getByRole('button', { name: 'Build Depot' }))).toEqual(['infrastructure/depot.png']);
    expect(art(within(dialog).getByRole('button', { name: 'Build Port' }))).toEqual(['infrastructure/port.png']);
    expect(art(within(dialog).getByRole('button', { name: 'Cancel' }))).toEqual([]);
    expect(allDecorative(dialog)).toBe(true);
  });

  it('FR-334 FR-335 the Transportation of Commodities popup\'s title shows the railyard, as its HUD button', () => {
    show(continent());
    render(<TransportAllocationModal capacity={4} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Transportation of Commodities' });
    const title = within(dialog).getByRole('heading', { level: 3 });
    expect(art(title)).toEqual(['buildings/railyard.png']);
    expect(icons(title)).toEqual([]);
    expect(text(title)).toBe('Transportation of Commodities');
  });
});

describe('FR-331 FR-332 the tile info panel', () => {
  it("FR-332 the capital's civilians each show their figure, decorative, the list's texts unchanged", () => {
    const s = continent();
    show(s, { selectedTileId: '2-9' });
    render(<TileInfoPanel selectedTile={tileAt(s, '2-9')} />);
    const items = within(screen.getByTestId('tile-info')).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    for (const [i, worker] of tileAt(s, '2-9').workers.entries()) {
      expect(art(items[i]), worker.type).toEqual([artFileOf(civilianArt(worker.type))]);
      expect(icons(items[i]), worker.type).toEqual([]);
      expect(items[i].textContent, worker.type).toContain(worker.type);
    }
    expect(art(items[0])).toEqual(['workers/prospector.png']);
    expect(allDecorative(screen.getByTestId('tile-info'))).toBe(true);
  });

  it("FR-332 the selected prospector's Prospect button shows the prospector, its name stays \"Prospect\"", () => {
    const s = continent();
    const prospector = tileAt(s, '2-9').workers.find((w) => w.type === WorkerType.Prospector)!;
    // Barren hills with hidden coal: a prospecting site
    const hills = { ...tileAt(s, '5-2'), workers: [{ ...prospector, assignedTileId: '5-2' }] };
    show(s, { selectedTileId: '5-2', selectedWorkerId: prospector.id });
    render(<TileInfoPanel selectedTile={hills} />);
    const prospect = screen.getByRole('button', { name: 'Prospect' });
    expect(art(prospect)).toEqual(['workers/prospector.png']);
    expect(icons(prospect)).toEqual([]);
    expect(prospect.querySelector('img')?.getAttribute('alt')).toBe('');
    // The hidden coal is not named, and has no picture (FR-095)
    const resource = within(screen.getByTestId('tile-info')).getByText('Resource:').parentElement!;
    expect(text(resource)).toBe('Resource: Not yet prospected');
    expect(art(resource)).toEqual([]);
  });

  it("FR-331 the Resource line shows a known resource's goods picture; none without a resource", () => {
    const s = continent();
    show(s, { selectedTileId: '3-9' });
    const { unmount } = render(<TileInfoPanel selectedTile={tileAt(s, '3-9')} />);
    let resource = within(screen.getByTestId('tile-info')).getByText('Resource:').parentElement!;
    expect(art(resource)).toEqual(['goods/grain.png']);
    expect(resource.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(text(resource)).toBe('Resource: Grain (L1)');
    unmount();

    render(<TileInfoPanel selectedTile={tileAt(s, '2-9')} />);
    resource = within(screen.getByTestId('tile-info')).getByText('Resource:').parentElement!;
    expect(art(resource)).toEqual([]);
    expect(text(resource)).toBe('Resource: None');
  });
});
