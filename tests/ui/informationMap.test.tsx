// @vitest-environment jsdom
// FR-651 (M18l; Imp1 diplomatic map, rules 11 section 3.1: an Information mode that "rates Military and Industry in
// words (Poor, Fair, Good, Excellent, Awesome)"): Market -> Trade policies offers Information beside the other modes, on
// the same map and List. Each country shows the provinces it owns, Military as a word from its visible land strength
// (the FR-226 defence of its provinces, Q32) against ours (below 0.5 Poor, 0.8 Fair, 1.25 Good, 2 Excellent, else
// Awesome; inferred), and for a Great Power the settled FR-610 industry placing. NR-041: a read of settled facts only.
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TradePolicies, type MapMode } from '@/components/market/TradePolicies';
import { diplomaticCountries, MILITARY_WORDS, militaryWord } from '@/components/market/diplomaticMapView';
import { MarketModal } from '@/components/MarketModal';
import { defenceOf, newGame, resolveTurn, transferProvince, tryApplyOrder, type Order } from '@/engine';
import { useGameStore } from '@/store/rootStore';
import type { RankRecord } from '@/store/rankHistory';
import { MILITARY_COLORS } from '@/styles/theme';
import type { GameState } from '@/types/GameState';
import { N1, N2, setPair, setWarehouse } from '../engine/fixtures';
import { addRegiments, ARVELIA, ARVELIA_P, clearArmy, NE1, NE2, relocate, SW1, SW2 } from '../engine/armyFixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();
const start = () => newGame({ world: 'continent', seed: 1 });

function renderInformation(game: GameState, history?: RankRecord[]) {
  const submit = vi.fn(() => ({ ok: true as const }));
  function Policies({ state, rankings }: { state: GameState; rankings?: RankRecord[] }) {
    const [mode, setMode] = useState<MapMode>('Trade policies');
    return <TradePolicies game={state} nationId={N1} submitOrder={submit} mode={mode} onModeChange={setMode} rankHistory={rankings} />;
  }
  const rendered = render(<Policies state={game} rankings={history} />);
  mode('Information');
  return { ...rendered, submit, update: (state: GameState) => rendered.rerender(<Policies state={state} rankings={history} />) };
}
function mode(name: string) {
  const select = screen.getByRole('combobox', { name: 'Map mode' });
  fireEvent.change(select, { target: { value: (within(select).getByRole('option', { name }) as HTMLOptionElement).value } });
}
const map = () => within(screen.getByRole('group', { name: 'Information map' }));
const detail = () => text(screen.getByRole('region', { name: 'Selected country' }));
const land = (country: Element) => country.querySelector('path')!.getAttribute('fill');
const fillOf = (word: string) => MILITARY_COLORS[MILITARY_WORDS.indexOf(word as never)];
/** Each List row as its visible text, our own first. */
function listRows(): string[] {
  fireEvent.click(screen.getByRole('button', { name: 'List' }));
  const table = screen.getByRole('table', { name: 'Information by country' });
  return within(table).getAllByRole('row').slice(1).map(text);
}
/** Hand-built: Testland and Valdoria with only these regiments (the minors keep their Minutemen). */
function onlyPowerArmies(s: GameState, ours: [string, 'regulars'[]], theirs: [string, 'regulars'[]]): GameState {
  const bare = { ...s, armies: s.armies.filter(a => a.ownerId !== N1 && a.ownerId !== N2) };
  return addRegiments(addRegiments(bare, N1, ours[0], ours[1]), N2, theirs[0], theirs[1]);
}
function queued(game: GameState, order: Order) {
  const result = tryApplyOrder(game, order);
  expect(result.result).toEqual({ ok: true });
  return result.state;
}

describe('FR-651 Information on the diplomatic map', () => {
  it('FR-651 the Military word steps at 0.5, 0.8, 1.25 and 2 times our strength (inferred thresholds)', () => {
    expect(MILITARY_WORDS).toEqual(['Poor', 'Fair', 'Good', 'Excellent', 'Awesome']);
    // Their strength against ours of 100: ratios 0, 0.49, 0.5, 0.79, 0.8, 1, 1.24, 1.25, 1.99 and 2, then any against none
    const strengths = [[0, 100], [49, 100], [50, 100], [79, 100], [80, 100], [100, 100], [124, 100], [125, 100], [199, 100], [200, 100], [1, 0]];
    expect(strengths.map(([theirs, ours]) => militaryWord(theirs, ours))).toEqual(
      ['Poor', 'Poor', 'Fair', 'Fair', 'Good', 'Good', 'Good', 'Excellent', 'Excellent', 'Awesome', 'Awesome']);
  });

  it('FR-651 equal strength reads Good and a minor without regiments Poor; map, key, List and detail agree', () => {
    // At the start each Great Power's provinces defend with 155 (FR-226); Arvelia here has no regiment
    const game = { ...start(), armies: start().armies.filter(a => a.ownerId !== ARVELIA) };
    const { submit } = renderInformation(game);
    const valdoria = map().getByRole('button', { name: /^Valdoria, Military Good, 4 provinces, Industry / });
    expect(land(valdoria)).toBe(fillOf('Good'));
    expect(valdoria.getAttribute('tabindex')).toBe('0');
    const arvelia = map().getByRole('button', { name: 'Arvelia, Military Poor, 1 province' });
    expect(land(arvelia)).toBe(fillOf('Poor'));
    // Our own country: Home on the map, not a counterpart to select
    const home = map().getByRole('img', { name: /^Testland, Home, Our forces, 4 provinces, Industry / });
    expect(home.hasAttribute('tabindex')).toBe(false);
    fireEvent.keyDown(valdoria, { key: 'Enter' });
    expect(valdoria.getAttribute('aria-pressed')).toBe('true');
    expect(detail()).toMatch(/^Information: Valdoria Provinces 4 Military Good Industry /);
    fireEvent.click(arvelia);
    expect(detail()).toBe('Information: Arvelia Provinces 1 Military Poor');
    const key = text(screen.getByRole('group', { name: 'Information key' }));
    for (const word of [...MILITARY_WORDS, 'Home', 'Colony']) expect(key).toContain(word);
    expect(key).not.toContain('No relations');
    const rows = listRows();
    expect(rows[0]).toMatch(/^Testland 4 Our forces /);
    expect(rows).toContain('Arvelia 1 Poor —');
    expect(rows.find(row => row.startsWith('Valdoria'))).toMatch(/^Valdoria 4 Good /);
    // Selecting in the List shows the same detail as the map
    fireEvent.click(screen.getByRole('button', { name: 'Valdoria' }));
    expect(detail()).toMatch(/^Information: Valdoria Provinces 4 Military Good Industry /);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(submit).not.toHaveBeenCalled();
    // The existing modes still work after it
    mode('Relationships');
    expect(screen.getByRole('group', { name: 'Relationships key' })).toBeTruthy();
    mode('Trade policies');
    fireEvent.click(within(screen.getByTestId('policy-row-' + N2)).getByRole('checkbox'));
    expect(submit).toHaveBeenCalledWith({ kind: 'setTradePolicy', nationId: N1, targetId: N2, subsidyPercent: 0, boycott: true });
  });

  it('FR-651 a rival twice our strength reads Awesome; Minutemen above 1.25 times ours read Excellent', () => {
    // One Regulars of ours (14.3 behind the capital fort) against two of Valdoria's; Arvelia's 3 Minutemen defend with 18.75
    renderInformation(onlyPowerArmies(start(), [SW1, ['regulars']], [SW2, ['regulars', 'regulars']]));
    const valdoria = map().getByRole('button', { name: /^Valdoria, Military Awesome, 4 provinces/ });
    expect(land(valdoria)).toBe(fillOf('Awesome'));
    const arvelia = map().getByRole('button', { name: 'Arvelia, Military Excellent, 1 province' });
    expect(land(arvelia)).toBe(fillOf('Excellent'));
    const rows = listRows();
    expect(rows.find(row => row.startsWith('Valdoria'))).toMatch(/^Valdoria 4 Awesome /);
    expect(rows).toContain('Arvelia 1 Excellent —');
  });

  it('FR-651 a strength exactly at a step reads the higher word, though the FR-226 sums round a hair under it (Codex task 66)', () => {
    // Regulars behind the level-1 capital forts (14.3 each): eight of ours against four sum to 0.49999999999999994 of
    // ours, twenty against sixteen to 0.7999999999999999, eight against ten to 1.2499999999999998, six against twelve to
    // 1.9999999999999998. Each is exactly at its step, which once read the lower word on the map, the detail and the List.
    const cases: [ours: number, theirs: number, limit: number, word: string][] =
      [[8, 4, 0.5, 'Fair'], [20, 16, 0.8, 'Good'], [8, 10, 1.25, 'Excellent'], [6, 12, 2, 'Awesome']];
    for (const [ours, theirs, limit, word] of cases) {
      const regulars = (n: number) => Array<'regulars'>(n).fill('regulars');
      const game = onlyPowerArmies(start(), [SW1, regulars(ours)], [SW2, regulars(theirs)]);
      const strength = (id: string) => game.provinces.reduce((sum, p) => (p.ownerId === id ? sum + defenceOf(game, p.id) : sum), 0);
      expect(strength(N2) / strength(N1)).toBeLessThan(limit);
      expect(strength(N2) / strength(N1)).toBeCloseTo(limit, 12);
      const view = renderInformation(game);
      const valdoria = map().getByRole('button', { name: new RegExp(`^Valdoria, Military ${word}, 4 provinces`) });
      expect(land(valdoria)).toBe(fillOf(word));
      fireEvent.click(valdoria);
      expect(detail()).toMatch(new RegExp(`^Information: Valdoria Provinces 4 Military ${word} Industry `));
      expect(listRows().find(row => row.startsWith('Valdoria'))).toMatch(new RegExp(`^Valdoria 4 ${word} `));
      view.unmount();
    }
  });

  it('FR-651 a large garrison exactly at a step reads the higher word: 170 Regulars against our 340 is Fair (Codex task 68)', () => {
    // The FR-226 sums of 170 and 340 Regulars behind the level-1 capital forts round to a ratio of 0.4999999999999981,
    // further under one half than a tolerance relative to the step allows. The exact ratio is one half.
    const regulars = (n: number) => Array<'regulars'>(n).fill('regulars');
    const game = onlyPowerArmies(start(), [SW1, regulars(340)], [SW2, regulars(170)]);
    const strength = (id: string) => game.provinces.reduce((sum, p) => (p.ownerId === id ? sum + defenceOf(game, p.id) : sum), 0);
    expect(strength(N2) / strength(N1)).toBeLessThan(0.5);
    expect(strength(N2) / strength(N1)).toBeCloseTo(0.5, 12);
    renderInformation(game);
    const valdoria = map().getByRole('button', { name: /^Valdoria, Military Fair, 4 provinces/ });
    expect(land(valdoria)).toBe(fillOf('Fair'));
    fireEvent.click(valdoria);
    expect(detail()).toMatch(/^Information: Valdoria Provinces 4 Military Fair Industry /);
    expect(listRows().find(row => row.startsWith('Valdoria'))).toMatch(/^Valdoria 4 Fair /);
  });

  it('FR-651 a strength a billionth under a step reads the lower word: their Regulars at 49.99999995 health against ours at 100 is Poor (Codex task 67)', () => {
    // Fractional health comes only from an edited save. The strengths compare exactly, so 49.99999995 against 100 is
    // below one half, while 50 against 100 (four Regulars against eight) is at it.
    const bare = { ...start(), armies: start().armies.filter(a => a.ownerId !== N1 && a.ownerId !== N2) };
    const game = addRegiments(addRegiments(bare, N1, SW1, ['regulars']), N2, SW2, ['regulars'], 49.99999995);
    const strength = (id: string) => game.provinces.reduce((sum, p) => (p.ownerId === id ? sum + defenceOf(game, p.id) : sum), 0);
    expect(strength(N2) / strength(N1)).toBeCloseTo(0.4999999995, 15);
    expect([militaryWord(49.99999995, 100), militaryWord(50, 100)]).toEqual(['Poor', 'Fair']);
    renderInformation(game);
    const valdoria = map().getByRole('button', { name: /^Valdoria, Military Poor, 4 provinces/ });
    expect(land(valdoria)).toBe(fillOf('Poor'));
    fireEvent.click(valdoria);
    expect(detail()).toMatch(/^Information: Valdoria Provinces 4 Military Poor Industry /);
    expect(listRows().find(row => row.startsWith('Valdoria'))).toMatch(/^Valdoria 4 Poor /);
  });

  it('FR-651 a colony is counted under its ruler: its land and the ruler\'s regiments there; the colony itself has none', () => {
    let game = transferProvince(start(), ARVELIA_P, N2);
    game = { ...game, minorNations: game.minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: N2 } : m)),
      armies: game.armies.filter(a => a.ownerId !== ARVELIA) };
    // Four Regulars of Valdoria's in the colony (12.5 each, no fort): 205 against our 155 is 1.32, Excellent
    game = addRegiments(game, N2, ARVELIA_P, ['regulars', 'regulars', 'regulars', 'regulars']);
    renderInformation(game);
    expect(map().getByRole('button', { name: /^Valdoria, Military Excellent, 5 provinces/ })).toBeTruthy();
    expect(map().queryByRole('button', { name: /^Arvelia,/ })).toBeNull();
    const rows = listRows();
    expect(rows).toContain('Arvelia 0 Colony, counted under Valdoria —');
    fireEvent.click(screen.getByRole('button', { name: 'Arvelia' }));
    // Review M18l: a colony has no Military word of its own, so its detail drops the "Military" label
    expect(detail()).toBe('Information: Arvelia Provinces 0 Colony, counted under Valdoria');
  });

  it('FR-651 a colony won by conquest: the province and its count pass to the conqueror, the colony row names it', () => {
    // Testland's 1st Regulars march from Testland North-East into undefended Arvelia, at war with it, and take it (FR-224)
    let game = setPair(relocate(clearArmy(start(), ARVELIA, ARVELIA_P), ['regiment-1'], NE1), N1, ARVELIA,
      { war: { aggressors: [N1], since: 1 }, consulates: [], embassies: [], pact: false, alliance: false });
    game = queued(game, { kind: 'moveArmy', nationId: N1, fromProvinceId: NE1, regimentIds: ['regiment-1'], toProvinceId: ARVELIA_P });
    game = resolveTurn(game, {}).state;
    expect(game.minorNations.find(m => m.id === ARVELIA)!.colonyOf).toBe(N1);
    renderInformation(game);
    expect(map().getByRole('img', { name: /^Testland, Home, Our forces, 5 provinces,/ })).toBeTruthy();
    expect(map().queryByRole('button', { name: /^Arvelia,/ })).toBeNull();
    const rows = listRows();
    expect(rows[0]).toMatch(/^Testland 5 Our forces /);
    expect(rows).toContain('Arvelia 0 Colony, counted under Testland —');
  });

  it('FR-651 a colony that still held land would be labelled on the map without a Military word (hand-built)', () => {
    // Conquest passes a colony's land to its ruler, so this state is hand-built: Arvelia keeps its province
    const game = { ...start(), minorNations: start().minorNations.map(m => (m.id === ARVELIA ? { ...m, colonyOf: N2 } : m)) };
    renderInformation(game);
    const arvelia = map().getByRole('button', { name: 'Arvelia, Colony, counted under Valdoria, 1 province' });
    fireEvent.click(arvelia);
    expect(detail()).toBe('Information: Arvelia Provinces 1 Colony, counted under Valdoria');
  });

  it('FR-651 with no regiment of ours an unarmed country reads Poor and an armed one Awesome, not Good (review: 0 against 0)', () => {
    // Testland and Arvelia without a regiment: both strengths are 0, which once fell back to a ratio of 1, Good
    const game = { ...start(), armies: start().armies.filter(a => a.ownerId !== N1 && a.ownerId !== ARVELIA) };
    renderInformation(game);
    const arvelia = map().getByRole('button', { name: 'Arvelia, Military Poor, 1 province' });
    expect(land(arvelia)).toBe(fillOf('Poor'));
    expect(map().getByRole('button', { name: /^Valdoria, Military Awesome, 4 provinces/ })).toBeTruthy();
    expect(map().getByRole('button', { name: 'Sundmark, Military Awesome, 1 province' })).toBeTruthy();
    expect(listRows()).toContain('Arvelia 1 Poor —');
  });

  it('FR-651 no regiment anywhere reads Poor for every country; Two islands, which has none, offers no Information mode', () => {
    const bare = { ...start(), armies: [] };
    expect(diplomaticCountries(bare, N1, 'Information').map(c => c.status)).toEqual(['Poor', 'Poor', 'Poor', 'Poor', 'Poor']);
    const islands = newGame({ world: 'two-islands', seed: 1 });
    expect(diplomaticCountries(islands, N1, 'Information').map(c => [c.name, c.status])).toEqual([['Valdoria', 'Poor']]);
    // Two islands keeps the world market (FR-073), whose dialog has no Trade policies tab and so no map modes
    useGameStore.setState({ ...useGameStore.getInitialState(), game: islands, activeNationId: N1, isMarketOpen: true });
    render(<MarketModal />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Trade policies' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Map mode' })).toBeNull();
  });

  it('FR-651 the note says what Military measures and how it differs from the army ranking in Stats', () => {
    renderInformation(start());
    const note = text(screen.getByText(/^From Testland/));
    expect(note).toBe('From Testland · Military compares the defence of each country\'s provinces with ours, militia and forts '
      + 'included, as the Attack preview counts it (the army ranking in Stats leaves them out). Industry is the last settled placing.');
  });

  it('FR-651 Industry is the settled FR-610 placing, for Great Powers only; none before the first settlement or for a missing turn', () => {
    const settled = resolveTurn(start(), {}).state;
    expect(settled.turn).toBe(2);
    const placings: RankRecord = { turn: 1, places: { industry: [{ nationId: N2, place: 1 }, { nationId: N1, place: 2 }] } };
    const ranked = renderInformation(settled, [placings]);
    expect(map().getByRole('button', { name: /^Valdoria, .*, Industry 1st of 2$/ })).toBeTruthy();
    expect(map().getByRole('img', { name: /^Testland, Home, .*, Industry 2nd of 2$/ })).toBeTruthy();
    const rows = listRows();
    expect(rows[0]).toBe('Testland 4 Our forces 2nd of 2');
    expect(rows.find(row => row.startsWith('Valdoria'))).toBe('Valdoria 4 Good 1st of 2');
    expect(rows.find(row => row.startsWith('Sundmark'))).toBe('Sundmark 1 Poor —');
    ranked.unmount();
    // Turn 1 has no placing yet; on turn 3 the record of turn 1 is not this turn's
    const first = renderInformation(start());
    expect(map().getByRole('button', { name: /^Valdoria, .*, Industry ranked after the first turn$/ })).toBeTruthy();
    first.unmount();
    renderInformation({ ...settled, turn: 3 }, [placings]);
    expect(map().getByRole('button', { name: /^Valdoria, .*, Industry unavailable$/ })).toBeTruthy();
  });

  it('NR-041 a rival\'s private march, recruit and grant change neither layout in Normal or Demo until settlement', () => {
    // Equal strength (one Regulars each behind the capital fort, 14.3): Good
    const game = setWarehouse(onlyPowerArmies(start(), [SW1, ['regulars']], [SW2, ['regulars']]), N2, { armaments: 4 });
    const marching = game.armies.find(a => a.ownerId === N2)!.regiments[0].id;
    let pending = queued(game, { kind: 'moveArmy', nationId: N2, fromProvinceId: SW2, regimentIds: [marching], toProvinceId: NE2 });
    pending = queued(pending, { kind: 'setRecruitment', nationId: N2, regiment: 'regulars', count: 1 });
    pending = queued(pending, { kind: 'giveGrant', nationId: N2, targetId: N1, amount: 1000, locked: false });
    const { container, update } = renderInformation(game);
    expect(map().getByRole('button', { name: /^Valdoria, Military Good,/ })).toBeTruthy();
    for (const layout of ['Map', 'List']) {
      fireEvent.click(screen.getByRole('button', { name: layout }));
      update(game);
      const before = container.innerHTML;
      for (const difficulty of ['normal', 'demo'] as const) {
        update({ ...pending, difficulty });
        expect(container.innerHTML).toBe(before);
      }
    }
    // At settlement the march (12.5 without a fort) and the recruit (14.3) stand: 1.88 times ours, Excellent
    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    update(resolveTurn(pending, {}).state);
    expect(map().getByRole('button', { name: /^Valdoria, Military Excellent,/ })).toBeTruthy();
  });

  it('FR-651 the Board of Trade passes the store\'s settled rankings to the Information mode', () => {
    const settled = resolveTurn(start(), {}).state;
    useGameStore.setState({
      ...useGameStore.getInitialState(), game: settled, activeNationId: N1, isMarketOpen: true,
      rankHistory: [{ turn: 1, places: { industry: [{ nationId: N1, place: 1 }, { nationId: N2, place: 1 }] } }],
    });
    render(<MarketModal />);
    fireEvent.click(screen.getByRole('tab', { name: 'Trade policies' }));
    mode('Information');
    expect(map().getByRole('button', { name: /^Valdoria, .*, Industry 1st of 2$/ })).toBeTruthy();
    expect(map().getByRole('img', { name: /^Testland, Home, .*, Industry 1st of 2$/ })).toBeTruthy();
  });
});
