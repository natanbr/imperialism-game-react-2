import { describe, it, expect } from 'vitest';
import { productionSystem } from '@/engine/systems/productionSystem';
import { createTurnContext, GameEvent } from '@/engine/turn/context';
import { GameState } from '@/types/GameState';
import { BuildingType, IndustryBuilding } from '@/types/Industry';
import {
  deepFreeze, economyViolations, emptyWarehouse, game, industryOf, N1, nationOf, setBuilding, setIndustry, stockOf,
} from '../fixtures';

// nation-1 of the two-nation fixture: 4 untrained, 2 trained, 1 expert (12 labour), mills at 2,
// factories at 1. Each test starts from an empty warehouse.

function produce(state: GameState): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const frozen = deepFreeze(structuredClone(state));
  const snapshot = structuredClone(frozen);
  const next = productionSystem(frozen, createTurnContext({ turn: frozen.turn, seed: 1, emit: e => events.push(e) }));
  expect(frozen).toEqual(snapshot); // FR-013: the system never mutates its input
  expect(economyViolations(nationOf(next, N1))).toEqual([]);
  return { state: next, events };
}

const orders = (state: GameState, building: BuildingType, patch: IndustryBuilding['orders']) =>
  setBuilding(state, N1, building, { orders: patch });

const stocks = (state: GameState, keys: string[]) => Object.fromEntries(keys.map(k => [k, stockOf(state, N1, k)]));
const produced = (events: GameEvent[]) =>
  events.filter(e => e.type === 'goods-produced' && e.nationId === N1).map(e => (e.type === 'goods-produced' ? [e.output, e.amount] : []));

describe('FR-037 production phase', () => {
  it('FR-034 FR-037 a mill turns 2 timber + 2 labour into 1 lumber and reports it', () => {
    const start = orders(emptyWarehouse(game(), N1, { timber: 4 }), 'lumberMill', { lumber: 2 });

    const { state, events } = produce(start);

    expect(stocks(state, ['timber', 'lumber'])).toEqual({ timber: 0, lumber: 2 });
    expect(produced(events)).toEqual([['lumber', 2]]);
  });

  it('FR-034 FR-037 steel takes 1 coal + 1 iron ore per unit', () => {
    const { state } = produce(orders(emptyWarehouse(game(), N1, { coal: 3, ironOre: 3 }), 'steelMill', { steel: 2 }));
    expect(stocks(state, ['coal', 'ironOre', 'steel'])).toEqual({ coal: 1, ironOre: 1, steel: 2 });
  });

  it('FR-034 FR-037 2 cans take 2 grain, 1 fruit and 1 livestock-or-fish, the larger stock first', () => {
    const { state, events } = produce(orders(emptyWarehouse(game(), N1, { grain: 4, fruit: 2, livestock: 1, fish: 3 }), 'foodProcessing', { cannedFood: 4 }));
    expect(stocks(state, ['grain', 'fruit', 'livestock', 'fish', 'cannedFood'])).toEqual({ grain: 0, fruit: 0, livestock: 1, fish: 1, cannedFood: 4 });
    expect(produced(events)).toEqual([['cannedFood', 4]]);
  });

  it('FR-034 FR-037 cotton and wool mix in the textile mill', () => {
    const { state } = produce(orders(emptyWarehouse(game(), N1, { cotton: 1, wool: 3 }), 'textileMill', { fabric: 2 }));
    expect(stocks(state, ['cotton', 'wool', 'fabric'])).toEqual({ cotton: 0, wool: 0, fabric: 2 });
  });

  it('FR-034 FR-037 the lumber mill makes lumber and paper within one shared capacity', () => {
    const { state } = produce(orders(emptyWarehouse(game(), N1, { timber: 8 }), 'lumberMill', { lumber: 1, paper: 1 }));
    expect(stocks(state, ['timber', 'lumber', 'paper'])).toEqual({ timber: 4, lumber: 1, paper: 1 });
  });

  it('FR-037 output is limited by the inputs in the warehouse; the order stays', () => {
    const { state } = produce(orders(emptyWarehouse(game(), N1, { timber: 3 }), 'lumberMill', { lumber: 2 }));
    expect(stocks(state, ['timber', 'lumber'])).toEqual({ timber: 1, lumber: 1 });
    expect(industryOf(state, N1).buildings.lumberMill!.orders).toEqual({ lumber: 2 });
  });

  it('FR-037 output is limited by the capacity, even for a standing order above it', () => {
    const { state } = produce(orders(emptyWarehouse(game(), N1, { steel: 10 }), 'metalWorks', { hardware: 3 }));
    expect(stocks(state, ['steel', 'hardware'])).toEqual({ steel: 8, hardware: 1 });
  });

  it('FR-035 FR-037 output is limited by labour: sick workers give none, buildings run in a fixed order', () => {
    // Only the expert is healthy: 4 labour for the steel mill (first) and the lumber mill.
    let start = emptyWarehouse(game(), N1, { coal: 2, ironOre: 2, timber: 4 });
    start = orders(orders(start, 'steelMill', { steel: 2 }), 'lumberMill', { lumber: 2 });
    start = setIndustry(start, N1, { sick: { untrained: 4, trained: 2, expert: 0 } });

    const { state } = produce(start);

    expect(stocks(state, ['steel', 'lumber', 'timber'])).toEqual({ steel: 2, lumber: 0, timber: 4 });
  });

  it('FR-037 a product made this turn is not an input this turn', () => {
    const start = orders(orders(emptyWarehouse(game(), N1, { timber: 4 }), 'lumberMill', { lumber: 2 }), 'furnitureFactory', { furniture: 1 });

    const { state } = produce(start);

    expect(stocks(state, ['lumber', 'furniture'])).toEqual({ lumber: 2, furniture: 0 });
  });

  it('FR-033 FR-037 food processing orders are cleared after production; mill orders are kept', () => {
    let start = emptyWarehouse(game(), N1, { grain: 2, fruit: 1, fish: 1, timber: 2 });
    start = orders(orders(start, 'foodProcessing', { cannedFood: 2 }), 'lumberMill', { lumber: 1 });

    const { state } = produce(start);

    expect(industryOf(state, N1).buildings.foodProcessing!.orders).toEqual({});
    expect(industryOf(state, N1).buildings.lumberMill!.orders).toEqual({ lumber: 1 });
  });

  it('FR-038 an expansion counts from next turn: this turn uses the old capacity, then it grows', () => {
    let start = emptyWarehouse(game(), N1, { timber: 8 });
    start = setBuilding(start, N1, 'lumberMill', { capacity: 2, pendingCapacity: 2, orders: { lumber: 4 } });

    const { state, events } = produce(start);

    expect(stockOf(state, N1, 'lumber')).toBe(2);
    expect(industryOf(state, N1).buildings.lumberMill).toMatchObject({ capacity: 4, pendingCapacity: 0 });
    expect(events).toContainEqual({ type: 'building-expanded', nationId: N1, building: 'lumberMill', capacity: 4 });
  });

  // FR-101 (NR-016) replaced "add to the transport capacity" here: the built cars wait in the
  // pending count, and the turn housekeeping puts them in service after every phase.
  it('FR-039 FR-101 ordered cars are built first, with 2 labour each, and wait in the pending count, not yet in service', () => {
    let start = emptyWarehouse(game(), N1, { timber: 2 });
    start = orders(start, 'lumberMill', { lumber: 1 });
    start = { ...start, nations: start.nations.map(n => (n.id === N1 ? { ...n, transportCapacityPendingIncrease: 2 } : n)) };
    // 6 labour: 4 for the cars, 2 for the lumber.
    start = setIndustry(start, N1, { sick: { untrained: 4, trained: 1, expert: 0 } });

    const { state, events } = produce(start);

    expect(nationOf(state, N1)).toMatchObject({ transportCapacity: 10, transportCapacityPendingIncrease: 2 });
    expect(stockOf(state, N1, 'lumber')).toBe(1);
    expect(events).toContainEqual({ type: 'freight-cars-built', nationId: N1, count: 2 });
  });

  it('FR-039 FR-101 a car the labour no longer covers is not built and its lumber and steel come back', () => {
    let start = emptyWarehouse(game(), N1);
    start = { ...start, nations: start.nations.map(n => (n.id === N1 ? { ...n, transportCapacityPendingIncrease: 3 } : n)) };
    start = setIndustry(start, N1, { sick: { untrained: 4, trained: 2, expert: 0 } }); // 4 labour: 2 cars

    const { state } = produce(start);

    expect(nationOf(state, N1)).toMatchObject({ transportCapacity: 10, transportCapacityPendingIncrease: 2 });
    expect(stocks(state, ['lumber', 'steel'])).toEqual({ lumber: 1, steel: 1 });
  });

  it('FR-041 trainees give no labour this turn and are promoted after production', () => {
    let start = emptyWarehouse(game(), N1, { timber: 8 });
    start = orders(start, 'lumberMill', { lumber: 2 });
    // 2 trained in training to expert, the expert and the untrained sick: 0 labour left.
    start = setIndustry(start, N1, {
      training: { untrained: 0, trained: 2, expert: 0 },
      sick: { untrained: 4, trained: 0, expert: 1 },
    });

    const { state, events } = produce(start);

    expect(stockOf(state, N1, 'lumber')).toBe(0);
    expect(industryOf(state, N1).workers).toEqual({ untrained: 4, trained: 0, expert: 3 });
    expect(industryOf(state, N1).training).toEqual({ untrained: 0, trained: 0, expert: 0 });
    expect(events).toContainEqual({ type: 'workers-trained', nationId: N1, to: 'expert', count: 2 });
  });

  it('FR-037 a nation with no orders produces nothing and reports nothing', () => {
    const start = emptyWarehouse(game(), N1, { timber: 8, coal: 4, ironOre: 4 });
    const { state, events } = produce(start);
    expect(nationOf(state, N1).warehouse).toEqual(nationOf(start, N1).warehouse);
    expect(events.filter(e => 'nationId' in e && e.nationId === N1)).toEqual([]);
  });
});
