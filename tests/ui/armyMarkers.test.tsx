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
import { tryApplyOrder } from '@/engine/orders/apply';
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

// M8 QA fix round, item 1. FR-263: before End Turn the map shows the player's own army orders: a dashed arrow in the
// nation's colour from the source province's marker to the destination's seat, with the count of regiments marching,
// named "Testland North-West: 1 regiment marching in from Testland South-West"; a disband ordered shows "−1" on the
// source marker. The markers' names say it too.
describe('FR-263 pending army orders on the map', () => {
  const N2 = 'nation-2';
  /** Renders the map on a new continent game and returns it with a way to send orders through the store. */
  function mapWithOrders() {
    show(continent());
    const view = render(<MapView />);
    const send = (order: Order) =>
      act(() => {
        expect(useGameStore.getState().submitOrder(order)).toEqual({ ok: true });
      });
    const id = (name: string) => idOf(useGameStore.getState().game, N1, name);
    return { ...view, send, id };
  }
  const arrows = (container: HTMLElement) => within(container).queryAllByTestId('march-arrow');

  it('FR-263 a march ordered: one arrow from the source marker to the destination seat, in the nation\'s colour, dashed, with its count and its name', () => {
    const { container, send, id } = mapWithOrders();
    expect(arrows(container)).toEqual([]);
    send({ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [id('1st Regulars')], toProvinceId: NW1 });

    const [arrow] = arrows(container);
    expect(arrows(container)).toHaveLength(1);
    expect(arrow.getAttribute('role')).toBe('img');
    expect(arrow.getAttribute('aria-label')).toBe('Testland North-West: 1 regiment marching in from Testland South-West');
    expect(screen.getByRole('img', { name: 'Testland North-West: 1 regiment marching in from Testland South-West' })).toBe(arrow);
    expect(text(within(arrow).getByTestId('march-count'))).toBe('1');
    const line = within(arrow).getByTestId('march-line');
    expect(line.getAttribute('stroke')).toBe(NATION_COLORS[0]);
    expect(line.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(within(arrow).getByTestId('march-head').getAttribute('fill')).toBe(NATION_COLORS[0]);

    // From the South-West marker (seat 2-9, odd row: 105, 378; the marker's centre 1 px right of the tile's left edge,
    // 21 px down) towards the North-West seat's marker (4-4: 168, 168), leaving the two markers clear
    const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((a) => Number(line.getAttribute(a)));
    const near = (x: number, y: number, cx: number, cy: number) => Math.hypot(x - cx, y - cy);
    expect(near(x1, y1, 106, 399)).toBeGreaterThanOrEqual(12);
    expect(near(x1, y1, 106, 399)).toBeLessThanOrEqual(18);
    expect(near(x2, y2, 169, 189)).toBeGreaterThanOrEqual(12);
    expect(near(x2, y2, 169, 189)).toBeLessThanOrEqual(26);
    expect(y2).toBeLessThan(y1);
  });

  it('FR-263 two regiments to one province make one arrow with "2"; the markers name the regiments marching out and in', () => {
    const { container, send, id } = mapWithOrders();
    send({ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [id('1st Regulars'), id('2nd Regulars')], toProvinceId: NW1 });

    expect(arrows(container).map((a) => a.getAttribute('aria-label'))).toEqual(['Testland North-West: 2 regiments marching in from Testland South-West']);
    expect(text(within(arrows(container)[0]).getByTestId('march-count'))).toBe('2');
    expect(markersIn(container, '2-9').map((m) => m.getAttribute('aria-label'))).toEqual(['Testland army: force size 4, 3 regiments, 4 militia, 2 marching out']);
    expect(markersIn(container, '4-4').map((m) => m.getAttribute('aria-label'))).toEqual(['Testland militia: 4, 2 marching in']);
  });

  it('FR-263 a disband ordered shows "−1" on the source marker and in its name; Cancel takes the arrow and the mark away', () => {
    const { container, send, id } = mapWithOrders();
    send({ kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [id('1st Artillery')] });
    send({ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [id('1st Regulars')], toProvinceId: NE1 });

    const [capital] = markersIn(container, '2-9');
    expect(capital.getAttribute('aria-label')).toBe('Testland army: force size 4, 3 regiments, 4 militia, 1 marching out, 1 to disband');
    expect(text(within(tileEl(container, '2-9')).getByTestId('army-disband'))).toBe('−1');
    expect(within(tileEl(container, '2-9')).getByTestId('army-disband').getAttribute('aria-hidden')).toBe('true');
    expect(arrows(container).map((a) => a.getAttribute('aria-label'))).toEqual(['Testland North-East: 1 regiment marching in from Testland South-West']);

    send({ kind: 'cancelDisband', nationId: N1, regimentIds: [id('1st Artillery')] });
    send({ kind: 'cancelArmyMove', nationId: N1, regimentIds: [id('1st Regulars')] });
    expect(within(tileEl(container, '2-9')).queryByTestId('army-disband')).toBeNull();
    expect(arrows(container)).toEqual([]);
    expect(markersIn(container, '2-9')[0].getAttribute('aria-label')).toBe('Testland army: force size 4, 3 regiments, 4 militia');
  });

  it('FR-263 after End Turn the orders are done: no arrow, the regiment is in the marker of its new province', () => {
    const { container, send, id } = mapWithOrders();
    send({ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [id('1st Regulars')], toProvinceId: NW1 });
    act(() => useGameStore.getState().advanceTurn());
    expect(arrows(container)).toEqual([]);
    expect(markersIn(container, '4-4').map((m) => m.getAttribute('aria-label'))).toEqual(['Testland army: force size 1, 1 regiment, 4 militia']);
  });

  // Review of the QA fix round, F1. FR-270: marches both ways between two provinces are two arrows side by side, each on
  // its own right of the line between the two markers (as traffic keeps right), so neither line nor count covers the
  // other; a march with no opposite one keeps to that line.
  it('FR-270 marches both ways between South-West and North-West: two arrows side by side, both counts readable', () => {
    const { container, send, id } = mapWithOrders();
    send({ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [id('1st Regulars')], toProvinceId: NW1 });
    act(() => useGameStore.getState().advanceTurn());
    send({ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [id('2nd Regulars'), id('1st Artillery')], toProvinceId: NW1 });
    send({ kind: 'moveArmy', nationId: N1, fromProvinceId: NW1, regimentIds: [id('1st Regulars')], toProvinceId: SW1 });

    const byLabel = (label: string) => arrows(container).find((a) => a.getAttribute('aria-label') === label)!;
    expect(arrows(container)).toHaveLength(2);
    const north = byLabel('Testland North-West: 2 regiments marching in from Testland South-West');
    const south = byLabel('Testland South-West: 1 regiment marching in from Testland North-West');
    expect(text(within(north).getByTestId('march-count'))).toBe('2');
    expect(text(within(south).getByTestId('march-count'))).toBe('1');

    // The line between the two markers' centres (South-West 106, 399; North-West 169, 189, as in the first FR-263 test):
    // the signed distance of a point from it, positive on the right of the way north
    const [ax, ay, bx, by] = [106, 399, 169, 189];
    const length = Math.hypot(bx - ax, by - ay);
    const side = (x: number, y: number) => ((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / -length;
    const ends = (arrow: HTMLElement) => {
      const line = within(arrow).getByTestId('march-line');
      return ['x1', 'y1', 'x2', 'y2'].map((a) => Number(line.getAttribute(a)));
    };
    const badge = (arrow: HTMLElement) => {
      const circle = arrow.querySelector('circle')!;
      return { x: Number(circle.getAttribute('cx')), y: Number(circle.getAttribute('cy')), r: Number(circle.getAttribute('r')) };
    };
    // Each arrow keeps to its own right, at both ends: the northbound one east of the line, the southbound one west
    const [n1x, n1y, n2x, n2y] = ends(north);
    const [s1x, s1y, s2x, s2y] = ends(south);
    for (const d of [side(n1x, n1y), side(n2x, n2y)]) expect(d).toBeGreaterThanOrEqual(8);
    for (const d of [side(s1x, s1y), side(s2x, s2y)]) expect(d).toBeLessThanOrEqual(-8);
    // The two count badges do not touch (their 1.5 px outlines included), so "2" and "1" are both on the map
    const [bn, bs] = [badge(north), badge(south)];
    expect(Math.hypot(bn.x - bs.x, bn.y - bs.y)).toBeGreaterThan(bn.r + bs.r + 1.5);

    // With the southbound march cancelled, the northbound arrow is alone and back on the line between the markers
    send({ kind: 'cancelArmyMove', nationId: N1, regimentIds: [id('1st Regulars')] });
    expect(arrows(container)).toHaveLength(1);
    const [l1x, l1y, l2x, l2y] = ends(arrows(container)[0]);
    expect(Math.abs(side(l1x, l1y))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(side(l2x, l2y))).toBeLessThanOrEqual(0.5);
  });

  it("FR-263 another nation's orders are not shown (they are not known before End Turn)", () => {
    let s = continent();
    const valdoria = s.armies.find((a) => a.ownerId === N2 && a.regiments.length === 7)!;
    const order: Order = { kind: 'moveArmy', nationId: N2, fromProvinceId: valdoria.provinceId, regimentIds: [valdoria.regiments[0].id], toProvinceId: 'province-nation-2-nw' };
    const applied = tryApplyOrder(s, order);
    expect(applied.result).toEqual({ ok: true });
    s = applied.state;
    show(s);
    const { container } = render(<MapView />);
    expect(arrows(container)).toEqual([]);
    expect(markersIn(container, '14-9')[0].getAttribute('aria-label')).toBe('Valdoria army: force size 4, 3 regiments, 4 militia');
  });
});
