// M4.2 (NR-023): the scripted player scores higher than the frozen M4 player and keeps NR-022.
// FR-125 the 40-turn acceptance on four seeds; FR-126 to FR-132 the rules that earn the points.
import { beforeAll, describe, it, expect } from 'vitest';
import { newGame } from '@/engine/newGame';
import { applyTurnOrders, resolveTurn } from '@/engine/turn/resolveTurn';
import { applyOrder } from '@/engine/orders/apply';
import { computerOrders } from '@/engine/ai/players';
import { scriptedPlayer, type Player } from '@/engine/ai/scriptedPlayer';
import { CASH_RESERVE, cashReserve, collectedAtLogistics, hubLabourNeed, PAIR_VALUE, planFinalTransport, priorityPlan, shippingWants } from '@/engine/ai/economy';
import { transportShipments } from '@/engine/systems/logisticsSystem';
import { bestDepotSite, capitalComponent, paybackTurns, railPath } from '@/engine/ai/railPlan';
import { addDepot, addRailroad } from '@/engine/systems/railroadSystem';
import { turnLimitOf } from '@/engine/turn/gameOver';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { withoutStartForces } from './armyFixtures';
import { m4ScriptedPlayer } from './m4ScriptedPlayer';
import { emptyWarehouse, N2, nationOf, setBuilding, setIndustry, setTile, setTreasury, setWarehouse, tileAt } from './fixtures';
import { CHECKPOINTS, play, SEEDS, start, type Game } from './scriptedGame';

const ENGINEER_2 = 'worker-nation-2-7';
const PROSPECTOR_2 = 'worker-nation-2-1';
/**
 * FR-125: at least half again the frozen M4 player's score. Measured lowest ratio 1.55 (seed 3, turn 15: 614 vs 396)
 * since M4.3, when a depot started needing its own rail section (FR-136); 1.60 before.
 */
const MARGIN = 1.5;

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

  // FR-616: Fish feeds both players. The new depot route and development reserve change scores.
  // Scripted/frozen M4 at turns 15, 25 and 40:
  // Seed 1: 760/451, 903/550, 1643/741 -> 701/445, 936/573, 1485/749.
  // Seed 2: 751/442, 900/522, 1546/711 -> 693/437, 896/537, 1353/723.
  // Seed 3: 757/457, 903/563, 1530/756 -> 690/450, 916/578, 1456/742.
  // Seed 4: 759/441, 903/525, 1637/708 -> 699/436, 944/532, 1511/724.
  it('FR-125 FR-616 records both scores at each checkpoint', () => {
    const scores = SEEDS.map(seed => now.get(seed)!.checkpoints.map((c, i) => [c.score, m4.get(seed)!.checkpoints[i].score]));
    expect(scores).toEqual([
      [[701, 445], [936, 573], [1485, 749]],
      [[693, 437], [896, 537], [1353, 723]],
      [[690, 450], [916, 578], [1456, 742]],
      [[699, 436], [944, 532], [1511, 724]],
    ]);
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

  it('FR-125 NR-022 no dead end at any checkpoint: every rail node with one link is a depot or a port (the capital excepted)', () => {
    // Checked at turns 15, 25 and 40 only: a path being laid has a dead-end tip for a few turns (FR-124 test).
    const deadEnds = (games: Map<number, Game>) => SEEDS.flatMap(seed => games.get(seed)!.checkpoints.map(c => ({ seed, turn: c.turn, deadEnds: c.deadEnds })));
    console.log('FR-125 dead ends, frozen M4 player:', JSON.stringify(deadEnds(m4).filter(r => r.deadEnds.length)));
    expect(deadEnds(now)).toEqual(SEEDS.flatMap(seed => CHECKPOINTS.map(turn => ({ seed, turn, deadEnds: [] }))));
    // The invariant can fail: the frozen M4 player lays rail to resource tiles, not to depots, and by turn 40 it
    // ends on a tile with neither on every seed
    expect(SEEDS.map(seed => m4.get(seed)!.checkpoints[2].deadEnds.length > 0)).toEqual(SEEDS.map(() => true));
  });

  it.each([1, 3, 4])('FR-125 FR-454 seed %i waits for developer cash before starting the depot at 20-10', seed => {
    const game = now.get(seed)!;
    const startTurn = game.orders.findIndex(orders => orders[N2].some(order => {
      if (order.kind === 'startConstruction') return order.structure === 'depot' && order.tileId === '20-10';
      if (order.kind === 'moveAndStartConstruction') return order.structure === 'depot' && order.toTileId === '20-10';
      return false;
    })) + 1;
    const checkpoint = game.checkpoints.find(c => c.turn === 15)!;
    // Spending the developers' cash on turn 12 starts the first rail section a turn early, leaving a tip at 18-11.
    expect({ startTurn, deadEnds: checkpoint.deadEnds }).toEqual({ startTurn: 13, deadEnds: [] });
  });

  it('FR-305 two-islands has no provinces, so no Council meets: no council-met in any game, each ends by the turn limit', () => {
    for (const games of [now, m4]) {
      expect(SEEDS.map(seed => games.get(seed)!.councils)).toEqual(SEEDS.map(() => 0));
      expect(SEEDS.map(seed => games.get(seed)!.final.gameOver)).toEqual(SEEDS.map(seed => ({ turn: 40, year: 1824, scores: games.get(seed)!.final.gameOver!.scores })));
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
    const s = emptyWarehouse(start(), N2, { coal: 5 });
    // 7 workers eat 4 grain, 2 fruit, 1 meat; a batch is 2 grain, 1 fruit, 1 meat; turn 1 gathers grain 4, fruit 4 and cotton 2;
    // iron (0 in stock) comes before coal (5)
    expect(shippingWants(s, N2)).toEqual([
      ['grain', 6], ['fruit', 3], ['livestock', 2], ['ironOre', 0], ['coal', 0], ['timber', 0], ['cotton', 2], ['wool', 0],
    ]);
    // M12 FR-389 (FR-405; until M12 the plan was these wants, topped up by the logistics phase): a set amount is exact,
    // so the plan sets each wanted commodity to its want or what the spare cars add (fruit: the 4 gathered), the rest automatic
    expect(planOf(s)).toEqual([['grain', 6], ['fruit', 4], ['livestock', 2], ['cotton', 2]]);
    expect(shippingWants(emptyWarehouse(start(), N2, { coal: 5, cannedFood: 7 }), N2).slice(0, 3)).toEqual([['grain', 4], ['fruit', 2], ['livestock', 1]]);
  });

  it('FR-127 a freight car only while that cargo is more than the cars carry, and none in the last 8 turns', () => {
    expect(ofKind(ordersOf(start()), 'changeTransportCapacity')).toEqual([]);
    const stocked = emptyWarehouse(start(), N2, { lumber: 1, steel: 1 });
    const s = { ...stocked, nations: stocked.nations.map(n => (n.id === N2 ? { ...n, transportCapacity: 0 } : n)) };
    expect(ofKind(ordersOf(s), 'changeTransportCapacity')).toEqual([{ kind: 'changeTransportCapacity', nationId: N2, delta: 1 }]);
    expect(ofKind(ordersOf(atTurn(s, turnLimitOf(s) - 7)), 'changeTransportCapacity')).toEqual([]);
  });
});

describe('M12 FR-389 FR-405 the scripted transport plan under exact amounts ships what the wants-then-fill rule shipped', () => {
  /** The logistics phase before FR-389: the plan first (capped), then every commodity topped up in tile order. */
  const fillRule = (capacity: number, collected: Record<string, number>, wants: [string, number][]) => {
    const shipped: Record<string, number> = {};
    let used = 0;
    const ship = (res: string, n: number) => {
      const take = Math.max(0, Math.min(n, (collected[res] ?? 0) - (shipped[res] ?? 0), capacity - used));
      if (take <= 0) return;
      shipped[res] = (shipped[res] ?? 0) + take;
      used += take;
    };
    for (const [res, n] of wants) ship(res, n);
    for (const [res, n] of Object.entries(collected)) ship(res, n);
    return shipped;
  };
  const WANTS: [string, number][] = [['grain', 0], ['fruit', 0], ['livestock', 1], ['ironOre', 0], ['coal', 0], ['timber', 0], ['cotton', 2], ['wool', 0]];

  it('M12 FR-389 example: 15 cars, collected grain 10, livestock 4, fruit 5, cotton 2, wanted livestock 1 and cotton 2: the plan { livestock 3, cotton 2 } ships livestock 3, cotton 2, grain 10', () => {
    const collected = { grain: 10, livestock: 4, fruit: 5, cotton: 2 };
    const plan = priorityPlan(15, collected, WANTS);
    expect(plan).toEqual({ livestock: 3, cotton: 2 });
    expect(transportShipments(15, collected, plan)).toEqual({ livestock: 3, cotton: 2, grain: 10 });
    expect(transportShipments(15, collected, plan)).toEqual(fillRule(15, collected, WANTS));
  });

  it.each([
    [0, { grain: 4, fruit: 4, cotton: 2 }],
    [9, { grain: 4, fruit: 4, cotton: 2 }],
    [30, { grain: 10, livestock: 4, fruit: 5, cotton: 2 }],
    [12, { timber: 6, ironOre: 4, livestock: 9, coal: 2, grain: 14, fruit: 7, cotton: 5 }],
  ])('M12 FR-389 with %i cars the plan ships what the old rule shipped (%j)', (cars, collected) => {
    const wants: [string, number][] = [['grain', 4], ['fruit', 2], ['livestock', 1], ['coal', 2], ['ironOre', 4], ['timber', 4], ['cotton', 5], ['wool', 0]];
    expect(transportShipments(cars, collected, priorityPlan(cars, collected, wants))).toEqual(fillRule(cars, collected, wants));
  });

  it('M12 FR-389 a rail the engineer starts and finishes this turn joins a hub: the final plan, on what the logistics phase collects, ships the cotton of the new hub as the old rule did (continent, seed 1, turn 6)', () => {
    let s = newGame({ seed: 1, world: 'continent' });
    for (let turn = 1; turn <= 5; turn++) s = resolveTurn(s, { [N2]: scriptedPlayer(s, N2) }, s.seed).state;
    const orders = scriptedPlayer(s, N2);
    // M12 strategy C re-record (FR-456, FR-457: the first depot is 16-12, no longer 15-6, whose rail on turn 6 brought
    // livestock 4 and grain 6 more; the old rule shipped livestock 3, the first plan's 1 would have shipped the fruit instead)
    expect(orders).toContainEqual(expect.objectContaining({ kind: 'moveAndStartConstruction', structure: 'rail', toTileId: '16-12' }));
    const view = applyTurnOrders(s, { [N2]: orders }, () => {}).state;
    // FR-517: 4 -> 3 fruit before the rail, 7 -> 6 afterwards; the ranch adds 0 -> 1 horse to both.
    // FR-616: the capital catch adds Fish 0 -> 1 before and after the rail joins the depot.
    expect(collectedAtLogistics(s, N2)).toEqual({ grain: 4, fruit: 3, cotton: 2, horses: 1, fish: 1 });
    expect(collectedAtLogistics(view, N2)).toEqual({ grain: 5, fruit: 6, cotton: 5, timber: 2, horses: 1, fish: 1 });
    // FR-616: Fish supplies protein. Both plans change livestock from an explicit allocation of 1 to automatic.
    // The opening plan still requests two cotton and the completed rail lets the final plan request three.
    expect(ofKind(orders, 'setTransportAllocations')[0].allocations).toEqual({ cotton: 2 });
    const final: Order[] = [];
    planFinalTransport(s, view, N2, o => (final.push(o), true));
    expect(final).toEqual([{ kind: 'setTransportAllocations', nationId: N2, allocations: { cotton: 3 } }]);
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

describe('FR-454 the cash reserve follows what the civilians need soon', () => {
  const s = start();
  const site = bestDepotSite(s, N2)!; // 16-12, 3 sections from the capital
  const node = (k: string) => ({ x: Number(k.split(/[,-]/)[0]), y: Number(k.split(/[,-]/)[1]) });
  const depotOrder: Order = { kind: 'moveAndStartConstruction', nationId: N2, workerId: ENGINEER_2, toTileId: site.tileId, structure: 'depot' };
  const building = applyOrder(s, depotOrder);
  const built = addDepot(setTile(s, site.tileId, { depot: true }), N2, node(site.tileId));
  const path = railPath(built, N2, site.tileId.replace('-', ','), capitalComponent(built, N2))!;
  const joined = path.slice(0, -1).reduceRight((v, k, i) => addRailroad(v, N2, node(k), node(path[i + 1])), built);
  const withoutWorker = (v: GameState, id: string): GameState => ({
    ...v,
    map: { ...v.map, tiles: v.map.tiles.map(row => row.map(t => ({ ...t, workers: t.workers.filter(w => w.id !== id) }))) },
  });

  it('FR-454 $100 for each developer, plus a depot\'s $2,000 while the engineer is free: a new game keeps CASH_RESERVE', () => {
    expect(cashReserve(s, N2)).toBe(CASH_RESERVE);
    expect(capitalComponent(joined, N2).has(site.tileId.replace('-', ','))).toBe(true);
    expect(cashReserve(joined, N2)).toBe(CASH_RESERVE);
    // the farmer gone: 4 developers
    expect(cashReserve(withoutWorker(s, 'worker-nation-2-2'), N2)).toBe(CASH_RESERVE - 100);
  });

  it('FR-454 while a depot is being built, or built and not joined, one rail section ($300) instead of the depot', () => {
    expect(cashReserve(building, N2)).toBe(5 * 100 + 300);
    expect(cashReserve(built, N2)).toBe(5 * 100 + 300);
  });

  it('FR-454 the cash above it buys pairs: with a depot being built, bids at $1,500; with every depot joined and the engineer free, none at $2,600', () => {
    expect(ofKind(ordersOf(setTreasury(building, N2, 1500)), 'buyCommodity').map(o => o.commodity)).toEqual(['lumber', 'steel']);
    expect(ofKind(ordersOf(setTreasury(joined, N2, CASH_RESERVE + 100)), 'buyCommodity')).toEqual([]);
  });

  it('FR-454 a nation with an army keeps CASH_RESERVE (FR-213\'s recruit floor) while a depot is being built', () => {
    const continent = newGame({ seed: 1, world: 'continent' });
    const order: Order = { kind: 'moveAndStartConstruction', nationId: N2, workerId: ENGINEER_2, toTileId: bestDepotSite(continent, N2)!.tileId, structure: 'depot' };
    const armed = applyOrder(continent, order);
    expect(cashReserve(armed, N2)).toBe(CASH_RESERVE);
    // the same game without the start forces: the rail section's $300
    expect(cashReserve(withoutStartForces(armed), N2)).toBe(5 * 100 + 300);
  });
});

describe('FR-456 FR-457 depot sites by what the nation will use, then by payback', () => {
  /** Seed 1's start with no resource on nation 2's land but `resources` (level 0), and `stock` the only goods. */
  const placed = (resources: Partial<Record<ResourceType, string[]>>, stock: Record<string, number> = { grain: 100, fruit: 100, livestock: 100 }): GameState => {
    const s = start();
    let v: GameState = { ...s, map: { ...s.map, tiles: s.map.tiles.map(row => row.map(t => (t.ownerNationId === N2 ? { ...t, resource: undefined } : t))) } };
    for (const [type, ids] of Object.entries(resources)) {
      for (const id of ids) v = setTile(v, id, { resource: { type: type as ResourceType, level: 0, discovered: true } });
    }
    return emptyWarehouse(v, N2, stock);
  };
  const lumberMill = (s: GameState, capacity: number) => setBuilding(s, N2, 'lumberMill', { capacity });
  const FORESTS = ['16-8', '17-8', '17-10']; // the three next to 16-9, 2 sections from the capital

  it('FR-456 a site counts only what the nation can use: three forests (6 timber a turn) count 6 for a lumber mill of 3, 2 for a mill of 1, none for no mill', () => {
    const forests = placed({ [ResourceType.Timber]: FORESTS });
    expect(bestDepotSite(lumberMill(forests, 3), N2)).toEqual({ tileId: '16-9', gain: 6, railNeeded: 2, railCost: 200 });
    // two turns of a mill of 1 use 2 timber: every site with a forest gains 2, and the first of the shortest paybacks wins
    expect(bestDepotSite(lumberMill(forests, 1), N2)).toEqual({ tileId: '15-7', gain: 2, railNeeded: 2, railCost: 200 });
    expect(bestDepotSite(lumberMill(forests, 0), N2)).toBeUndefined();
  });

  it('FR-456 a site covering a meal kind that runs out within 15 turns comes first: the far grain before the near timber', () => {
    const both = lumberMill(placed({ [ResourceType.Timber]: FORESTS, [ResourceType.Grain]: ['19-10', '20-10'] }), 3);
    // 100 grain feed the 7 workers (4 a turn) for 25 turns: the timber pays back first
    expect(bestDepotSite(both, N2)?.tileId).toBe('16-9');
    // no grain and no canned food: the grain comes first, 5 sections away
    const hungry = emptyWarehouse(both, N2, { fruit: 100, livestock: 100 });
    expect(bestDepotSite(hungry, N2)).toEqual({ tileId: '19-9', gain: 4, railNeeded: 5, railCost: 500 });
  });

  it('FR-457 among sites with the same meal cover, the one that pays back first: 4 timber a turn 2 sections away before 6 a turn 7 sections away', () => {
    const far = ['19-5', '20-5', '21-6'];
    const s = lumberMill(placed({ [ResourceType.Timber]: ['16-8', '17-10', ...far] }), 10);
    const best = bestDepotSite(s, N2)!;
    expect(best).toEqual({ tileId: '16-9', gain: 4, railNeeded: 2, railCost: 200 });
    // the far forests alone: their best site gains 6 a turn, 7 sections away
    const farSite = bestDepotSite(lumberMill(placed({ [ResourceType.Timber]: far }), 10), N2)!;
    expect({ tileId: farSite.tileId, gain: farSite.gain, railNeeded: farSite.railNeeded }).toEqual({ tileId: '20-6', gain: 6, railNeeded: 7 });
    // 2 build turns + 2 sections + ($2,000 + $200) / $100 / 4 a turn, against 2 + 7 + (2,000 + rail) / 100 / 6
    expect(paybackTurns(best)).toBe(9.5);
    expect(paybackTurns(farSite)).toBeGreaterThan(paybackTurns(best));
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

  it('FR-129 FR-455 paper for next turn\'s training comes before the pairs, only while the hubs gather more than the labour works; none when training no longer pays', () => {
    // M12 strategy C (FR-455; it was: the new game's lumber mill makes 2 paper and no lumber). A new game's hubs gather
    // grain 4, fruit 4, cotton 2: 3 labour of the 12, so the start timber makes lumber for pairs and no paper
    const s = start();
    expect(nationOf(s, N2).warehouse.paper).toBe(0);
    expect(hubLabourNeed(s, N2)).toBe(3);
    expect(made(ordersOf(s)).paper).toBeUndefined();
    expect(made(ordersOf(s))).toMatchObject({ lumber: 2 });
    // 2 untrained workers (2 labour) work less than the hubs need: their 2 paper come first, 1 within the labour, no lumber
    const short = setIndustry(s, N2, { workers: { untrained: 2, trained: 0, expert: 0 } });
    expect(made(ordersOf(short))).toMatchObject({ paper: 1 });
    expect(made(ordersOf(short)).lumber).toBeUndefined();
    // 3 turns to go: a worker trained next turn would work only 2 turns (TRAIN_MIN_TURNS 3)
    expect(made(ordersOf(atTurn(short, turnLimitOf(short) - 3))).paper).toBeUndefined();
  });

  // 3 experts (12 labour) and no ores: no pair can be made, so the goods show alone
  const goodsOnly = (stock: Record<string, number>) =>
    setBuilding(
      setBuilding(
        setBuilding(
          setIndustry(emptyWarehouse(start(), N2, stock), N2, { workers: { untrained: 0, trained: 0, expert: 3 } }),
          N2, 'furnitureFactory', { capacity: 4 }
        ),
        N2, 'textileMill', { capacity: 4 }
      ),
      N2, 'lumberMill', { capacity: 4 }
    );

  it('FR-129 furniture only from the lumber that has no steel to pair with', () => {
    // 5 lumber, 1 steel: 4 unpaired make 2 furniture (2 lumber each), the last lumber stays with the steel
    expect(made(ordersOf(goodsOnly({ lumber: 5, steel: 1 })))).toEqual({ furniture: 2 });
    expect(made(ordersOf(goodsOnly({ lumber: 3, steel: 3 })))).toEqual({});
  });

  it('FR-140 a furniture takes 2 lumber: lumber that has a steel to pair with is not spent on it', () => {
    // Every next expansion step costs 4 pairs or more, so up to 3 pairs stay in stock for the run (FR-126)
    const grown = (stock: Record<string, number>) => {
      let s = goodsOnly(stock);
      for (const mill of ['steelMill', 'lumberMill', 'textileMill'] as const) s = setBuilding(s, N2, mill, { capacity: 8 });
      for (const factory of ['clothingFactory', 'furnitureFactory', 'metalWorks'] as const) s = setBuilding(s, N2, factory, { capacity: 4 });
      return s;
    };
    expect(ofKind(ordersOf(grown({ lumber: 4, steel: 3 })), 'expandBuilding')).toEqual([]);
    // 4 lumber, 3 steel: 1 unpaired lumber is half a furniture, so none (the old bound, lumber - steel, made 1 and left 2 lumber with 3 steel)
    expect(made(ordersOf(grown({ lumber: 4, steel: 3 })))).toEqual({});
    // 6 lumber, 1 steel: 5 unpaired make 2 furniture (the old bound made 3), and the 2 lumber left still pair with the steel
    expect(made(ordersOf(grown({ lumber: 6, steel: 1 })))).toEqual({ furniture: 2 });
  });

  it('FR-129 fabric and spare lumber for next turn\'s goods, not on the turn before the last', () => {
    // Clothing factory 2 wants 4 fabric (8 labour); furniture factory 4 wants 8 spare lumber, the 4 labour left make 2
    const s = setBuilding(goodsOnly({ cotton: 10, timber: 10 }), N2, 'clothingFactory', { capacity: 2 });
    expect(made(ordersOf(s))).toEqual({ fabric: 4, lumber: 2 });
    expect(made(ordersOf(atTurn(s, turnLimitOf(s) - 1)))).toEqual({});
  });

  it('FR-129 canned food from raw food above a meal comes last: only from the labour the pairs leave', () => {
    // The cans (3) already match the workers (3), so only the last step cans food
    const fed = (stock: Record<string, number>) => goodsOnly({ cannedFood: 3, grain: 20, fruit: 10, livestock: 10, ...stock });
    const withOres = setBuilding(fed({ coal: 3, ironOre: 3, timber: 10 }), N2, 'steelMill', { capacity: 4 });
    expect(made(ordersOf(withOres))).toEqual({ steel: 3, lumber: 3 });
    expect(made(ordersOf(fed({}))).cannedFood ?? 0).toBeGreaterThan(0);
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

  it('FR-131 the prospector tries the tiles in the FR-123 order: on or next to a depot first, then by distance over land to the capital', () => {
    const prospector = (s: GameState) => ordersOf(s).filter(o => 'workerId' in o && o.workerId === PROSPECTOR_2);
    const goTo = (toTileId: string) => [{ kind: 'moveAndStartProspecting', nationId: N2, workerId: PROSPECTOR_2, toTileId }];
    // Seed 1: of the nine hills he can prospect, 17-4 is nearest the capital
    expect(prospector(start())).toEqual(goTo('17-4'));
    // A depot on 20-3, the hills farthest away, joined to the capital: it and 20-4 next to it come first, in map order
    // (M12 FR-459: the depot is joined here; until FR-459 the test's depot had no rail)
    const depot = addDepot(setTile(start(), '20-3', { depot: true }), N2, { x: 20, y: 3 });
    const path = railPath(depot, N2, '20,3', capitalComponent(depot, N2))!;
    const node = (k: string) => ({ x: Number(k.split(',')[0]), y: Number(k.split(',')[1]) });
    const joined = path.slice(0, -1).reduceRight((s, k, i) => addRailroad(s, N2, node(k), node(path[i + 1])), depot);
    expect(capitalComponent(joined, N2).has('20,3')).toBe(true);
    expect(prospector(joined)).toEqual(goTo('20-3'));
    // FR-459: while the depot is not joined, its tile is left to the engineer's rail, so 20-4 next to it comes first
    expect(prospector(setTile(start(), '20-3', { depot: true }))).toEqual(goTo('20-4'));
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
