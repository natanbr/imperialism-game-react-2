import { setImmediate as yieldToRunner } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { SHIPS } from '@/definisions/ships';
import { technologyById } from '@/definisions/technologies';
import { UNIVERSITY_FEES, UNIVERSITY_TECHNOLOGY, type UniversityCivilian } from '@/definisions/universityFees';
import { DEVELOPMENT_COST } from '@/definisions/workPrices';
import { WorkerLevelDurationsTurns } from '@/definisions/workerDurations';
import { cashReserve, researchReserve } from '@/engine/ai/economy';
import { computerOrders } from '@/engine/ai/players';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { newGame } from '@/engine/newGame';
import { pendingRailTiles, tilesByReach } from '@/engine/ai/railPlan';
import { upkeepReserve } from '@/engine/ai/scriptedArmy';
import { tryApplyOrder } from '@/engine/orders/apply';
import { validateCivilianOrder } from '@/engine/orders/civilianOrders';
import { DEVELOPMENT_TERRAINS, hasJob, nationById, nextResourceLevel, workersOf } from '@/engine/orders/queries';
import { marketOf, tradeOrdersOf } from '@/engine/market/market';
import { marketModeOf, partnerRanking, settledTradeBarrier } from '@/engine/market/partners';
import { diplomacySystem } from '@/engine/systems/diplomacySystem';
import { collectingHub } from '@/engine/systems/logisticsSystem';
import { productionSystem } from '@/engine/systems/productionSystem';
import { tradeDeliverySystem } from '@/engine/systems/tradeDeliverySystem';
import { tradeSystem } from '@/engine/systems/tradeSystem';
import { availableTechnologies } from '@/engine/technology';
import { createTurnContext } from '@/engine/turn/context';
import { turnLimitOf } from '@/engine/turn/gameOver';
import { applyTurnOrders, resolveTurn } from '@/engine/turn/resolveTurn';
import type { GameState } from '@/types/GameState';
import { ResourceType } from '@/types/Resource';
import { COMPUTER_ID as id, type HumanPolicy } from './humans';
import { emptyWarehouse, setTreasury } from '../fixtures';
import { runGame } from './harness';

const K = 3;
type Observation = { turn: number; tech: string };
type Transaction = Observation & { cashBefore: number; cashAfter: number; floor: number; researchFloor: number };
const nationOf = (s: GameState) => nationById(s, id)!;
const reserve = (s: GameState) => Math.max(cashReserve(s, id), upkeepReserve(s, id));

// Derive demand from the Shipyard's stock, public trade history and committed mill output.
// An Indiaman that the existing plan can build already satisfies the freight demand.
function clipperNeeded(s: GameState): boolean {
  const { merchantMarine: fleet } = nationOf(s);
  if (!s.provinces.length || Object.values(fleet.pendingShips ?? {}).some(Boolean)) return false;
  if (fleet.lastShipOrderTurn !== undefined && s.turn + 1 - fleet.lastShipOrderTurn < 4) return false;
  if ((fleet.tradeHistory ?? []).slice(-3).filter(p => p.holds > 0 && p.holds === p.used).length < 2) return false;
  const ctx = createTurnContext({ turn: s.turn, seed: s.seed });
  // Run the actual clearing with only our orders. In a partners market, remove minors where a
  // competing Great Power could take precedence. Private rival bids cannot guarantee a fill.
  const market = marketOf(s);
  const filed = { ...s, market: { ...market, orders: { [id]: tradeOrdersOf(s, id) } }, intents: s.intents.filter(i => i.nationId === id) };
  const diplomatic = diplomacySystem(filed, ctx);
  const partners = marketModeOf(s) === 'partners';
  const certain = partners ? { ...diplomatic, minorNations: diplomatic.minorNations.filter(m =>
    partnerRanking(diplomatic, m.id).find(n => !settledTradeBarrier(diplomatic, n, m.id)) === id) } : diplomatic;
  const cleared = tradeSystem(certain, ctx);
  const history = nationOf(cleared).merchantMarine.tradeHistory ?? [];
  if (history.filter(p => p.holds > 0 && p.used === p.holds).length < 3) return false;
  const production = productionSystem(s, ctx);
  const onHand = nationOf(production).warehouse;
  const guaranteed = nationOf(tradeDeliverySystem({ ...production, market: cleared.market }, ctx)).warehouse;
  if ((guaranteed.lumber ?? 0) < SHIPS.clipper.lumber || (guaranteed.fabric ?? 0) < SHIPS.clipper.fabric) return false;
  const { buy, sell } = tradeOrdersOf(s, id);
  const possible = (good: 'lumber' | 'fabric') => partners
    ? (onHand[good] ?? 0) + (buy[good] ?? 0) + (sell[good] ?? 0) : (guaranteed[good] ?? 0);
  if (possible('lumber') >= SHIPS.indiaman.lumber && possible('fabric') >= SHIPS.indiaman.fabric) return false;
  // If the ordinary plan launches the regular hull within the same window with research
  // withheld, it already meets this freight demand. Replay only these few candidate turns.
  let future = resolveTurn(s, {}).state;
  while (!future.gameOver && future.turn <= s.turn + K) {
    const orders = scriptedPlayer(future, id, order => order.kind !== 'buyTechnology');
    if (orders.some(order => order.kind === 'setShipyard' && order.ship === 'indiaman' && order.count > 0)) return false;
    future = resolveTurn(future, { [id]: orders }).state;
  }
  return true;
}

// Ask the University whether the enrolment works with the technology requirement waived,
// then check for a collected job for that missing specialist. Ungated projects require no purchase.
function recruitNeeded(s: GameState, type: UniversityCivilian, moneyForWork: number, after?: GameState): boolean {
  const nation = nationOf(s);
  if (nation.university?.[type] || workersOf(s, id).some(({ worker }) => worker.type === type && !worker.pendingDisband)) return false;
  // Training, deliveries and the meal resolve before the next enrolment. The economy clears
  // the standing production orders before assigning an available expert to the University.
  const next = after ?? resolveTurn(s, {}).state;
  const staff = nationOf(next);
  const buildings = Object.fromEntries(Object.entries(staff.industry.buildings).map(([building, b]) => [building, { ...b, orders: {} }]));
  const freeStaff = { ...staff, industry: { ...staff.industry, buildings } };
  if (!validateCivilianOrder(next, freeStaff, { kind: 'setUniversity', nationId: id, civilianType: type, count: 1 }, false).ok) return false;
  const rail = pendingRailTiles(s, id);
  const sites = tilesByReach(s, id).filter(tile => tile.resource && tile.resource.discovered !== false && !hasJob(tile)
    && !rail.has(tile.id) && DEVELOPMENT_TERRAINS[type]?.includes(tile.terrain));
  for (const level of [1, 2] as const) {
    const nextJob = sites.find(tile => nextResourceLevel(tile) === level);
    if (nextJob) return !!collectingHub(s, id, nextJob.id)
      && turnLimitOf(s) >= s.turn + 2 + WorkerLevelDurationsTurns[type]![level] - 1
      && moneyForWork >= UNIVERSITY_FEES[type] + DEVELOPMENT_COST[level];
  }
  return false;
}

function affordableNeeds(s: GameState, after?: GameState): string[] {
  if (s.turn >= turnLimitOf(s)) return [];
  const spendable = nationOf(s).treasury - researchReserve(s, id);
  const needs: string[] = [];
  for (const tech of availableTechnologies(s, id)) {
    if (tech.cost > spendable) continue;
    if (tech.id === SHIPS.clipper.requiredTechnology && clipperNeeded(s)) needs.push(tech.id);
    for (const type of Object.keys(UNIVERSITY_TECHNOLOGY) as UniversityCivilian[]) {
      if (UNIVERSITY_TECHNOLOGY[type] === tech.id && recruitNeeded(s, type, spendable - tech.cost, after)) needs.push(tech.id);
    }
  }
  return needs;
}

function observeGame(seed: number, human: HumanPolicy | 'idle' = 'idle', turns = 40) {
  const needs: Observation[] = [];
  const buys: Transaction[] = [];
  const uses: Observation[] = [];
  const errors: string[] = [];
  const checkpoints = new Map<number, number>();
  const game = runGame({ seed, human, turns, observeTurn(before, orders, after) {
    const turn = before.turn;
    let state = before;
    const observeNeeds = () => {
      // A technology first becomes usable next season. No further action can be taken after the terminal turn.
      if (after.gameOver) return;
      for (const tech of affordableNeeds(state, after)) if (!needs.some(n => n.tech === tech && n.turn === turn)) needs.push({ turn, tech });
    };
    const bought = new Set<string>();
    for (const order of orders[id] ?? []) {
      const tried = tryApplyOrder(state, order);
      if (!tried.result.ok) {
        errors.push(`T${turn} ${order.kind} rejected: ${tried.result.reason}`);
        continue;
      }
      if (order.kind === 'buyTechnology') {
        observeNeeds();
        const tech = order.techId;
        const cashBefore = nationOf(state).treasury;
        const cashAfter = nationOf(tried.state).treasury;
        const floor = reserve(state);
        const researchFloor = researchReserve(state, id);
        buys.push({ turn, tech, cashBefore, cashAfter, floor, researchFloor });
        if (bought.size) errors.push(`T${turn} more than one purchase`);
        if (!needs.some(n => n.turn === turn && n.tech === tech)) errors.push(`T${turn} ${tech} has no affordable locked use`);
        if (cashBefore - cashAfter !== technologyById(tech)?.cost || cashAfter < floor || cashAfter < researchFloor) {
          errors.push(`T${turn} ${tech} payment or reserve`);
        }
        if (!nationOf(tried.state).pendingTechnologies?.includes(tech)) errors.push(`T${turn} ${tech} was not queued`);
        bought.add(tech);
      }
      if (order.kind === 'setUniversity' && order.count > (nationOf(state).university?.[order.civilianType] ?? 0)) {
        const tech = UNIVERSITY_TECHNOLOGY[order.civilianType];
        if (tech) uses.push({ turn, tech });
      }
      if (order.kind === 'setShipyard' && order.count > (nationOf(state).merchantMarine.pendingShips?.[order.ship] ?? 0)) {
        const tech = SHIPS[order.ship].requiredTechnology;
        if (tech) uses.push({ turn, tech });
      }
      state = tried.state;
    }
    observeNeeds(); // This also runs when the buyer emits no order.
    const owned = new Set(nationOf(after).technologies ?? []);
    const added = [...owned].filter(tech => !nationOf(before).technologies?.includes(tech));
    if (added.length !== bought.size || added.some(tech => !bought.has(tech))) errors.push(`T${turn} ownership differs from purchases`);
    checkpoints.set(turn, owned.size);
  } });
  for (const need of needs) {
    if (!buys.some(b => b.tech === need.tech && b.turn >= need.turn && b.turn < need.turn + K)) {
      errors.push(`T${need.turn} affordable ${need.tech} missed three-turn deadline`);
    }
  }
  for (const buy of buys) {
    if (!uses.some(u => u.tech === buy.tech && u.turn > buy.turn && u.turn <= buy.turn + K)) {
      errors.push(`T${buy.turn} ${buy.tech} had no accepted use within ${K} turns`);
    }
  }
  return { seed, lastTurn: game.turns.at(-1)!.turn, owned20: checkpoints.get(20), owned40: checkpoints.get(40),
    finalOwned: nationOf(game.final).technologies?.length ?? 0, needs, buys, uses, errors };
}

const games: ReturnType<typeof observeGame>[] = [];
for (let seed = 1; seed <= 24; seed++) {
  games.push(observeGame(seed));
  await yieldToRunner();
}
const failures = games.filter(g => g.errors.length);
const observed = games.reduce((sum, g) => sum + g.needs.length, 0);

it(`FR-547 affordable needs met within three turns in ${24 - failures.length}/24 idle games (${observed} need observations)`, () => {
  for (const game of games) console.info(JSON.stringify(game));
  for (const key of ['owned20', 'owned40'] as const) {
    const counts = games.map(g => g[key]).filter((x): x is number => x !== undefined).sort((a, b) => a - b);
    const mid = counts.length / 2;
    console.info(`${key}: ${counts.length}/24 reached; min/median/max ${counts.length
      ? [counts[0], (counts[Math.ceil(mid) - 1] + counts[Math.floor(mid)]) / 2, counts.at(-1)].join('/') : 'unplayed'}`);
  }
  expect(failures.map(({ seed, errors }) => ({ seed, errors }))).toEqual([]);
});

it('FR-547 the same observer sees an affordable need, payment, and a launch in a controlled continent game', () => {
  const game = observeGame(1, { name: 'full fleet', orders: () => [], setup(s) {
    if (s.turn !== 7) return s;
    const setup = setTreasury(emptyWarehouse(s, id, { lumber: 6, fabric: 2 }), id, 50000);
    // With no timber input the mills cannot supply the seventh lumber for an ordinary Indiaman.
    const tiles = setup.map.tiles.map(row => row.map(tile => tile.resource?.type === ResourceType.Timber
      ? { ...tile, resource: undefined } : tile));
    return { ...setup, map: { ...setup.map, tiles }, nations: setup.nations.map(n => n.id === id ? { ...n,
      merchantMarine: { ...n.merchantMarine, lastShipOrderTurn: undefined, tradeHistory: Array.from({ length: 3 }, () => ({ used: 4, holds: 4 })) },
    } : n) };
  } }, 7 + K);
  console.info('Controlled fleet', JSON.stringify(game));
  const tech = 'streamlinedHulls';
  expect(game.needs).toContainEqual({ turn: 7, tech });
  expect(game.buys).toContainEqual(expect.objectContaining({ turn: 7, tech }));
  expect(game.uses).toContainEqual({ turn: 8, tech });
  expect(game.errors).toEqual([]);
});

it.each([
  { reason: 'a guaranteed fourth trade phase', lastShipOrderTurn: undefined, history: [4, 4, 0, 4], lumber: 6, fabric: 2 },
  { reason: 'an expiring ship cooldown', lastShipOrderTurn: 36, history: [4, 4, 4, 4], lumber: 8, fabric: 4 },
])('FR-547 $reason makes a final-turn Clipper usable', ({ lastShipOrderTurn, history, lumber, fabric }) => {
  const start = newGame({ seed: 1, world: 'continent', market: 'world' });
  const stocked = setTreasury(emptyWarehouse(start, id, { lumber, fabric, clothing: 4, furniture: 4 }), id, 50000);
  const turn39: GameState = { ...stocked, turn: 39, nations: stocked.nations.map(n => n.id === id ? { ...n,
    merchantMarine: { ...n.merchantMarine, lastShipOrderTurn, tradeHistory: history.map(used => ({ used, holds: 4 })) },
  } : n) };
  const orders = computerOrders(turn39);
  const committed = orders[id].filter(order => order.kind !== 'buyTechnology');
  const demand = applyTurnOrders(turn39, { [id]: committed }, () => {}).state;
  expect(affordableNeeds(demand)).toContain('streamlinedHulls');
  const turn40 = resolveTurn(turn39, orders).state;
  expect(nationOf(turn40).merchantMarine.tradeHistory?.map(p => p.used)).toEqual([...history.slice(-3), 4]);
  expect(nationOf(turn40).warehouse).toMatchObject({ lumber: 6, fabric: 2 });
  expect(nationOf(turn40).technologies).toContain('streamlinedHulls');
  const final = resolveTurn(turn40, computerOrders(turn40)).state;
  expect(nationOf(final).merchantMarine.ships?.clipper).toBe(1);
});
