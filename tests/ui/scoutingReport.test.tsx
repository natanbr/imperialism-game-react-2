// @vitest-environment jsdom
// FR-650 (M18l; Imp1 Scouting Report, rules 11 section 5.3): Tile Info of another country's province offers "Scouting
// report". Available, it opens a dialog "Report on the army forces of [country] in the province of [name]" with the
// owner's regiments there by type and count (or "No army forces seen."), the estimator ("Estimated by our garrison in
// Testland North-East", "... by our army in ...", "... by our fleet off ...") and OK. Unavailable, the button is disabled
// and says why: "We cannot scout this province without a nearby ship or neighboring armies." Our own province, a tile
// without a province and Two islands offer no report. Opening and closing it sends no Order and leaves the game as it was.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { TileInfoPanel } from '@/components/TileInfoPanel';
import { attackView } from '@/components/army/attackView';
import { newGame, type Order } from '@/engine';
import { useGameStore } from '@/store/rootStore';
import type { GameState } from '@/types/GameState';
import { ShipType, type Fleet } from '@/types/Navy';
import { N1, N2, tileAt } from '../engine/fixtures';
import { addRegiments, ARVELIA, ARVELIA_P, clearArmy, continent, NE1, NW2, SW2 } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const ARVELIA_FOREST = '10-3';
const VALDORIA_CAPITAL = '14-9';
const SUNDMARK_CAPITAL = '12-9';
const REFUSAL = 'We cannot scout this province without a nearby ship or neighboring armies.';
let submitted: Order[] = [];

function show(game: GameState, tileId: string) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game, activeNationId: N1 });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({ submitOrder: (order: Order) => (submitted.push(order), submitOrder(order)) });
  return render(<TileInfoPanel selectedTile={tileAt(game, tileId)} />);
}

const scoutButton = () => within(screen.getByTestId('tile-info')).queryByRole('button', { name: 'Scouting report' });
const report = (name: string) => screen.getByRole('dialog', { name });
const forcesOf = (dialog: HTMLElement) => within(within(dialog).getByRole('list', { name: 'Army forces seen' })).getAllByRole('listitem').map(li => text(li));

const squadronOff = (s: GameState, provinceId: string): GameState => {
  const fleet: Fleet = {
    id: 'nation-1-scout', name: 'Scouting squadron', ownerNationId: N1, location: '0-0', aggression: 'normal',
    approach: { provinceId, seaId: '0-0' },
    ships: [{ id: 'nation-1-frigate', type: ShipType.Frigate, firepower: 3, range: 5, armour: 10, hull: 35, battleMove: 4, speed: 3, experience: 0 }],
  };
  return { ...s, fleets: [fleet], nations: s.nations.map(n => (n.id === N1 ? { ...n, fleets: [fleet.id] } : n)) };
};

describe('FR-650 the Scouting report in Tile Info', () => {
  it('FR-650 a bordering minor with three Minutemen: our garrison reports them; OK closes, sends nothing, changes nothing', () => {
    const game = continent();
    show(game, ARVELIA_FOREST);
    const button = scoutButton()!;
    expect(button).toBeTruthy();
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-describedby')).toBeNull();
    button.focus();
    fireEvent.click(button);

    const dialog = report('Report on the army forces of Arvelia in the province of Arvelia');
    expect(forcesOf(dialog)).toEqual(['3 Minutemen']);
    expect(text(dialog)).toContain('Estimated by our garrison in Testland North-East');
    expect(text(dialog)).not.toContain('unknown');
    const ok = within(dialog).getByRole('button', { name: 'OK' });
    expect(document.activeElement).toBe(ok);
    fireEvent.click(ok);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(scoutButton());

    expect(submitted).toEqual([]);
    expect(useGameStore.getState().game).toBe(game);
    expect(useGameStore.getState().ordersThisTurn).toEqual([]);
  });

  it('FR-650 the forces list keeps its list role where list-style: none would drop it (Safari)', () => {
    show(continent(), ARVELIA_FOREST);
    fireEvent.click(scoutButton()!);
    const dialog = report('Report on the army forces of Arvelia in the province of Arvelia');
    expect(within(dialog).getByRole('list', { name: 'Army forces seen' }).getAttribute('role')).toBe('list');
  });

  it('FR-650 a report that becomes unavailable while open closes, and does not reopen by itself when scouting is possible again', () => {
    const game = continent();
    show(game, ARVELIA_FOREST);
    fireEvent.click(scoutButton()!);
    expect(report('Report on the army forces of Arvelia in the province of Arvelia')).toBeTruthy();
    // Our garrison in Testland North-East leaves (hand-built): no one of ours borders Arvelia
    act(() => useGameStore.setState({ game: clearArmy(game, N1, NE1) }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(scoutButton()!.hasAttribute('disabled')).toBe(true);
    // It is back: the button is enabled again and only a click opens the report
    act(() => useGameStore.setState({ game }));
    expect(scoutButton()!.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FR-650 Escape closes the report too', () => {
    show(continent(), ARVELIA_FOREST);
    fireEvent.click(scoutButton()!);
    const dialog = report('Report on the army forces of Arvelia in the province of Arvelia');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FR-650 an empty province: "No army forces seen."', () => {
    show(clearArmy(continent(), ARVELIA, ARVELIA_P), ARVELIA_FOREST);
    fireEvent.click(scoutButton()!);
    const dialog = report('Report on the army forces of Arvelia in the province of Arvelia');
    expect(text(dialog)).toContain('No army forces seen.');
    expect(within(dialog).queryByRole('list', { name: 'Army forces seen' })).toBeNull();
  });

  it('FR-650 a far province: the action is disabled and says why; a click opens nothing', () => {
    show(continent(), VALDORIA_CAPITAL);
    const button = scoutButton()!;
    expect(button.hasAttribute('disabled')).toBe(true);
    const reason = document.getElementById(button.getAttribute('aria-describedby')!)!;
    expect(text(reason)).toBe(REFUSAL);
    fireEvent.click(button);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(submitted).toEqual([]);
  });

  it('FR-650 a Great Power province with mixed regiments, seen by our army: the counts equal the Attack preview\'s defenders', () => {
    const game = addRegiments(continent(), N1, NW2, ['regulars']);
    show(game, VALDORIA_CAPITAL);
    fireEvent.click(scoutButton()!);
    const dialog = report('Report on the army forces of Valdoria in the province of Valdoria South-West');
    expect(forcesOf(dialog)).toEqual(['4 Minutemen', '2 Regulars', '1 Artillery']);
    expect(text(dialog)).toContain('Estimated by our army in Valdoria North-West');
    const defenders = attackView(game, N1, { fromProvinceId: NW2, toProvinceId: SW2, regimentIds: [] }).defenders;
    const counts = new Map<string, number>();
    for (const d of defenders) counts.set(d.typeName, (counts.get(d.typeName) ?? 0) + 1);
    expect([...forcesOf(dialog)].sort()).toEqual([...counts].map(([name, n]) => `${n} ${name}`).sort());
  });

  it('FR-650 scouting by ship: a squadron of ours off the island Sundmark', () => {
    show(squadronOff(continent(), 'province-minor-2'), SUNDMARK_CAPITAL);
    fireEvent.click(scoutButton()!);
    const dialog = report('Report on the army forces of Sundmark in the province of Sundmark');
    expect(forcesOf(dialog)).toEqual(['3 Minutemen']);
    expect(text(dialog)).toContain('Estimated by our fleet off Sundmark');
  });

  it('FR-650 our own province offers no report', () => {
    show(continent(), '2-9');
    expect(scoutButton()).toBeNull();
    expect(text(screen.getByTestId('tile-info'))).not.toContain('Scouting report');
  });

  it('FR-650 Two islands has no provinces: no action on the rival\'s land', () => {
    const islands = newGame({ seed: 1, world: 'two-islands' });
    const rivalTile = islands.map.tiles.flat().find(t => t.ownerNationId === N2)!;
    show(islands, rivalTile.id);
    expect(text(screen.getByTestId('tile-owner'))).toBe('Owner: Valdoria');
    expect(scoutButton()).toBeNull();
  });
});
