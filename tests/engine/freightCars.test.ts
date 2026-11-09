// FR-101 (NR-016, decision Q9): a freight car ordered this turn is built at the end of the turn, as
// in FR-039, but carries goods only from the next turn. Real newGame(), nation 1, with its capacity
// cut to 2 cars so that the capacity, not the land, limits what is shipped.
import { describe, it, expect } from 'vitest';
import { foodForecast } from '@/engine';
import { newGame } from '@/engine/newGame';
import { applyOrder } from '@/engine/orders/apply';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { promoteFreightCars } from '@/engine/systems/turnHousekeeping';
import { createTurnContext } from '@/engine/turn/context';
import type { GameState } from '@/types/GameState';
import { deepFreeze, emptyWarehouse, nationOf, setWarehouse, stockOf } from './fixtures';

const N1 = 'nation-1';
const orderCars = (state: GameState, delta: number) => applyOrder(state, { kind: 'changeTransportCapacity', nationId: N1, delta });
const withCapacity = (state: GameState, transportCapacity: number): GameState => ({
  ...state,
  nations: state.nations.map(n => (n.id === N1 ? { ...n, transportCapacity } : n)),
});
/** The food and cotton nation 1 holds: what shipping adds and nothing in these runs takes but the meal. */
const shippedStock = (state: GameState) => ['grain', 'fruit', 'livestock', 'cotton'].reduce((sum, key) => sum + stockOf(state, N1, key), 0);
const turn = (state: GameState) => resolveTurn(state, {}, state.seed);

describe('FR-101 freight cars carry goods from the next turn', () => {
  const start = withCapacity(newGame({ seed: 1 }), 2);

  it('FR-101 cars ordered this turn are built at its end (event, lumber and steel paid) and are in service after it', () => {
    const ordered = orderCars(start, 3);
    expect(nationOf(ordered, N1)).toMatchObject({ transportCapacity: 2, transportCapacityPendingIncrease: 3 });
    expect([stockOf(ordered, N1, 'lumber'), stockOf(ordered, N1, 'steel')]).toEqual([7, 7]);

    const { state, events } = turn(ordered);

    expect(events).toContainEqual({ type: 'freight-cars-built', nationId: N1, count: 3 });
    expect(nationOf(state, N1)).toMatchObject({ transportCapacity: 5, transportCapacityPendingIncrease: 0 });
  });

  it('FR-101 this turn ships what the old 2 cars carry; the next turn ships with all 5', () => {
    const withCars = turn(orderCars(start, 3)).state;
    const without = turn(start).state;
    // This turn: the same goods reached the warehouse with or without the order.
    expect(shippedStock(withCars)).toBe(shippedStock(without));

    // Next turn: 3 more units shipped by the new cars (the meal is the same in both runs).
    expect(shippedStock(turn(withCars).state) - shippedStock(turn(without).state)).toBe(3);
  });

  it('FR-101 FR-049 the food forecast does not count this turn\'s cars, and matches the meal served', () => {
    // No food in the warehouse and no cars in service: only shipping could feed the workers.
    const hungry = setWarehouse(emptyWarehouse(withCapacity(start, 0), N1), N1, { lumber: 3, steel: 3 });
    const ordered = orderCars(hungry, 3);
    expect(nationOf(ordered, N1).transportCapacityPendingIncrease).toBe(3);

    const forecast = foodForecast(ordered, N1);
    const meal = turn(ordered).events.find(e => e.type === 'workers-fed' && e.nationId === N1);

    expect(forecast).toMatchObject({ mouths: 7, fed: 0, starved: 7, short: true });
    expect(meal).toEqual({ type: 'workers-fed', nationId: N1, fed: forecast.fed, sick: forecast.sick, starved: forecast.starved });
  });

  it('FR-101 the housekeeping step adds the built cars to the capacity and clears the count, without touching its input', () => {
    const built: GameState = deepFreeze({
      ...start,
      nations: start.nations.map(n => (n.id === N1 ? { ...n, transportCapacityPendingIncrease: 2 } : n)),
    });
    const after = promoteFreightCars(built, createTurnContext({ turn: built.turn }));
    expect(after.nations.map(n => [n.id, n.transportCapacity, n.transportCapacityPendingIncrease])).toEqual([
      [N1, 4, 0],
      ['nation-2', 15, 0],
    ]);
  });
});
