// M13 lane B (T-07): the scripted Great Power keeps and staffs its workforce with migrants (FR-042's `recruitWorkers`:
// 1 canned food + 1 clothing + 1 furniture each), on a world with provinces only (FR-498, card Q116 (b)).
// FR-485: WHEN it has fewer healthy workers than a new game's 7 THEN its economy orders 1 migrant a turn, planned before
// its offers, while those goods are in the warehouse and at least 3 turns follow; its run makes the next one's clothing
// and furniture meanwhile. FR-486: WHEN its planned run leaves at least 4 capacity points idle for want of labour and
// FR-485 orders none THEN it orders 1 migrant from the goods the minors it may trade with cannot take this turn.
import { describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { idleForWantOfLabour, migrantsWanted, MIGRANT_IDLE_CAPACITY, MIGRANT_MIN_TURNS } from '@/engine/ai/economy';
import { partnerDemand } from '@/engine/ai/scriptedPartners';
import { START_WORKERS } from '@/engine/industry/industryState';
import { noWorkers } from '@/engine/industry/labour';
import type { Order } from '@/engine/orders/Order';
import type { Workers } from '@/types/Industry';
import type { GameState } from '@/types/GameState';
import { GoodsType, MaterialType } from '@/types/Resource';
import { N2, emptyWarehouse, setBuilding, setIndustry, setPair, setWarehouse } from './fixtures';

const continent = (): GameState => newGame({ seed: 1, world: 'continent' });
const twoIslands = (): GameState => newGame({ seed: 1 });

/** Test setup: Valdoria's workforce, none sick, in training or recruited this turn unless given. */
const withWorkers = (s: GameState, workers: Workers, patch: { sick?: Workers; training?: Workers } = {}): GameState =>
  setIndustry(s, N2, { workers, sick: patch.sick ?? noWorkers(), training: patch.training ?? noWorkers(), recruits: 0 });
/** 5 healthy workers: 2 short of a new game's 7 (the regiments took them). */
const FIVE: Workers = { untrained: 0, trained: 1, expert: 4 };
const SEVEN: Workers = { ...START_WORKERS };
/** One migrant's goods (MIGRANT_COST), with a meal's cans to spare. */
const MIGRANT_GOODS = { [MaterialType.CannedFood]: 10, [GoodsType.Clothing]: 1, [GoodsType.Furniture]: 1 };

const migrants = (orders: Order[]) => orders.filter(o => o.kind === 'recruitWorkers');
const atTurn = (s: GameState, turn: number): GameState => ({ ...s, turn });
const made = (orders: Order[], output: string): number =>
  Math.max(0, ...orders.flatMap(o => (o.kind === 'setProduction' && o.output === output ? [o.amount] : [])));

describe('FR-485 migrants replace the workers it lost', () => {
  it('FR-485 the start workforce it counts from is a new game\'s: 7 workers (4 untrained, 2 trained, 1 expert)', () => {
    expect(SEVEN).toEqual({ untrained: 4, trained: 2, expert: 1 });
    expect(migrantsWanted(continent(), N2)).toBe(0);
    expect(migrantsWanted(withWorkers(continent(), FIVE), N2)).toBe(2);
  });

  it('FR-485 a continent Valdoria with 5 healthy workers and the goods orders 1 migrant', () => {
    const orders = scriptedPlayer(setWarehouse(withWorkers(continent(), FIVE), N2, MIGRANT_GOODS), N2);
    expect(migrants(orders)).toEqual([{ kind: 'recruitWorkers', nationId: N2, delta: 1 }]);
  });

  it('FR-485 planned before its offers: the migrant comes before the first sale, which no longer counts its goods', () => {
    const s = setWarehouse(withWorkers(continent(), FIVE), N2, { ...MIGRANT_GOODS, [GoodsType.Clothing]: 3, [GoodsType.Furniture]: 3 });
    const orders = scriptedPlayer(s, N2);
    const recruit = orders.findIndex(o => o.kind === 'recruitWorkers');
    const firstSale = orders.findIndex(o => o.kind === 'sellCommodity');
    expect(recruit).toBeGreaterThanOrEqual(0);
    expect(firstSale).toBeGreaterThan(recruit);
    const sold = (c: string) => Math.max(0, ...orders.flatMap(o => (o.kind === 'sellCommodity' && o.commodity === c ? [o.amount] : [])));
    expect(sold(GoodsType.Clothing)).toBeLessThanOrEqual(2);
    expect(sold(GoodsType.Furniture)).toBeLessThanOrEqual(2);
  });

  it('FR-485 none with the start workforce (7 healthy workers)', () => {
    expect(migrants(scriptedPlayer(setWarehouse(withWorkers(continent(), SEVEN), N2, MIGRANT_GOODS), N2))).toEqual([]);
  });

  it('FR-485 none while any of the three goods is short: no canned food, no clothing or no furniture', () => {
    for (const short of [MaterialType.CannedFood, GoodsType.Clothing, GoodsType.Furniture]) {
      const s = setWarehouse(withWorkers(continent(), FIVE), N2, { ...MIGRANT_GOODS, [short]: 0 });
      expect(migrants(scriptedPlayer(s, N2)), short).toEqual([]);
    }
  });

  it(`FR-485 only while at least ${3} turns follow: turn 37 orders one, turn 38 none`, () => {
    expect(MIGRANT_MIN_TURNS).toBe(3);
    const s = setWarehouse(withWorkers(continent(), FIVE), N2, MIGRANT_GOODS);
    expect(migrants(scriptedPlayer(atTurn(s, 37), N2))).toHaveLength(1);
    expect(migrants(scriptedPlayer(atTurn(s, 38), N2))).toEqual([]);
  });

  it('FR-485 a sick worker is not healthy: 7 workers with 2 sick order one', () => {
    const s = setWarehouse(withWorkers(continent(), SEVEN, { sick: { untrained: 2, trained: 0, expert: 0 } }), N2, MIGRANT_GOODS);
    expect(migrants(scriptedPlayer(s, N2))).toHaveLength(1);
  });

  it('FR-485 a worker in training is still healthy (back next turn): 7 workers with 2 training order none', () => {
    const s = setWarehouse(withWorkers(continent(), SEVEN, { training: { untrained: 2, trained: 0, expert: 0 } }), N2, MIGRANT_GOODS);
    expect(migrants(scriptedPlayer(s, N2))).toEqual([]);
  });

  it('FR-485 the run makes the next migrant\'s clothing and furniture while workers are short and its lumber pairs with steel', () => {
    // Without the rule no furniture is made here: the run spends only unpaired lumber on furniture (FR-140), and none is.
    const stock = { [MaterialType.Lumber]: 4, [MaterialType.Steel]: 4, [MaterialType.Fabric]: 2, [MaterialType.CannedFood]: 10 };
    const short = scriptedPlayer(emptyWarehouse(withWorkers(continent(), FIVE), N2, stock), N2);
    expect(made(short, GoodsType.Furniture)).toBeGreaterThanOrEqual(1);
    expect(made(short, GoodsType.Clothing)).toBeGreaterThanOrEqual(1);
    const full = scriptedPlayer(emptyWarehouse(withWorkers(continent(), SEVEN), N2, stock), N2);
    expect(made(full, GoodsType.Furniture)).toBe(0);
  });

  it('FR-485 FR-040 (M13 T-15) the migrant never takes the can this turn\'s meal needs: with 1 can and no meat, none; with 2, one; no worker is sick either way', () => {
    // Measured before the fix: FR-260 seed 2 (world market), turn 18, Valdoria's 6 workers had no livestock and 1 can;
    // the migrant took it and one worker fell sick (FR-260 "no worker sick" went red)
    const noMeat = (cans: number) =>
      emptyWarehouse(withWorkers(continent(), FIVE), N2, { grain: 20, fruit: 10, [MaterialType.CannedFood]: cans, [GoodsType.Clothing]: 1, [GoodsType.Furniture]: 1 });
    const meal = (s: GameState) => {
      const fed = resolveTurn(s, { [N2]: scriptedPlayer(s, N2) }, s.seed).events.filter(e => e.type === 'workers-fed' && e.nationId === N2);
      return fed.map(e => (e.type === 'workers-fed' ? e.sick + e.starved : -1));
    };
    expect(migrants(scriptedPlayer(noMeat(1), N2))).toEqual([]);
    expect(meal(noMeat(1))).toEqual([0]);
    expect(migrants(scriptedPlayer(noMeat(2), N2))).toHaveLength(1);
    expect(meal(noMeat(2))).toEqual([0]);
  });

  it('FR-498 on a world without provinces (two-islands) it orders no migrant and wants none', () => {
    const s = setWarehouse(withWorkers(twoIslands(), FIVE), N2, MIGRANT_GOODS);
    expect(migrantsWanted(s, N2)).toBe(0);
    expect(migrants(scriptedPlayer(s, N2))).toEqual([]);
  });
});

describe('FR-486 the mills it builds are staffed', () => {
  /** Raw stock its 12 labour cannot work up, so capacity stands idle for want of labour. */
  const RAW = { timber: 99, coal: 99, ironOre: 99, cotton: 99, wool: 99 };
  /** Test setup: Valdoria's mills at 8 and factories at 4 (a new game has 2 and 1, which its labour fills). */
  const builtUp = (s: GameState): GameState =>
    (['steelMill', 'lumberMill', 'textileMill', 'clothingFactory', 'furnitureFactory', 'metalWorks'] as const).reduce(
      (state, b) => setBuilding(state, N2, b, { capacity: b.endsWith('Mill') ? 8 : 4 }),
      s
    );
  /** Valdoria with a consulate in Arvelia: the minors it may trade with take 2 clothing and 2 furniture this turn. */
  const trading = (s: GameState) => setPair(s, N2, 'minor-1', { consulates: [N2] });

  it(`FR-486 the idle capacity is the room the run's stock could fill with more labour: at least ${4} with 12 labour, raw stock and built-up mills, 0 with no stock or 240 labour`, () => {
    expect(MIGRANT_IDLE_CAPACITY).toBe(4);
    expect(idleForWantOfLabour(setWarehouse(withWorkers(builtUp(continent()), SEVEN), N2, RAW), N2)).toBeGreaterThanOrEqual(4);
    expect(idleForWantOfLabour(emptyWarehouse(withWorkers(continent(), SEVEN), N2), N2)).toBe(0);
    const plenty: Workers = { untrained: 0, trained: 0, expert: 60 };
    expect(idleForWantOfLabour(setWarehouse(withWorkers(builtUp(continent()), plenty), N2, RAW), N2)).toBe(0);
  });

  it('FR-486 with 7 workers, idle capacity and goods beyond what the minors take (3 against 2), it orders 1 migrant', () => {
    const s = trading(setWarehouse(withWorkers(builtUp(continent()), SEVEN), N2, { ...RAW, cannedFood: 10, clothing: 3, furniture: 3 }));
    expect(partnerDemand(s, N2)).toMatchObject({ clothing: 2, furniture: 2 });
    expect(migrants(scriptedPlayer(s, N2))).toEqual([{ kind: 'recruitWorkers', nationId: N2, delta: 1 }]);
  });

  it('FR-486 none when the minors would take every clothing (2 against 2): no sale is given up', () => {
    const s = trading(setWarehouse(withWorkers(builtUp(continent()), SEVEN), N2, { ...RAW, cannedFood: 10, clothing: 2, furniture: 3 }));
    expect(migrants(scriptedPlayer(s, N2))).toEqual([]);
  });

  it('FR-486 none when the run leaves less than 4 capacity points idle for want of labour (nothing to work up)', () => {
    const s = trading(emptyWarehouse(withWorkers(builtUp(continent()), SEVEN), N2, { cannedFood: 10, clothing: 3, furniture: 3 }));
    expect(idleForWantOfLabour(s, N2)).toBeLessThan(4);
    expect(migrants(scriptedPlayer(s, N2))).toEqual([]);
  });

  it('FR-486 only one migrant a turn: with 5 workers FR-485 orders it and FR-486 adds none', () => {
    const s = trading(setWarehouse(withWorkers(builtUp(continent()), FIVE), N2, { ...RAW, cannedFood: 10, clothing: 5, furniture: 5 }));
    expect(migrants(scriptedPlayer(s, N2))).toEqual([{ kind: 'recruitWorkers', nationId: N2, delta: 1 }]);
  });

  it('FR-486 only while at least 3 turns follow (turn 38: none)', () => {
    const s = trading(setWarehouse(withWorkers(builtUp(continent()), SEVEN), N2, { ...RAW, cannedFood: 10, clothing: 3, furniture: 3 }));
    expect(migrants(scriptedPlayer(atTurn(s, 38), N2))).toEqual([]);
  });

  it('FR-498 on two-islands it orders none, though its capacity stands idle for want of labour', () => {
    const s = setWarehouse(withWorkers(builtUp(twoIslands()), SEVEN), N2, { ...RAW, cannedFood: 10, clothing: 9, furniture: 9 });
    expect(idleForWantOfLabour(s, N2)).toBeGreaterThanOrEqual(4);
    expect(migrants(scriptedPlayer(s, N2))).toEqual([]);
  });
});
