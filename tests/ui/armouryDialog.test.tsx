// @vitest-environment jsdom
// M8 UI half. FR-212 (plan M8; Imp1 Armory, rules 11 section 4): on a world with provinces the capital dialog has an
// "Armoury" button opening a dialog named "Armoury" with one card per recruitable regiment (7 types, FR-200): the name,
// Firepower, Move, Range, "Entrench: yes" or "no", the cost (worker grade, arms, horses, cash), what is at hand (free
// workers of that grade, armaments, horses, cash; a short item marked "short" in text as well as colour), and the count
// ordered this turn with "−" and "+" (`setRecruitment`), "+" disabled with the refusal text when refused, and the note
// "New regiments join the army in the capital next turn." Every control sends one order through submitOrder (FR-022).
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArmouryModal } from '@/components/ArmouryModal';
import { CapitalModal } from '@/components/CapitalModal';
import { useGameStore } from '@/store/rootStore';
import { newGame, type Order } from '@/engine';
import type { GameState } from '@/types/GameState';
import { setIndustry, setTreasury, setWarehouse, industryOf, stockOf, treasury } from '../engine/fixtures';
import { continent } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const N1 = 'nation-1';
let submitted: Order[] = [];

/** Opens the capital and the Armoury over it on `state` and records every order the dialogs submit. */
function openArmoury(state: GameState) {
  submitted = [];
  useGameStore.setState({ ...useGameStore.getInitialState(), game: state, activeNationId: N1, isCapitalOpen: true, isArmouryOpen: true });
  const submitOrder = useGameStore.getState().submitOrder;
  useGameStore.setState({
    submitOrder: (order: Order) => {
      submitted.push(order);
      return submitOrder(order);
    },
  });
  return render(
    <>
      <CapitalModal />
      <ArmouryModal />
    </>
  );
}

const armoury = () => screen.getByRole('dialog', { name: 'Armoury' });
const card = (name: string) => within(armoury()).getByRole('article', { name });
const part = (name: string, testId: string) => text(within(card(name)).getByTestId(testId));
/** The items of a card's "Cost" or "At hand" list, as the screen reads them. */
const items = (name: string, list: 'Cost' | 'At hand') =>
  within(within(card(name)).getByRole('list', { name: list }))
    .getAllByRole('listitem')
    .map((li) => text(li));
const plus = (name: string) => within(card(name)).getByRole('button', { name: `Recruit one more ${name}` }) as HTMLButtonElement;
const description = (el: HTMLElement): string =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
const now = () => useGameStore.getState().game;
/** A new continent game with armaments in the warehouse. */
const armed = (armaments = 2) => setWarehouse(continent(), N1, { armaments });

describe('FR-212 the Armoury: how it opens', () => {
  it('FR-212 on the continent the capital dialog has an "Armoury" button; it opens the dialog named "Armoury" over the capital', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: continent(), activeNationId: N1, isCapitalOpen: true });
    render(
      <>
        <CapitalModal />
        <ArmouryModal />
      </>
    );
    expect(screen.queryByRole('dialog', { name: 'Armoury' })).toBeNull();
    fireEvent.click(within(screen.getByRole('dialog', { name: /Capital/ })).getByRole('button', { name: 'Armoury' }));
    expect(useGameStore.getState().isArmouryOpen).toBe(true);
    expect(armoury().getAttribute('aria-modal')).toBe('true');
    expect(text(within(armoury()).getByRole('heading', { level: 2 }))).toBe('Armoury');
    expect(screen.getByRole('dialog', { name: /Capital/ })).toBeTruthy();
  });

  it('FR-212 two-islands has no provinces: no Armoury button', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: newGame({ seed: 1, world: 'two-islands' }), activeNationId: N1, isCapitalOpen: true });
    render(<CapitalModal />);
    expect(within(screen.getByRole('dialog', { name: /Capital/ })).queryByRole('button', { name: 'Armoury' })).toBeNull();
  });

  it('FR-212 the close button and Escape close the Armoury only; the capital stays', () => {
    const first = openArmoury(continent());
    fireEvent.click(within(armoury()).getByRole('button', { name: 'Close Armoury' }));
    expect(useGameStore.getState().isArmouryOpen).toBe(false);
    expect(screen.queryByRole('dialog', { name: 'Armoury' })).toBeNull();
    expect(screen.getByRole('dialog', { name: /Capital/ })).toBeTruthy();
    first.unmount();

    openArmoury(continent());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useGameStore.getState().isArmouryOpen).toBe(false);
    expect(useGameStore.getState().isCapitalOpen).toBe(true);
  });

  it('FR-212 openArmoury clears a refusal left from another dialog (FR-055)', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), game: continent(), activeNationId: N1 });
    useGameStore.getState().submitOrder({ kind: 'setRecruitment', nationId: N1, regiment: 'regulars', count: 1 });
    expect(useGameStore.getState().lastRejection).not.toBeNull();
    useGameStore.getState().openArmoury();
    expect(useGameStore.getState().isArmouryOpen).toBe(true);
    expect(useGameStore.getState().lastRejection).toBeNull();
  });
});

describe('FR-212 the Armoury: one card per recruitable regiment', () => {
  it('FR-212 7 cards in the FR-199 order, each named by its regiment', () => {
    openArmoury(continent());
    expect(within(armoury()).getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Skirmishers',
      'Regulars',
      'Grenadiers',
      'Hussars',
      'Cuirassiers',
      'Light Artillery',
      'Artillery',
    ]);
    expect(text(within(card('Regulars')).getByRole('heading', { level: 3 }))).toBe('Regulars');
  });

  it('FR-212 FR-199 the stats: Firepower, Move, Range and "Entrench: yes" or "no"', () => {
    openArmoury(continent());
    expect(part('Regulars', 'stats')).toBe('Firepower 10 Move 4 Range 5 Entrench: yes');
    expect(part('Skirmishers', 'stats')).toBe('Firepower 5 Move 6 Range 5 Entrench: yes');
    expect(part('Hussars', 'stats')).toBe('Firepower 7 Move 11 Range 3 Entrench: no');
    expect(part('Artillery', 'stats')).toBe('Firepower 16 Move 3 Range 11 Entrench: no');
    expect(part('Light Artillery', 'stats')).toBe('Firepower 10 Move 5 Range 9 Entrench: no');
  });

  it('FR-212 FR-199 the cost: the worker of its grade, the armaments, the horses when it needs any, the cash', () => {
    openArmoury(continent());
    expect(items('Regulars', 'Cost')).toEqual(['1 untrained worker', '1 armaments', '$500']);
    expect(items('Hussars', 'Cost')).toEqual(['1 untrained worker', '1 armaments', '1 horse', '$100']);
    expect(items('Artillery', 'Cost')).toEqual(['1 trained worker', '2 armaments', '$1,000']);
    expect(items('Light Artillery', 'Cost')).toEqual(['1 trained worker', '2 armaments', '1 horse', '$1,000']);
  });

  it('FR-212 at hand: the free workers of its grade, the armaments, the horses, the cash; a short item says "short"', () => {
    openArmoury(continent());
    // A new game: 4 untrained and 2 trained workers free, no armaments, 4 horses (FR-203), $10,000
    expect(items('Regulars', 'At hand')).toEqual(['4 untrained workers', '0 armaments (short)', '$10,000']);
    expect(items('Hussars', 'At hand')).toEqual(['4 untrained workers', '0 armaments (short)', '4 horses', '$10,000']);
    expect(items('Artillery', 'At hand')).toEqual(['2 trained workers', '0 armaments (short)', '$10,000']);
    // In colour as well: the short item carries its mark
    const short = within(within(card('Regulars')).getByRole('list', { name: 'At hand' })).getAllByRole('listitem');
    expect(short.map((li) => li.dataset.short)).toEqual([undefined, 'true', undefined]);
  });

  it('FR-212 a short worker, horse or cash is marked too', () => {
    let s = setWarehouse(continent(), N1, { armaments: 5, horses: 0 });
    s = setIndustry(setTreasury(s, N1, 300), N1, { workers: { ...industryOf(s, N1).workers, trained: 0 } });
    openArmoury(s);
    expect(items('Cuirassiers', 'At hand')).toEqual(['0 trained workers (short)', '5 armaments', '0 horses (short)', '$300 (short)']);
    expect(items('Hussars', 'At hand')).toEqual(['4 untrained workers', '5 armaments', '0 horses (short)', '$300']);
  });

  it('FR-212 the note: "New regiments join the army in the capital next turn."', () => {
    openArmoury(continent());
    expect(text(within(armoury()).getByTestId('armoury-note'))).toBe('New regiments join the army in the capital next turn.');
  });
});

describe('FR-212 FR-200 ordering regiments', () => {
  it('FR-212 "+" sends setRecruitment one up; cash and armaments fall at once; "−" sends it one down and gives them back', () => {
    openArmoury(armed(2));
    expect(part('Regulars', 'count')).toBe('0');
    // At 0 there is no "−", only its place (FR-257's rule for steppers)
    expect(within(card('Regulars')).queryByRole('button', { name: 'Recruit one less Regulars' })).toBeNull();
    fireEvent.click(plus('Regulars'));
    expect(submitted).toEqual([{ kind: 'setRecruitment', nationId: N1, regiment: 'regulars', count: 1 }]);
    expect(part('Regulars', 'count')).toBe('1');
    expect(treasury(now(), N1)).toBe(9500);
    expect(stockOf(now(), N1, 'armaments')).toBe(1);
    expect(items('Regulars', 'At hand')).toEqual(['3 untrained workers', '1 armaments', '$9,500']);
    expect(text(within(armoury()).getByTestId('armoury-cash'))).toBe('Cash: $9,500');

    fireEvent.click(within(card('Regulars')).getByRole('button', { name: 'Recruit one less Regulars' }));
    expect(submitted.at(-1)).toEqual({ kind: 'setRecruitment', nationId: N1, regiment: 'regulars', count: 0 });
    expect(part('Regulars', 'count')).toBe('0');
    expect(treasury(now(), N1)).toBe(10000);
  });

  it('FR-212 "+" is disabled when validateOrder refuses one more, with the reason beside it and as its description', () => {
    openArmoury(continent());
    // No armaments in a new game
    for (const name of ['Skirmishers', 'Regulars', 'Grenadiers', 'Hussars', 'Cuirassiers', 'Light Artillery', 'Artillery']) {
      expect(plus(name).disabled, name).toBe(true);
      expect(part(name, 'count-note'), name).toBe('Not enough armaments');
      expect(description(plus(name)), name).toBe('Not enough armaments');
    }
  });

  it('FR-212 the refusals in words: money, horses, a free worker of the grade', () => {
    let s = setWarehouse(continent(), N1, { armaments: 5, horses: 0 });
    s = setIndustry(setTreasury(s, N1, 300), N1, { workers: { ...industryOf(s, N1).workers, trained: 0 } });
    openArmoury(s);
    expect(part('Regulars', 'count-note')).toBe('Not enough money');
    // $200 a Skirmisher: within the $300
    expect(plus('Skirmishers').disabled).toBe(false);
    expect(part('Hussars', 'count-note')).toBe('Not enough horses');
    // The engine checks the cash before the stock and the worker (FR-200)
    expect(part('Grenadiers', 'count-note')).toBe('Not enough money');
  });

  it('FR-212 no free worker of the grade: "No free trained worker"', () => {
    const s = setIndustry(setWarehouse(continent(), N1, { armaments: 5 }), N1, { workers: { ...industryOf(continent(), N1).workers, trained: 0 } });
    openArmoury(s);
    expect(plus('Grenadiers').disabled).toBe(true);
    expect(part('Grenadiers', 'count-note')).toBe('No free trained worker');
    expect(plus('Regulars').disabled).toBe(false);
    expect(within(card('Regulars')).queryByTestId('count-note')).toBeNull();
  });

  it('FR-212 after 2 Regulars the last armament is gone: every "+" says why', () => {
    openArmoury(armed(2));
    fireEvent.click(plus('Regulars'));
    fireEvent.click(plus('Regulars'));
    expect(part('Regulars', 'count')).toBe('2');
    expect(plus('Regulars').disabled).toBe(true);
    expect(part('Regulars', 'count-note')).toBe('Not enough armaments');
  });
});
