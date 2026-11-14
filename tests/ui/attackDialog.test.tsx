// @vitest-environment jsdom
// M9 UI half. FR-230 (plan M9; Imp1 Scouting Report and red attack arrows, rules 11 sections 5.1 and 5.3): WHEN the player
// picks "Attack Arvelia" in the Army screen's "March to" (and presses "Attack…" beside it), or clicks a tile of a
// bordering enemy province with own regiments selected (ticked in the Army screen), THEN a dialog named "Attack Arvelia"
// shows our chosen regiments (name, health), the defenders (name, type, health, "entrenched" or "fort level 1"), the
// FR-226 strengths and verdict ("Our strength 36, theirs 18.8: Likely victory"), and "Attack" (one `moveArmy` into the
// province) and "Cancel". Without an active war it says "We are not at war with Arvelia. Declare war in Diplomacy; the
// war starts next turn." (or "The war starts next turn." when declared this turn) and has no Attack button. The Army
// screen reads an ordered attack as "Attacking Arvelia" with "Cancel attack" (`cancelArmyMove`). FR-272: the regiment
// pictures beside the names are decorative (alt ""); a fort shows its picture.
import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ArmyModal } from '@/components/ArmyModal';
import { AttackModal } from '@/components/AttackModal';
import { MapView } from '@/components/MapView';
import { attackPlanAt, estimateText, strengthText } from '@/components/army/attackView';
import { useGameStore } from '@/store/rootStore';
import { applyOrder, battleEstimate, defendersOf, findRegiment, REGIMENTS, type Order, type Regiment } from '@/engine';
import type { GameState } from '@/types/GameState';
import { setPair, setTile } from '../engine/fixtures';
import { ARVELIA, ARVELIA_P, clearArmy, continent, idOf, NE1, NW1, patchRegiment, relocate, SE1, SW1 } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
const N2 = 'nation-2';
/** The start forces' field army (FR-203): 1st Regulars, 2nd Regulars, 1st Artillery. */
const FIELD = ['regiment-1', 'regiment-2', 'regiment-3'];
/** Arvelia's capital tile, the seat of its one province (FR-153). */
const ARVELIA_SEAT = '11-4';
let submitted: Order[] = [];

const atWar = (s: GameState, a: string, b: string, since = 1): GameState =>
  setPair(s, a, b, { war: { aggressors: [a], since }, consulates: [], embassies: [], pact: false, alliance: false });
/** Testland's field army on Arvelia's border, in Testland North-East; at war with Arvelia unless `war` is false. */
const onTheBorder = (war = true): GameState => {
  const s = relocate(continent('world'), FIELD, NE1);
  return war ? atWar(s, N1, ARVELIA) : s;
};

/** Puts `state` in the store for the player and records every order a component submits. */
function show(state: GameState, ui: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, ...ui });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
}

const attackDialog = (name = 'Attack Arvelia') => screen.getByRole('dialog', { name });
const armyDialog = (name = 'Army in Testland North-East') => screen.getByRole('dialog', { name });
const now = () => useGameStore.getState().game;

/** Opens the Attack screen directly from the store flag (what the Army screen and the map click set). */
function openAttack(state: GameState, regimentIds = FIELD, from = NE1, to = ARVELIA_P) {
  show(state, { attackPlan: { fromProvinceId: from, toProvinceId: to, regimentIds } });
  return render(<AttackModal />);
}

describe('FR-230 the Attack screen: what it shows', () => {
  it('FR-230 a dialog named "Attack Arvelia" (the shared Modal) with our chosen regiments, by name and health', () => {
    const s = patchRegiment(onTheBorder(), 'regiment-2', { health: 80 });
    openAttack(s);
    expect(attackDialog().getAttribute('aria-modal')).toBe('true');
    expect(text(within(attackDialog()).getByRole('heading', { level: 2 }))).toBe('Attack Arvelia');
    const ours = within(attackDialog()).getByRole('list', { name: 'Our regiments' });
    expect(within(ours).getAllByRole('listitem').map((li) => [text(within(li).getByTestId('name')), text(within(li).getByTestId('health'))])).toEqual([
      ['1st Regulars', '100%'],
      ['2nd Regulars', '80%'],
      ['1st Artillery', '100%'],
    ]);
  });

  it('FR-230 the defenders exactly: name, type, health and "entrenched" (militia entrench, FR-199)', () => {
    openAttack(onTheBorder());
    const defenders = within(attackDialog()).getByRole('list', { name: 'Defenders' });
    expect(
      within(defenders)
        .getAllByRole('listitem')
        .map((li) => ['name', 'type', 'health', 'protection'].map((part) => text(within(li).getByTestId(part))))
    ).toEqual([
      ['1st Minutemen', 'Minutemen', '100%', 'entrenched'],
      ['2nd Minutemen', 'Minutemen', '100%', 'entrenched'],
      ['3rd Minutemen', 'Minutemen', '100%', 'entrenched'],
    ]);
    expect(text(within(attackDialog()).getByTestId('defenders-heading'))).toBe('Defenders: Arvelia');
    // No fort in Arvelia: no fort line, no fort picture
    expect(within(attackDialog()).queryByTestId('attack-fort')).toBeNull();
  });

  it('FR-230 FR-272 behind a fort the defenders read "fort level 1" and the fort shows its picture', () => {
    openAttack(setTile(onTheBorder(), ARVELIA_SEAT, { fortLevel: 1 }));
    const defenders = within(attackDialog()).getByRole('list', { name: 'Defenders' });
    expect(within(defenders).getAllByTestId('protection').map((p) => text(p))).toEqual(['fort level 1', 'fort level 1', 'fort level 1']);
    const fort = within(attackDialog()).getByTestId('attack-fort');
    expect(text(fort)).toBe('Fort level 1: our hits do 30% less damage');
    const picture = fort.querySelector('img')!;
    expect(picture.getAttribute('src')).toBe('/assets/ink-and-wash/infrastructure/fort-1.png');
    expect(picture.getAttribute('alt')).toBe('');
  });

  it('FR-230 the FR-226 strengths and verdict: "Our strength 36, theirs 18.8: Likely victory"', () => {
    openAttack(onTheBorder());
    expect(text(within(attackDialog()).getByTestId('attack-estimate'))).toBe('Our strength 36, theirs 18.8: Likely victory');
  });

  it('FR-230 the estimate words each verdict, strengths to one decimal at most', () => {
    expect(strengthText(36)).toBe('36');
    expect(strengthText(18.75)).toBe('18.8');
    expect(strengthText(12.5)).toBe('12.5');
    expect(strengthText(0)).toBe('0');
    expect(estimateText({ attack: 36, defence: 18.75, ratio: 1.92, verdict: 'likely-victory' })).toBe('Our strength 36, theirs 18.8: Likely victory');
    expect(estimateText({ attack: 15, defence: 18.75, ratio: 0.8, verdict: 'uncertain' })).toBe('Our strength 15, theirs 18.8: Uncertain');
    expect(estimateText({ attack: 10, defence: 18.75, ratio: 0.53, verdict: 'likely-defeat' })).toBe('Our strength 10, theirs 18.8: Likely defeat');
  });

  it('FR-230 FR-217 an undefended province: no defender listed, theirs 0, and it says so', () => {
    openAttack(clearArmy(onTheBorder(), ARVELIA, ARVELIA_P));
    expect(within(attackDialog()).queryByRole('list', { name: 'Defenders' })).toBeNull();
    expect(text(within(attackDialog()).getByTestId('no-defenders'))).toBe('No one defends Arvelia: it falls without a battle.');
    expect(text(within(attackDialog()).getByTestId('attack-estimate'))).toBe('Our strength 36, theirs 0: Likely victory');
  });

  it('FR-272 each regiment shows its picture beside its name, decorative (alt "")', () => {
    openAttack(onTheBorder());
    const pictures = (name: string) =>
      within(within(attackDialog()).getByRole('list', { name }))
        .getAllByRole('listitem')
        .map((li) => {
          const img = li.querySelector('img')!;
          return [img.getAttribute('src'), img.getAttribute('alt')];
        });
    expect(pictures('Our regiments')).toEqual([
      ['/assets/ink-and-wash/army/regulars.png', ''],
      ['/assets/ink-and-wash/army/regulars.png', ''],
      ['/assets/ink-and-wash/army/heavy-artillery.png', ''],
    ]);
    expect(pictures('Defenders').map(([src]) => src)).toEqual(Array(3).fill('/assets/ink-and-wash/army/militia.png'));
  });
});

describe('FR-230 the Attack screen: Attack and Cancel', () => {
  it('FR-230 "Attack" sends one moveArmy into the province with the chosen regiments and closes the dialog', () => {
    openAttack(onTheBorder());
    fireEvent.click(within(attackDialog()).getByRole('button', { name: 'Attack' }));
    expect(submitted).toEqual([{ kind: 'moveArmy', nationId: N1, fromProvinceId: NE1, regimentIds: FIELD, toProvinceId: ARVELIA_P }]);
    expect(now().intents.map((i) => i.kind)).toEqual(['attack']);
    expect(useGameStore.getState().attackPlan).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FR-230 "Cancel" and Escape close it and send nothing', () => {
    const first = openAttack(onTheBorder());
    fireEvent.click(within(attackDialog()).getByRole('button', { name: 'Cancel' }));
    expect(useGameStore.getState().attackPlan).toBeNull();
    expect(submitted).toEqual([]);
    first.unmount();

    openAttack(onTheBorder());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useGameStore.getState().attackPlan).toBeNull();
    expect(submitted).toEqual([]);
  });

  it('FR-230 without a war: "We are not at war with Arvelia. Declare war in Diplomacy; the war starts next turn." and no Attack button', () => {
    openAttack(onTheBorder(false));
    expect(text(within(attackDialog()).getByTestId('attack-war-note'))).toBe(
      'We are not at war with Arvelia. Declare war in Diplomacy; the war starts next turn.'
    );
    expect(within(attackDialog()).queryByRole('button', { name: 'Attack' })).toBeNull();
    expect(within(attackDialog()).getByRole('button', { name: 'Cancel' })).toBeTruthy();
    // The scouting still shows: both sides and the estimate
    expect(within(attackDialog()).getAllByRole('listitem')).toHaveLength(6);
    expect(text(within(attackDialog()).getByTestId('attack-estimate'))).toBe('Our strength 36, theirs 18.8: Likely victory');
  });

  it('FR-230 war declared this turn: "The war starts next turn." and no Attack button', () => {
    const declared = applyOrder(onTheBorder(false), { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA });
    openAttack(declared);
    expect(text(within(attackDialog()).getByTestId('attack-war-note'))).toBe('The war starts next turn.');
    expect(within(attackDialog()).queryByRole('button', { name: 'Attack' })).toBeNull();
  });

  it('FR-230 an attack the engine would refuse is disabled with the refusal text (game over)', () => {
    const over: GameState = { ...onTheBorder(), gameOver: { turn: 40, year: 1824, scores: [] } as unknown as GameState['gameOver'] };
    openAttack(over);
    const attack = within(attackDialog()).getByRole('button', { name: 'Attack' }) as HTMLButtonElement;
    expect(attack.disabled).toBe(true);
    expect(text(within(attackDialog()).getByTestId('attack-reason'))).toBe('The game is over.');
    expect(attack.getAttribute('aria-describedby')).toBe(within(attackDialog()).getByTestId('attack-reason').id);
  });
});

describe('FR-230 from the Army screen: "Attack Arvelia" in "March to"', () => {
  function openArmy(state: GameState, provinceId = NE1) {
    show(state, { armyProvinceId: provinceId });
    return render(
      <>
        <ArmyModal />
        <AttackModal />
      </>
    );
  }
  const select = () => within(armyDialog()).getByRole('combobox', { name: 'March to' }) as HTMLSelectElement;

  it('FR-230 "March to" lists the bordering provinces of ours, then "Attack Arvelia" for the bordering foreign one', () => {
    openArmy(onTheBorder());
    expect([...select().options].map((o) => [o.text, o.value])).toEqual([
      ['Testland North-West', NW1],
      ['Testland South-West', SW1],
      ['Testland South-East', SE1],
      ['Attack Arvelia', ARVELIA_P],
    ]);
  });

  it('FR-230 picking "Attack Arvelia" turns March into "Attack…"; with nothing ticked it says why', () => {
    openArmy(onTheBorder());
    fireEvent.change(select(), { target: { value: ARVELIA_P } });
    expect(within(armyDialog()).queryByRole('button', { name: 'March' })).toBeNull();
    const attack = within(armyDialog()).getByRole('button', { name: 'Attack…' }) as HTMLButtonElement;
    expect(attack.disabled).toBe(true);
    expect(text(within(armyDialog()).getByTestId('march-reason'))).toBe('Tick the regiments to attack with first.');
  });

  it('FR-230 FR-279 tick the regiments, pick "Attack Arvelia", "Attack…": the Attack screen opens in place of the Army screen with them; Attack orders it', () => {
    openArmy(onTheBorder());
    for (const name of ['1st Regulars', '1st Artillery']) fireEvent.click(within(armyDialog()).getByRole('checkbox', { name }));
    fireEvent.change(select(), { target: { value: ARVELIA_P } });
    fireEvent.click(within(armyDialog()).getByRole('button', { name: 'Attack…' }));

    // FR-279 (QA item 4): the plan remembers the Army screen it replaced
    expect(useGameStore.getState().attackPlan).toEqual({ fromProvinceId: NE1, toProvinceId: ARVELIA_P, regimentIds: ['regiment-1', 'regiment-3'], fromArmyScreen: true });
    const ours = within(attackDialog()).getByRole('list', { name: 'Our regiments' });
    expect(within(ours).getAllByTestId('name').map((n) => text(n))).toEqual(['1st Regulars', '1st Artillery']);
    // An attack without war is not refused here: the Attack screen says why it cannot be ordered yet
    expect(submitted).toEqual([]);

    fireEvent.click(within(attackDialog()).getByRole('button', { name: 'Attack' }));
    expect(submitted).toEqual([{ kind: 'moveArmy', nationId: N1, fromProvinceId: NE1, regimentIds: ['regiment-1', 'regiment-3'], toProvinceId: ARVELIA_P }]);
    expect(screen.queryByRole('dialog', { name: 'Attack Arvelia' })).toBeNull();
    // Back on the Army screen: the rows read "Attacking Arvelia", the ticks went with the order
    const row = within(armyDialog()).getByTestId('regiment-1st Regulars');
    expect(text(within(row).getByTestId('status'))).toBe('Attacking Arvelia');
    expect(within(row).getByRole('button', { name: 'Cancel attack of 1st Regulars' })).toBeTruthy();
    expect(text(within(within(armyDialog()).getByTestId('regiment-1st Artillery')).getByTestId('status'))).toBe('Attacking Arvelia');
    expect(within(armyDialog()).getAllByRole('checkbox').every((c) => !(c as HTMLInputElement).checked)).toBe(true);
    expect(useGameStore.getState().armySelection).toBeNull();
  });

  it('FR-230 "Cancel attack" sends cancelArmyMove for the regiment; it is Available again', () => {
    const s = applyOrder(onTheBorder(), { kind: 'moveArmy', nationId: N1, fromProvinceId: NE1, regimentIds: FIELD, toProvinceId: ARVELIA_P });
    openArmy(s);
    const row = within(armyDialog()).getByTestId('regiment-2nd Regulars');
    fireEvent.click(within(row).getByRole('button', { name: 'Cancel attack of 2nd Regulars' }));
    expect(submitted).toEqual([{ kind: 'cancelArmyMove', nationId: N1, regimentIds: ['regiment-2'] }]);
    expect(text(within(row).getByTestId('status'))).toBe('Available');
  });

  it('FR-230 the Attack screen is named after the province it attacks: a Great Power province reads "Attack Valdoria North-West"', () => {
    // Hand-built: Valdoria holds Testland North-West, at war with Testland
    let s = atWar(relocate(continent('world'), FIELD, NE1), N1, N2);
    s = { ...s, provinces: s.provinces.map((p) => (p.id === NW1 ? { ...p, ownerId: N2, name: 'Valdoria North-West' } : p)) };
    openAttack(clearArmy(s, N1, NW1), FIELD, NE1, NW1);
    expect(attackDialog('Attack Valdoria North-West')).toBeTruthy();
    expect(text(within(attackDialog('Attack Valdoria North-West')).getByTestId('defenders-heading'))).toBe('Defenders: Valdoria');
  });
});

describe('FR-230 from the map: a click on a bordering enemy province with our regiments selected', () => {
  /** The map with the Army screen and the Attack screen over it, on `state`. */
  function mapWith(state: GameState) {
    show(state);
    return render(
      <>
        <MapView />
        <ArmyModal />
        <AttackModal />
      </>
    );
  }
  const tileAt = (container: HTMLElement, id: string) => container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;

  it('FR-230 the ticks of the Army screen stay as the selection when it closes; the marker names it ("3 selected")', () => {
    const { container } = mapWith(onTheBorder());
    act(() => useGameStore.getState().openArmy(NE1));
    for (const name of ['1st Regulars', '2nd Regulars', '1st Artillery']) fireEvent.click(within(armyDialog()).getByRole('checkbox', { name }));
    fireEvent.click(within(armyDialog()).getByRole('button', { name: 'Close army' }));

    expect(useGameStore.getState().armySelection).toEqual({ provinceId: NE1, regimentIds: FIELD });
    const marker = within(tileAt(container, '7-3')).getAllByTestId('army-marker')[0];
    expect(marker.getAttribute('aria-label')).toBe('Testland army: force size 4, 3 regiments, 4 militia, 3 selected');
    expect(marker.getAttribute('data-selected')).toBe('true');
  });

  it("FR-230 then a click on Arvelia's land opens \"Attack Arvelia\" with the selected regiments", () => {
    const { container } = mapWith(onTheBorder());
    act(() => useGameStore.getState().selectRegiments(NE1, ['regiment-1', 'regiment-2']));
    fireEvent.click(tileAt(container, ARVELIA_SEAT));
    expect(useGameStore.getState().attackPlan).toEqual({ fromProvinceId: NE1, toProvinceId: ARVELIA_P, regimentIds: ['regiment-1', 'regiment-2'] });
    const ours = within(attackDialog()).getByRole('list', { name: 'Our regiments' });
    expect(within(ours).getAllByTestId('name').map((n) => text(n))).toEqual(['1st Regulars', '2nd Regulars']);
    expect(submitted).toEqual([]);
  });

  it('FR-230 a click on a province that does not border the selection opens nothing and drops the selection', () => {
    const { container } = mapWith(onTheBorder());
    act(() => useGameStore.getState().selectRegiments(NE1, FIELD));
    // Valdoria's capital tile: another country's, not bordering Testland North-East
    fireEvent.click(tileAt(container, '14-9'));
    expect(useGameStore.getState().attackPlan).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useGameStore.getState().armySelection).toBeNull();
  });

  it('FR-230 the plan from a selection keeps only the regiments still Available there, in the army\'s order', () => {
    let s = onTheBorder();
    s = applyOrder(s, { kind: 'moveArmy', nationId: N1, fromProvinceId: NE1, regimentIds: ['regiment-2'], toProvinceId: SE1 });
    expect(attackPlanAt(s, N1, { provinceId: NE1, regimentIds: ['regiment-3', 'regiment-2', 'regiment-1'] }, ARVELIA_P)).toEqual({
      fromProvinceId: NE1,
      toProvinceId: ARVELIA_P,
      regimentIds: ['regiment-1', 'regiment-3'],
    });
    // Not a bordering foreign province, or nothing left to send: no plan
    expect(attackPlanAt(s, N1, { provinceId: NE1, regimentIds: FIELD }, SW1)).toBeUndefined();
    expect(attackPlanAt(s, N1, { provinceId: NE1, regimentIds: ['regiment-2'] }, ARVELIA_P)).toBeUndefined();
    expect(attackPlanAt(s, N1, { provinceId: NE1, regimentIds: [idOf(s, N1, '5th Minutemen')] }, ARVELIA_P)).toBeUndefined();
  });

  it('FR-230 End Turn drops the selection and the plan', () => {
    show(onTheBorder());
    act(() => useGameStore.getState().selectRegiments(NE1, FIELD));
    act(() => useGameStore.getState().openAttack({ fromProvinceId: NE1, toProvinceId: ARVELIA_P, regimentIds: FIELD }));
    act(() => useGameStore.getState().advanceTurn());
    expect(useGameStore.getState().armySelection).toBeNull();
    expect(useGameStore.getState().attackPlan).toBeNull();
  });
});

// M9 QA fix round, item 3. FR-278: the Attack screen explains its terms: a short line under the estimate says what
// strength is (FR-226: firepower x health / 100 added up; a defender under cover divided by the share of damage it still
// takes) and what the verdicts mean, and "entrenched" is described under the defenders.
describe('FR-278 the Attack screen explains its terms', () => {
  const explanation = () => text(within(attackDialog()).getByTestId('estimate-explanation'));
  const VERDICTS = 'Likely victory at 1.5 times theirs or more, uncertain at 0.75 or more.';

  it('FR-278 FR-281 right under the estimate: what strength is and what the verdict means, with the cover that applies here', () => {
    openAttack(onTheBorder());
    const line = within(attackDialog()).getByTestId('estimate-explanation');
    expect(within(attackDialog()).getByTestId('attack-estimate').nextElementSibling).toBe(line);
    expect(explanation()).toBe(`Strength: each regiment's firepower times its health, added up; an entrenched defender counts 1.25 times as strong. ${VERDICTS}`);
  });

  it("FR-278 the explanation fits the engine: battleEstimate's strengths are firepower x health / 100 added up, the defenders' times the factor the line names (review F3)", () => {
    // The factor is read from the line on the screen and set against battleEstimate itself, so the two cannot drift apart
    const added = (regiments: readonly Regiment[]) => regiments.reduce((sum, r) => sum + REGIMENTS[r.type].stats.fpNormal * r.health, 0) / 100;
    const twoDecimals = (n: number) => Math.round(n * 100) / 100;
    const damaged = patchRegiment(patchRegiment(onTheBorder(), 'regiment-2', { health: 80 }), idOf(onTheBorder(), ARVELIA, '2nd Minutemen'), { health: 60 });
    const cases: [string, GameState][] = [
      ['entrenched', onTheBorder()],
      ['entrenched, damaged on both sides', damaged],
      ['behind a level-1 fort', setTile(onTheBorder(), ARVELIA_SEAT, { fortLevel: 1 })],
    ];
    const seen = cases.map(([name, s]) => {
      const view = openAttack(s);
      const said = /counts ([\d.]+) times as strong/.exec(explanation());
      view.unmount();
      const estimate = battleEstimate(s, FIELD, ARVELIA_P);
      return {
        name,
        explained: said ? Number(said[1]) : null,
        engine: twoDecimals(estimate.defence / added(defendersOf(s, ARVELIA_P).map((d) => d.regiment))),
        oursIsTheSum: estimate.attack === added(FIELD.map((id) => findRegiment(s, id)!.regiment)),
      };
    });
    expect(seen).toEqual([
      { name: 'entrenched', explained: 1.25, engine: 1.25, oursIsTheSum: true },
      { name: 'entrenched, damaged on both sides', explained: 1.25, engine: 1.25, oursIsTheSum: true },
      { name: 'behind a level-1 fort', explained: 1.43, engine: 1.43, oursIsTheSum: true },
    ]);
    // FR-226's example as the screen shows it: ours 36 is 2 Regulars and 1 Artillery, theirs 18.75 is 3 Minutemen x 1.25
    const start = battleEstimate(onTheBorder(), FIELD, ARVELIA_P);
    expect([start.attack, start.defence, 3 * REGIMENTS.minutemen.stats.fpNormal * 1.25]).toEqual([36, 18.75, 18.75]);
  });

  it('FR-278 FR-281 behind a fort the cover part names the fort (level 1: 1.43 times as strong); with no defender there is no cover part', () => {
    const first = openAttack(setTile(onTheBorder(), ARVELIA_SEAT, { fortLevel: 1 }));
    expect(explanation()).toBe(`Strength: each regiment's firepower times its health, added up; behind the fort a defender counts 1.43 times as strong. ${VERDICTS}`);
    first.unmount();
    openAttack(clearArmy(onTheBorder(), ARVELIA, ARVELIA_P));
    expect(explanation()).toBe(`Strength: each regiment's firepower times its health, added up. ${VERDICTS}`);
  });

  it('FR-278 "entrenched" is described under the defenders: "Entrenched: takes 20% less damage.", and each "entrenched" points to it', () => {
    openAttack(onTheBorder());
    const legend = within(attackDialog()).getByTestId('entrenched-legend');
    expect(text(legend)).toBe('Entrenched: takes 20% less damage.');
    expect(within(attackDialog()).getByRole('list', { name: 'Defenders' }).nextElementSibling).toBe(legend);
    expect(within(attackDialog()).getAllByTestId('protection').map((p) => p.getAttribute('aria-describedby'))).toEqual([legend.id, legend.id, legend.id]);
  });

  it('FR-278 behind a fort no defender is entrenched: no entrenched line (the fort line says what the fort does)', () => {
    openAttack(setTile(onTheBorder(), ARVELIA_SEAT, { fortLevel: 1 }));
    expect(within(attackDialog()).queryByTestId('entrenched-legend')).toBeNull();
    expect(within(attackDialog()).getAllByTestId('protection').map((p) => p.getAttribute('aria-describedby'))).toEqual([null, null, null]);
  });
});

// M9 QA fix round, item 4. FR-279: opening the Attack screen from the Army screen replaces it, so one dialog shows at a
// time; Cancel, Escape, the backdrop and Attack bring the Army screen back with the same ticks (none after Attack: they
// went with the order) and "Attack Arvelia" still picked, the focus on "Attack…".
describe('FR-279 the Attack screen replaces the Army screen', () => {
  const armySelect = () => within(armyDialog()).getByRole('combobox', { name: 'March to' }) as HTMLSelectElement;
  const ticks = () =>
    ['1st Regulars', '2nd Regulars', '1st Artillery'].map((name) => (within(armyDialog()).getByRole('checkbox', { name }) as HTMLInputElement).checked);

  /** The Army screen of Testland North-East with 1st Regulars and 1st Artillery ticked, "Attack Arvelia", "Attack…". */
  function attackFromArmy(state = onTheBorder()) {
    show(state, { armyProvinceId: NE1 });
    const view = render(
      <>
        <ArmyModal />
        <AttackModal />
      </>
    );
    for (const name of ['1st Regulars', '1st Artillery']) fireEvent.click(within(armyDialog()).getByRole('checkbox', { name }));
    fireEvent.change(armySelect(), { target: { value: ARVELIA_P } });
    fireEvent.click(within(armyDialog()).getByRole('button', { name: 'Attack…' }));
    return view;
  }

  /** Back on the Army screen as the player left it: alone, the same ticks, "Attack Arvelia" picked, the focus on "Attack…". */
  function backOnTheArmyScreen() {
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByRole('dialog', { name: 'Attack Arvelia' })).toBeNull();
    expect(ticks()).toEqual([true, false, true]);
    expect(armySelect().value).toBe(ARVELIA_P);
    expect(document.activeElement).toBe(within(armyDialog()).getByRole('button', { name: 'Attack…' }));
    expect(useGameStore.getState().attackPlan).toBeNull();
  }

  it('FR-279 "Attack…" closes the Army screen: only the Attack screen shows; the ticks wait in the selection', () => {
    attackFromArmy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(attackDialog()).toBeTruthy();
    expect(useGameStore.getState().armyProvinceId).toBeNull();
    expect(useGameStore.getState().armySelection).toEqual({ provinceId: NE1, regimentIds: ['regiment-1', 'regiment-3'] });
  });

  it('FR-279 "Cancel" goes back to the Army screen with the same ticks and "Attack Arvelia" still picked; nothing is sent', () => {
    attackFromArmy();
    fireEvent.click(within(attackDialog()).getByRole('button', { name: 'Cancel' }));
    backOnTheArmyScreen();
    expect(submitted).toEqual([]);
  });

  it('FR-279 Escape and a click on the backdrop go back the same way', () => {
    const first = attackFromArmy();
    fireEvent.keyDown(document, { key: 'Escape' });
    backOnTheArmyScreen();
    first.unmount();

    attackFromArmy();
    const backdrop = screen.getByTestId('dialog-backdrop');
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    backOnTheArmyScreen();
    expect(submitted).toEqual([]);
  });

  it('FR-279 "Attack" goes back to the Army screen too: one dialog, the rows "Attacking Arvelia", no tick left', () => {
    attackFromArmy();
    fireEvent.click(within(attackDialog()).getByRole('button', { name: 'Attack' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(text(within(within(armyDialog()).getByTestId('regiment-1st Regulars')).getByTestId('status'))).toBe('Attacking Arvelia');
    expect(within(armyDialog()).getAllByRole('checkbox').every((c) => !(c as HTMLInputElement).checked)).toBe(true);
    expect(armySelect().value).toBe(ARVELIA_P);
  });

  it('FR-279 opened from the map, Cancel brings no Army screen', () => {
    show(onTheBorder(), { attackPlan: { fromProvinceId: NE1, toProvinceId: ARVELIA_P, regimentIds: FIELD } });
    render(
      <>
        <ArmyModal />
        <AttackModal />
      </>
    );
    fireEvent.click(within(attackDialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useGameStore.getState().armyProvinceId).toBeNull();
  });

  it('FR-279 once the Army screen is closed, the next open starts at the first "March to" entry', () => {
    attackFromArmy();
    fireEvent.click(within(attackDialog()).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(within(armyDialog()).getByRole('button', { name: 'Close army' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useGameStore.getState().openArmy(NE1));
    expect(armySelect().value).toBe(NW1);
  });
});
