// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TradePolicies, type MapMode } from '@/components/market/TradePolicies';
import { relationText } from '@/components/diplomacy/diplomacyView';
import { newGame, pairKey, resolveTurn, tryApplyOrder, type Order } from '@/engine';
import { relationColor } from '@/styles/theme';
import type { GameState } from '@/types/GameState';
import { N1, N2, setPair } from '../engine/fixtures';
import { failOnActWarnings } from './actWarnings';
import { text } from './domText';

failOnActWarnings();
const start = () => newGame({ world: 'continent', seed: 1 });
const arvelia = 'minor-1';
const sundmark = 'minor-2';
const renderPolicies = (game: GameState, viewer = N1) => {
  const submit = vi.fn(() => ({ ok: true as const }));
  function Policies({ state }: { state: GameState }) {
    const [mode, setMode] = useState<MapMode>('Trade policies');
    return <TradePolicies game={state} nationId={viewer} submitOrder={submit} mode={mode} onModeChange={setMode} />;
  }
  const rendered = render(<Policies state={game} />);
  return { ...rendered, submit, update: (state: GameState) => rendered.rerender(<Policies state={state} />) };
};
function mode(name: string) {
  const select = screen.getByRole('combobox', { name: 'Map mode' });
  fireEvent.change(select, { target: { value: (within(select).getByRole('option', { name }) as HTMLOptionElement).value } });
}
const map = (name: string) => within(screen.getByRole('group', { name: name + ' map' }));
const detail = () => text(screen.getByRole('region', { name: 'Selected country' }));
const list = () => fireEvent.click(screen.getByRole('button', { name: 'List', exact: true }));
const land = (country: Element) => country.querySelector('path')!.getAttribute('fill');
function queued(game: GameState, order: Order) {
  const result = tryApplyOrder(game, order);
  expect(result.result).toEqual({ ok: true });
  return result.state;
}

describe('FR-614 and FR-615 diplomatic map modes', () => {
  it('FR-614 Map, key, List and detail use the settled Diplomacy bands, distinguish home and missing pairs, and keep keyboard selection', () => {
    const game = setPair(start(), N1, arvelia, { points: 75 });
    delete game.diplomacy[pairKey(N1, sundmark)];
    const { submit } = renderPolicies(game);
    mode('Relationships');
    const countries = map('Relationships');
    expect(countries.getByRole('img', { name: /Testland.*home/i }).hasAttribute('tabindex')).toBe(false);
    expect(countries.getByRole('button', { name: /Sundmark.*no relations/i })).toBeTruthy();
    for (const [name, level] of [['Valdoria', 4], ['Arvelia', 7]] as const) {
      const country = countries.getByRole('button', { name: name + ', ' + relationText(level) });
      expect(land(country)).toBe(relationColor(level));
      expect(country.getAttribute('tabindex')).toBe('0');
      fireEvent.keyDown(country, { key: 'Enter' });
      expect(detail()).toContain(name);
      expect(detail()).toContain(relationText(level));
    }
    const missing = countries.getByRole('button', { name: /^Sundmark,/ });
    fireEvent.keyDown(missing, { key: ' ' });
    fireEvent.keyUp(missing, { key: ' ' });
    expect(missing.getAttribute('aria-pressed')).toBe('true');
    const legend = screen.getByRole('group', { name: 'Relationships key' });
    for (let level = 0; level < 9; level++) {
      expect(text(legend)).toContain(relationText(level));
    }
    list();
    fireEvent.click(screen.getByRole('button', { name: 'Arvelia', exact: true }));
    expect(detail()).toContain(relationText(7));
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it('FR-614 and NR-040 a grant crosses a band only at settlement; private orders and Demo leave all map markup unchanged', () => {
    const game = setPair(start(), N1, arvelia, { points: 39, consulates: [N1], embassies: [N1] });
    const { container, update } = renderPolicies(game);
    mode('Relationships');
    const before = container.innerHTML;
    const grant = queued(game, { kind: 'giveGrant', nationId: N1, targetId: arvelia, amount: 1000, locked: false });
    const privateGame = queued(grant, { kind: 'giveGrant', nationId: N2, targetId: N1, amount: 1000, locked: false });
    for (const difficulty of ['normal', 'demo'] as const) {
      update({ ...privateGame, difficulty });
      expect(container.innerHTML).toBe(before);
    }
    update(resolveTurn(privateGame, {}, privateGame.seed).state);
    const settled = map('Relationships').getByRole('button', { name: 'Arvelia, ' + relationText(4) });
    expect(land(settled)).toBe(relationColor(4));
  });

  it('FR-615 distinguishes peace, war, pact, alliance and a landless empire; offices only mark the human sender', () => {
    let game = setPair(start(), N1, N2, { alliance: true, consulates: [N2], embassies: [N2] });
    game = setPair(game, N1, arvelia, { pact: true, consulates: [N1], embassies: [N1] });
    game = setPair(game, N1, sundmark, { war: { since: 1, aggressors: [N1] } });
    const colony = game.minorNations[2];
    game = { ...game, minorNations: game.minorNations.map(m => m === colony ? { ...m, colonyOf: N2 } : m),
      provinces: game.provinces.map(p => p.ownerId === colony.id ? { ...p, ownerId: N2 } : p) };
    const { submit } = renderPolicies(game);
    mode('Political status');
    const countries = map('Political status');
    const ally = countries.getByRole('button', { name: /^Valdoria, Alliance/ });
    expect(ally.getAttribute('aria-label')).not.toMatch(/consulate|embassy/i);
    const pact = countries.getByRole('button', { name: /^Arvelia, Pact.*Consulate.*Embassy/i });
    const war = countries.getByRole('button', { name: /^Sundmark, War/ });
    const peace = countries.getByRole('button', { name: /, Peace/ });
    expect(new Set([ally, pact, war, peace].map(land)).size).toBe(4);
    fireEvent.click(pact);
    expect(detail()).toMatch(/Testland.*Arvelia/i);
    expect(detail()).toMatch(/Consulate.*Embassy/i);
    const key = text(screen.getByRole('group', { name: 'Political status key' }));
    for (const word of ['Peace', 'War', 'Pact', 'Alliance', 'Empire', 'Consulate', 'Embassy']) expect(key).toContain(word);
    expect(countries.queryByRole('button', { name: new RegExp('^' + colony.name + ',') })).toBeNull();
    list();
    fireEvent.click(screen.getByRole('button', { name: colony.name, exact: true }));
    expect(detail()).toMatch(/Empire.*Valdoria/i);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(submit).not.toHaveBeenCalled();
    mode('Trade policies');
    fireEvent.click(within(screen.getByTestId('policy-row-' + N2)).getByRole('checkbox'));
    expect(submit).toHaveBeenCalledWith({ kind: 'setTradePolicy', nationId: N1, targetId: N2, subsidyPercent: 0, boycott: true });
  });

  it('FR-615 and NR-040 pending offices, treaties and boycotts do not change either political layout in Normal or Demo', () => {
    const game = setPair(start(), N1, arvelia, { consulates: [N1] });
    let pending = queued(game, { kind: 'proposeOverture', nationId: N1, targetId: arvelia, overture: 'embassy' });
    pending = queued(pending, { kind: 'proposeOverture', nationId: N2, targetId: N1, overture: 'alliance' });
    pending = queued(pending, { kind: 'setTradePolicy', nationId: N2, targetId: N1, subsidyPercent: 0, boycott: true });
    const { container, update } = renderPolicies(game);
    mode('Political status');
    for (const layout of ['Map', 'List']) {
      fireEvent.click(screen.getByRole('button', { name: layout, exact: true }));
      update(game);
      const before = container.innerHTML;
      for (const difficulty of ['normal', 'demo'] as const) {
        update({ ...pending, difficulty });
        expect(container.innerHTML).toBe(before);
      }
    }
  });
});
