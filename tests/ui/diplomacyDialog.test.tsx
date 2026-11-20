// @vitest-environment jsdom
// M6 UI half. FR-177: the Diplomacy screen lists every other country with its relation (a decorative swatch and the
// text), its treaties in words and this turn's ordered overtures with their cost and a Withdraw button; the rows come
// from the React-free helper components/diplomacy/diplomacyView.ts. FR-178: each row offers the overtures of its kind
// of country, a grant control and a trade policy control; each builds its order with submitOrder only, and a control
// validateOrder would refuse is disabled with the refusal text as its description; Declare war asks in place first.
// FR-175: a proposal to the player opens "Accept Offer"; Accept and Reject (Enter and Escape) build answerProposal;
// closing it leaves the proposal, which End Turn refuses. Review fix round: the End Turn key "n" does nothing in a form
// field or while a dialog is open; "Stop grant" never takes back this turn's grant; the war question names a broken
// treaty; the page shows Accept Offer. QA fix round: two panes, the countries as tabs and the selected one's details
// (FR-237), a refusal shown once per control group (FR-237), the war question names the other minors (FR-238), the start
// treaties say "since the start" (FR-240), "we are already at war with them" (FR-241). QA review (FR-236): Tab from the
// war question or a disabled control goes on from it; Escape answers the war question wherever the focus is; after an
// order disables or removes the focused control, Tab goes on from its place.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import Home from '@/page';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { DiplomacyModal } from '@/components/DiplomacyModal';
import { AcceptOfferModal } from '@/components/AcceptOfferModal';
import { CapitalModal } from '@/components/CapitalModal';
import { ActionButtons } from '@/components/HUD/index';
import { compareStrength, diplomacyRows, grantAsk } from '@/components/diplomacy/diplomacyView';
import { money, upkeepWarningText } from '@/components/gameText';
import { useGameStore } from '@/store/rootStore';
import { HOW_TO_PLAY_SEEN_KEY } from '@/store/persistence';
import {
  COUNCIL,
  isMilitia,
  militaryStrength,
  newGame,
  OVERTURE_COST,
  pairKey,
  proposalAnswer,
  provincesOf,
  regimentsOf,
  scoreOf,
  tryApplyOrder,
  upkeepForecast,
  type Order,
  type Proposal,
} from '@/engine';
import { SCRIPTED_DIPLOMACY, WAR_RELATION } from '@/definisions/diplomacyRules';
import type { GameState } from '@/types/GameState';
import { setPair, setTreasury, treasury } from '../engine/fixtures';
import { addRegiments, SW2 } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();

const ROOT = join(__dirname, '..', '..');
const N1 = 'nation-1';
const N2 = 'nation-2';
const ARVELIA = 'minor-1';
const LORRAN = 'minor-3';
// FR-406: of the minors only Arvelia can be reached over land; war on Sundmark, Lorran or Pellis needs ships (FR-407)
const SUNDMARK = 'minor-2';

let submitted: Order[] = [];

const start = (): GameState => newGame({ seed: 1, world: 'continent' });

/** Puts `state` in the store for the player (nation 1) and records every order a component submits. */
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

/** Opens the Diplomacy dialog on `state`. */
function openDiplomacy(state: GameState) {
  show(state, { isDiplomacyOpen: true });
  return render(<DiplomacyModal />);
}

// FR-236: the dialog is named by its title (was aria-label "Diplomacy")
const DIPLOMACY = 'Diplomacy — Testland';
const dialog = () => screen.getByRole('dialog', { name: DIPLOMACY });
// FR-237: the countries are tabs of a list; the selected one's details are its tab panel (were one region per country)
const countries = () => within(dialog()).getByRole('tablist', { name: 'Countries' });
const tab = (name: string) => within(countries()).getByRole('tab', { name });
/** Selects the country in the list (as a click does) and returns its details pane. */
const country = (name: string) => {
  const t = tab(name);
  if (t.getAttribute('aria-selected') !== 'true') fireEvent.click(t);
  return within(dialog()).getByRole('tabpanel', { name });
};
const button = (countryName: string, name: string | RegExp) => within(country(countryName)).getByRole('button', { name });
const treaties = (countryName: string) => within(tab(countryName)).getAllByTestId('treaty').map(text);
const ordered = (countryName: string) => within(country(countryName)).queryAllByTestId('ordered').map(text);
/** The name of each tab, in the list's order. */
const tabNames = () =>
  within(countries())
    .getAllByRole('tab')
    .map((t) => document.getElementById(t.getAttribute('aria-labelledby') ?? '')?.textContent);
/** The text of the elements an element's aria-describedby names: its accessible description. */
const description = (el: HTMLElement): string =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
const now = () => useGameStore.getState().game;
/** FR-422: Give asks first; this answers the question with "Give $…". */
const give = (countryName: string) => {
  fireEvent.click(within(country(countryName)).getByRole('button', { name: 'Give' }));
  const ask = within(country(countryName)).getByRole('group', { name: `Confirm grant to ${countryName}` });
  fireEvent.click(within(ask).getByRole('button', { name: /^Give \$/ }));
};
/** FR-395: what a subsidy toward a minor costs. */
const subsidyCost = (name: string, percent: number) =>
  `Subsidy ${percent}%: no fee; ${name} pays us ${percent}% less for our goods and charges us ${percent}% more for its own.`;

// FR-430: this browser has seen "How to play", so the page (Home) does not open it over these tests
beforeEach(() => {
  submitted = [];
  window.localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
});

// The page (Home) autosaves to the browser (FR-357): each test starts with an empty slot, so no "Saved game" dialog
afterEach(() => {
  window.localStorage.clear();
});

describe('FR-177 the Diplomacy screen: the countries', () => {
  it('FR-177 the HUD button "Diplomacy" opens the dialog named "Diplomacy"; the close button closes it', () => {
    show(start());
    render(
      <>
        <ActionButtons />
        <DiplomacyModal />
      </>
    );
    expect(screen.queryByRole('dialog', { name: DIPLOMACY })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Diplomacy' }));
    expect(useGameStore.getState().isDiplomacyOpen).toBe(true);
    expect(dialog()).toBeTruthy();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close diplomacy' }));
    expect(useGameStore.getState().isDiplomacyOpen).toBe(false);
    expect(screen.queryByRole('dialog', { name: DIPLOMACY })).toBeNull();
  });

  it('FR-177 the capital dialog\'s Diplomacy button opens it too (Imp1: the capital leads to every screen)', () => {
    show(start(), { isCapitalOpen: true });
    render(
      <>
        <CapitalModal />
        <DiplomacyModal />
      </>
    );
    const capital = screen.getByRole('dialog', { name: 'Capital — Testland' });
    fireEvent.click(within(capital).getByRole('button', { name: 'Diplomacy' }));
    expect(useGameStore.getState().isDiplomacyOpen).toBe(true);
    expect(dialog()).toBeTruthy();
  });

  it('FR-177 FR-237 one tab per other country: the other Great Power first, then the minors in id order, each named by kind', () => {
    openDiplomacy(start());

    expect(tabNames()).toEqual(['Valdoria', 'Arvelia', 'Sundmark', 'Lorran', 'Pellis']);
    expect(within(countries()).queryByRole('tab', { name: 'Testland' })).toBeNull();
    expect(text(within(tab('Valdoria')).getByTestId('country-kind'))).toBe('Great Power');
    for (const name of ['Arvelia', 'Sundmark', 'Lorran', 'Pellis']) {
      expect(text(within(tab(name)).getByTestId('country-kind'))).toBe('Minor nation');
    }
  });

  it('FR-177 FR-179 the relation as text ("Yellow, level 4 of 9") and as a decorative swatch in --color-relation-<level>', () => {
    let s = start();
    s = setPair(s, N1, 'minor-2', { points: 89 });
    s = setPair(s, N1, LORRAN, { points: 0 });
    openDiplomacy(s);

    expect(text(within(tab('Arvelia')).getByTestId('relation'))).toBe('Yellow, level 4 of 9');
    expect(text(within(tab('Valdoria')).getByTestId('relation'))).toBe('Beige, level 5 of 9');
    expect(text(within(tab('Sundmark')).getByTestId('relation'))).toBe('Dark green, level 9 of 9');
    expect(text(within(tab('Lorran')).getByTestId('relation'))).toBe('Dark brown, level 1 of 9');

    const swatch = within(tab('Arvelia')).getByTestId('relation-swatch');
    expect(swatch.getAttribute('aria-hidden')).toBe('true');
    expect(swatch.getAttribute('style')).toContain('var(--color-relation-3)');
    expect(within(tab('Sundmark')).getByTestId('relation-swatch').getAttribute('style')).toContain('var(--color-relation-8)');
  });

  it('FR-177 the treaties in words; a country with none reads "No treaties"', () => {
    let s = start();
    s = setPair(s, N1, ARVELIA, { consulates: [N1], embassies: [N1], pact: true, boycotts: [N1], subsidies: { [N1]: 10 }, lockedGrants: { [N1]: 1000 } });
    s = setPair(s, N1, LORRAN, { war: { aggressors: [N1], since: 5 } });
    s = setPair(s, N1, N2, { alliance: true, boycotts: [N2] });
    openDiplomacy(s);

    expect(treaties('Arvelia')).toEqual(['Consulate', 'Embassy', 'Pact', 'We boycott them', 'Subsidy 10%', 'Grant $1,000 each turn']);
    expect(treaties('Lorran')).toEqual(['At war since turn 5']);
    // Two Great Powers start with consulates and embassies both ways (FR-151), said on the chip (FR-240)
    expect(treaties('Valdoria')).toEqual(['Consulate since the start', 'Embassy since the start', 'Alliance', 'They boycott us']);
    expect(treaties('Sundmark')).toEqual(['No treaties']);
  });

  it("FR-177 FR-161 this turn's ordered overtures with their cost and a Withdraw button, which builds withdrawOverture and refunds", () => {
    openDiplomacy(start());
    const before = treasury(now(), N1);
    expect(ordered('Arvelia')).toEqual([]);

    fireEvent.click(button('Arvelia', 'Consulate ($500)'));
    expect(treasury(now(), N1)).toBe(before - 500);
    expect(ordered('Arvelia')).toEqual(['Consulate $500 Withdraw']);

    fireEvent.click(button('Arvelia', 'Withdraw consulate'));
    expect(submitted.at(-1)).toEqual({ kind: 'withdrawOverture', nationId: N1, overture: 'consulate', targetId: ARVELIA });
    expect(treasury(now(), N1)).toBe(before);
    expect(ordered('Arvelia')).toEqual([]);
  });

  it('FR-177 FR-395 a grant, a trade policy and a declaration ordered this turn are listed; a free one says "free", a subsidy what it costs', () => {
    let s = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] });
    for (const order of [
      { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 3000, locked: true },
      { kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 10, boycott: true },
      { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: N2 },
    ] as Order[]) {
      s = tryApplyOrder(s, order).state;
    }
    openDiplomacy(s);

    expect(ordered('Arvelia')).toEqual(['Grant $3,000, each turn $3,000 Withdraw', `Trade policy: subsidy 10%, boycott ${subsidyCost('Arvelia', 10)} Withdraw`]);
    expect(ordered('Valdoria')).toEqual(['Declaration of war free Withdraw']);
    expect(button('Arvelia', 'Withdraw grant $3,000, each turn')).toBeTruthy();
    expect(button('Arvelia', 'Withdraw trade policy: subsidy 10%, boycott')).toBeTruthy();
    expect(button('Valdoria', 'Withdraw declaration of war')).toBeTruthy();
  });

  it('FR-177 FR-170 the screen says that a grant\'s money goes to no country (review B-R3: a grant buys relations only)', () => {
    openDiplomacy(start());
    expect(text(dialog())).toContain('A grant improves relations; the money leaves our treasury and no country receives it.');
  });

  it('FR-177 the rows come from components/diplomacy/diplomacyView.ts, which imports no React, store or DOM', () => {
    const rows = diplomacyRows(start(), N1);
    expect(rows.map((r) => [r.name, r.kind, r.relationText])).toEqual([
      ['Valdoria', 'Great Power', 'Beige, level 5 of 9'],
      ['Arvelia', 'Minor nation', 'Yellow, level 4 of 9'],
      ['Sundmark', 'Minor nation', 'Yellow, level 4 of 9'],
      ['Lorran', 'Minor nation', 'Yellow, level 4 of 9'],
      ['Pellis', 'Minor nation', 'Yellow, level 4 of 9'],
    ]);
    const source = readFileSync(join(ROOT, 'src/app/components/diplomacy/diplomacyView.ts'), 'utf8');
    expect(source).not.toMatch(/from ["'](react|react-dom|zustand)["']|store\/|document\.|window\./);
  });
});

describe('FR-178 the Diplomacy screen: the overtures', () => {
  const overtureButtons = (countryName: string) =>
    within(within(country(countryName)).getByRole('group', { name: 'Overtures' }))
      .getAllByRole('button')
      .map((b) => b.textContent);

  it('FR-178 a minor offers Consulate ($500), Embassy ($5,000), Pact, Declare war, Propose peace; a Great Power Alliance instead of Pact', () => {
    openDiplomacy(start());
    expect(overtureButtons('Arvelia')).toEqual(['Consulate ($500)', 'Embassy ($5,000)', 'Pact', 'Declare war', 'Propose peace']);
    expect(overtureButtons('Valdoria')).toEqual(['Consulate ($500)', 'Embassy ($5,000)', 'Alliance', 'Declare war', 'Propose peace']);
  });

  it('FR-178 each overture button submits its proposeOverture order through submitOrder', () => {
    let s = start();
    s = setPair(s, N1, ARVELIA, { consulates: [N1] });
    s = setPair(s, N1, 'minor-2', { consulates: [N1], embassies: [N1] });
    s = setPair(s, N1, 'minor-4', { war: { aggressors: [N1], since: 1 } });
    openDiplomacy(s);

    fireEvent.click(button('Sundmark', 'Consulate ($500)'));
    expect(submitted).toEqual([]); // held: disabled, so the click does nothing
    fireEvent.click(button('Lorran', 'Consulate ($500)'));
    fireEvent.click(button('Arvelia', 'Embassy ($5,000)'));
    fireEvent.click(button('Sundmark', 'Pact'));
    fireEvent.click(button('Valdoria', 'Alliance'));
    fireEvent.click(button('Pellis', 'Propose peace'));

    expect(submitted).toEqual([
      { kind: 'proposeOverture', nationId: N1, overture: 'consulate', targetId: LORRAN },
      { kind: 'proposeOverture', nationId: N1, overture: 'embassy', targetId: ARVELIA },
      { kind: 'proposeOverture', nationId: N1, overture: 'pact', targetId: 'minor-2' },
      { kind: 'proposeOverture', nationId: N1, overture: 'alliance', targetId: N2 },
      { kind: 'proposeOverture', nationId: N1, overture: 'peace', targetId: 'minor-4' },
    ]);
    expect(now().intents.map((i) => i.kind)).toEqual(['consulate', 'embassy', 'pact', 'alliance', 'peace']);
  });

  it('FR-178 FR-162 a control validateOrder would refuse is disabled and shows the refusal text as its description', () => {
    let s = start();
    s = setPair(s, N1, LORRAN, { war: { aggressors: [N1], since: 1 } });
    openDiplomacy(s);

    const refused = (countryName: string, name: string) => {
      const b = button(countryName, name);
      return { disabled: (b as HTMLButtonElement).disabled, description: description(b) };
    };
    expect(refused('Arvelia', 'Consulate ($500)')).toEqual({ disabled: false, description: '' });
    expect(refused('Arvelia', 'Embassy ($5,000)')).toEqual({ disabled: true, description: 'we need a consulate there first' });
    expect(refused('Arvelia', 'Pact')).toEqual({ disabled: true, description: 'we need an embassy there first' });
    expect(refused('Arvelia', 'Declare war')).toEqual({ disabled: false, description: '' });
    expect(refused('Arvelia', 'Propose peace')).toEqual({ disabled: true, description: 'we are not at war with them' });
    expect(refused('Arvelia', 'Give')).toEqual({ disabled: true, description: 'we need an embassy there first' });
    expect(refused('Valdoria', 'Consulate ($500)')).toEqual({ disabled: true, description: 'that is already in place' });
    expect(refused('Valdoria', 'Embassy ($5,000)')).toEqual({ disabled: true, description: 'that is already in place' });
    expect(refused('Lorran', 'Consulate ($500)')).toEqual({ disabled: true, description: 'we are at war with them' });
    // FR-241 (QA fix round): at war, "Declare war" says so (was "that is already in place")
    expect(refused('Lorran', 'Declare war')).toEqual({ disabled: true, description: 'we are already at war with them' });
    expect(refused('Lorran', 'Propose peace')).toEqual({ disabled: false, description: '' });
    // The refusal is shown on the screen too, not only to a screen reader
    expect(text(country('Arvelia'))).toContain('we need a consulate there first');
  });

  it('FR-178 FR-162 a cost above the treasury: "not enough money"; an overture ordered this turn: "that is already in place"', () => {
    openDiplomacy(setTreasury(start(), N1, 600));
    fireEvent.click(button('Arvelia', 'Consulate ($500)'));

    expect((button('Arvelia', 'Consulate ($500)') as HTMLButtonElement).disabled).toBe(true);
    expect(description(button('Arvelia', 'Consulate ($500)'))).toBe('that is already in place');
    expect((button('Sundmark', 'Consulate ($500)') as HTMLButtonElement).disabled).toBe(true);
    expect(description(button('Sundmark', 'Consulate ($500)'))).toBe('not enough money');
  });

  it('FR-178 FR-170 the grant control: $1,000 to $10,000, once or each turn; Give builds giveGrant', () => {
    openDiplomacy(setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] }));
    const row = within(country('Arvelia'));
    const amount = row.getByRole('combobox', { name: 'Amount' }) as HTMLSelectElement;
    const often = row.getByRole('combobox', { name: 'How often' }) as HTMLSelectElement;
    expect([...amount.options].map((o) => o.textContent)).toEqual(['$1,000', '$3,000', '$5,000', '$10,000']);
    expect([...often.options].map((o) => o.textContent)).toEqual(['once', 'each turn']);

    give('Arvelia');
    fireEvent.change(amount, { target: { value: '3000' } });
    fireEvent.change(often, { target: { value: 'each-turn' } });
    give('Arvelia');

    expect(submitted).toEqual([
      { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 1000, locked: false },
      { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 3000, locked: true },
    ]);
    // The second replaced the first (FR-161)
    expect(ordered('Arvelia')).toEqual(['Grant $3,000, each turn $3,000 Withdraw']);
  });

  it('FR-178 FR-170 a grant above the treasury is disabled: "not enough money"', () => {
    let s = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] });
    s = setTreasury(s, N1, 2000);
    openDiplomacy(s);
    const row = within(country('Arvelia'));
    fireEvent.change(row.getByRole('combobox', { name: 'Amount' }), { target: { value: '3000' } });
    const give = row.getByRole('button', { name: 'Give' }) as HTMLButtonElement;
    expect(give.disabled).toBe(true);
    expect(description(give)).toBe('not enough money');
  });

  it('FR-178 FR-161 a standing locked grant can be stopped: "Stop grant" builds withdrawOverture "grant"', () => {
    openDiplomacy(setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1], lockedGrants: { [N1]: 1000 } }));
    fireEvent.click(button('Arvelia', 'Stop grant'));
    expect(submitted).toEqual([{ kind: 'withdrawOverture', nationId: N1, overture: 'grant', targetId: ARVELIA }]);
    expect(ordered('Arvelia')).toEqual(['Grant stops at End Turn free']);
    expect(within(country('Arvelia')).queryByRole('button', { name: 'Stop grant' })).toBeNull();
  });

  it('FR-178 FR-161 a standing locked grant and a grant ordered this turn: "Stop grant" is disabled until that grant is withdrawn, so it never takes it back (review A-R1, B-R2, F1)', () => {
    const locked = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1], lockedGrants: { [N1]: 3000 } });
    const s = tryApplyOrder(locked, { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 1000, locked: false }).state;
    openDiplomacy(s);

    const stop = button('Arvelia', 'Stop grant') as HTMLButtonElement;
    expect(stop.disabled).toBe(true);
    expect(description(stop)).toBe("withdraw this turn's grant first");
    fireEvent.click(stop);
    expect(submitted).toEqual([]);
    expect(ordered('Arvelia')).toEqual(['Grant $1,000, once $1,000 Withdraw']);

    // Withdraw the grant, stop the lock, give the once grant again: the lock ends and only the once grant is paid
    fireEvent.click(button('Arvelia', 'Withdraw grant $1,000, once'));
    fireEvent.click(button('Arvelia', 'Stop grant'));
    give('Arvelia');
    const withdrawGrant = { kind: 'withdrawOverture', nationId: N1, overture: 'grant', targetId: ARVELIA };
    expect(submitted).toEqual([withdrawGrant, withdrawGrant, { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 1000, locked: false }]);
    expect(ordered('Arvelia')).toEqual(['Grant stops at End Turn free', 'Grant $1,000, once $1,000 Withdraw']);
    expect(now().intents.map((i) => i.kind)).toEqual(['grant-stop', 'grant']);

    act(() => useGameStore.getState().advanceTurn());
    expect(now().diplomacy[pairKey(N1, ARVELIA)].lockedGrants).toEqual({});
    const grantEvents = useGameStore
      .getState()
      .eventLog.at(-1)!
      .events.filter((e) => (e.type === 'grant-paid' || e.type === 'grant-stopped') && e.nationId === N1);
    expect(grantEvents).toEqual([
      { type: 'grant-stopped', nationId: N1, targetId: ARVELIA, amount: 3000, reason: 'withdrawn' },
      { type: 'grant-paid', nationId: N1, targetId: ARVELIA, amount: 1000 },
    ]);
  });

  it('FR-178 FR-171 the trade policy: subsidy none to 100%, Boycott, Set policy builds setTradePolicy', () => {
    openDiplomacy(setPair(start(), N1, ARVELIA, { consulates: [N1] }));
    const row = within(country('Arvelia'));
    const subsidy = row.getByRole('combobox', { name: 'Subsidy' }) as HTMLSelectElement;
    expect([...subsidy.options].map((o) => o.textContent)).toEqual(['none', '5%', '10%', '25%', '50%', '75%', '100%']);
    expect(subsidy.value).toBe('0');

    fireEvent.change(subsidy, { target: { value: '10' } });
    fireEvent.click(row.getByRole('checkbox', { name: 'Boycott' }));
    fireEvent.click(row.getByRole('button', { name: 'Set policy' }));

    expect(submitted).toEqual([{ kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 10, boycott: true }]);
    expect(ordered('Arvelia')).toEqual([`Trade policy: subsidy 10%, boycott ${subsidyCost('Arvelia', 10)} Withdraw`]);
  });

  it('FR-178 FR-162 a subsidy without a consulate is disabled ("we need a consulate there first"); a boycott alone is not', () => {
    openDiplomacy(start());
    const row = within(country('Arvelia'));
    const set = row.getByRole('button', { name: 'Set policy' }) as HTMLButtonElement;
    fireEvent.change(row.getByRole('combobox', { name: 'Subsidy' }), { target: { value: '25' } });
    expect(set.disabled).toBe(true);
    expect(description(set)).toBe('we need a consulate there first');

    fireEvent.change(row.getByRole('combobox', { name: 'Subsidy' }), { target: { value: '0' } });
    fireEvent.click(row.getByRole('checkbox', { name: 'Boycott' }));
    expect(set.disabled).toBe(false);
    fireEvent.click(set);
    expect(submitted).toEqual([{ kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 0, boycott: true }]);
  });

  it('FR-178 the trade policy form starts at the standing policy', () => {
    openDiplomacy(setPair(start(), N1, ARVELIA, { consulates: [N1], subsidies: { [N1]: 50 }, boycotts: [N1] }));
    const row = within(country('Arvelia'));
    expect((row.getByRole('combobox', { name: 'Subsidy' }) as HTMLSelectElement).value).toBe('50');
    expect((row.getByRole('checkbox', { name: 'Boycott' }) as HTMLInputElement).checked).toBe(true);
  });

  it('FR-178 FR-167 "Declare war" asks in place first; "Keep the peace" sends nothing, "Declare war" sends the order', () => {
    openDiplomacy(start());

    fireEvent.click(button('Arvelia', 'Declare war'));
    let ask = within(country('Arvelia')).getByRole('group', { name: 'Confirm war on Arvelia' });
    expect(text(within(ask).getByTestId('war-question'))).toBe('Declare war on Arvelia? The war starts next turn.');
    expect(document.activeElement).toBe(ask);
    fireEvent.click(within(ask).getByRole('button', { name: 'Keep the peace' }));
    expect(submitted).toEqual([]);
    expect(within(country('Arvelia')).queryByRole('group', { name: 'Confirm war on Arvelia' })).toBeNull();

    fireEvent.click(button('Arvelia', 'Declare war'));
    ask = within(country('Arvelia')).getByRole('group', { name: 'Confirm war on Arvelia' });
    fireEvent.click(within(ask).getByRole('button', { name: 'Declare war' }));
    expect(submitted).toEqual([{ kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA }]);
    expect(within(country('Arvelia')).queryByRole('group', { name: 'Confirm war on Arvelia' })).toBeNull();
    expect(ordered('Arvelia')).toEqual(['Declaration of war free Withdraw']);
    expect(within(country('Arvelia')).queryByTestId('war-cost')).toBeNull();
  });

  it('FR-178 FR-168 war on a pact partner or an ally: the question adds that the treaty breaks and relations with every other country get worse (review B-R5)', () => {
    let s = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1], pact: true });
    s = setPair(s, N1, N2, { alliance: true });
    openDiplomacy(s);

    const ask = (name: string) => {
      fireEvent.click(button(name, 'Declare war'));
      return within(country(name)).getByRole('group', { name: `Confirm war on ${name}` });
    };
    const pact = ask('Arvelia');
    expect(text(within(pact).getByTestId('war-question'))).toBe('Declare war on Arvelia? The war starts next turn.');
    expect(text(within(pact).getByTestId('war-cost'))).toBe('This breaks our pact with Arvelia: relations with every other country get worse.');
    // Arvelia is a minor nation, so the FR-238 line (QA fix round) follows the broken treaty's
    expect(description(pact)).toBe(
      'Declare war on Arvelia? The war starts next turn. This breaks our pact with Arvelia: relations with every other country get worse. A war on a minor nation also lowers our relations with every other minor nation, by half a level each.'
    );
    const alliance = ask('Valdoria');
    expect(text(within(alliance).getByTestId('war-cost'))).toBe('This breaks our alliance with Valdoria: relations with every other country get worse.');
    // Without a treaty there is no such line: FR-167's test above (Arvelia, the one minor an army can reach, FR-407)
  });

  it('FR-178 FR-022 the screen changes the game only through submitOrder: replaying the submitted orders gives the same game', () => {
    const s = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] });
    openDiplomacy(s);
    fireEvent.click(button('Arvelia', 'Pact'));
    fireEvent.click(button('Sundmark', 'Consulate ($500)'));
    give('Arvelia');
    fireEvent.click(within(country('Arvelia')).getByRole('button', { name: 'Set policy' }));
    fireEvent.click(button('Sundmark', 'Withdraw consulate'));
    expect(submitted).toHaveLength(5);

    const replayed = submitted.reduce((state, order) => tryApplyOrder(state, order).state, s);
    expect(now()).toEqual(replayed);
  });

  it('FR-178 a refused order shows its refusal in the dialog', () => {
    openDiplomacy(start());
    act(() => {
      useGameStore.getState().submitOrder({ kind: 'proposeOverture', nationId: N1, overture: 'embassy', targetId: ARVELIA });
    });
    expect(text(within(dialog()).getByRole('alert'))).toBe('Overture refused: we need a consulate there first.');
  });
});

describe("FR-237 two panes: the countries and the selected country's details (QA fix round)", () => {
  const selected = () => within(countries()).getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true');
  const panels = () => within(dialog()).getAllByRole('tabpanel');

  it('FR-237 the first country is selected when the screen opens; a click selects another; only its details are shown', () => {
    openDiplomacy(start());
    expect(countries().getAttribute('aria-orientation')).toBe('vertical');
    expect(selected()).toEqual([tab('Valdoria')]);
    expect(panels()).toEqual([within(dialog()).getByRole('tabpanel', { name: 'Valdoria' })]);
    // One set of controls, not one per country (the QA screenshot had five)
    expect(within(dialog()).getAllByRole('button', { name: 'Consulate ($500)' })).toHaveLength(1);
    expect(within(dialog()).getAllByRole('button', { name: 'Give' })).toHaveLength(1);

    fireEvent.click(tab('Lorran'));
    expect(selected()).toEqual([tab('Lorran')]);
    expect(panels()).toEqual([within(dialog()).getByRole('tabpanel', { name: 'Lorran' })]);
    // Only the selected tab is in the Tab order (the arrow keys move inside the list)
    expect(within(countries()).getAllByRole('tab').map((t) => t.tabIndex)).toEqual([-1, -1, -1, 0, -1]);
  });

  it('FR-237 Arrow Down and Up, Home and End in the list move the focus and the selection', () => {
    openDiplomacy(start());
    act(() => tab('Valdoria').focus());
    const key = (k: string) => fireEvent.keyDown(document.activeElement!, { key: k });

    key('ArrowDown');
    expect([document.activeElement, ...selected()]).toEqual([tab('Arvelia'), tab('Arvelia')]);
    key('End');
    expect([document.activeElement, ...selected()]).toEqual([tab('Pellis'), tab('Pellis')]);
    key('ArrowDown');
    expect([document.activeElement, ...selected()]).toEqual([tab('Valdoria'), tab('Valdoria')]);
    key('ArrowUp');
    expect([document.activeElement, ...selected()]).toEqual([tab('Pellis'), tab('Pellis')]);
    key('Home');
    expect([document.activeElement, ...selected()]).toEqual([tab('Valdoria'), tab('Valdoria')]);
  });

  it('FR-237 the country last selected stays selected when the screen is closed and opened again', () => {
    show(start());
    render(
      <>
        <ActionButtons />
        <DiplomacyModal />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Diplomacy' }));
    fireEvent.click(tab('Lorran'));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close diplomacy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Diplomacy' }));
    expect(selected()).toEqual([tab('Lorran')]);
  });

  it('FR-237 a tab says "1 ordered" ("2 ordered") while orders toward the country stand this turn', () => {
    openDiplomacy(setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] }));
    const mark = (name: string) => within(tab(name)).queryByTestId('ordered-mark');
    expect(mark('Arvelia')).toBeNull();

    fireEvent.click(button('Arvelia', 'Pact'));
    expect(text(mark('Arvelia')!)).toBe('1 ordered');
    give('Arvelia');
    expect(text(mark('Arvelia')!)).toBe('2 ordered');
    expect(description(tab('Arvelia'))).toContain('2 ordered');
    expect(mark('Valdoria')).toBeNull();

    fireEvent.click(button('Arvelia', 'Withdraw pact'));
    fireEvent.click(button('Arvelia', 'Withdraw grant $1,000, once'));
    expect(mark('Arvelia')).toBeNull();
  });

  it("FR-237 a refusal shows once, in a line under its control group that names the controls, and is each disabled control's description", () => {
    openDiplomacy(setPair(start(), N1, LORRAN, { war: { aggressors: [N1], since: 1 }, points: 0 }));
    const reasons = (countryName: string, group: string) =>
      within(within(country(countryName)).getByRole('group', { name: group }))
        .queryAllByTestId('reason')
        .map(text);

    expect(reasons('Arvelia', 'Overtures')).toEqual([
      'Embassy: we need a consulate there first',
      'Pact: we need an embassy there first',
      'Propose peace: we are not at war with them',
    ]);
    expect(reasons('Arvelia', 'Grant')).toEqual(['Give: we need an embassy there first']);
    expect(reasons('Arvelia', 'Trade policy')).toEqual([]);

    // At war: three controls with the same reason share one line
    expect(reasons('Lorran', 'Overtures')).toEqual(['Consulate, Embassy, Pact: we are at war with them', 'Declare war: we are already at war with them']);
    for (const name of ['Consulate ($500)', 'Embassy ($5,000)', 'Pact']) expect(description(button('Lorran', name))).toBe('we are at war with them');
    // Once per group (the overtures and the grant), not once per button
    expect(text(country('Lorran')).split('we are at war with them').length - 1).toBe(2);
  });
});

describe('FR-238 FR-240 FR-241 the war question, the start treaties and the wording (QA fix round)', () => {
  const MINORS_LINE = 'A war on a minor nation also lowers our relations with every other minor nation, by half a level each.';

  it('FR-238 war on a minor nation: the question adds that relations with every other minor nation get worse; not on a Great Power', () => {
    openDiplomacy(start());
    fireEvent.click(button('Arvelia', 'Declare war'));
    const ask = within(country('Arvelia')).getByRole('group', { name: 'Confirm war on Arvelia' });
    expect(text(within(ask).getByTestId('war-minors'))).toBe(MINORS_LINE);
    expect(description(ask)).toBe(`Declare war on Arvelia? The war starts next turn. ${MINORS_LINE}`);
    fireEvent.click(within(ask).getByRole('button', { name: 'Keep the peace' }));

    fireEvent.click(button('Valdoria', 'Declare war'));
    const onGreatPower = within(country('Valdoria')).getByRole('group', { name: 'Confirm war on Valdoria' });
    expect(within(onGreatPower).queryByTestId('war-minors')).toBeNull();
    expect(description(onGreatPower)).toBe('Declare war on Valdoria? The war starts next turn.');
  });

  it('FR-236 FR-178 Escape in the war question keeps the peace: the question closes, the dialog stays, the focus is back on Declare war', () => {
    openDiplomacy(start());
    fireEvent.click(button('Arvelia', 'Declare war'));
    const ask = within(country('Arvelia')).getByRole('group', { name: 'Confirm war on Arvelia' });
    expect(document.activeElement).toBe(ask);

    fireEvent.keyDown(ask, { key: 'Escape' });
    expect(within(country('Arvelia')).queryByRole('group', { name: 'Confirm war on Arvelia' })).toBeNull();
    expect(useGameStore.getState().isDiplomacyOpen).toBe(true);
    expect(document.activeElement).toBe(button('Arvelia', 'Declare war'));
    expect(submitted).toEqual([]);

    // With no question open, Escape closes the dialog (FR-236)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(useGameStore.getState().isDiplomacyOpen).toBe(false);
  });

  it('FR-240 the Great Powers\' start consulate and embassy read "since the start", with a tooltip; a minor\'s consulate does not', () => {
    openDiplomacy(setPair(start(), N1, ARVELIA, { consulates: [N1] }));
    expect(treaties('Valdoria')).toEqual(['Consulate since the start', 'Embassy since the start']);
    for (const chip of within(tab('Valdoria')).getAllByTestId('treaty')) {
      expect(chip.getAttribute('title')).toBe('Great Powers begin the game with a consulate and an embassy in each other.');
    }
    expect(treaties('Arvelia')).toEqual(['Consulate']);
    expect(within(tab('Arvelia')).getByTestId('treaty').getAttribute('title')).toBeNull();
  });

  it('FR-233 FR-224 a minor that became a colony reads "Colony" (ours) or "Colony of Valdoria" first among its chips', () => {
    const colonies = (s: GameState, owner: string) => ({
      ...s,
      minorNations: s.minorNations.map((m) => (m.id === ARVELIA ? { ...m, colonyOf: owner } : m)),
    });
    openDiplomacy(setPair(colonies(start(), N1), N1, ARVELIA, { consulates: [N1] }));
    expect(treaties('Arvelia')).toEqual(['Colony', 'Consulate']);
    expect(treaties('Sundmark')).toEqual(['No treaties']);
  });

  it("FR-233 another Great Power's colony names its owner", () => {
    openDiplomacy({ ...start(), minorNations: start().minorNations.map((m) => (m.id === ARVELIA ? { ...m, colonyOf: N2 } : m)) });
    expect(treaties('Arvelia')).toEqual(['Colony of Valdoria']);
  });

  it('FR-224 toward a colony, ours or another\'s, every overture, Give and Set policy is disabled with the reason (M9 review F2)', () => {
    for (const owner of [N1, N2]) {
      const view = openDiplomacy({ ...start(), minorNations: start().minorNations.map((m) => (m.id === ARVELIA ? { ...m, colonyOf: owner } : m)) });
      for (const name of ['Consulate ($500)', 'Embassy ($5,000)', 'Pact', 'Declare war', 'Propose peace', 'Give', 'Set policy']) {
        const b = button('Arvelia', name) as HTMLButtonElement;
        expect({ owner, name, disabled: b.disabled, description: description(b) }).toEqual({ owner, name, disabled: true, description: 'it is a colony, ruled by its owner' });
      }
      view.unmount();
    }
  });

  it('FR-240 without the start mark (a war ended the start treaties) a consulate opened again is plain "Consulate"', () => {
    openDiplomacy(setPair(start(), N1, N2, { consulates: [N1], embassies: [], startTreaties: undefined }));
    expect(treaties('Valdoria')).toEqual(['Consulate']);
  });

  it('FR-241 at war "Declare war" gives "we are already at war with them"; a declaration ordered this turn keeps "that is already in place"', () => {
    let s = setPair(start(), N1, LORRAN, { war: { aggressors: [N1], since: 1 } });
    s = tryApplyOrder(s, { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA }).state;
    openDiplomacy(s);
    expect(description(button('Lorran', 'Declare war'))).toBe('we are already at war with them');
    expect(description(button('Arvelia', 'Declare war'))).toBe('that is already in place');
  });
});

describe('FR-236 the keyboard on the Diplomacy screen (QA review F1, F3, F4)', () => {
  const key = (k: string, shiftKey = false) => fireEvent.keyDown(document.activeElement!, { key: k, shiftKey });
  const pane = () => within(country('Arvelia'));
  /** The overtures' own "Declare war" (it opens the question, so it carries aria-expanded; the question's does not). */
  const warOverture = () => pane().getAllByRole('button', { name: 'Declare war' }).find((b) => b.hasAttribute('aria-expanded'))!;
  const question = () => pane().queryByRole('group', { name: 'Confirm war on Arvelia' });
  /** What Chrome does when an order disables or removes the focused control: the focus falls to the page. */
  const dropFocus = () => {
    if (document.activeElement !== document.body) {
      // jsdom's blur() ignores a disabled button: pass the focus to a scratch button outside the dialog and remove it
      act(() => {
        const scratch = document.createElement('button');
        document.body.appendChild(scratch);
        scratch.focus();
        scratch.remove();
      });
    }
    expect(document.activeElement).toBe(document.body);
  };
  /** Focuses an element found first: a lookup inside act would select the country tab without rendering its pane yet. */
  const focusOn = (el: HTMLElement) => act(() => el.focus());

  it('FR-236 Tab from the war question (a focused group, not a control) goes on to its "Declare war", then "Keep the peace"; Shift+Tab to the control before it (F1)', () => {
    openDiplomacy(start());
    fireEvent.click(warOverture());
    const ask = question()!;
    expect(document.activeElement).toBe(ask);

    key('Tab');
    expect(document.activeElement).toBe(within(ask).getByRole('button', { name: 'Declare war' }));
    key('Tab');
    expect(document.activeElement).toBe(within(ask).getByRole('button', { name: 'Keep the peace' }));

    act(() => ask.focus());
    key('Tab', true);
    // Propose peace, after it in the overtures, is disabled (not at war), so the overture "Declare war" comes before the question
    expect(document.activeElement).toBe(warOverture());
  });

  it('FR-236 FR-178 while the war question is open, Escape answers it ("Keep the peace") wherever the focus is in the dialog; the dialog stays (F3)', () => {
    openDiplomacy(start());
    const spots: [string, () => HTMLElement][] = [
      ['the Grant amount', () => pane().getByRole('combobox', { name: 'Amount' })],
      ['the country tab', () => tab('Arvelia')],
      ['the close button', () => within(dialog()).getByRole('button', { name: 'Close diplomacy' })],
    ];
    for (const [where, spot] of spots) {
      fireEvent.click(warOverture());
      expect(question(), where).not.toBeNull();
      const el = spot();
      focusOn(el);
      fireEvent.keyDown(el, { key: 'Escape' });
      expect(question(), where).toBeNull();
      expect(useGameStore.getState().isDiplomacyOpen, where).toBe(true);
      expect(document.activeElement, where).toBe(warOverture());
    }
    expect(submitted).toEqual([]);
    // With the question closed, Escape closes the dialog again
    key('Escape');
    expect(useGameStore.getState().isDiplomacyOpen).toBe(false);
  });

  it('FR-236 an order that disables or removes the focused control: Tab and Shift+Tab go on from its place, not from the top of the dialog (F4)', () => {
    openDiplomacy(start());
    const consulate = () => pane().getByRole('button', { name: 'Consulate ($500)' }) as HTMLButtonElement;
    const withdraw = () => pane().getByRole('button', { name: 'Withdraw consulate' });

    // Consulate ordered: the button is disabled ("that is already in place"); Embassy and Pact are disabled, so Tab reaches Declare war
    focusOn(consulate());
    fireEvent.click(consulate());
    expect(consulate().disabled).toBe(true);
    dropFocus();
    key('Tab');
    expect(document.activeElement).toBe(warOverture());

    // Withdraw consulate: the button is removed with its line; Shift+Tab reaches the control before it, the country's tab
    const removed = withdraw();
    focusOn(removed);
    fireEvent.click(removed);
    expect(removed.isConnected).toBe(false);
    dropFocus();
    key('Tab', true);
    expect(document.activeElement).toBe(tab('Arvelia'));

    // Ordered again: Shift+Tab from the disabled Consulate reaches Withdraw consulate, above it
    focusOn(consulate());
    fireEvent.click(consulate());
    dropFocus();
    key('Tab', true);
    expect(document.activeElement).toBe(withdraw());

    // Withdrawn again from the keyboard's place: Tab reaches the control now in its place, Consulate, enabled again
    fireEvent.click(withdraw());
    dropFocus();
    key('Tab');
    expect(document.activeElement).toBe(consulate());
    expect(submitted.map((o) => o.kind)).toEqual(['proposeOverture', 'withdrawOverture', 'proposeOverture', 'withdrawOverture']);
  });

  it('FR-236 a control still holding the focus while disabled (as jsdom and other browsers keep it): Tab goes on to the next control after it (F1)', () => {
    openDiplomacy(start());
    const consulate = pane().getByRole('button', { name: 'Consulate ($500)' }) as HTMLButtonElement;
    focusOn(consulate);
    fireEvent.click(consulate);
    expect(consulate.disabled).toBe(true);
    expect(document.activeElement).toBe(consulate);
    key('Tab');
    expect(document.activeElement).toBe(warOverture());
  });
});

describe('FR-175 Accept Offer', () => {
  const offer = (id: string, kind: 'alliance' | 'peace', turn = 1): Proposal => ({ id, fromId: N2, toId: N1, kind, turn });
  /** Turn 2 of a new game with these proposals to the player from turn 1. */
  const withOffers = (...proposals: Proposal[]): GameState => {
    let s: GameState = { ...start(), turn: 2, proposals };
    if (proposals.some((p) => p.kind === 'peace')) s = setPair(s, N1, N2, { war: { aggressors: [N2], since: 1 } });
    return s;
  };
  const offerDialog = () => screen.getByRole('dialog', { name: 'Accept Offer' });

  it('FR-175 a proposal of an alliance opens "Accept Offer" with the Imp1 sentence; Accept builds answerProposal', () => {
    show(withOffers(offer('proposal-1-1', 'alliance')));
    render(<AcceptOfferModal />);

    expect(text(within(offerDialog()).getByTestId('offer-text'))).toBe(
      'Valdoria seeks to enter into an alliance with our great Empire. Do you accept their offer?'
    );
    fireEvent.click(within(offerDialog()).getByRole('button', { name: 'Accept' }));

    expect(submitted).toEqual([{ kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: true }]);
    expect(proposalAnswer(now(), 'proposal-1-1')).toBe(true);
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
  });

  it('FR-175 a peace request reads "Valdoria asks for an end to our war. Do you accept?"; Reject builds answerProposal false', () => {
    show(withOffers(offer('proposal-1-1', 'peace')));
    render(<AcceptOfferModal />);

    expect(text(within(offerDialog()).getByTestId('offer-text'))).toBe('Valdoria asks for an end to our war. Do you accept?');
    fireEvent.click(within(offerDialog()).getByRole('button', { name: 'Reject' }));

    expect(submitted).toEqual([{ kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: false }]);
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
  });

  it('FR-175 Escape rejects and Enter accepts (Imp1: Esc rejects, Return accepts); the dialog takes the focus', () => {
    show(withOffers(offer('proposal-1-1', 'alliance'), offer('proposal-1-2', 'peace')));
    render(<AcceptOfferModal />);
    expect(offerDialog().contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(submitted).toEqual([{ kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: false }]);
    expect(offerDialog().contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(submitted.at(-1)).toEqual({ kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-2', accept: true });
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
  });

  it('FR-175 Enter on the focused Reject button rejects, not accepts', () => {
    show(withOffers(offer('proposal-1-1', 'alliance')));
    render(<AcceptOfferModal />);
    const reject = within(offerDialog()).getByRole('button', { name: 'Reject' });
    reject.focus();
    fireEvent.keyDown(reject, { key: 'Enter' });
    expect(submitted).toEqual([]); // the browser turns Enter on a button into its click
    fireEvent.click(reject);
    expect(submitted).toEqual([{ kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: false }]);
  });

  it('FR-175 several proposals open one after the other, oldest first', () => {
    show(withOffers(offer('proposal-1-1', 'alliance'), offer('proposal-1-2', 'peace')));
    render(<AcceptOfferModal />);
    expect(text(within(offerDialog()).getByTestId('offer-text'))).toMatch(/alliance/);
    fireEvent.click(within(offerDialog()).getByRole('button', { name: 'Accept' }));
    expect(text(within(offerDialog()).getByTestId('offer-text'))).toMatch(/end to our war/);
  });

  it('FR-175 FR-166 closing it without an answer leaves the proposal; End Turn refuses it', () => {
    show(withOffers(offer('proposal-1-1', 'alliance')));
    render(<AcceptOfferModal />);

    // The close button promises no later answer: a closed offer does not come back (review B-R4)
    const close = within(offerDialog()).getByRole('button', { name: 'Close offer' });
    expect(close.getAttribute('title')).toBe('Close: an offer not answered by End Turn is refused');
    fireEvent.click(close);
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
    expect(submitted).toEqual([]);
    expect(proposalAnswer(now(), 'proposal-1-1')).toBeUndefined();
    expect(now().proposals).toHaveLength(1);

    act(() => useGameStore.getState().advanceTurn());
    expect(now().proposals).toEqual([]);
    expect(now().diplomacy[pairKey(N1, N2)].alliance).toBe(false);
    expect(useGameStore.getState().eventLog.at(-1)!.events).toContainEqual({ type: 'overture-refused', nationId: N2, overture: 'alliance', targetId: N1 });
  });

  it('FR-175 no dialog without a proposal to the player: none, one to another nation, or one already answered', () => {
    show(start());
    const { unmount } = render(<AcceptOfferModal />);
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
    unmount();

    show({ ...start(), turn: 2, proposals: [{ id: 'proposal-1-1', fromId: N1, toId: N2, kind: 'alliance', turn: 1 }] });
    const second = render(<AcceptOfferModal />);
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
    second.unmount();

    const answered = tryApplyOrder(withOffers(offer('proposal-1-1', 'alliance')), { kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: true }).state;
    show(answered);
    render(<AcceptOfferModal />);
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
  });

  it('FR-175 the page itself (Home) opens "Accept Offer" for a proposal to the player (review A-R2: the page wiring)', () => {
    show(withOffers(offer('proposal-1-1', 'alliance')));
    render(<Home />);
    expect(text(within(offerDialog()).getByTestId('offer-text'))).toBe(
      'Valdoria seeks to enter into an alliance with our great Empire. Do you accept their offer?'
    );
    fireEvent.click(within(offerDialog()).getByRole('button', { name: 'Accept' }));
    expect(submitted).toEqual([{ kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: true }]);
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
  });
});

describe('FR-410 FR-411 a closed offer stays answerable in Diplomacy; an offer says what accepting does', () => {
  const offer = (kind: 'alliance' | 'peace'): Proposal => ({ id: 'proposal-1-1', fromId: N2, toId: N1, kind, turn: 1 });
  /** Turn 2 with Valdoria's offer from turn 1; a peace offer comes during a war, with Valdoria at `points` (5: dark brown). */
  const offered = (kind: 'alliance' | 'peace', points = 5): GameState => {
    const s: GameState = { ...start(), turn: 2, proposals: [offer(kind)] };
    return kind === 'peace' ? setPair(s, N1, N2, { points, war: { aggressors: [N2], since: 1 }, consulates: [], embassies: [] }) : s;
  };
  const offerDialog = () => screen.getByRole('dialog', { name: 'Accept Offer' });
  /** The page's Diplomacy screen and Accept Offer, as page.tsx mounts them. */
  const page = () =>
    render(
      <>
        <DiplomacyModal />
        <AcceptOfferModal />
      </>
    );
  const closeOfferThenOpenDiplomacy = () => {
    fireEvent.click(within(offerDialog()).getByRole('button', { name: 'Close offer' }));
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
    act(() => useGameStore.getState().openDiplomacy());
  };
  const offerGroup = (countryName: string) => within(country(countryName)).getByRole('group', { name: 'Offer' });

  it.each([
    ['peace', 'Valdoria asks for peace'],
    ['alliance', 'Valdoria offers an alliance'],
  ] as const)('FR-410 after × on a %s offer, Valdoria\'s panel shows "%s" with Accept and Reject; Accept builds answerProposal', (kind, line) => {
    show(offered(kind));
    page();
    closeOfferThenOpenDiplomacy();
    expect(submitted).toEqual([]);

    const group = offerGroup('Valdoria');
    expect(text(within(group).getByTestId('offer-line'))).toBe(line);
    fireEvent.click(within(group).getByRole('button', { name: 'Accept' }));
    expect(submitted).toEqual([{ kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: true }]);
    expect(proposalAnswer(now(), 'proposal-1-1')).toBe(true);
    // Answered: the offer leaves the panel, and Accept Offer does not come back
    expect(within(country('Valdoria')).queryByRole('group', { name: 'Offer' })).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Accept Offer' })).toBeNull();
  });

  it('FR-410 Reject in the panel builds answerProposal false', () => {
    show(offered('alliance'));
    page();
    closeOfferThenOpenDiplomacy();
    fireEvent.click(within(offerGroup('Valdoria')).getByRole('button', { name: 'Reject' }));
    expect(submitted).toEqual([{ kind: 'answerProposal', nationId: N1, proposalId: 'proposal-1-1', accept: false }]);
  });

  it('FR-410 the country list marks the proposer ("Offer"), as the tab\'s description, and only the proposer; answering removes the mark', () => {
    show(offered('alliance'));
    page();
    closeOfferThenOpenDiplomacy();
    const mark = within(tab('Valdoria')).getByTestId('offer-mark');
    expect(text(mark)).toBe('Offer');
    expect(description(tab('Valdoria'))).toContain('Offer');
    expect(within(tab('Arvelia')).queryByTestId('offer-mark')).toBeNull();
    expect(within(country('Arvelia')).queryByRole('group', { name: 'Offer' })).toBeNull();

    fireEvent.click(within(offerGroup('Valdoria')).getByRole('button', { name: 'Accept' }));
    expect(within(tab('Valdoria')).queryByTestId('offer-mark')).toBeNull();
  });

  it('FR-410 FR-166 an offer still unanswered at End Turn is refused as before; the × title still says so', () => {
    show(offered('alliance'));
    page();
    expect(within(offerDialog()).getByRole('button', { name: 'Close offer' }).getAttribute('title')).toBe('Close: an offer not answered by End Turn is refused');
    closeOfferThenOpenDiplomacy();
    act(() => useGameStore.getState().advanceTurn());
    expect(now().proposals).toEqual([]);
    expect(useGameStore.getState().eventLog.at(-1)!.events).toContainEqual({ type: 'overture-refused', nationId: N2, overture: 'alliance', targetId: N1 });
  });

  it.each([
    ['peace', 5, 'Accepting ends the war at End Turn. Relations stay dark brown; treaties are not restored.'],
    ['peace', 34, 'Accepting ends the war at End Turn. Relations stay yellow; treaties are not restored.'],
    ['alliance', 5, 'We become allies at End Turn.'],
  ] as const)('FR-411 a %s offer (relations %i) says under the Imp1 sentence: "%s", in Accept Offer and in the panel', (kind, points, effect) => {
    show(offered(kind, points));
    page();
    const sentence = within(offerDialog()).getByTestId('offer-text');
    const line = within(offerDialog()).getByTestId('offer-effect');
    expect(text(line)).toBe(effect);
    expect(sentence.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Part of the dialog's description, with the sentence
    expect(description(offerDialog())).toContain(effect);

    closeOfferThenOpenDiplomacy();
    expect(text(within(offerGroup('Valdoria')).getByTestId('offer-effect'))).toBe(effect);
  });
});

describe('FR-178 the End Turn key "n" on the page (review blocker B-R1)', () => {
  const turn = () => now().turn;
  const press = (target: Element, key = 'n') => fireEvent.keyDown(target, { key });

  it('FR-178 "n" or "N" typed on the Subsidy, Amount or How often select does not end the turn', () => {
    show(start(), { isDiplomacyOpen: true });
    render(<Home />);
    const row = within(country('Arvelia'));
    for (const name of ['Subsidy', 'Amount', 'How often']) {
      const select = row.getByRole('combobox', { name });
      select.focus();
      press(select);
      press(select, 'N');
    }
    expect(turn()).toBe(1);
    expect(useGameStore.getState().eventLog).toEqual([]);
  });

  it('FR-178 "n" does nothing while a dialog is open, wherever the focus is; once it is closed "n" ends the turn again', () => {
    show(start(), { isDiplomacyOpen: true });
    render(<Home />);
    press(document.body);
    press(dialog());
    expect(turn()).toBe(1);

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Close diplomacy' }));
    press(document.body);
    expect(turn()).toBe(2);
  });

  it('FR-175 FR-178 "n" does nothing while Accept Offer is open', () => {
    show({ ...start(), turn: 2, proposals: [{ id: 'proposal-1-1', fromId: N2, toId: N1, kind: 'alliance', turn: 1 }] });
    render(<Home />);
    expect(screen.getByRole('dialog', { name: 'Accept Offer' })).toBeTruthy();
    press(document.activeElement!);
    press(document.body);
    expect(turn()).toBe(2);
  });

  it('FR-178 with no dialog open the key is ignored in a select, a text field, a text area and editable text, and works anywhere else', () => {
    let ended = 0;
    renderHook(() => useKeyboardShortcuts({ onAdvanceTurn: () => (ended += 1) }));
    const field = document.createElement('div');
    field.innerHTML =
      '<select id="f-select"><option>none</option></select><input id="f-input"><textarea id="f-area"></textarea><div contenteditable="true"><span id="f-edit">x</span></div>';
    document.body.appendChild(field);
    try {
      for (const id of ['f-select', 'f-input', 'f-area', 'f-edit']) press(document.getElementById(id)!);
      expect(ended).toBe(0);
      press(document.body);
      expect(ended).toBe(1);
    } finally {
      field.remove();
    }
  });
});

// FR-427 (diplomacy-council-11): below 600 px the details pane shrank to 34 px; jsdom has no layout, so the rule is read
// from the style sheet (the e2e at 390x844 measures it)
describe('FR-427 Diplomacy on a narrow window', () => {
  const narrow = () => {
    const css = readFileSync(join(ROOT, 'src/app/components/diplomacy/Diplomacy.module.css'), 'utf8');
    return /@media \(max-width: 599\.98px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  };

  it('FR-427 below 600 px the country list stacks above the details, one column', () => {
    expect(narrow()).toMatch(/\.panes \{[^}]*grid-template-columns: minmax\(0, 1fr\);[^}]*grid-template-rows: minmax\(0, 2fr\) minmax\(0, 3fr\);/);
  });

  it('FR-427 at 390 px the details get at least 340 px: the dialog 8 px from each edge, 12 px of padding (390 - 16 - 24 = 350)', () => {
    expect(narrow()).toMatch(/\.dialog \{[^}]*max-width: calc\(100vw - 16px\);[^}]*padding: 12px;/);
  });

  it('FR-427 the list comes first in the page order, so it stacks above the details', () => {
    openDiplomacy(start());
    expect(countries().compareDocumentPosition(within(dialog()).getByRole('tabpanel')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// M12 T7 (cards Q82, Q83): Diplomacy says what each choice does and what the other country is. FR-407 the war no army can
// reach; FR-395 what a subsidy costs; FR-416 a line per overture, its numbers from the rules; FR-417 the relation points
// a Council vote reads; FR-418 the other country's provinces, army and industry; FR-422 a grant asks once first.
describe('FR-407 FR-395 FR-416 FR-417 FR-418 FR-422 Diplomacy says what each choice does', () => {
  const regiments = (n: number) => `${n} regiment${n === 1 ? '' : 's'}`;

  it('FR-407 war on a country no army can reach over land: Declare war is disabled with "No army can reach Sundmark over land. War needs ships (a later milestone)."', () => {
    openDiplomacy(start());
    const line = 'No army can reach Sundmark over land. War needs ships (a later milestone).';
    const war = button('Sundmark', 'Declare war') as HTMLButtonElement;
    expect(war.disabled).toBe(true);
    expect(description(war)).toBe(line);
    expect(within(country('Sundmark')).getAllByTestId('reason').map(text)).toContain(`Declare war: ${line}`);
    fireEvent.click(war);
    expect(within(country('Sundmark')).queryByRole('group', { name: 'Confirm war on Sundmark' })).toBeNull();
    expect(submitted).toEqual([]);

    for (const name of ['Lorran', 'Pellis']) expect(description(button(name, 'Declare war'))).toBe(`No army can reach ${name} over land. War needs ships (a later milestone).`);
    for (const name of ['Arvelia', 'Valdoria']) expect((button(name, 'Declare war') as HTMLButtonElement).disabled).toBe(false);
  });

  it('FR-395 a subsidy ordered this turn says what it costs, not "free"; removing it says "no fee"', () => {
    let s = setPair(start(), N1, SUNDMARK, { consulates: [N1] });
    s = setPair(s, N1, ARVELIA, { consulates: [N1], subsidies: { [N1]: 10 } });
    s = tryApplyOrder(s, { kind: 'setTradePolicy', nationId: N1, targetId: SUNDMARK, subsidyPercent: 25, boycott: false }).state;
    s = tryApplyOrder(s, { kind: 'setTradePolicy', nationId: N1, targetId: ARVELIA, subsidyPercent: 0, boycott: false }).state;
    openDiplomacy(s);

    expect(ordered('Sundmark')).toEqual([
      'Trade policy: subsidy 25% Subsidy 25%: no fee; Sundmark pays us 25% less for our goods and charges us 25% more for its own. Withdraw',
    ]);
    expect(ordered('Arvelia')).toEqual(['Trade policy: no subsidy no fee Withdraw']);
  });

  it('FR-395 FR-416 the trade policy says what the chosen step does, and what a boycott does', () => {
    openDiplomacy(setPair(start(), N1, SUNDMARK, { consulates: [N1] }));
    const policy = () => within(within(country('Sundmark')).getByRole('group', { name: 'Trade policy' }));
    expect(text(policy().getByTestId('subsidy-help'))).toBe('No subsidy: we trade at the Board price.');
    expect(text(policy().getByTestId('boycott-help'))).toBe('Boycott (free): no trade between us and Sundmark while it stands.');

    fireEvent.change(policy().getByRole('combobox', { name: 'Subsidy' }), { target: { value: '25' } });
    expect(text(policy().getByTestId('subsidy-help'))).toBe(`${subsidyCost('Sundmark', 25)} In return it ranks us higher as a trading partner.`);

    // A Great Power: our subsidy sets only what it pays for our goods; its own subsidy sets what we pay it (FR-189 (3))
    fireEvent.click(tab('Valdoria'));
    const valdoria = within(within(country('Valdoria')).getByRole('group', { name: 'Trade policy' }));
    fireEvent.change(valdoria.getByRole('combobox', { name: 'Subsidy' }), { target: { value: '10' } });
    expect(text(valdoria.getByTestId('subsidy-help'))).toBe('Subsidy 10%: no fee; Valdoria pays us 10% less for our goods.');
  });

  it('FR-416 each overture says what it does and what it costs, beside its button', () => {
    openDiplomacy(start());
    const help = (name: string) =>
      within(within(country(name)).getByRole('group', { name: 'Overtures' }))
        .getAllByTestId('overture-help')
        .map(text);
    expect(help('Arvelia')).toEqual([
      '$500: opens at End Turn; then Arvelia trades with us and we may set a subsidy and build an embassy.',
      '$5,000: needs our consulate; then we may give grants and offer a pact.',
      'Free: needs our embassy; Arvelia accepts at End Turn and relations rise by 10 points.',
      'Free: the war starts next turn; relations with Arvelia fall by 40 points.',
      'Free: Arvelia always accepts; the war ends at End Turn.',
    ]);
    expect(help('Valdoria')).toEqual([
      '$500: opens at End Turn; then we may set a subsidy and build an embassy.',
      '$5,000: needs our consulate; then we may give grants.',
      'Free: Valdoria accepts at level 7 (grey) or higher.',
      'Free: the war starts next turn; relations with Valdoria fall by 40 points.',
      'Free: Valdoria accepts when it is losing, or after 6 turns of war if no province changed hands in the last 3.',
    ]);
    // Each line sits after its own button
    const group = within(country('Arvelia')).getByRole('group', { name: 'Overtures' });
    const pact = within(group).getByRole('button', { name: 'Pact' });
    expect(text(pact.nextElementSibling!)).toBe('Free: needs our embassy; Arvelia accepts at End Turn and relations rise by 10 points.');
  });

  it('FR-416 the grant says what the chosen amount adds, once or each turn', () => {
    openDiplomacy(setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] }));
    const grant = () => within(within(country('Arvelia')).getByRole('group', { name: 'Grant' }));
    expect(text(grant().getByTestId('grant-help'))).toBe('$1,000 once: +2 relation points; needs our embassy.');
    fireEvent.change(grant().getByRole('combobox', { name: 'Amount' }), { target: { value: '10000' } });
    fireEvent.change(grant().getByRole('combobox', { name: 'How often' }), { target: { value: 'each-turn' } });
    expect(text(grant().getByTestId('grant-help'))).toBe('$10,000 each turn: +8 relation points each turn; needs our embassy.');
  });

  it("FR-416 FR-417 the numbers are the rules': a changed constant in diplomacyRules.ts or council.ts changes the text", () => {
    const scripted = SCRIPTED_DIPLOMACY as { allianceLevel: number; peaceAfterTurns: number };
    const cost = OVERTURE_COST as Record<string, number>;
    const war = WAR_RELATION as { pair: number };
    const council = COUNCIL as { minRelationPoints: number };
    const was = { alliance: scripted.allianceLevel, peace: scripted.peaceAfterTurns, consulate: cost.consulate, war: war.pair, vote: council.minRelationPoints };
    try {
      scripted.allianceLevel = 5;
      scripted.peaceAfterTurns = 8;
      cost.consulate = 750;
      war.pair = -30;
      council.minRelationPoints = 60;
      const rows = diplomacyRows(start(), N1);
      const row = (id: string) => rows.find((r) => r.id === id)!;
      expect(row(N2).overtures.map((o) => o.help)).toEqual([
        '$750: opens at End Turn; then we may set a subsidy and build an embassy.',
        '$5,000: needs our consulate; then we may give grants.',
        'Free: Valdoria accepts at level 6 (brown) or higher.',
        'Free: the war starts next turn; relations with Valdoria fall by 30 points.',
        'Free: Valdoria accepts when it is losing, or after 8 turns of war if no province changed hands in the last 3.',
      ]);
      expect(row(ARVELIA).vote).toBe('Arvelia: 30 with us, 30 with Valdoria; a vote needs 60 and more than the rival');
    } finally {
      scripted.allianceLevel = was.alliance;
      scripted.peaceAfterTurns = was.peace;
      cost.consulate = was.consulate;
      war.pair = was.war;
      council.minRelationPoints = was.vote;
    }
  });

  it('FR-417 each minor shows its relation points with us and with the rival, and what a Council vote needs', () => {
    let s = setPair(start(), N2, ARVELIA, { points: 46 });
    openDiplomacy(s);
    expect(text(within(country('Arvelia')).getByTestId('council-vote'))).toBe('Arvelia: 30 with us, 46 with Valdoria; a vote needs 50 and more than the rival');
    expect(within(country('Valdoria')).queryByTestId('council-vote')).toBeNull();
    // The two islands have no provinces, so no Council
    s = newGame({ seed: 1 });
    expect(diplomacyRows(s, N1).map((r) => r.vote)).toEqual(diplomacyRows(s, N1).map(() => undefined));
  });

  it('FR-501 FR-506 Diplomacy explains a free minor’s vote when the last meeting is next', () => {
    openDiplomacy({ ...start(), turn: 31 });
    const vote = text(within(country('Arvelia')).getByTestId('council-vote'));
    expect(vote).toContain('more relation points');
    expect(vote).toContain('equal points');
    expect(vote).not.toContain('needs 50');
  });

  it.each([
    { turn: 1, turnLimit: 9 },
    { turn: 31, turnLimit: 35 },
    { turn: 40, turnLimit: 40, gameOver: { turn: 40, year: 1824, scores: [] } },
  ])('FR-417 FR-506 Diplomacy keeps both relation scores without forecasting a vote when no meeting remains: %o', end => {
    const state = setPair({ ...start(), ...end }, N2, ARVELIA, { points: 46 });
    expect(diplomacyRows(state, N1).find(r => r.id === ARVELIA)?.vote).toBe('Arvelia: 30 with us, 46 with Valdoria. No further Council meeting is scheduled.');
  });

  it('FR-418 a Great Power shows its provinces, its regiments without the militia, its strength against ours and its industry capacity', () => {
    const s = start();
    openDiplomacy(s);
    const facts = (name: string) => within(within(country(name)).getByRole('group', { name: 'Strength' })).getAllByTestId('fact').map(text);
    const army = regimentsOf(s, N2).filter((r) => !isMilitia(r.type)).length;
    expect(army).toBeGreaterThan(0);
    expect(militaryStrength(s, N2)).toBe(militaryStrength(s, N1));
    expect(facts('Valdoria')).toEqual([
      `Provinces ${provincesOf(s, N2).length}`,
      `Army ${regiments(army)}, about equal to ours`,
      `Industry capacity ${scoreOf(s, N2).capacity}`,
    ]);

    // A minor: its provinces and its militia
    const militia = regimentsOf(s, ARVELIA).filter((r) => isMilitia(r.type)).length;
    expect(militia).toBeGreaterThan(0);
    expect(facts('Arvelia')).toEqual([`Provinces ${provincesOf(s, ARVELIA).length}`, `Militia ${regiments(militia)}`]);
  });

  it('FR-418 a stronger or weaker Great Power says so', () => {
    const stronger = addRegiments(start(), N2, SW2, ['regulars', 'regulars', 'regulars', 'regulars']);
    expect(militaryStrength(stronger, N2)).toBeGreaterThan(1.1 * militaryStrength(stronger, N1));
    const { unmount } = openDiplomacy(stronger);
    const army = () => within(within(country('Valdoria')).getByRole('group', { name: 'Strength' })).getAllByTestId('fact')[1];
    expect(text(army())).toMatch(/, stronger than ours$/);
    unmount();

    openDiplomacy({ ...start(), armies: start().armies.filter((a) => a.ownerId !== N2) });
    expect(text(army())).toBe('Army 0 regiments, weaker than ours');
  });

  it('FR-418 "about equal" is within 10% of our strength', () => {
    expect([compareStrength(36, 36), compareStrength(39.6, 36), compareStrength(39.7, 36), compareStrength(32.4, 36), compareStrength(32.3, 36)]).toEqual([
      'about equal',
      'about equal',
      'stronger',
      'about equal',
      'weaker',
    ]);
    expect([compareStrength(0, 0), compareStrength(5, 0)]).toEqual(['about equal', 'stronger']);
  });

  it('FR-422 Give asks once first, naming the treasury after it: "Keep the money" sends nothing, "Give $10,000" sends the order', () => {
    let s = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] });
    s = setTreasury(s, N1, 50000);
    openDiplomacy(s);
    const grant = () => within(within(country('Arvelia')).getByRole('group', { name: 'Grant' }));
    const ask = () => grant().queryByRole('group', { name: 'Confirm grant to Arvelia' });
    fireEvent.change(grant().getByRole('combobox', { name: 'Amount' }), { target: { value: '10000' } });

    fireEvent.click(grant().getByRole('button', { name: 'Give' }));
    expect(ask()).toBeTruthy();
    expect(document.activeElement).toBe(ask());
    expect(text(within(ask()!).getByTestId('grant-question'))).toBe('Give $10,000 to Arvelia? The treasury will hold $40,000 after it.');
    expect(within(ask()!).queryByTestId('grant-upkeep')).toBeNull();
    expect(within(ask()!).getAllByRole('button').map((b) => b.textContent)).toEqual(['Give $10,000', 'Keep the money']);
    expect(submitted).toEqual([]);

    fireEvent.click(within(ask()!).getByRole('button', { name: 'Keep the money' }));
    expect(ask()).toBeNull();
    expect(submitted).toEqual([]);
    expect(document.activeElement).toBe(grant().getByRole('button', { name: 'Give' }));

    // Escape keeps the money too, and the dialog stays
    fireEvent.click(grant().getByRole('button', { name: 'Give' }));
    fireEvent.keyDown(ask()!, { key: 'Escape' });
    expect(ask()).toBeNull();
    expect(dialog()).toBeTruthy();

    fireEvent.click(grant().getByRole('button', { name: 'Give' }));
    fireEvent.click(within(ask()!).getByRole('button', { name: 'Give $10,000' }));
    expect(submitted).toEqual([{ kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount: 10000, locked: false }]);
    expect(treasury(now(), N1)).toBe(40000);
    expect(ask()).toBeNull();
  });

  it("FR-422 FR-393 a grant that leaves the cash short of the army upkeep names the regiments at risk in FR-393's words", () => {
    let s = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] });
    const due = upkeepForecast(s, N1).due;
    expect(due).toBeGreaterThan(40);
    s = setTreasury(s, N1, 3000 + due - 40);
    openDiplomacy(s);
    const grant = within(within(country('Arvelia')).getByRole('group', { name: 'Grant' }));
    fireEvent.change(grant.getByRole('combobox', { name: 'Amount' }), { target: { value: '3000' } });
    fireEvent.change(grant.getByRole('combobox', { name: 'How often' }), { target: { value: 'each-turn' } });
    fireEvent.click(grant.getByRole('button', { name: 'Give' }));
    const ask = grant.getByRole('group', { name: 'Confirm grant to Arvelia' });

    expect(text(within(ask).getByTestId('grant-question'))).toBe(`Give $3,000 to Arvelia each turn? The treasury will hold ${money(due - 40)} after it.`);
    const warning = upkeepWarningText(upkeepForecast(s, N1, 3000))!;
    expect(warning).toMatch(/: \$40 short\. Unless this turn's sales bring in \$40, 1 regiment is disbanded \(.+\)\.$/);
    expect(text(within(ask).getByTestId('grant-upkeep'))).toBe(warning);
    expect(within(ask).getByRole('button', { name: 'Give $3,000' })).toBeTruthy();
  });

  // The ask reads the game as End Turn will, without applying the order (FR-022: no component calls tryApplyOrder): each
  // case is checked against the game with the grant really applied
  it('FR-422 FR-393 a grant that replaces this turn\'s grant counts its refund; a locked one that replaces the standing locked grant is not counted twice', () => {
    const base = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] });
    const due = upkeepForecast(base, N1).due;
    const applied = (s: GameState, amount: 1000 | 3000 | 5000 | 10000, locked: boolean) =>
      tryApplyOrder(s, { kind: 'giveGrant', nationId: N1, targetId: ARVELIA, amount, locked }).state;
    const truth = (s: GameState, amount: 1000 | 3000 | 5000 | 10000, locked: boolean) => {
      const after = applied(s, amount, locked);
      return { treasury: treasury(after, N1), upkeep: upkeepWarningText(upkeepForecast(after, N1)) };
    };
    const asked = (s: GameState, amount: 1000 | 3000 | 5000 | 10000, locked: boolean) => grantAsk(s, N1, ARVELIA, amount, locked)!;

    // $5,000 ordered this turn, then $10,000 instead: the $5,000 comes back first
    const replacing = applied(setTreasury(base, N1, 10000 + due - 40), 5000, false);
    expect(asked(replacing, 10000, false).question).toBe(`Give $10,000 to Arvelia? The treasury will hold ${money(due - 40)} after it.`);
    expect(truth(replacing, 10000, false).treasury).toBe(due - 40);
    expect(asked(replacing, 10000, false).upkeep).toBe(truth(replacing, 10000, false).upkeep);
    expect(asked(replacing, 10000, false).upkeep).toMatch(/: \$40 short\./);

    // A standing $3,000 each turn, renewed at $3,000 each turn: End Turn pays the new one only, so the cash is not short
    // (counted twice, the cash would be $40 short)
    const standing = setTreasury(setPair(base, N1, ARVELIA, { lockedGrants: { [N1]: 3000 } }), N1, 6000 + due - 40);
    expect(upkeepForecast(standing, N1, 3000).shortBy).toBe(40);
    expect(asked(standing, 3000, true).upkeep).toBeNull();
    expect(truth(standing, 3000, true)).toEqual({ treasury: 3000 + due - 40, upkeep: null });

    // A one-off grant leaves the standing one paid at End Turn as well
    const both = setTreasury(setPair(base, N1, ARVELIA, { lockedGrants: { [N1]: 3000 } }), N1, 6000 + due - 40);
    expect(asked(both, 3000, false).upkeep).toBe(truth(both, 3000, false).upkeep);
    expect(asked(both, 3000, false).upkeep).toMatch(/: \$40 short\./);
  });

  // M12 review (L1-ENG-1, L3-01): a grant that costs less than what it replaces gives money back; the ask must not warn
  // of a disband that End Turn will not do, nor miss one it will do
  it('FR-422 FR-393 a smaller grant that replaces a larger one: the ask reads the cash End Turn will find', () => {
    const base = setPair(start(), N1, ARVELIA, { consulates: [N1], embassies: [N1] });
    const due = upkeepForecast(base, N1).due;
    const applied = (s: GameState, amount: 1000 | 3000 | 5000 | 10000, locked: boolean, target = ARVELIA) =>
      tryApplyOrder(s, { kind: 'giveGrant', nationId: N1, targetId: target, amount, locked }).state;
    const truth = (s: GameState, amount: 1000 | 3000 | 5000 | 10000, locked: boolean, target = ARVELIA) =>
      upkeepWarningText(upkeepForecast(applied(s, amount, locked, target), N1));
    const asked = (s: GameState, amount: 1000 | 3000 | 5000 | 10000, locked: boolean, target = ARVELIA) =>
      grantAsk(s, N1, target, amount, locked)!.upkeep;

    // $10,000 ordered this turn (the treasury is empty, the HUD warns), then $1,000 instead: $9,000 comes back
    const ordered = applied(setTreasury(base, N1, 10000), 10000, false);
    expect(upkeepWarningText(upkeepForecast(ordered, N1))).toMatch(/short/);
    expect(truth(ordered, 1000, false)).toBeNull();
    expect(asked(ordered, 1000, false)).toBe(truth(ordered, 1000, false));
    // ... or $5,000 instead, with only $40 short of the upkeep before the ask: $5,000 comes back
    const tight = applied(setTreasury(base, N1, 10000 + due - 40), 10000, false);
    expect(truth(tight, 5000, false)).toBeNull();
    expect(asked(tight, 5000, false)).toBe(truth(tight, 5000, false));

    // A standing $3,000 each turn, treasury $3,000 + half the upkeep: $1,000 each turn replaces it, so End Turn pays the
    // $1,000 now and not the $3,000 (the audit's case: the ask read "$50 short" and named a regiment)
    const standing = setTreasury(setPair(base, N1, ARVELIA, { lockedGrants: { [N1]: 3000 } }), N1, 3000 + due / 2);
    expect(truth(standing, 1000, true)).toBeNull();
    expect(asked(standing, 1000, true)).toBe(truth(standing, 1000, true));

    // Two standing grants, $1,000 to Arvelia (paid first, pair order) and $3,000 to Sundmark; $1,000 each turn to Sundmark
    // replaces its $3,000: the cash left cannot hold Arvelia's $1,000, so End Turn is $40 short (counting the $3,000 as
    // given back, the forecast would pay Arvelia and find no shortage)
    const two = setTreasury(
      setPair(setPair(base, N1, ARVELIA, { lockedGrants: { [N1]: 1000 } }), N1, SUNDMARK, { consulates: [N1], embassies: [N1], lockedGrants: { [N1]: 3000 } }),
      N1,
      1000 + due - 40
    );
    expect(truth(two, 1000, true, SUNDMARK)).toMatch(/: \$40 short\./);
    expect(asked(two, 1000, true, SUNDMARK)).toBe(truth(two, 1000, true, SUNDMARK));
  });
});
