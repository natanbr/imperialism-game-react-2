// @vitest-environment jsdom
// M8 UI half. FR-210 (plan M8; Imp1 encampment tents, rules 11 section 5.1): on each province's seat tile the map draws one
// marker per country with regiments there, in its colour (the Great Power's slot colour, --color-minor for a minor),
// showing its force size and militia count, named "Testland army: force size 4, 3 regiments, 4 militia" or "Arvelia
// militia: 3". The player's own marker is a button that opens the Army screen (FR-211); the others are images.
// The markers come from the engine's `armyMarkers` through the React-free components/army/armyView.ts.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MapView } from '@/components/MapView';
import { ArmyModal } from '@/components/ArmyModal';
import { markerLabel } from '@/components/army/armyView';
import { useGameStore } from '@/store/rootStore';
import { newGame, type Order } from '@/engine';
import { NATION_COLORS, THEME } from '@/styles/theme';
import type { GameState } from '@/types/GameState';
import { addRegiments, continent, idOf, NE1, NW1, SW1 } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const show = (game: GameState) => useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1 });
const tileEl = (container: HTMLElement, id: string) => container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
const markersIn = (container: HTMLElement, tileId: string) => within(tileEl(container, tileId)).queryAllByTestId('army-marker');

/** The seat tile of each province of a new continent game (continent.ts: SW on the capital, minors on theirs). */
const SEATS: Record<string, string> = {
  'province-nation-1-nw': '4-4',
  'province-nation-1-ne': '7-3',
  'province-nation-1-sw': '2-9',
  'province-nation-1-se': '7-10',
  'province-nation-2-nw': '16-4',
  'province-nation-2-ne': '19-3',
  'province-nation-2-sw': '14-9',
  'province-nation-2-se': '19-10',
  'province-minor-1': '11-4',
  'province-minor-2': '12-9',
  'province-minor-3': '11-1',
  'province-minor-4': '12-13',
};

// Each test renders the whole 24 x 16 map: about 2 s alone (testTimeout in vitest.config.ts)
describe('FR-210 army markers on the seat tiles', () => {
  it('FR-210 a new continent game: one marker on each of the 12 seats, named by its owner, force size, regiments and militia', () => {
    show(continent());
    const { container } = render(<MapView />);

    const all = within(container).getAllByTestId('army-marker');
    expect(all).toHaveLength(12);
    const names = Object.fromEntries(Object.entries(SEATS).map(([province, tileId]) => [province, markersIn(container, tileId).map((m) => m.getAttribute('aria-label'))]));
    expect(names).toEqual({
      'province-nation-1-nw': ['Testland militia: 4'],
      'province-nation-1-ne': ['Testland militia: 4'],
      'province-nation-1-sw': ['Testland army: force size 4, 3 regiments, 4 militia'],
      'province-nation-1-se': ['Testland militia: 4'],
      'province-nation-2-nw': ['Valdoria militia: 4'],
      'province-nation-2-ne': ['Valdoria militia: 4'],
      'province-nation-2-sw': ['Valdoria army: force size 4, 3 regiments, 4 militia'],
      'province-nation-2-se': ['Valdoria militia: 4'],
      'province-minor-1': ['Arvelia militia: 3'],
      'province-minor-2': ['Sundmark militia: 3'],
      'province-minor-3': ['Lorran militia: 3'],
      'province-minor-4': ['Pellis militia: 3'],
    });
    // The name is the title too, for the mouse
    for (const m of all) expect(m.getAttribute('title')).toBe(m.getAttribute('aria-label'));
  });

  it("FR-210 the player's own markers are buttons, every other country's an image", () => {
    show(continent());
    const { container } = render(<MapView />);
    const capital = within(tileEl(container, '2-9'));
    expect(capital.getByRole('button', { name: 'Testland army: force size 4, 3 regiments, 4 militia' })).toBeTruthy();
    expect(within(tileEl(container, '4-4')).getByRole('button', { name: 'Testland militia: 4' })).toBeTruthy();
    expect(within(tileEl(container, '14-9')).getByRole('img', { name: 'Valdoria army: force size 4, 3 regiments, 4 militia' })).toBeTruthy();
    expect(within(tileEl(container, '11-4')).getByRole('img', { name: 'Arvelia militia: 3' })).toBeTruthy();
    expect(within(tileEl(container, '14-9')).queryAllByRole('button').filter((b) => b.dataset.testid === 'army-marker')).toEqual([]);
    expect(screen.getAllByRole('button').filter((b) => b.dataset.testid === 'army-marker')).toHaveLength(4);
  });

  it('FR-210 the marker shows the force size and the militia count; a militia-only marker shows the militia alone', () => {
    show(continent());
    const { container } = render(<MapView />);
    const [army] = markersIn(container, '2-9');
    expect(text(within(army).getByTestId('army-force'))).toBe('4');
    expect(text(within(army).getByTestId('army-militia'))).toBe('4');
    const [militia] = markersIn(container, '11-4');
    expect(within(militia).queryByTestId('army-force')).toBeNull();
    expect(text(within(militia).getByTestId('army-militia'))).toBe('3');
  });

  it("FR-210 in its owner's colour: the Great Power's slot colour, --color-minor for a minor", () => {
    show(continent());
    const { container } = render(<MapView />);
    expect(markersIn(container, '2-9')[0].style.borderColor).toBe(NATION_COLORS[0]);
    expect(markersIn(container, '14-9')[0].style.borderColor).toBe(NATION_COLORS[1]);
    expect(markersIn(container, '11-4')[0].style.borderColor).toBe(THEME.minor);
    // The force size sits on the owner's colour
    expect(within(markersIn(container, '2-9')[0]).getByTestId('army-force').style.backgroundColor).toBe(NATION_COLORS[0]);
  });

  it('FR-210 FR-211 a click on our marker opens the Army screen of its province and does not select the tile', () => {
    show(continent());
    const { container } = render(
      <>
        <MapView />
        <ArmyModal />
      </>
    );
    fireEvent.click(within(tileEl(container, '2-9')).getByRole('button', { name: /^Testland army/ }));
    expect(useGameStore.getState().armyProvinceId).toBe(SW1);
    expect(useGameStore.getState().selectedTileId).toBeUndefined();
    expect(screen.getByRole('dialog', { name: 'Army in Testland South-West' })).toBeTruthy();
  });

  it("FR-210 two countries in one province: two markers on its seat, the province's owner first", () => {
    show(addRegiments(continent(), 'nation-2', NE1, ['regulars']));
    const { container } = render(<MapView />);
    expect(markersIn(container, '7-3').map((m) => m.getAttribute('aria-label'))).toEqual([
      'Testland militia: 4',
      'Valdoria army: force size 1, 1 regiment',
    ]);
  });

  it('FR-210 the markers follow the game: after a march the North-West marker shows the regiment that arrived', () => {
    show(continent());
    const { container } = render(<MapView />);
    const s = useGameStore.getState().game;
    const order: Order = { kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [idOf(s, N1, '1st Artillery')], toProvinceId: NW1 };
    act(() => {
      expect(useGameStore.getState().submitOrder(order)).toEqual({ ok: true });
    });
    act(() => useGameStore.getState().advanceTurn());
    expect(markersIn(container, '4-4').map((m) => m.getAttribute('aria-label'))).toEqual(['Testland army: force size 2, 1 regiment, 4 militia']);
    expect(markersIn(container, '2-9').map((m) => m.getAttribute('aria-label'))).toEqual(['Testland army: force size 2, 2 regiments, 4 militia']);
  });

  it('FR-210 two-islands has no provinces and no regiments: no marker', () => {
    show(newGame({ seed: 1, world: 'two-islands' }));
    const { container } = render(<MapView />);
    expect(within(container).queryAllByTestId('army-marker')).toEqual([]);
  });

  it('FR-210 the name: militia only; an army with militia; an army without militia; one regiment', () => {
    expect(markerLabel({ forceSize: 0, regiments: 0, militia: 3 }, 'Arvelia')).toBe('Arvelia militia: 3');
    expect(markerLabel({ forceSize: 4, regiments: 3, militia: 4 }, 'Testland')).toBe('Testland army: force size 4, 3 regiments, 4 militia');
    expect(markerLabel({ forceSize: 2, regiments: 1, militia: 0 }, 'Testland')).toBe('Testland army: force size 2, 1 regiment');
    expect(markerLabel({ forceSize: 1, regiments: 1, militia: 1 }, 'Valdoria')).toBe('Valdoria army: force size 1, 1 regiment, 1 militia');
  });
});
