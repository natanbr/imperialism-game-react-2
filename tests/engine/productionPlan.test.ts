// M4.1 (NR-020): what a standing order really makes. FR-116 one production plan for the phase and
// the forecast, FR-117 committed labour is what the plan uses, FR-118 raising an order needs the plan
// to make all of it, FR-120 the play-test bug from the real newGame().
import { describe, it, expect } from 'vitest';
import { planProduction, labourOf } from '@/engine/industry/productionPlan';
import { productionSystem } from '@/engine/systems/productionSystem';
import { createTurnContext, type GameEvent } from '@/engine/turn/context';
import { validateOrder } from '@/engine/orders/validate';
import { applyOrder, tryApplyOrder } from '@/engine/orders/apply';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import type { BuildingType, ProductionOutput } from '@/types/Industry';
import { emptyWarehouse, game, industryOf, N1, nationOf, setBuilding, setIndustry, stockOf } from './fixtures';

const produce = (building: BuildingType, output: ProductionOutput, amount: number): Order => ({ kind: 'setProduction', nationId: N1, building, output, amount });
const reasonOf = (s: GameState, order: Order) => {
  const r = validateOrder(s, order);
  return r.ok ? 'ok' : r.reason;
};

/** What the production phase really made for nation 1, from its events. */
function phaseMade(s: GameState): Record<string, number> {
  const events: GameEvent[] = [];
  productionSystem(s, createTurnContext({ turn: s.turn, emit: e => events.push(e) }));
  const made: Record<string, number> = {};
  for (const e of events) if (e.type === 'goods-produced' && e.nationId === N1) made[e.output] = (made[e.output] ?? 0) + e.amount;
  return made;
}

describe('FR-116 one production plan', () => {
  const cases: [string, GameState][] = [
    ['everything in stock', setBuilding(setBuilding(emptyWarehouse(game(), N1, { timber: 10, coal: 5, ironOre: 5 }), N1, 'lumberMill', { orders: { lumber: 2 } }), N1, 'steelMill', { orders: { steel: 2 } })],
    ['timber for one lumber of two', setBuilding(emptyWarehouse(game(), N1, { timber: 3 }), N1, 'lumberMill', { orders: { lumber: 2 } })],
    ['no inputs at all', setBuilding(setBuilding(emptyWarehouse(game(), N1), N1, 'lumberMill', { orders: { lumber: 2 } }), N1, 'steelMill', { orders: { steel: 2 } })],
    ['labour for part of the orders', setIndustry(setBuilding(setBuilding(emptyWarehouse(game(), N1, { timber: 10, coal: 5, ironOre: 5 }), N1, 'lumberMill', { orders: { lumber: 2 } }), N1, 'steelMill', { orders: { steel: 2 } }), N1, { sick: { untrained: 4, trained: 1, expert: 1 } })],
  ];

  it.each(cases)('FR-116 the plan makes exactly what the production phase makes: %s', (_name, s) => {
    expect(planProduction(nationOf(s, N1)).made).toEqual(phaseMade(s));
  });

  it('FR-116 a standing order whose inputs run short makes as much as they allow and stays the standing order', () => {
    const s = cases[1][1];
    expect(planProduction(nationOf(s, N1)).made).toEqual({ lumber: 1 });
    const after = resolveTurn(s, {}, 1).state;
    expect(stockOf(after, N1, 'lumber')).toBe(1);
    expect(industryOf(after, N1).buildings.lumberMill!.orders).toEqual({ lumber: 2 });
  });
});

describe('FR-117 committed labour is what the plan uses', () => {
  it('FR-117 an order without inputs commits no labour; one with inputs for half of it commits half', () => {
    const none = setBuilding(emptyWarehouse(game(), N1), N1, 'lumberMill', { orders: { lumber: 2 } });
    expect(labourOf(nationOf(none, N1))).toEqual({ total: 12, committed: 0, free: 12 });
    const half = setBuilding(emptyWarehouse(game(), N1, { timber: 2 }), N1, 'lumberMill', { orders: { lumber: 2 } });
    expect(labourOf(nationOf(half, N1))).toEqual({ total: 12, committed: 2, free: 10 });
  });

  it('FR-117 orders that cannot run block no other order', () => {
    // Lumber 2, steel 2 and fabric 2 would take all 12 labour, but there is no timber, coal, iron or cotton
    let s = emptyWarehouse(game(), N1, { grain: 2, fruit: 1, livestock: 1 });
    s = setBuilding(setBuilding(setBuilding(s, N1, 'lumberMill', { orders: { lumber: 2 } }), N1, 'steelMill', { orders: { steel: 2 } }), N1, 'textileMill', { orders: { fabric: 2 } });
    expect(reasonOf(s, produce('foodProcessing', 'cannedFood' as ProductionOutput, 2))).toBe('ok');
    expect(reasonOf(s, { kind: 'changeTransportCapacity', nationId: N1, delta: 1 })).toBe('insufficient-resources'); // no lumber or steel, not labour
  });
});

describe('FR-118 raising an order needs the plan to make all of it', () => {
  it('FR-118 lumber and paper share the timber: paper is refused when the lumber order already takes it', () => {
    const s = setBuilding(emptyWarehouse(game(), N1, { timber: 4 }), N1, 'lumberMill', { capacity: 4, orders: { lumber: 2 } });
    expect(reasonOf(s, produce('lumberMill', 'paper' as ProductionOutput, 1))).toBe('insufficient-resources');
    const more = setBuilding(emptyWarehouse(game(), N1, { timber: 6 }), N1, 'lumberMill', { capacity: 4, orders: { lumber: 2 } });
    expect(reasonOf(more, produce('lumberMill', 'paper' as ProductionOutput, 1))).toBe('ok');
  });

  it('FR-118 an order that would starve a later building of labour is refused for labour', () => {
    // 12 labour: steel 2 + lumber 2 use 8; clothing 1 uses 2; fabric 2 (4 labour) runs before clothing
    let s = emptyWarehouse(game(), N1, { timber: 4, coal: 2, ironOre: 2, cotton: 4, fabric: 2 });
    s = setBuilding(setBuilding(setBuilding(s, N1, 'lumberMill', { orders: { lumber: 2 } }), N1, 'steelMill', { orders: { steel: 2 } }), N1, 'clothingFactory', { orders: { clothing: 1 } });
    expect(reasonOf(s, produce('textileMill', 'fabric' as ProductionOutput, 2))).toBe('insufficient-labour');
    expect(reasonOf(s, produce('textileMill', 'fabric' as ProductionOutput, 1))).toBe('ok');
  });

  it('FR-118 a partly made order cannot be raised past its stock; lowering is always accepted', () => {
    const s = setBuilding(emptyWarehouse(game(), N1, { timber: 2 }), N1, 'lumberMill', { orders: { lumber: 2 } });
    expect(reasonOf(s, produce('lumberMill', 'lumber' as ProductionOutput, 2))).toBe('ok'); // unchanged
    expect(reasonOf(s, produce('lumberMill', 'lumber' as ProductionOutput, 1))).toBe('ok');
    expect(reasonOf(applyOrder(s, produce('lumberMill', 'lumber' as ProductionOutput, 0)), produce('lumberMill', 'lumber' as ProductionOutput, 2))).toBe('insufficient-resources');
  });
});

describe('FR-120 the play-test bug, from the real newGame()', () => {
  /** Lumber 2, steel 2, fabric 2 ordered on turn 1, then 6 turns with no other order: turn 7. */
  function turnSeven(): GameState {
    let s = newGame({ seed: 1 });
    for (const order of [produce('lumberMill', 'lumber' as ProductionOutput, 2), produce('steelMill', 'steel' as ProductionOutput, 2), produce('textileMill', 'fabric' as ProductionOutput, 2)]) {
      const r = tryApplyOrder(s, order);
      expect(r.result).toEqual({ ok: true });
      s = r.state;
    }
    for (let t = 0; t < 6; t++) s = resolveTurn(s, {}, s.seed).state;
    return s;
  }

  it('FR-120 on turn 7 the timber, coal and iron are gone: lumber and steel plan 0, labour commits only fabric\'s 4', () => {
    const s = turnSeven();
    expect(s.turn).toBe(7);
    expect([stockOf(s, N1, 'timber'), stockOf(s, N1, 'coal'), stockOf(s, N1, 'ironOre')]).toEqual([0, 0, 0]);
    // The standing orders are still there (rules 05: saved between turns)...
    expect(industryOf(s, N1).buildings.lumberMill!.orders.lumber).toBe(2);
    expect(industryOf(s, N1).buildings.steelMill!.orders.steel).toBe(2);
    // ...but they make nothing and hold no labour
    const plan = planProduction(nationOf(s, N1));
    expect(plan.made).toEqual({ fabric: 2 });
    expect(labourOf(nationOf(s, N1))).toEqual({ total: 12, committed: 4, free: 8 });
  });

  it('FR-120 on turn 7 canned food can be ordered, steel cannot be re-added without coal and iron, and fabric can be removed and added back', () => {
    const s = turnSeven();
    expect(reasonOf(s, produce('foodProcessing', 'cannedFood' as ProductionOutput, 2))).toBe('ok');
    const noSteel = applyOrder(s, produce('steelMill', 'steel' as ProductionOutput, 0));
    expect(reasonOf(noSteel, produce('steelMill', 'steel' as ProductionOutput, 1))).toBe('insufficient-resources');
    const noFabric = applyOrder(s, produce('textileMill', 'fabric' as ProductionOutput, 0));
    expect(industryOf(noFabric, N1).buildings.textileMill!.orders.fabric).toBe(0);
    expect(reasonOf(noFabric, produce('textileMill', 'fabric' as ProductionOutput, 2))).toBe('ok');
  });
});
