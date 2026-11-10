// M4.2 (NR-023): the scripted player scores higher than the frozen M4 player and keeps NR-022.
// FR-125 the 40-turn acceptance on four seeds; FR-126 to FR-132 the rules that earn the points.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { applyOrder } from '@/engine/orders/apply';
import { computerOrders } from '@/engine/ai/players';
import { scriptedPlayer, type Player } from '@/engine/ai/scriptedPlayer';
import { CASH_RESERVE, PAIR_VALUE } from '@/engine/ai/economy';
import { bestDepotSite, capitalComponent } from '@/engine/ai/railPlan';
import { addDepot, railLinksOf } from '@/engine/systems/railroadSystem';
import { scoreOf } from '@/engine/score/score';
import { turnLimitOf } from '@/engine/turn/gameOver';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { m4ScriptedPlayer } from './m4ScriptedPlayer';
import { railBound } from './railBound';
import { emptyWarehouse, invariantViolations, N2, nationOf, setBuilding, setIndustry, setTile, setTreasury, setWarehouse, tileAt } from './fixtures';

const ENGINEER_2 = 'worker-nation-2-7';
const SEEDS = [1, 2, 3, 4];
const CHECKPOINTS = [15, 25, 40];
/** FR-125: at least half again the frozen M4 player's score; measured lowest ratio 1.60 (seed 1, turn 15: 625 vs 390). */
const MARGIN = 1.5;

const start = (seed = 1): GameState => newGame({ seed });
const atTurn = (s: GameState, turn: number): GameState => ({ ...s, turn });
const lastTurn = (s: GameState): GameState => atTurn(s, turnLimitOf(s));
const ordersOf = (s: GameState): Order[] => scriptedPlayer(s, N2);
const ofKind = <K extends Order['kind']>(orders: Order[], kind: K) => orders.filter((o): o is Extract<Order, { kind: K }> => o.kind === kind);
const economy = (orders: Order[]) => orders.filter(o => !('workerId' in o));
const made = (orders: Order[]) => Object.fromEntries(ofKind(orders, 'setProduction').filter(o => o.amount > 0).map(o => [o.output, o.amount]));
const developments = (orders: Order[]) => orders.filter((o): o is Extract<Order, { kind: 'startDevelopment' | 'moveAndStartDevelopment' }> => o.kind === 'startDevelopment' || o.kind === 'moveAndStartDevelopment');
const targetOf = (o: Extract<Order, { kind: 'startDevelopment' | 'moveAndStartDevelopment' }>) => (o.kind === 'startDevelopment' ? o.tileId : o.toTileId);
/** Every own resource tile of nation 2 set to `level`. */
const allAtLevel = (s: GameState, level: number): GameState => ({
  ...s,
  map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => (t.ownerNationId === N2 && t.resource ? { ...t, resource: { ...t.resource, level } } : t))) },
});

interface Checkpoint { turn: number; score: number; depotsJoined: number; links: number; bound: number }
/** FR-125 health: nation 2's meals (`workers-fed`) and the invariants, every turn. */
interface Health { meals: number; sick: number; starved: number; violations: string[] }
interface Game { checkpoints: Checkpoint[]; refused: number; health: Health; final: GameState }

/** 40 turns from the real new game; nation 2's orders from `orders`, none for nation 1. */
function play(orders: (s: GameState) => Order[], seed: number): Game {
  let state = start(seed);
  let refused = 0;
  const checkpoints: Checkpoint[] = [];
  const health: Health = { meals: 0, sick: 0, starved: 0, violations: [] };
  for (let turn = 1; turn <= 40; turn++) {
    const result = resolveTurn(state, { [N2]: orders(state) }, state.seed);
    refused += result.events.filter(e => e.type === 'order-rejected' && e.nationId === N2).length;
    for (const e of result.events) {
      if (e.type !== 'workers-fed' || e.nationId !== N2) continue;
      health.meals++;
      health.sick += e.sick;
      health.starved += e.starved;
    }
    state = result.state;
    health.violations.push(...invariantViolations(state).map(v => `turn ${turn}: ${v}`));
    if (!CHECKPOINTS.includes(turn)) continue;
    const component = capitalComponent(state, N2);
    const depotsJoined = state.transportNetwork.railroadNetworks![N2].depots.filter(d => d.isActive && component.has(`${d.x},${d.y}`)).length;
    const links = railLinksOf(state).filter(l => l.nationId === N2).length;
    checkpoints.push({ turn, score: scoreOf(state, N2).total, depotsJoined, links, bound: railBound(state, N2) });
  }
  return { checkpoints, refused, health, final: state };
}

describe('FR-125 score acceptance: 40 turns of nation 2 on seeds 1 to 4', () => {
  const now = new Map<number, Game>();
  const m4 = new Map<number, Game>();
  const frozen: Player = m4ScriptedPlayer;
  beforeAll(() => {
    for (const seed of SEEDS) {
      // Through the registry (FR-099), as the store plays it
      now.set(seed, play(s => computerOrders(s)[N2], seed));
      m4.set(seed, play(s => frozen(s, N2), seed));
    }
  }, 180_000);

  it.each(SEEDS)('FR-125 seed %i: at turns 15, 25 and 40 the score is at least 1.5 times the frozen M4 player\'s', seed => {
    const rows = CHECKPOINTS.map((turn, i) => {
      const score = now.get(seed)!.checkpoints[i].score;
      const m4Score = m4.get(seed)!.checkpoints[i].score;
      return { turn, atLeastM4: score >= m4Score, withMargin: score >= MARGIN * m4Score };
    });
    expect(rows).toEqual(CHECKPOINTS.map(turn => ({ turn, atLeastM4: true, withMargin: true })));
  });

  it('FR-125 no order of nation 2 is refused on any seed', () => {
    expect(SEEDS.map(seed => now.get(seed)!.refused)).toEqual(SEEDS.map(() => 0));
  });

  it('FR-125 nation 2 is fed every turn: no worker sick or starved, and no invariant broken, on any seed', () => {
    expect(SEEDS.map(seed => ({ seed, ...now.get(seed)!.health }))).toEqual(
      SEEDS.map(seed => ({ seed, meals: 40, sick: 0, starved: 0, violations: [] }))
    );
  });

  it('FR-125 NR-022 holds at each checkpoint: a depot joined to the capital, rail links within the FR-124 bound', () => {
    for (const seed of SEEDS) {
      for (const c of now.get(seed)!.checkpoints) {
        expect({ seed, turn: c.turn, joined: c.depotsJoined >= 1, linked: c.links > 0, withinBound: c.links <= c.bound }).toEqual({
          seed, turn: c.turn, joined: true, linked: true, withinBound: true,
        });
      }
    }
  });

  it('FR-125 the same seed gives the same game', () => {
    expect(play(s => computerOrders(s)[N2], 1).final).toEqual(now.get(1)!.final);
  });

  it('FR-125 the numbers, for the journal', () => {
    for (const seed of SEEDS) {
      const row = now.get(seed)!.checkpoints.map((c, i) => `t${c.turn} ${c.score}/${m4.get(seed)!.checkpoints[i].score} (${(c.score / m4.get(seed)!.checkpoints[i].score).toFixed(2)}) depots ${c.depotsJoined} links ${c.links}/${c.bound}`);
      console.log(`FR-125 seed ${seed}: ${row.join(' | ')}`);
    }
    expect(now.size).toBe(SEEDS.length);
  });
});

describe('FR-126 every lumber + steel pair becomes capacity', () => {
  it('FR-126 on turn 1 the ten start pairs expand the steel and lumber mills first, then the cheapest steps, until no step is affordable', () => {
    const s = start();
    const orders = ordersOf(s);
    expect(ofKind(orders, 'expandBuilding').map(o => o.building)).toEqual([
      'steelMill', 'lumberMill', 'metalWorks', 'furnitureFactory', 'clothingFactory', 'textileMill',
    ]);
    const expanded = ofKind(orders, 'expandBuilding').reduce<GameState>((v, o) => applyOrder(v, o), s);
    const w = nationOf(expanded, N2).warehouse as Record<string, number>;
    expect(Math.min(w.lumber, w.steel)).toBe(1); // 10 pairs: 2 + 2 + 1 + 1 + 1 + 2, and every next step costs 2 or more
  });

  it('FR-126 equal steps go to the smaller building, so the factories grow evenly', () => {
    let s = setWarehouse(start(), N2, { lumber: 8, steel: 8 });
    for (const mill of ['steelMill', 'lumberMill', 'textileMill'] as const) s = setBuilding(s, N2, mill, { capacity: 8 });
    s = setBuilding(setBuilding(setBuilding(s, N2, 'metalWorks', { capacity: 12 }), N2, 'furnitureFactory', { capacity: 4 }), N2, 'clothingFactory', { capacity: 4 });
    // Each factory step costs 4 pairs, a mill step 8: the two size-4 factories, not the metal works at 12
    expect(ofKind(ordersOf(s), 'expandBuilding').map(o => o.building)).toEqual(['furnitureFactory', 'clothingFactory']);
  });

  it('FR-126 lumber and steel are kept for pairs, and offered only on the last turn', () => {
    const s = setWarehouse(start(), N2, { lumber: 3, steel: 0 });
    const offered = (orders: Order[]) => ofKind(orders, 'sellCommodity').filter(o => o.commodity === 'lumber' || o.commodity === 'steel');
    expect(offered(ordersOf(s))).toEqual([]);
    expect(offered(ordersOf(lastTurn(s)))).toEqual([{ kind: 'sellCommodity', nationId: N2, commodity: 'lumber', amount: 3 }]);
  });
});

describe('FR-127 transport plan and freight cars', () => {
  it('FR-127 the plan asks for the missing meal first (and a canned-food batch while the cans are short), then coal and iron (the scarcer first), timber, cotton and wool', () => {
    const planOf = (s: GameState) => Object.entries(ofKind(ordersOf(s), 'setTransportAllocations')[0].allocations);
    // 7 workers eat 4 grain, 2 fruit, 1 meat; a batch is 2 grain, 1 fruit, 1 meat; turn 1 gathers grain 4, fruit 4 and cotton 2;
    // iron (0 in stock) comes before coal (5)
    expect(planOf(emptyWarehouse(start(), N2, { coal: 5 }))).toEqual([
      ['grain', 6], ['fruit', 3], ['livestock', 2], ['ironOre', 0], ['coal', 0], ['timber', 0], ['cotton', 2], ['wool', 0],
    ]);
    expect(planOf(emptyWarehouse(start(), N2, { coal: 5, cannedFood: 7 })).slice(0, 3)).toEqual([['grain', 4], ['fruit', 2], ['livestock', 1]]);
  });

  it('FR-127 a freight car only while that cargo is more than the cars carry, and none in the last 8 turns', () => {
    expect(ofKind(ordersOf(start()), 'changeTransportCapacity')).toEqual([]);
    const stocked = emptyWarehouse(start(), N2, { lumber: 1, steel: 1 });
    const s = { ...stocked, nations: stocked.nations.map(n => (n.id === N2 ? { ...n, transportCapacity: 0 } : n)) };
    expect(ofKind(ordersOf(s), 'changeTransportCapacity')).toEqual([{ kind: 'changeTransportCapacity', nationId: N2, delta: 1 }]);
    expect(ofKind(ordersOf(atTurn(s, turnLimitOf(s) - 7)), 'changeTransportCapacity')).toEqual([]);
  });
});

describe('FR-128 the cargo holds', () => {
  it('FR-128 the best-priced units go first: goods at $900 before anything else, ties in market order', () => {
    const s = setWarehouse(start(), N2, { clothing: 2, furniture: 1 });
    const trade = economy(ordersOf(s)).filter(o => o.kind === 'sellCommodity' || o.kind === 'buyCommodity');
    expect(trade.slice(0, 2)).toEqual([
      { kind: 'sellCommodity', nationId: N2, commodity: 'clothing', amount: 2 },
      { kind: 'sellCommodity', nationId: N2, commodity: 'furniture', amount: 1 },
    ]);
    const units = trade.reduce((sum, o) => sum + o.amount, 0);
    expect(units).toBeLessThanOrEqual(nationOf(s, N2).merchantMarine.holds);
  });

  it('FR-128 bids for lumber and steel while a pair costs less than $1,000, never below the cash reserve, never on the last turn', () => {
    const s = start();
    const orders = economy(ordersOf(s));
    expect([...new Set(ofKind(orders, 'buyCommodity').map(o => o.commodity))].sort()).toEqual(['lumber', 'steel']);
    const afterBids = orders.reduce<GameState>((v, o) => applyOrder(v, o), s);
    expect(nationOf(afterBids, N2).treasury).toBeGreaterThanOrEqual(CASH_RESERVE);

    expect(ofKind(ordersOf(setTreasury(s, N2, CASH_RESERVE + 100)), 'buyCommodity')).toEqual([]);
    const dear = { ...s, market: { ...s.market!, prices: { ...s.market!.prices, lumber: PAIR_VALUE / 2, steel: PAIR_VALUE / 2 } } };
    expect(ofKind(ordersOf(dear), 'buyCommodity')).toEqual([]);
    expect(ofKind(ordersOf(lastTurn(s)), 'buyCommodity')).toEqual([]);
  });

  it('FR-128 a meal of canned food is kept from the holds', () => {
    const poor = (cans: number) => setTreasury(emptyWarehouse(start(), N2, { cannedFood: cans }), N2, 1000);
    expect(ofKind(ordersOf(poor(7)), 'sellCommodity')).toEqual([]);
    expect(ofKind(ordersOf(poor(10)), 'sellCommodity')).toEqual([{ kind: 'sellCommodity', nationId: N2, commodity: 'cannedFood', amount: 3 }]);
  });
});

describe('FR-129 the production run', () => {
  // 3 experts (12 labour, nobody to train: no paper wanted), mills at 4, inputs for 3 pairs and a clothing
  const base = (treasury: number) =>
    setTreasury(
      setBuilding(
        setBuilding(
          setIndustry(emptyWarehouse(start(), N2, { coal: 3, ironOre: 3, timber: 10, fabric: 2 }), N2, {
            workers: { untrained: 0, trained: 0, expert: 3 },
          }),
          N2, 'steelMill', { capacity: 4 }
        ),
        N2, 'lumberMill', { capacity: 4 }
      ),
      N2,
      treasury
    );

  it('FR-129 pairs first: as much steel as lumber, the labour all in pairs while the treasury is at the reserve or above', () => {
    expect(made(ordersOf(base(CASH_RESERVE)))).toEqual({ steel: 3, lumber: 3 });
  });

  it('FR-129 goods first while the treasury is below the reserve', () => {
    expect(made(ordersOf(base(CASH_RESERVE - 1)))).toMatchObject({ clothing: 1 });
  });

  it('FR-129 canned food while the cans are fewer than the workers; nothing on the last turn', () => {
    const s = setWarehouse(base(CASH_RESERVE), N2, { grain: 20, fruit: 10, livestock: 10 });
    expect(made(ordersOf(s)).cannedFood).toBeGreaterThanOrEqual(3);
    expect(made(ordersOf(lastTurn(start())))).toEqual({});
  });
});

describe('FR-130 training only when the labour is all used', () => {
  it('FR-130 with paper and a run that uses all the labour, the untrained are trained', () => {
    const s = setWarehouse(start(), N2, { paper: 4 });
    expect(ofKind(ordersOf(s), 'trainWorkers')).toEqual([{ kind: 'trainWorkers', nationId: N2, from: 'untrained', delta: 4 }]);
  });

  it('FR-130 no training while labour is left over, or with fewer than 3 turns to go', () => {
    expect(ofKind(ordersOf(emptyWarehouse(start(), N2, { paper: 4 })), 'trainWorkers')).toEqual([]);
    const s = setWarehouse(start(), N2, { paper: 4 });
    expect(ofKind(ordersOf(atTurn(s, turnLimitOf(s) - 2)), 'trainWorkers')).toEqual([]);
  });
});

describe('FR-131 development: the cheapest level that pays first', () => {
  it('FR-131 on turn 1 every developer starts a level-1 job (level-1 tiles are open to each of them)', () => {
    const s = start();
    let view = s;
    const levels: number[] = [];
    for (const order of ordersOf(s)) {
      if (order.kind === 'startDevelopment' || order.kind === 'moveAndStartDevelopment') levels.push(tileAt(view, targetOf(order)).resource!.level + 1);
      view = applyOrder(view, order);
    }
    expect(levels.length).toBeGreaterThanOrEqual(3);
    expect(levels.every(l => l === 1)).toBe(true);
  });

  it('FR-131 level 2 ($1,000 for 10 points) is started when no level-1 job is open; level 3 ($5,000) never', () => {
    expect(developments(ordersOf(allAtLevel(start(), 1))).length).toBeGreaterThan(0);
    expect(developments(ordersOf(allAtLevel(start(), 2)))).toEqual([]);
  });

  it('FR-131 no job that cannot finish by the last turn', () => {
    const s = start();
    expect(developments(ordersOf(atTurn(s, turnLimitOf(s) - 2))).length).toBeGreaterThan(0);
    expect(developments(ordersOf(atTurn(s, turnLimitOf(s) - 1)))).toEqual([]);
  });
});

describe('FR-132 a depot only when it pays back', () => {
  it('FR-132 the best depot is started from the turn its gain covers its price and rail, not later', () => {
    const s = start();
    const site = bestDepotSite(s, N2)!;
    // gain x (turns after - 2 - rail tiles) >= (2000 + rail cost) / 100
    const lastTurnsAfter = 2 + site.railNeeded + Math.ceil((2000 + site.railCost) / 100 / site.gain);
    const engineer = (turnsAfter: number) => ordersOf(atTurn(s, turnLimitOf(s) - turnsAfter)).filter(o => 'workerId' in o && o.workerId === ENGINEER_2);
    expect(engineer(lastTurnsAfter)).toEqual([{ kind: 'moveAndStartConstruction', nationId: N2, workerId: ENGINEER_2, toTileId: site.tileId, structure: 'depot' }]);
    expect(engineer(lastTurnsAfter - 1)).toEqual([]);
  });

  it('FR-132 joining a built depot is not limited: rail is still laid near the end', () => {
    const s = start();
    const site = bestDepotSite(s, N2)!;
    const [x, y] = site.tileId.split('-').map(Number);
    const withDepot = addDepot(setTile(s, site.tileId, { depot: true }), N2, { x, y });
    const engineer = ordersOf(atTurn(withDepot, turnLimitOf(s) - 1)).filter(o => 'workerId' in o && o.workerId === ENGINEER_2);
    expect(engineer).toHaveLength(1);
    expect(['moveAndBuildRail', 'moveAndStartConstruction']).toContain(engineer[0].kind);
  });
});
