// M5 (decision 5): simultaneous orders through intents. An order that involves a second country (M6 to
// M9 add the kinds) stores an intent; a phase resolves the turn's intents in an order that rotates with
// the turn, so no nation always goes first; resolveTurn leaves none of the resolved turn.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { addIntent, byIntentOrder, intentOrder } from '@/engine/turn/intents';
import type { GameState } from '@/types/GameState';
import type { Intent } from '@/types/Intent';
import { deepFreeze, N1, N2 } from './fixtures';

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const reversed = (s: GameState): GameState => ({ ...s, nations: [...s.nations].reverse() });
/** A third Great Power, founded third (colour slot 3), for the rotation over three. */
const withThird = (s: GameState): GameState => ({ ...s, nations: [...s.nations, { ...s.nations[1], id: 'nation-3', name: 'Third', colorSlot: 3 }] });

describe('FR-152 intents', () => {
  it('FR-152 a new game has no intent, on both worlds', () => {
    expect(continent().intents).toEqual([]);
    expect(newGame({ seed: 1, world: 'two-islands' }).intents).toEqual([]);
  });

  it('FR-152 intentOrder: turn 1 nation-1 first, turn 2 nation-2 first, turn 3 nation-1 first', () => {
    expect([1, 2, 3, 4].map(turn => intentOrder(continent(), turn))).toEqual([[N1, N2], [N2, N1], [N1, N2], [N2, N1]]);
  });

  it('FR-152 intentOrder follows the founding order (colorSlot), not the order of state.nations', () => {
    for (const turn of [1, 2, 3]) expect(intentOrder(reversed(continent()), turn)).toEqual(intentOrder(continent(), turn));
  });

  it('FR-152 with three Great Powers turn t starts at index (t - 1) mod 3', () => {
    expect([1, 2, 3, 4].map(turn => intentOrder(withThird(continent()), turn))).toEqual([
      [N1, N2, 'nation-3'],
      [N2, 'nation-3', N1],
      ['nation-3', N1, N2],
      [N1, N2, 'nation-3'],
    ]);
  });

  it('FR-152 minor nations never take part in the order', () => {
    expect(intentOrder(continent(), 1)).not.toEqual(expect.arrayContaining(['minor-1']));
  });

  it('FR-152 byIntentOrder takes the intents nation by nation in intentOrder, each nation\'s in the order stored', () => {
    const intents: Intent[] = [
      { id: 'a', kind: 'test', nationId: N1, turn: 2 },
      { id: 'b', kind: 'test', nationId: N2, turn: 2 },
      { id: 'c', kind: 'test', nationId: N1, turn: 2 },
      { id: 'd', kind: 'test', nationId: N2, turn: 2 },
    ];
    expect(byIntentOrder(continent(), 2, intents).map(i => i.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(byIntentOrder(continent(), 3, intents).map(i => i.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('FR-152 addIntent stores { id, kind, nationId, turn, ... } for this turn and changes nothing else, its input unchanged', () => {
    const before = deepFreeze(continent());
    const snapshot = structuredClone(before);

    const once = addIntent(before, { kind: 'test', nationId: N1, targetId: 'minor-1' });
    const twice = addIntent(once, { kind: 'test', nationId: N2, targetId: 'minor-1' });

    expect(before).toEqual(snapshot);
    expect(twice.intents).toEqual([
      { id: 'intent-1-1', kind: 'test', nationId: N1, turn: 1, targetId: 'minor-1' },
      { id: 'intent-1-2', kind: 'test', nationId: N2, turn: 1, targetId: 'minor-1' },
    ]);
    expect({ ...twice, intents: [] }).toEqual(before);
  });

  it('FR-152 after resolveTurn no intent of the resolved turn is left', () => {
    const s = addIntent(addIntent(continent(), { kind: 'test', nationId: N1 }), { kind: 'test', nationId: N2 });
    expect(s.intents).toHaveLength(2);

    const { state } = resolveTurn(s, {}, s.seed);

    expect(state.intents).toEqual([]);
    expect(state.turn).toBe(2);
  });
});
