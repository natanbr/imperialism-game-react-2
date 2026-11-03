import { describe, it, expect } from 'vitest';
import { foodSystem } from '@/engine/systems/foodSystem';
import { labourOf } from '@/engine/industry/labour';
import { createTurnContext, GameEvent } from '@/engine/turn/context';
import { GameState } from '@/types/GameState';
import { deepFreeze, economyViolations, emptyWarehouse, game, industryOf, N1, nationOf, setIndustry, stockOf } from '../fixtures';

// nation-1 of the two-nation fixture: 1 expert, 2 trained, 4 untrained = 7 mouths. Fed in that
// order, slot i prefers grain, fruit, grain, livestock-or-fish: the expert grain, the trained fruit
// and grain, the untrained livestock-or-fish, grain, fruit, grain. So 7 workers want 4 grain,
// 2 fruit and 1 livestock-or-fish.

function eat(state: GameState): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const frozen = deepFreeze(structuredClone(state));
  const snapshot = structuredClone(frozen);
  const next = foodSystem(frozen, createTurnContext({ turn: frozen.turn, seed: 1, emit: e => events.push(e) }));
  expect(frozen).toEqual(snapshot); // FR-013
  expect(economyViolations(nationOf(next, N1))).toEqual([]);
  return { state: next, events };
}

const FOOD = ['grain', 'fruit', 'livestock', 'fish', 'cannedFood'];
const food = (state: GameState) => Object.fromEntries(FOOD.map(k => [k, stockOf(state, N1, k)]));
const meal = (events: GameEvent[]) => events.find(e => e.type === 'workers-fed' && e.nationId === N1);

describe('FR-040 workers eat', () => {
  it('FR-040 with the preferred food everyone eats well and nobody falls sick', () => {
    const { state, events } = eat(emptyWarehouse(game(), N1, { grain: 5, fruit: 2, livestock: 1, cannedFood: 3 }));

    expect(food(state)).toEqual({ grain: 1, fruit: 0, livestock: 0, fish: 0, cannedFood: 3 });
    expect(industryOf(state, N1).sick).toEqual({ untrained: 0, trained: 0, expert: 0 });
    expect(meal(events)).toEqual({ type: 'workers-fed', nationId: N1, fed: 7, sick: 0, starved: 0 });
  });

  it('FR-040 fish stands in for livestock', () => {
    const { state } = eat(emptyWarehouse(game(), N1, { grain: 4, fruit: 2, fish: 1 }));
    expect(food(state)).toEqual({ grain: 0, fruit: 0, livestock: 0, fish: 0, cannedFood: 0 });
  });

  it('FR-040 canned food feeds a worker whose food is missing, without sickness', () => {
    const { state, events } = eat(emptyWarehouse(game(), N1, { fruit: 2, livestock: 1, cannedFood: 5 }));

    expect(food(state)).toEqual({ grain: 0, fruit: 0, livestock: 0, fish: 0, cannedFood: 1 });
    expect(meal(events)).toEqual({ type: 'workers-fed', nationId: N1, fed: 7, sick: 0, starved: 0 });
  });

  it('FR-040 other raw food feeds but makes the worker sick: no labour next turn, the untrained first', () => {
    // Only fruit: the 2 fruit slots eat well, the other 5 eat fruit and fall sick.
    const { state, events } = eat(emptyWarehouse(game(), N1, { fruit: 7 }));

    expect(food(state)).toEqual({ grain: 0, fruit: 0, livestock: 0, fish: 0, cannedFood: 0 });
    expect(industryOf(state, N1).sick).toEqual({ untrained: 4, trained: 1, expert: 0 });
    expect(labourOf(nationOf(state, N1)).total).toBe(2 + 4);
    expect(meal(events)).toEqual({ type: 'workers-fed', nationId: N1, fed: 2, sick: 5, starved: 0 });
  });

  it('FR-040 a worker with nothing to eat starves and leaves the workforce, the untrained first', () => {
    const { state, events } = eat(emptyWarehouse(game(), N1, { grain: 3 }));

    expect(industryOf(state, N1).workers).toEqual({ untrained: 0, trained: 2, expert: 1 });
    expect(stockOf(state, N1, 'grain')).toBe(0);
    expect(meal(events)).toEqual({ type: 'workers-fed', nationId: N1, fed: 3, sick: 0, starved: 4 });
  });

  it('FR-040 last turn\'s sickness ends with a good meal', () => {
    const start = setIndustry(emptyWarehouse(game(), N1, { grain: 4, fruit: 2, livestock: 1 }), N1, { sick: { untrained: 4, trained: 1, expert: 0 } });
    const { state } = eat(start);
    expect(industryOf(state, N1).sick).toEqual({ untrained: 0, trained: 0, expert: 0 });
  });

  it('FR-042 migrants join after the meal: they do not eat this turn', () => {
    const start = setIndustry(emptyWarehouse(game(), N1, { grain: 4, fruit: 2, livestock: 1 }), N1, { recruits: 2 });

    const { state, events } = eat(start);

    expect(industryOf(state, N1)).toMatchObject({ workers: { untrained: 6, trained: 2, expert: 1 }, recruits: 0 });
    expect(food(state)).toEqual({ grain: 0, fruit: 0, livestock: 0, fish: 0, cannedFood: 0 });
    expect(events).toContainEqual({ type: 'workers-recruited', nationId: N1, count: 2 });
  });

  it('FR-040 a nation without workers eats nothing and reports no meal', () => {
    const start = setIndustry(emptyWarehouse(game(), N1, { grain: 4 }), N1, { workers: { untrained: 0, trained: 0, expert: 0 } });
    const { state, events } = eat(start);
    expect(stockOf(state, N1, 'grain')).toBe(4);
    expect(meal(events)).toBeUndefined();
  });
});
