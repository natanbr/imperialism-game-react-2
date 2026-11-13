// @vitest-environment jsdom
// M8 UI half. FR-211 (plan M8; Imp1 Garrison Book, rules 11 section 5.2): a dialog named "Army in Testland South-West"
// shows "Force Size: 4" and lists each regiment with its name, category, ARMS, a health bar with its number ("80%") and a
// status: "Defending" (militia), "Available", "Marching to Testland North-East" or "Disband ordered". Controls: a checkbox
// per Available regiment; a "March to" select with the bordering provinces (own ones in M8) and "March" (`moveArmy`);
// "Cancel march" (`cancelArmyMove`); "Disband", asking in place first (`disbandRegiments`). A control whose order
// `validateOrder` would refuse is disabled with the refusal text (visible, and its accessible description). Store flag
// `armyProvinceId`. Every control sends one order through submitOrder (FR-022).
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ArmyModal } from '@/components/ArmyModal';
import { useGameStore } from '@/store/rootStore';
import { transferProvince, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { continent, idOf, NE1, NW1, patchRegiment, SE1, SW1 } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const TITLE = 'Army in Testland South-West';
let submitted: Order[] = [];

/** Opens the Army screen of the province on `state` for the player and records every order it submits. */
function openArmy(state: GameState, provinceId = SW1) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, armyProvinceId: provinceId });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
  return render(<ArmyModal />);
}

const dialog = () => screen.getByRole('dialog', { name: TITLE });
const rowOf = (name: string) => within(dialog()).getByTestId(`regiment-${name}`);
const cellOf = (name: string, part: string) => text(within(rowOf(name)).getByTestId(part));
const statusOf = (name: string) => cellOf(name, 'status');
/** The text of the elements an element's aria-describedby names: its accessible description. */
const description = (el: HTMLElement): string =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
const button = (name: string | RegExp) => within(dialog()).getByRole('button', { name }) as HTMLButtonElement;
const now = () => useGameStore.getState().game;
const SW_REGIMENTS = ['1st Regulars', '2nd Regulars', '1st Artillery', '9th Minutemen', '10th Minutemen', '11th Minutemen', '12th Minutemen'];

describe('FR-211 the Army screen: what it shows', () => {
  it('FR-211 the dialog is named "Army in Testland South-West" and shows "Force Size: 4"', () => {
    openArmy(continent());
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(text(within(dialog()).getByRole('heading', { level: 2 }))).toBe(TITLE);
    expect(text(within(dialog()).getByTestId('force-size'))).toBe('Force Size: 4');
  });

  it('FR-211 one row per regiment: the regiments that may march first, then the militia, each by id', () => {
    openArmy(continent());
    const rows = within(dialog()).getAllByTestId(/^regiment-/);
    expect(rows.map((r) => r.dataset.testid?.replace('regiment-', ''))).toEqual(SW_REGIMENTS);
  });

  it('FR-211 each row: name, category, ARMS, health with its number, status', () => {
    openArmy(continent());
    expect([cellOf('1st Regulars', 'category'), cellOf('1st Regulars', 'arms'), cellOf('1st Regulars', 'health'), statusOf('1st Regulars')]).toEqual([
      'Regular Infantry',
      '1',
      '100%',
      'Available',
    ]);
    expect([cellOf('1st Artillery', 'category'), cellOf('1st Artillery', 'arms'), statusOf('1st Artillery')]).toEqual(['Heavy Artillery', '2', 'Available']);
    expect([cellOf('9th Minutemen', 'category'), cellOf('9th Minutemen', 'arms'), statusOf('9th Minutemen')]).toEqual(['Militia', '0', 'Defending']);
    // The column heads name what the cells hold
    expect(within(dialog()).getAllByRole('columnheader').map((th) => text(th))).toEqual(['Regiment', 'Category', 'Arms', 'Health', 'Status']);
  });

  it('FR-211 the health bar: as wide as the health, with its number ("80%")', () => {
    const s = continent();
    openArmy(patchRegiment(s, idOf(s, N1, '2nd Regulars'), { health: 80 }));
    expect(cellOf('2nd Regulars', 'health')).toBe('80%');
    const bar = within(rowOf('2nd Regulars')).getByTestId('health-bar');
    expect(bar.style.width).toBe('80%');
    expect(within(rowOf('1st Regulars')).getByTestId('health-bar').style.width).toBe('100%');
  });

  it('FR-211 a checkbox per Available regiment, named by the regiment; none for the militia', () => {
    openArmy(continent());
    expect(within(dialog()).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label') ?? text(c.closest('label')!))).toEqual([
      '1st Regulars',
      '2nd Regulars',
      '1st Artillery',
    ]);
    expect(within(rowOf('9th Minutemen')).queryByRole('checkbox')).toBeNull();
  });

  it('FR-211 "March to" lists the bordering provinces of ours, in province order', () => {
    openArmy(continent());
    const select = within(dialog()).getByRole('combobox', { name: 'March to' }) as HTMLSelectElement;
    expect([...select.options].map((o) => o.text)).toEqual(['Testland North-West', 'Testland North-East', 'Testland South-East']);
    expect([...select.options].map((o) => o.value)).toEqual([NW1, NE1, SE1]);
  });

  it('FR-261 the header shows the army upkeep at End Turn; a disband ordered takes its regiments out of it', () => {
    openArmy(continent());
    expect(text(within(dialog()).getByTestId('army-upkeep'))).toBe('Army upkeep at End Turn: $100');
    expect(within(dialog()).queryByTestId('army-upkeep-warning')).toBeNull();

    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '1st Artillery' }));
    fireEvent.click(button('Disband'));
    fireEvent.click(button('Yes, disband'));
    expect(text(within(dialog()).getByTestId('army-upkeep'))).toBe('Army upkeep at End Turn: $50');
  });

  it('FR-261 review F2: with less cash than the upkeep the screen warns that the newest regiments would be disbanded', () => {
    openArmy({ ...continent(), nations: continent().nations.map((n) => (n.id === N1 ? { ...n, treasury: 60 } : n)) });
    const warning = within(dialog()).getByTestId('army-upkeep-warning');
    expect(warning.getAttribute('role')).toBe('status');
    expect(text(warning)).toBe(
      "Cash is short of the army upkeep: $100 is due at End Turn and $60 will be left. Unless this turn's sales cover the rest, the newest regiments are disbanded."
    );
  });

  it("FR-211 the store flag armyProvinceId opens it; the close button and Escape clear it", () => {
    const first = openArmy(continent());
    fireEvent.click(button('Close army'));
    expect(useGameStore.getState().armyProvinceId).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    first.unmount();

    openArmy(continent());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useGameStore.getState().armyProvinceId).toBeNull();
  });

  it('FR-211 openArmy names the province and clears a refusal left from the map (FR-055)', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: continent(), activeNationId: N1 });
    useGameStore.getState().submitOrder({ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [], toProvinceId: NW1 });
    expect(useGameStore.getState().lastRejection).not.toBeNull();
    act(() => useGameStore.getState().openArmy(SW1));
    expect(useGameStore.getState().armyProvinceId).toBe(SW1);
    expect(useGameStore.getState().lastRejection).toBeNull();
  });
});

describe('FR-211 the Army screen: March and Cancel march', () => {
  it('FR-211 with nothing ticked, March is disabled and says why, as text and as its description', () => {
    openArmy(continent());
    const march = button('March');
    expect(march.disabled).toBe(true);
    expect(text(within(dialog()).getByTestId('march-reason'))).toBe('Tick the regiments to march first.');
    expect(description(march)).toBe('Tick the regiments to march first.');
  });

  it('FR-211 tick 1st Regulars, pick Testland North-East, March: one moveArmy order, the row now "Marching to Testland North-East"', () => {
    openArmy(continent());
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '1st Regulars' }));
    fireEvent.change(within(dialog()).getByRole('combobox', { name: 'March to' }), { target: { value: NE1 } });
    const march = button('March');
    expect(march.disabled).toBe(false);
    expect(within(dialog()).queryByTestId('march-reason')).toBeNull();
    fireEvent.click(march);

    const s = now();
    expect(submitted).toEqual([{ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [idOf(s, N1, '1st Regulars')], toProvinceId: NE1 }]);
    expect(statusOf('1st Regulars')).toBe('Marching to Testland North-East');
    expect(within(rowOf('1st Regulars')).queryByRole('checkbox')).toBeNull();
    // The ticks went with the order
    expect(within(dialog()).getAllByRole('checkbox').every((c) => !(c as HTMLInputElement).checked)).toBe(true);
  });

  it('FR-211 several regiments march with one order, in the order of the list', () => {
    openArmy(continent());
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '1st Artillery' }));
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '2nd Regulars' }));
    fireEvent.click(button('March'));
    const s = now();
    expect(submitted).toEqual([
      { kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [idOf(s, N1, '2nd Regulars'), idOf(s, N1, '1st Artillery')], toProvinceId: NW1 },
    ]);
    expect([statusOf('2nd Regulars'), statusOf('1st Artillery')]).toEqual(['Marching to Testland North-West', 'Marching to Testland North-West']);
  });

  it('FR-211 "Cancel march" on a marching regiment sends cancelArmyMove for it; it is Available again', () => {
    openArmy(continent());
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '1st Regulars' }));
    fireEvent.click(button('March'));
    const cancel = within(rowOf('1st Regulars')).getByRole('button', { name: 'Cancel march of 1st Regulars' });
    expect(text(cancel)).toBe('Cancel march');
    fireEvent.click(cancel);
    expect(submitted.at(-1)).toEqual({ kind: 'cancelArmyMove', nationId: N1, regimentIds: [idOf(now(), N1, '1st Regulars')] });
    expect(statusOf('1st Regulars')).toBe('Available');
    expect(within(rowOf('1st Regulars')).getByRole('checkbox')).toBeTruthy();
  });

  it('FR-211 a province with no bordering province of ours: the select is empty and March says why', () => {
    // Testland keeps only its South-West province (hand-built: the other three given to Valdoria)
    let s = continent();
    for (const p of [NW1, NE1, SE1]) s = transferProvince(s, p, 'nation-2');
    openArmy(s);
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '1st Regulars' }));
    const select = within(dialog()).getByRole('combobox', { name: 'March to' }) as HTMLSelectElement;
    expect(select.options).toHaveLength(0);
    expect(select.disabled).toBe(true);
    expect(button('March').disabled).toBe(true);
    expect(text(within(dialog()).getByTestId('march-reason'))).toBe('No province of ours borders this one.');
  });
});

describe('FR-211 the Army screen: Disband, asked in place', () => {
  it('FR-211 with nothing ticked, Disband is disabled and says why', () => {
    openArmy(continent());
    const disband = button('Disband');
    expect(disband.disabled).toBe(true);
    expect(text(within(dialog()).getByTestId('disband-reason'))).toBe('Tick the regiments to disband first.');
    expect(description(disband)).toBe('Tick the regiments to disband first.');
  });

  it('FR-211 Disband asks first; "Keep them" sends nothing and gives the focus back to Disband', () => {
    openArmy(continent());
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '2nd Regulars' }));
    fireEvent.click(button('Disband'));
    const question = within(dialog()).getByRole('group', { name: 'Confirm disband' });
    expect(text(within(question).getByTestId('disband-question'))).toBe(
      'Disband 2nd Regulars? They leave at End Turn; no money, armaments or workers come back.'
    );
    fireEvent.click(within(question).getByRole('button', { name: 'Keep them' }));
    expect(submitted).toEqual([]);
    expect(within(dialog()).queryByRole('group', { name: 'Confirm disband' })).toBeNull();
    expect(document.activeElement).toBe(button('Disband'));
  });

  it('FR-211 "Yes, disband" sends one disbandRegiments order; the row reads "Disband ordered" and has no checkbox', () => {
    openArmy(continent());
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '2nd Regulars' }));
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '1st Artillery' }));
    fireEvent.click(button('Disband'));
    expect(text(within(dialog()).getByTestId('disband-question'))).toBe(
      'Disband 2nd Regulars and 1st Artillery? They leave at End Turn; no money, armaments or workers come back.'
    );
    fireEvent.click(button('Yes, disband'));
    const s = now();
    expect(submitted).toEqual([{ kind: 'disbandRegiments', nationId: N1, provinceId: SW1, regimentIds: [idOf(s, N1, '2nd Regulars'), idOf(s, N1, '1st Artillery')] }]);
    expect(statusOf('2nd Regulars')).toBe('Disband ordered');
    expect(within(rowOf('2nd Regulars')).queryByRole('checkbox')).toBeNull();
    expect(within(dialog()).queryByRole('group', { name: 'Confirm disband' })).toBeNull();
  });

  it('FR-211 review F4: "Cancel disband" on a disband-ordered row sends cancelDisband for it; it is Available again', () => {
    openArmy(continent());
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '1st Artillery' }));
    fireEvent.click(button('Disband'));
    fireEvent.click(button('Yes, disband'));
    const cancel = within(rowOf('1st Artillery')).getByRole('button', { name: 'Cancel disband of 1st Artillery' });
    expect(text(cancel)).toBe('Cancel disband');

    fireEvent.click(cancel);

    expect(submitted.at(-1)).toEqual({ kind: 'cancelDisband', nationId: N1, regimentIds: [idOf(now(), N1, '1st Artillery')] });
    expect(statusOf('1st Artillery')).toBe('Available');
    expect(within(rowOf('1st Artillery')).getByRole('checkbox')).toBeTruthy();
  });

  it('FR-211 Escape while the question is shown keeps the regiments and leaves the dialog open', () => {
    openArmy(continent());
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '2nd Regulars' }));
    fireEvent.click(button('Disband'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(submitted).toEqual([]);
    expect(dialog()).toBeTruthy();
    expect(within(dialog()).queryByRole('group', { name: 'Confirm disband' })).toBeNull();
  });
});

describe('FR-211 a refused order: the control is disabled with the refusal text', () => {
  it('FR-211 after the game is over March, Disband and Cancel march are disabled and say "The game is over."', () => {
    const s = continent();
    // A march ordered before the end, then the game over (hand-built)
    useGameStore.setState({ ...useGameStore.getInitialState(), game: s, activeNationId: N1 });
    const marched = useGameStore.getState().submitOrder({ kind: 'moveArmy', nationId: N1, fromProvinceId: SW1, regimentIds: [idOf(s, N1, '1st Regulars')], toProvinceId: NW1 });
    expect(marched).toEqual({ ok: true });
    const over: GameState = { ...useGameStore.getState().game, gameOver: { turn: 40, year: 1824, scores: [] } as unknown as GameState['gameOver'] };
    openArmy(over);
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '2nd Regulars' }));
    for (const [name, reasonId] of [['March', 'march-reason'], ['Disband', 'disband-reason']] as const) {
      expect(button(name).disabled).toBe(true);
      expect(text(within(dialog()).getByTestId(reasonId))).toBe('The game is over.');
      expect(description(button(name))).toBe('The game is over.');
    }
    const cancel = within(rowOf('1st Regulars')).getByRole('button', { name: 'Cancel march of 1st Regulars' }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    expect(description(cancel)).toBe('The game is over.');
  });

  it('FR-211 review F1: a militia-only province (3 of our 4 on a new game): March and Disband say militia cannot march or be disbanded, not "tick"', () => {
    openArmy(continent(), NW1);
    const nw = screen.getByRole('dialog', { name: 'Army in Testland North-West' });
    expect(within(nw).queryAllByRole('checkbox')).toEqual([]);
    const militia = 'Militia defend their province: they cannot march or be disbanded.';
    for (const [name, reasonId] of [['March', 'march-reason'], ['Disband', 'disband-reason']] as const) {
      const control = within(nw).getByRole('button', { name }) as HTMLButtonElement;
      expect(control.disabled).toBe(true);
      expect(text(within(nw).getByTestId(reasonId))).toBe(militia);
      expect(description(control)).toBe(militia);
    }
  });

  it('FR-211 review F1: once every regiment here is marching or to be disbanded, March and Disband say so, not "tick"', () => {
    openArmy(continent());
    for (const name of ['1st Regulars', '2nd Regulars']) fireEvent.click(within(dialog()).getByRole('checkbox', { name }));
    fireEvent.click(button('March'));
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: '1st Artillery' }));
    fireEvent.click(button('Disband'));
    fireEvent.click(button('Yes, disband'));

    expect(within(dialog()).queryAllByRole('checkbox')).toEqual([]);
    for (const reasonId of ['march-reason', 'disband-reason']) {
      expect(text(within(dialog()).getByTestId(reasonId))).toBe('Every regiment here already has an order this turn.');
    }
  });

  it('FR-211 no army of ours in the province (all disbanded or marched away): the dialog says so', () => {
    const s = continent();
    openArmy({ ...s, armies: s.armies.filter((a) => !(a.ownerId === N1 && a.provinceId === SW1)) });
    expect(text(within(dialog()).getByTestId('no-army'))).toBe('No regiment of ours is here.');
    expect(text(within(dialog()).getByTestId('force-size'))).toBe('Force Size: 0');
  });
});
