// M5 (decision 4): one home for diplomacy state. `state.diplomacy` is keyed by country pair; the old
// relation, treaty, trade policy and grant fields on the state and the nations are gone.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { pairKey, RELATION_SWATCHES, relationLevel, relationOf } from '@/engine/diplomacy/relations';
import type { GameState } from '@/types/GameState';
import { N1, N2 } from './fixtures';

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const MINORS = ['minor-1', 'minor-2', 'minor-3', 'minor-4'];
// FR-240 (M6 QA fix round): the Great Power pair's consulates and embassies are marked as the start ones
const GREAT_POWER_PAIR = { points: 40, consulates: [N1, N2], embassies: [N1, N2], pact: false, alliance: false, boycotts: [], subsidies: {}, lockedGrants: {}, startTreaties: true };
const MINOR_PAIR = { points: 30, consulates: [], embassies: [], pact: false, alliance: false, boycotts: [], subsidies: {}, lockedGrants: {} };
const withPoints = (s: GameState, a: string, b: string, points: number): GameState => ({
  ...s,
  diplomacy: { ...s.diplomacy, [pairKey(a, b)]: { ...s.diplomacy[pairKey(a, b)], points } },
});

describe('FR-151 the diplomacy state', () => {
  it('FR-151 pairKey joins the two country ids in string order with a bar, either way round', () => {
    expect([pairKey(N1, 'minor-1'), pairKey('minor-1', N1), pairKey(N2, N1)]).toEqual(['minor-1|nation-1', 'minor-1|nation-1', 'nation-1|nation-2']);
  });

  it('FR-151 the continent starts with 9 entries: the Great Power pair and 8 Great Power and minor pairs', () => {
    const expected = [pairKey(N1, N2), ...MINORS.flatMap(m => [pairKey(N1, m), pairKey(N2, m)])].sort();
    expect(Object.keys(continent().diplomacy).sort()).toEqual(expected);
  });

  it('FR-151 two-islands starts with the one Great Power pair', () => {
    expect(Object.keys(newGame({ seed: 1, world: 'two-islands' }).diplomacy)).toEqual(['nation-1|nation-2']);
  });

  it('FR-151 Q25 the Great Power pair starts at 40 (beige) with consulates and embassies both ways; a Great Power and a minor at 30 (yellow) with nothing', () => {
    const s = continent();
    expect(s.diplomacy[pairKey(N1, N2)]).toEqual(GREAT_POWER_PAIR);
    for (const m of MINORS) for (const n of [N1, N2]) expect(s.diplomacy[pairKey(n, m)]).toEqual(MINOR_PAIR);
    expect(relationOf(s, N2, N1)).toEqual(GREAT_POWER_PAIR);
    expect([relationLevel(s, N1, N2), relationLevel(s, 'minor-1', N2)]).toEqual([4, 3]);
    expect([RELATION_SWATCHES[4], RELATION_SWATCHES[3]]).toEqual(['beige', 'yellow']);
  });

  it('FR-151 two minors have no entry and no relation level', () => {
    expect(relationOf(continent(), 'minor-1', 'minor-2')).toBeUndefined();
    expect(relationLevel(continent(), 'minor-1', 'minor-2')).toBeUndefined();
  });

  it('FR-151 Q24 the level is floor(points / 10), 0 to 8', () => {
    const levels = [0, 9, 10, 39, 40, 79, 80, 89].map(p => relationLevel(withPoints(continent(), N1, 'minor-1', p), N1, 'minor-1'));
    expect(levels).toEqual([0, 0, 1, 3, 4, 7, 8, 8]);
  });

  it('FR-151 the nine Imp1 swatches, dark brown (level 0) to dark green (level 8)', () => {
    expect(RELATION_SWATCHES).toEqual(['dark brown', 'red', 'orange', 'yellow', 'beige', 'brown', 'grey', 'light green', 'dark green']);
  });

  it('FR-151 the old relations, treaties, trade policies and grants are gone from the state and the nations', () => {
    for (const s of [continent(), newGame({ seed: 1, world: 'two-islands' })]) {
      for (const key of ['relations', 'treaties', 'tradePolicies', 'grants']) expect(s).not.toHaveProperty(key);
      for (const n of s.nations) for (const key of ['relations', 'tradePolicies', 'grants']) expect(n).not.toHaveProperty(key);
    }
  });

  it('FR-151 every entry has at least one Great Power', () => {
    const s = continent();
    const greatPowers = new Set(s.nations.map(n => n.id));
    expect(Object.keys(s.diplomacy).filter(k => !k.split('|').some(id => greatPowers.has(id)))).toEqual([]);
  });
});
