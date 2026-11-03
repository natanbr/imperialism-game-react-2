import { describe, it, expect } from 'vitest';
import { applyOrder } from '@/engine/orders/apply';
import { Order, RejectReason } from '@/engine/orders/Order';
import { validateOrder } from '@/engine/orders/validate';
import { labourOf } from '@/engine/industry/labour';
import { BUILDINGS, nextCapacity } from '@/definisions/industryBuildings';
import { RECIPES } from '@/definisions/ResourceConversions';
import { GameState } from '@/types/GameState';
import { BuildingType, ProductionOutput } from '@/types/Industry';
import {
  deepFreeze, emptyWarehouse, game, industryOf, N1, nationOf, setBuilding, setIndustry, setTreasury, stockOf, treasury,
} from './fixtures';

// The two-nation fixture: nation-1 has 4 untrained, 2 trained and 1 expert worker (12 labour),
// the six mills and factories built (mills 2, factories 1), no refinery, and $10,000.
const base = (patch: Record<string, number> = {}) => emptyWarehouse(game(), N1, patch);

const produce = (building: BuildingType, amount: number, output?: ProductionOutput): Order =>
  output ? { kind: 'setProduction', nationId: N1, building, output, amount } : { kind: 'setProduction', nationId: N1, building, amount };

/** Standing orders that use all 12 labour: lumber 2, steel 2, fabric 2 (2 labour each). */
const allLabourCommitted = (s: GameState) =>
  setBuilding(setBuilding(setBuilding(s, N1, 'lumberMill', { orders: { lumber: 2 } }), N1, 'steelMill', { orders: { steel: 2 } }), N1, 'textileMill', { orders: { fabric: 2 } });

interface Case {
  name: string;
  setup: () => GameState;
  order: Order;
  expected: 'ok' | RejectReason;
}

const cases: Case[] = [
  // FR-036 setProduction
  { name: 'FR-036 lumber 2 from 4 timber is ok', setup: () => base({ timber: 4 }), order: produce('lumberMill', 2), expected: 'ok' },
  { name: 'FR-036 paper 2 in the lumber mill is ok', setup: () => base({ timber: 4 }), order: produce('lumberMill', 2, 'paper' as ProductionOutput), expected: 'ok' },
  { name: 'FR-036 FR-034 fabric from 1 cotton and 1 wool is ok (any mix)', setup: () => base({ cotton: 1, wool: 1 }), order: produce('textileMill', 1), expected: 'ok' },
  { name: 'FR-036 FR-034 2 cans from 2 grain, 1 fruit and 1 fish is ok', setup: () => base({ grain: 2, fruit: 1, fish: 1 }), order: produce('foodProcessing', 2), expected: 'ok' },
  { name: 'FR-036 setting an order to 0 is ok', setup: () => base(), order: produce('steelMill', 0), expected: 'ok' },
  { name: 'FR-036 lowering a standing order is ok even when stock and labour are gone', setup: () => setIndustry(setBuilding(base(), N1, 'lumberMill', { orders: { lumber: 2 } }), N1, { sick: { untrained: 4, trained: 2, expert: 1 } }), order: produce('lumberMill', 1), expected: 'ok' },
  { name: 'FR-036 an unknown building', setup: () => base(), order: produce('mint' as BuildingType, 1), expected: 'invalid-target' },
  { name: 'FR-026 FR-036 an inherited name as building (toString)', setup: () => base(), order: produce('toString' as BuildingType, 1), expected: 'invalid-target' },
  { name: 'FR-036 an output the building does not make', setup: () => base({ timber: 4 }), order: produce('lumberMill', 1, 'steel' as ProductionOutput), expected: 'invalid-target' },
  { name: 'FR-026 FR-036 an inherited name as output (constructor)', setup: () => base({ timber: 4 }), order: produce('lumberMill', 1, 'constructor' as ProductionOutput), expected: 'invalid-target' },
  { name: 'FR-036 a building that is not built (refinery)', setup: () => base({ oil: 4 }), order: produce('refinery', 1), expected: 'invalid-target' },
  { name: 'FR-036 a negative amount', setup: () => base(), order: produce('lumberMill', -1), expected: 'invalid-amount' },
  { name: 'FR-036 a fractional amount', setup: () => base({ timber: 4 }), order: produce('lumberMill', 1.5), expected: 'invalid-amount' },
  { name: 'FR-036 a NaN amount', setup: () => base({ timber: 4 }), order: produce('lumberMill', Number.NaN), expected: 'invalid-amount' },
  { name: 'FR-034 FR-036 an odd number of cans', setup: () => base({ grain: 4, fruit: 2, fish: 2 }), order: produce('foodProcessing', 3), expected: 'invalid-amount' },
  { name: 'FR-036 more than the capacity', setup: () => base({ timber: 6 }), order: produce('lumberMill', 3), expected: 'limit-reached' },
  { name: 'FR-034 FR-036 lumber and paper share the capacity', setup: () => setBuilding(base({ timber: 8 }), N1, 'lumberMill', { orders: { paper: 2 } }), order: produce('lumberMill', 1), expected: 'limit-reached' },
  { name: 'FR-036 more timber than the warehouse holds', setup: () => base({ timber: 3 }), order: produce('lumberMill', 2), expected: 'insufficient-resources' },
  { name: 'FR-034 FR-036 steel needs as much iron as coal', setup: () => base({ coal: 2, ironOre: 1 }), order: produce('steelMill', 2), expected: 'insufficient-resources' },
  { name: 'FR-034 FR-036 canned food needs livestock or fish', setup: () => base({ grain: 2, fruit: 1 }), order: produce('foodProcessing', 2), expected: 'insufficient-resources' },
  { name: 'FR-035 FR-036 more labour than the nation has left', setup: () => allLabourCommitted(base({ lumber: 2 })), order: produce('furnitureFactory', 1), expected: 'insufficient-labour' },
  { name: 'FR-035 FR-036 sick workers give no labour', setup: () => setIndustry(base({ timber: 4 }), N1, { sick: { untrained: 4, trained: 2, expert: 1 } }), order: produce('lumberMill', 2), expected: 'insufficient-labour' },

  // FR-038 expandBuilding
  { name: 'FR-038 expanding the steel mill with lumber and steel is ok', setup: () => base({ lumber: 2, steel: 2 }), order: { kind: 'expandBuilding', nationId: N1, building: 'steelMill' }, expected: 'ok' },
  { name: 'FR-038 expanding without enough steel', setup: () => base({ lumber: 2, steel: 1 }), order: { kind: 'expandBuilding', nationId: N1, building: 'steelMill' }, expected: 'insufficient-resources' },
  { name: 'FR-038 food processing has no capacity to expand', setup: () => base({ lumber: 9, steel: 9 }), order: { kind: 'expandBuilding', nationId: N1, building: 'foodProcessing' }, expected: 'invalid-target' },
  { name: 'FR-038 the refinery before Oil Drilling', setup: () => base({ lumber: 9, steel: 9 }), order: { kind: 'expandBuilding', nationId: N1, building: 'refinery' }, expected: 'invalid-target' },
  { name: 'FR-038 building the refinery after Oil Drilling is ok', setup: () => ({ ...base({ lumber: 2, steel: 2 }), technologyState: { technologies: [], oilDrillingTechUnlocked: true } }), order: { kind: 'expandBuilding', nationId: N1, building: 'refinery' }, expected: 'ok' },
  { name: 'FR-026 FR-038 an inherited name as building (__proto__)', setup: () => base({ lumber: 9, steel: 9 }), order: { kind: 'expandBuilding', nationId: N1, building: '__proto__' as BuildingType }, expected: 'invalid-target' },

  // FR-057 expandBuilding with a delta: cancel this turn's steps, or order several at once
  { name: 'FR-057 cancelling this turn\'s expansion step is ok', setup: () => setBuilding(base(), N1, 'steelMill', { capacity: 2, pendingCapacity: 2 }), order: { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: -1 }, expected: 'ok' },
  { name: 'FR-057 cancelling with no expansion pending', setup: () => base(), order: { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: -1 }, expected: 'invalid-amount' },
  { name: 'FR-057 cancelling more steps than are pending', setup: () => setBuilding(base(), N1, 'steelMill', { capacity: 2, pendingCapacity: 2 }), order: { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: -2 }, expected: 'invalid-amount' },
  { name: 'FR-057 a zero delta', setup: () => base({ lumber: 9, steel: 9 }), order: { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: 0 }, expected: 'invalid-amount' },
  { name: 'FR-057 a fractional delta', setup: () => base({ lumber: 9, steel: 9 }), order: { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: 0.5 }, expected: 'invalid-amount' },
  { name: 'FR-057 two steps at once are all or nothing (2 -> 4 -> 8 costs 6 + 6)', setup: () => base({ lumber: 5, steel: 9 }), order: { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: 2 }, expected: 'insufficient-resources' },
  { name: 'FR-057 food processing has no expansion to cancel', setup: () => base(), order: { kind: 'expandBuilding', nationId: N1, building: 'foodProcessing', delta: -1 }, expected: 'invalid-target' },

  // FR-039 freight cars
  { name: 'FR-039 2 cars with 2 lumber, 2 steel and 4 free labour is ok', setup: () => base({ lumber: 2, steel: 2 }), order: { kind: 'changeTransportCapacity', nationId: N1, delta: 2 }, expected: 'ok' },
  { name: 'FR-039 cars need lumber and steel, not coal and iron', setup: () => base({ coal: 5, ironOre: 5, lumber: 1, steel: 5 }), order: { kind: 'changeTransportCapacity', nationId: N1, delta: 2 }, expected: 'insufficient-resources' },
  { name: 'FR-039 cars need 2 free labour each', setup: () => allLabourCommitted(base({ lumber: 2, steel: 2 })), order: { kind: 'changeTransportCapacity', nationId: N1, delta: 1 }, expected: 'insufficient-labour' },
  { name: 'FR-039 giving back part of this turn\'s cars is ok', setup: () => ({ ...base(), nations: base().nations.map(n => (n.id === N1 ? { ...n, transportCapacityPendingIncrease: 2 } : n)) }), order: { kind: 'changeTransportCapacity', nationId: N1, delta: -1 }, expected: 'ok' },

  // FR-041 trainWorkers
  { name: 'FR-041 training an untrained worker with $100 and 1 paper is ok', setup: () => base({ paper: 1 }), order: { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 }, expected: 'ok' },
  { name: 'FR-041 training a trained worker to expert with $1,000 and 2 paper is ok', setup: () => base({ paper: 2 }), order: { kind: 'trainWorkers', nationId: N1, from: 'trained', delta: 1 }, expected: 'ok' },
  { name: 'FR-041 experts cannot be trained', setup: () => base({ paper: 9 }), order: { kind: 'trainWorkers', nationId: N1, from: 'expert', delta: 1 }, expected: 'invalid-target' },
  { name: 'FR-041 more trainees than untrained workers', setup: () => base({ paper: 9 }), order: { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 5 }, expected: 'invalid-amount' },
  { name: 'FR-041 a sick worker cannot be trained', setup: () => setIndustry(base({ paper: 9 }), N1, { sick: { untrained: 4, trained: 0, expert: 0 } }), order: { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 }, expected: 'invalid-amount' },
  { name: 'FR-041 training without the cash', setup: () => setTreasury(base({ paper: 2 }), N1, 999), order: { kind: 'trainWorkers', nationId: N1, from: 'trained', delta: 1 }, expected: 'insufficient-funds' },
  { name: 'FR-041 training without paper', setup: () => base({ paper: 1 }), order: { kind: 'trainWorkers', nationId: N1, from: 'trained', delta: 1 }, expected: 'insufficient-resources' },
  { name: 'FR-041 a trainee whose labour is committed', setup: () => allLabourCommitted(base({ paper: 1 })), order: { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 }, expected: 'insufficient-labour' },
  { name: 'FR-041 a zero change', setup: () => base({ paper: 1 }), order: { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 0 }, expected: 'invalid-amount' },
  { name: 'FR-041 cancelling more trainees than ordered', setup: () => base(), order: { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: -1 }, expected: 'invalid-amount' },

  // FR-042 recruitWorkers
  { name: 'FR-042 a migrant for canned food, clothing and furniture is ok', setup: () => base({ cannedFood: 1, clothing: 1, furniture: 1 }), order: { kind: 'recruitWorkers', nationId: N1, delta: 1 }, expected: 'ok' },
  { name: 'FR-042 a migrant without furniture', setup: () => base({ cannedFood: 1, clothing: 1 }), order: { kind: 'recruitWorkers', nationId: N1, delta: 1 }, expected: 'insufficient-resources' },
  { name: 'FR-042 more migrants than the cap (2 provinces: 1 a turn)', setup: () => base({ cannedFood: 2, clothing: 2, furniture: 2 }), order: { kind: 'recruitWorkers', nationId: N1, delta: 2 }, expected: 'limit-reached' },
  { name: 'FR-042 8 provinces allow 2 migrants a turn', setup: () => ({ ...base({ cannedFood: 2, clothing: 2, furniture: 2 }), nations: base({ cannedFood: 2, clothing: 2, furniture: 2 }).nations.map(n => (n.id === N1 ? { ...n, provinces: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] } : n)) }), order: { kind: 'recruitWorkers', nationId: N1, delta: 2 }, expected: 'ok' },
  { name: 'FR-042 a fractional number of migrants', setup: () => base({ cannedFood: 2, clothing: 2, furniture: 2 }), order: { kind: 'recruitWorkers', nationId: N1, delta: 0.5 }, expected: 'invalid-amount' },
];

describe('industry orders: validation', () => {
  it.each(cases.map(c => [c.name, c] as const))('%s', (_name, c) => {
    const state = deepFreeze(c.setup());
    const snapshot = structuredClone(state);

    expect(validateOrder(state, c.order)).toEqual(c.expected === 'ok' ? { ok: true } : { ok: false, reason: c.expected });
    expect(state).toEqual(snapshot);
  });
});

/** Applies to a deep-frozen copy and checks the input stayed unchanged (FR-013). */
function run(state: GameState, order: Order): GameState {
  const frozen = deepFreeze(structuredClone(state));
  const snapshot = structuredClone(frozen);
  const next = applyOrder(frozen, order);
  expect(frozen).toEqual(snapshot);
  expect(next).not.toBe(frozen);
  return next;
}

describe('FR-033 FR-034 buildings and recipes', () => {
  it('FR-033 the fixture nation has the six mills and factories at their start sizes, no refinery, and food processing', () => {
    const b = industryOf(game(), N1).buildings;
    const capacities = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v!.capacity]));
    expect(capacities).toEqual({
      textileMill: 2, lumberMill: 2, steelMill: 2, clothingFactory: 1, furnitureFactory: 1, metalWorks: 1, refinery: 0, foodProcessing: 0,
    });
    expect(BUILDINGS.foodProcessing.unlimited).toBe(true);
    expect(BUILDINGS.foodProcessing.keepsOrders).toBe(false);
    expect(BUILDINGS.lumberMill.keepsOrders).toBe(true);
  });

  it('FR-034 recipes per output from the rules', () => {
    const simple = (output: ProductionOutput) => {
      const r = RECIPES[output];
      return { building: r.building, batch: r.batch, labour: r.labour, inputs: r.inputs.map(i => [[...i.types].sort().join('|'), i.amount]) };
    };
    expect(simple('fabric' as ProductionOutput)).toEqual({ building: 'textileMill', batch: 1, labour: 2, inputs: [['cotton|wool', 2]] });
    expect(simple('clothing' as ProductionOutput)).toEqual({ building: 'clothingFactory', batch: 1, labour: 2, inputs: [['fabric', 2]] });
    expect(simple('lumber' as ProductionOutput)).toEqual({ building: 'lumberMill', batch: 1, labour: 2, inputs: [['timber', 2]] });
    expect(simple('paper' as ProductionOutput)).toEqual({ building: 'lumberMill', batch: 1, labour: 2, inputs: [['timber', 2]] });
    expect(simple('furniture' as ProductionOutput)).toEqual({ building: 'furnitureFactory', batch: 1, labour: 2, inputs: [['lumber', 2]] });
    expect(simple('steel' as ProductionOutput)).toEqual({ building: 'steelMill', batch: 1, labour: 2, inputs: [['coal', 1], ['ironOre', 1]] });
    expect(simple('hardware' as ProductionOutput)).toEqual({ building: 'metalWorks', batch: 1, labour: 2, inputs: [['steel', 2]] });
    expect(simple('armaments' as ProductionOutput)).toEqual({ building: 'metalWorks', batch: 1, labour: 2, inputs: [['steel', 2]] });
    expect(simple('fuel' as ProductionOutput)).toEqual({ building: 'refinery', batch: 1, labour: 2, inputs: [['oil', 2]] });
    expect(simple('cannedFood' as ProductionOutput)).toEqual({ building: 'foodProcessing', batch: 2, labour: 2, inputs: [['grain', 2], ['fruit', 1], ['fish|livestock', 1]] });
  });

  it('FR-038 capacity steps: mills 0, 2, 4, 8, 16, 24, then +8; factories 0, 1, 2, 4, 8, 12, then +4', () => {
    const climb = (kind: 'mill' | 'factory', steps: number) => {
      const seen = [0];
      for (let i = 0; i < steps; i++) seen.push(nextCapacity(kind, seen.at(-1)!));
      return seen;
    };
    expect(climb('mill', 7)).toEqual([0, 2, 4, 8, 16, 24, 32, 40]);
    expect(climb('factory', 7)).toEqual([0, 1, 2, 4, 8, 12, 16, 20]);
  });
});

describe('FR-035 labour', () => {
  it('FR-035 labour is untrained x1 + trained x2 + expert x4, less sick workers and trainees, and orders commit it', () => {
    expect(labourOf(nationOf(game(), N1))).toEqual({ total: 12, committed: 0, free: 12 });

    let s = setIndustry(game(), N1, { sick: { untrained: 0, trained: 1, expert: 0 }, training: { untrained: 1, trained: 0, expert: 0 } });
    s = setBuilding(s, N1, 'lumberMill', { orders: { lumber: 2 } });
    s = setBuilding(s, N1, 'foodProcessing', { orders: { cannedFood: 2 } });
    s = { ...s, nations: s.nations.map(n => (n.id === N1 ? { ...n, transportCapacityPendingIncrease: 1 } : n)) };

    expect(labourOf(nationOf(s, N1))).toEqual({ total: 9, committed: 4 + 2 + 2, free: 1 });
  });
});

describe('industry orders: immediate effects', () => {
  it('FR-036 setProduction records the standing order and changes nothing else', () => {
    const before = base({ timber: 4 });

    const s = run(before, produce('lumberMill', 2, 'paper' as ProductionOutput));

    expect(industryOf(s, N1).buildings.lumberMill!.orders).toEqual({ paper: 2 });
    expect(nationOf(s, N1).warehouse).toEqual(nationOf(before, N1).warehouse);
    expect(treasury(s, N1)).toBe(treasury(before, N1));
    expect(labourOf(nationOf(s, N1)).committed).toBe(4);
  });

  it('FR-038 expandBuilding takes 1 lumber + 1 steel per point now and queues the capacity for next turn', () => {
    let s = run(base({ lumber: 6, steel: 6 }), { kind: 'expandBuilding', nationId: N1, building: 'steelMill' });
    expect(industryOf(s, N1).buildings.steelMill).toMatchObject({ capacity: 2, pendingCapacity: 2 });
    expect([stockOf(s, N1, 'lumber'), stockOf(s, N1, 'steel')]).toEqual([4, 4]);

    // A second expansion in the same turn goes on from the queued size: 4 -> 8 costs 4 + 4.
    s = run(s, { kind: 'expandBuilding', nationId: N1, building: 'steelMill' });
    expect(industryOf(s, N1).buildings.steelMill).toMatchObject({ capacity: 2, pendingCapacity: 6 });
    expect([stockOf(s, N1, 'lumber'), stockOf(s, N1, 'steel')]).toEqual([0, 0]);
  });

  it('FR-057 cancelling refunds exactly the last step\'s cost; cancel and re-order nets zero', () => {
    const before = base({ lumber: 6, steel: 6 });
    const expand: Order = { kind: 'expandBuilding', nationId: N1, building: 'steelMill' };
    const cancel: Order = { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: -1 };

    // One step and its cancel: the game is as it was.
    expect(run(run(before, expand), cancel)).toEqual(before);

    // 2 -> 4 (2 points) then 4 -> 8 (4 points); cancelling refunds the 4 of the last step.
    let s = run(run(before, expand), expand);
    s = run(s, cancel);
    expect(industryOf(s, N1).buildings.steelMill).toMatchObject({ capacity: 2, pendingCapacity: 2 });
    expect([stockOf(s, N1, 'lumber'), stockOf(s, N1, 'steel')]).toEqual([4, 4]);

    // Re-ordering costs the same 4 again and lands where the two steps did.
    s = run(s, expand);
    expect(industryOf(s, N1).buildings.steelMill).toMatchObject({ capacity: 2, pendingCapacity: 6 });
    expect([stockOf(s, N1, 'lumber'), stockOf(s, N1, 'steel')]).toEqual([0, 0]);

    // Cancelling both steps at once gives everything back.
    expect(run(s, { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: -2 })).toEqual(before);
  });

  it('FR-057 a positive delta orders that many steps at once, as the same steps one by one', () => {
    const before = base({ lumber: 6, steel: 6 });
    const expand: Order = { kind: 'expandBuilding', nationId: N1, building: 'steelMill' };
    expect(run(before, { kind: 'expandBuilding', nationId: N1, building: 'steelMill', delta: 2 })).toEqual(run(run(before, expand), expand));
  });

  it('FR-038 a factory grows 1 -> 2 for 1 lumber + 1 steel', () => {
    const s = run(base({ lumber: 1, steel: 1 }), { kind: 'expandBuilding', nationId: N1, building: 'clothingFactory' });
    expect(industryOf(s, N1).buildings.clothingFactory).toMatchObject({ capacity: 1, pendingCapacity: 1 });
    expect([stockOf(s, N1, 'lumber'), stockOf(s, N1, 'steel')]).toEqual([0, 0]);
  });

  it('FR-039 cars take 1 lumber + 1 steel each now, commit 2 labour each, and a negative delta refunds', () => {
    let s = run(base({ lumber: 3, steel: 3 }), { kind: 'changeTransportCapacity', nationId: N1, delta: 2 });
    expect(nationOf(s, N1).transportCapacityPendingIncrease).toBe(2);
    expect([stockOf(s, N1, 'lumber'), stockOf(s, N1, 'steel')]).toEqual([1, 1]);
    expect(labourOf(nationOf(s, N1)).committed).toBe(4);

    s = run(s, { kind: 'changeTransportCapacity', nationId: N1, delta: -1 });
    expect(nationOf(s, N1).transportCapacityPendingIncrease).toBe(1);
    expect([stockOf(s, N1, 'lumber'), stockOf(s, N1, 'steel')]).toEqual([2, 2]);
  });

  it('FR-041 training charges cash and paper now, takes the trainee out of the labour pool, and a negative delta refunds', () => {
    const before = base({ paper: 3 });
    let s = run(before, { kind: 'trainWorkers', nationId: N1, from: 'untrained', delta: 1 });
    s = run(s, { kind: 'trainWorkers', nationId: N1, from: 'trained', delta: 1 });

    expect(industryOf(s, N1).training).toEqual({ untrained: 1, trained: 1, expert: 0 });
    expect(treasury(s, N1)).toBe(treasury(before, N1) - 100 - 1000);
    expect(stockOf(s, N1, 'paper')).toBe(0);
    expect(labourOf(nationOf(s, N1)).total).toBe(12 - 1 - 2);

    s = run(s, { kind: 'trainWorkers', nationId: N1, from: 'trained', delta: -1 });
    expect(industryOf(s, N1).training).toEqual({ untrained: 1, trained: 0, expert: 0 });
    expect(treasury(s, N1)).toBe(treasury(before, N1) - 100);
    expect(stockOf(s, N1, 'paper')).toBe(2);
  });

  it('FR-042 a migrant costs canned food, clothing and furniture, no cash, and a negative delta gives them back', () => {
    const before = base({ cannedFood: 1, clothing: 1, furniture: 1 });
    let s = run(before, { kind: 'recruitWorkers', nationId: N1, delta: 1 });

    expect(industryOf(s, N1).recruits).toBe(1);
    expect(['cannedFood', 'clothing', 'furniture'].map(k => stockOf(s, N1, k))).toEqual([0, 0, 0]);
    expect(treasury(s, N1)).toBe(treasury(before, N1));
    expect(industryOf(s, N1).workers).toEqual(industryOf(before, N1).workers);

    s = run(s, { kind: 'recruitWorkers', nationId: N1, delta: -1 });
    expect(industryOf(s, N1).recruits).toBe(0);
    expect(['cannedFood', 'clothing', 'furniture'].map(k => stockOf(s, N1, k))).toEqual([1, 1, 1]);
  });
});
