// FR-049: the food forecast is a pure query that predicts the meal of the turn being played,
// with the same rules resolveTurn uses.
import { describe, it, expect } from 'vitest';
import { foodForecast } from '@/engine';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { applyOrder } from '@/engine/orders/apply';
import { GameState } from '@/types/GameState';
import { deepFreeze, emptyWarehouse, game, N1, N2, setIndustry, setTile, T } from './fixtures';

/** The meal resolveTurn actually serves this turn, with no further orders. */
function actualMeal(state: GameState, nationId: string) {
  const meal = resolveTurn(state, {}, state.seed).events.find(e => e.type === 'workers-fed' && e.nationId === nationId);
  return meal?.type === 'workers-fed' ? { fed: meal.fed, sick: meal.sick, starved: meal.starved } : { fed: 0, sick: 0, starved: 0 };
}

/** nation-1 with no food anywhere: an empty warehouse and no food tiles next to the capital. */
function noFood(state: GameState): GameState {
  let s = emptyWarehouse(state, N1);
  for (const tileId of [T.farm1, T.dryPlains1, T.homeOrchard1, T.range1]) s = setTile(s, tileId, { resource: undefined });
  return s;
}

const cases: { name: string; state: () => GameState; short: boolean }[] = [
  { name: 'the fixture at the start (food balanced)', state: () => game(), short: false },
  { name: 'no food at all: every worker starves', state: () => noFood(game()), short: true },
  { name: 'grain only: the fruit and meat eaters fall sick', state: () => emptyWarehouse(noFood(game()), N1, { grain: 20 }), short: true },
  { name: 'canned food covers the missing fruit and meat', state: () => emptyWarehouse(noFood(game()), N1, { grain: 20, cannedFood: 3 }), short: false },
  {
    name: 'thirty untrained workers outgrow the food',
    state: () => setIndustry(game(), N1, { workers: { untrained: 30, trained: 2, expert: 1 } }),
    short: true,
  },
  {
    name: "this turn's canned food order is counted",
    // 4 cans from 4 grain, 2 fruit, 2 livestock; the 4 grain left and the cans feed all seven.
    state: () => applyOrder(emptyWarehouse(noFood(game()), N1, { grain: 8, fruit: 2, livestock: 2 }), { kind: 'setProduction', nationId: N1, building: 'foodProcessing', amount: 4 }),
    short: false,
  },
];

describe('FR-049 food forecast', () => {
  it.each(cases)('FR-049 $name: the forecast equals the meal resolveTurn serves', ({ state, short }) => {
    const s = state();
    const forecast = foodForecast(s, N1);
    const meal = actualMeal(s, N1);

    expect({ fed: forecast.fed, sick: forecast.sick, starved: forecast.starved }).toEqual(meal);
    expect(forecast.mouths).toBe(meal.fed + meal.sick + meal.starved);
    expect(forecast.short).toBe(short);
  });

  it('FR-049 no food at all: all seven workers would starve', () => {
    expect(foodForecast(noFood(game()), N1)).toEqual({ mouths: 7, fed: 0, sick: 0, starved: 7, short: true });
  });

  it('FR-049 each nation gets its own forecast', () => {
    const s = noFood(game());
    expect(foodForecast(s, N1).short).toBe(true);
    expect(foodForecast(s, N2).short).toBe(false);
  });

  it('FR-049 an unknown nation has no mouths to feed', () => {
    expect(foodForecast(game(), 'nation-9')).toEqual({ mouths: 0, fed: 0, sick: 0, starved: 0, short: false });
  });

  it('FR-013 FR-049 the query never changes the state it reads', () => {
    const s = deepFreeze(noFood(game()));
    const snapshot = structuredClone(s);
    foodForecast(s, N1);
    expect(s).toEqual(snapshot);
  });
});
