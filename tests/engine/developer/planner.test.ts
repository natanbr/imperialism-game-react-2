// M18j T-05: how the computer uses the Developer (FR-638) and what its planner may know (FR-640). Continent seed 1:
// Arvelia (minor-1) holds timber at 10-3, 11-3, 13-3 and 13-4, coal at 12-3, 10-4 and 12-5, iron ore at 12-4 and 11-5
// (barren hills), cotton at 13-5 and horses at 10-5. Testland's own coal and iron seams are hidden at the start, so its
// Miner has no home job: it is idle. Every board price starts at $100 and the turn limit is 40.
import { describe, expect, it } from 'vitest';
import { newGame } from '@/engine/newGame';
import { universityCapital } from '@/engine/orders/civilianOrders';
import { tryApplyOrder } from '@/engine/orders/apply';
import { validateOrder } from '@/engine/orders/validate';
import { computerOrders } from '@/engine/ai/players';
import { scriptedPlayer } from '@/engine/ai/scriptedPlayer';
import { developerOrders, heldTileOrders, purchaseReserve } from '@/engine/ai/scriptedDeveloper';
import { cashReserve } from '@/engine/ai/economy';
import { upkeepReserve } from '@/engine/ai/scriptedArmy';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { marketOf, priceOf } from '@/engine/market/market';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import type { TradeCommodity } from '@/types/Market';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { MINING_TERRAINS } from '@/definisions/terrainDefinitions';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';
import { deepFreeze, invariantViolations, locate, N1, N2, put, setPair, setTechnologies, setTile, setTreasury, tileAt, treasury } from '../fixtures';
import { HUMANS } from '../sim/humans';
import { frozenDiplomat, POLICIES } from '../sim/policies';

const ARVELIA = 'minor-1';
const SUNDMARK = 'minor-2';
const COAL = '12-3';
const IRON = '12-4';
const TIMBER = '10-3';
const SUNDMARK_TIMBER = '12-7';
const developer = (nationId: string) => `developer-${nationId}-1`;
const miner = (nationId: string) => `worker-${nationId}-5`;
const driller = (nationId: string) => `worker-${nationId}-6`;
const forester = (nationId: string) => `worker-${nationId}-4`;

const capitalOf = (state: GameState, nationId: string) => universityCapital(state, state.nations.find(n => n.id === nationId)!)!.id;

/** Test setup: the nation's one Developer, Available and unmoved, on its capital tile. */
function addDeveloper(state: GameState, nationId: string): GameState {
  const tileId = capitalOf(state, nationId);
  const worker: Worker = {
    id: developer(nationId), type: WorkerType.Developer, nationId, assignedTileId: tileId, efficiency: 100,
    status: WorkerStatus.Available, justMoved: false,
  };
  return setTile(state, tileId, { workers: [...tileAt(state, tileId).workers, worker] });
}

/** The nation holds an embassy (and a consulate) with the minor in the settled record. */
const embassy = (state: GameState, nationId: string, points = 60, minorId = ARVELIA) =>
  setPair(state, nationId, minorId, { points, consulates: [nationId], embassies: [nationId] });

/** Testland on `turn` with its Developer at the capital, an embassy in Arvelia at `points` and `cash`. */
const testland = (turn: number, points = 60, cash = 50_000) =>
  ({ ...addDeveloper(setTreasury(embassy(newGame({ seed: 1, world: 'continent' }), N1, points), N1, cash), N1), turn });

function setPrice(state: GameState, commodity: TradeCommodity, price: number): GameState {
  return { ...state, market: { ...state.market!, prices: { ...state.market!.prices, [commodity]: price } } };
}

/** Test setup: the worker busy, as if at a job this turn (the planner reads its status). */
const busy = (state: GameState, workerId: string) => {
  const tileId = state.map.tiles.flat().find(t => t.workers.some(w => w.id === workerId))!.id;
  return put(state, workerId, tileId, { status: WorkerStatus.Working });
};

/** Test setup: the tile held by `holderId` at `level`, as a settled purchase leaves it (FR-634). */
function hold(state: GameState, tileId: string, holderId = N1, level = 0, minorId = ARVELIA): GameState {
  const tile = tileAt(state, tileId);
  const held = setTile(state, tileId, { resource: { ...tile.resource!, level } });
  return { ...held, overseasLand: { ...held.overseasLand, [tileId]: { tileId, holderId, minorId, turn: 1, price: 2000 } } };
}

const purchases = (orders: readonly Order[]) => orders.filter(o => o.kind === 'buyLand');
const buy = (tileId: string, nationId = N1): Order => ({ kind: 'buyLand', nationId, workerId: developer(nationId), tileId });
const ordersOf = (orders: readonly Order[], workerId: string) => orders.filter(o => 'workerId' in o && o.workerId === workerId);

function developerPlan(state: GameState, nationId = N1): Order[] {
  const loc = state.map.tiles.flat().flatMap(tile => tile.workers.filter(w => w.id === developer(nationId)).map(worker => ({ worker, tile })))[0];
  return developerOrders(state, nationId, loc);
}

describe('FR-638 the Developer buys the tile with the shortest payback', () => {
  it('FR-638 the scripted player plans the Developer last, with one buyLand: coal with an idle Miner pays back before timber', () => {
    // Turn 14 at 75%: coal costs $2,000 + a $100 mine and pays floor(2 x 100 x 0.75) = $150 from three End Turns on
    // (payback 3 + 14 = 17 End Turns); timber costs $2,000 and pays $75 from this End Turn (payback 27).
    const orders = scriptedPlayer(deepFreeze(testland(14)), N1);
    expect(purchases(orders)).toEqual([buy(COAL)]);
    expect(ordersOf(orders, developer(N1))).toEqual([buy(COAL)]);
    const civilians = orders.flatMap((o, i) => ('workerId' in o && o.kind !== 'buyLand' ? [i] : []));
    expect(Math.max(-1, ...civilians)).toBeLessThan(orders.findIndex(o => o.kind === 'buyLand'));
  });

  it('FR-638 without an idle Miner it buys no mineral, only a tile that yields at level 0 (timber, first in map order)', () => {
    expect(developerPlan(testland(14))).toEqual([buy(COAL), buy('10-4'), buy(IRON), buy('11-5'), buy('12-5'), buy(TIMBER), buy('11-3'), buy('13-3'), buy('13-4'), buy('13-5')]);
    expect(developerPlan(busy(testland(14), miner(N1)))).toEqual([buy(TIMBER), buy('11-3'), buy('13-3'), buy('13-4'), buy('13-5')]);
    // The Driller cannot open a seam in the hills; nor can a Miner that is already working
    expect(purchases(scriptedPlayer(busy(testland(14), miner(N1)), N1))).toEqual([buy(TIMBER)]);
  });

  it('FR-638 a level-0 tile at 100%: bought on turn 21 its 20 paid End Turns return exactly the $2,000; on turn 22 it is one short', () => {
    const at = (turn: number) => busy(testland(turn, 85), miner(N1));
    expect((developerPlan(at(21)))[0]).toEqual(buy(TIMBER));
    expect(developerPlan(at(22))).toEqual([]);
  });

  it('FR-638 a coal tile at $50 and 100%: bought on turn 27 its mine pays 11 x $100 = the $1,000 + $100 exactly; on turn 28 it is one short', () => {
    const at = (turn: number) => setPrice(setPrice(testland(turn, 85), ResourceType.Coal, 50), ResourceType.IronOre, 40);
    expect(developerPlan(at(27))).toEqual([buy(COAL), buy('10-4'), buy('12-5')]);
    expect(developerPlan(at(28))).toEqual([]);
  });

  it('FR-638 a better relation pays back sooner: Sundmark at 100% before Arvelia at 75%', () => {
    const both = busy(embassy(testland(14), N1, 85, SUNDMARK), miner(N1));
    expect((developerPlan(both))[0]).toEqual(buy(SUNDMARK_TIMBER));
  });

  it('FR-638 it buys after the reserves: the cash reserve and the upkeep reserve, and nothing for grants it has nobody to give to', () => {
    const at = (cash: number) => busy(testland(14, 60, cash), miner(N1));
    const reserve = purchaseReserve(at(0), N1);
    // Arvelia borders Testland and is past the grant band (40 to 49 points), so the influence plan gives it no grant (FR-542)
    expect(reserve).toBe(Math.max(cashReserve(at(0), N1), upkeepReserve(at(0), N1)));
    expect(reserve).toBeGreaterThan(0);
    expect((developerPlan(at(2000 + reserve)))[0]).toEqual(buy(TIMBER));
    expect(developerPlan(at(2000 + reserve - 1))).toEqual([]);
  });

  it('FR-638 FR-490 it keeps the grants its influence plan will give before the next meeting, one for each grant turn still to come', () => {
    // Sundmark at 41 points with Testland's embassy takes a $1,000 grant (+2 points) on each of turns 16 to 19 before the
    // turn-20 meeting, staying within the grant band (40 to 49) to the last
    const courted = (turn: number) => embassy(testland(turn), N1, 41, SUNDMARK);
    const kept = (turn: number) => purchaseReserve(courted(turn), N1) - purchaseReserve(testland(turn), N1);
    expect(scriptedPlayer(courted(16), N1).filter(o => o.kind === 'giveGrant'))
      .toEqual([{ kind: 'giveGrant', nationId: N1, targetId: SUNDMARK, amount: 1000, locked: false }]);
    expect([15, 16, 17, 19].map(kept)).toEqual([4000, 3000, 2000, 0]);
    // No meeting is ahead on the meeting turn itself; the day after, the four grants of turns 26 to 29 are
    expect([20, 21].map(kept)).toEqual([0, 4000]);
    // Turn 14 is the last a $2,000 timber tile at 75% pays back by (27 paid End Turns); four grants are still to come
    const at = (cash: number) => busy(setTreasury(courted(14), N1, cash), miner(N1));
    const reserve = purchaseReserve(at(0), N1);
    expect(reserve).toBe(Math.max(cashReserve(at(0), N1), upkeepReserve(at(0), N1)) + 4000);
    expect((developerPlan(at(2000 + reserve)))[0]).toEqual(buy(TIMBER));
    expect(developerPlan(at(2000 + reserve - 1))).toEqual([]);
  });

  it('FR-638 FR-490 the grants kept are those its targets can still take before they leave the band (Codex task 62 finding 4)', () => {
    const courted = (turn: number, points: number) => embassy(testland(turn), N1, points, SUNDMARK);
    const grant: Order = { kind: 'giveGrant', nationId: N1, targetId: SUNDMARK, amount: 1000, locked: false };
    const base = (state: GameState) => Math.max(cashReserve(state, N1), upkeepReserve(state, N1));
    // At 45 points the grants of turns 16, 17 and 18 take Sundmark to 51, past the band: no grant on turn 19
    expect(purchaseReserve(courted(15, 45), N1) - base(courted(15, 45))).toBe(3000);
    // On turn 16 at 49 points its plan gives the grant, which takes Sundmark to 51: no grant is left to keep
    expect(scriptedPlayer(courted(16, 49), N1).filter(o => o.kind === 'giveGrant')).toEqual([grant]);
    const granted = tryApplyOrder(courted(16, 49), grant);
    expect(granted.result).toEqual({ ok: true });
    expect(purchaseReserve(granted.state, N1)).toBe(base(granted.state));
  });

  it('FR-638 FR-636 a war it declares this turn stops the share: no purchase or held-tile job in that Minor Nation (Codex task 62 finding 4)', () => {
    const declare: Order = { kind: 'proposeOverture', nationId: N1, overture: 'war', targetId: ARVELIA };
    const open = embassy(hold(testland(14), '10-4'), N1, 60, SUNDMARK);
    const war = tryApplyOrder(open, declare);
    expect(war.result).toEqual({ ok: true });
    const arvelian = (orders: Order[]) => orders.filter(o => 'tileId' in o && ['12-3', '10-4', '12-4', '11-5', '12-5', '10-3', '11-3', '13-3', '13-4', '13-5'].includes(o.tileId));
    expect(arvelian(developerPlan(open)).length).toBeGreaterThan(0);
    expect(arvelian(developerPlan(war.state))).toEqual([]);
    expect(developerPlan(war.state)[0]).toEqual(buy('12-10'));
    expect(heldTileOrders(open, N1, locate(open, miner(N1))!)).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: miner(N1), toTileId: '10-4' }]);
    expect(heldTileOrders(war.state, N1, locate(war.state, miner(N1))!)).toEqual([]);
    // The settlement rule stays: a war declared this turn begins next turn, so the purchase is still valid
    expect(validateOrder(war.state, buy(COAL))).toEqual({ ok: true });
  });

  it('FR-638 a held seam whose job does not pay keeps no Miner from a seam in another Minor Nation (Codex task 62 finding 6)', () => {
    // Testland's unopened holding in Arvelia, which boycotts it: no share, so its Miner starts no job there
    const open = embassy(testland(14), N1, 60, SUNDMARK);
    const blocked = setPair(hold(open, '10-4'), N1, ARVELIA, { boycotts: [ARVELIA] });
    expect(heldTileOrders(blocked, N1, locate(blocked, miner(N1))!)).toEqual([]);
    expect(developerPlan(blocked).slice(0, 2)).toEqual([buy('12-10'), buy('12-11')]);
    // A held seam that pays keeps one Miner; a second idle Miner still opens a new seam
    const waiting = hold(open, '10-4');
    expect(developerPlan(waiting)[0]).toEqual(buy(TIMBER));
    const capital = capitalOf(waiting, N1);
    const second: Worker = { ...locate(waiting, miner(N1))!.worker, id: 'worker-nation-1-second-miner', assignedTileId: capital };
    const two = setTile(waiting, capital, { workers: [...tileAt(waiting, capital).workers, second] });
    expect(developerPlan(two)[0]).toEqual(buy(COAL));
  });

  it('FR-638 FR-636 a tile is valued by what it adds to the rounded payment for its holder, Minor Nation and commodity (Codex task 62 finding 7)', () => {
    // Timber at $50 and 75%: one tile pays floor(37.5) = $37, two pay $75, so a second adds $38. On turn 14 (27 paid End
    // Turns) the $1,000 tile returns 27 x $38 = $1,026 beside a held one, and 27 x $37 = $999 alone
    const cheap = (state: GameState) => busy(setPrice(state, ResourceType.Timber, 50), miner(N1));
    expect(developerPlan(cheap(testland(14)))).not.toContainEqual(buy(TIMBER));
    expect(developerPlan(cheap(hold(testland(14), '11-3')))).toContainEqual(buy(TIMBER));
    // Coal at $51 and 75%: level 1 pays floor(76.5) = $76 and level 2 $153, so the $1,000 level-2 job adds $77. Ordered on
    // turn 26 it pays from the End Turn of turn 28: 13 x $77 = $1,001
    const mine = (turn: number) => setTechnologies(hold(setPrice(testland(turn), ResourceType.Coal, 51), COAL, N1, 1), N1, 'squareSetTimbering');
    expect(heldTileOrders(mine(26), N1, locate(mine(26), miner(N1))!)).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: miner(N1), toTileId: COAL }]);
    expect(heldTileOrders(mine(27), N1, locate(mine(27), miner(N1))!)).toEqual([]);
  });

  it('FR-638 an oil tile needs an idle Driller with Oil Drilling', () => {
    const oil = (s: GameState) => busy(setTile(s, COAL, { terrain: TerrainType.Swamp, resource: { type: ResourceType.Oil, level: 1, discovered: true } }), miner(N1));
    expect((developerPlan(oil(testland(14))))[0]).toEqual(buy(TIMBER));
    expect((developerPlan(oil(setTechnologies(testland(14), N1, 'oilDrilling'))))[0]).toEqual(buy(COAL));
    expect((developerPlan(busy(oil(setTechnologies(testland(14), N1, 'oilDrilling')), driller(N1))))[0]).toEqual(buy(TIMBER));
  });

  it('FR-638 a held seam still waiting for its Miner takes the idle Miner: no second mineral is bought', () => {
    expect((developerPlan(hold(testland(14), '10-4')))[0]).toEqual(buy(TIMBER));
    expect((developerPlan(hold(testland(14), '10-4', N1, 1)))[0]).toEqual(buy(COAL));
  });

  it('FR-638 nothing to buy without an open Minor Nation, a Developer at work, or the cash', () => {
    const closed = setPair(testland(14), N1, ARVELIA, { embassies: [] });
    expect(purchases(scriptedPlayer(closed, N1))).toEqual([]);
    expect(purchases(scriptedPlayer(testland(14, 60, 3000), N1))).toEqual([]);
    const buying = tryApplyOrder(testland(14), buy(COAL)).state;
    expect(purchases(scriptedPlayer(buying, N1))).toEqual([]);
  });
});

describe('FR-638 its Miner and Driller work held tiles after home candidates, under the payback rule', () => {
  it('FR-638 the idle Miner goes to the held level-0 seam; with a home seam to open it stays home', () => {
    const held = hold(testland(15), COAL);
    expect(ordersOf(scriptedPlayer(held, N1), miner(N1))).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: miner(N1), toTileId: COAL }]);
    const home = setTile(held, '5-2', { resource: { type: ResourceType.Coal, level: 0, discovered: true } });
    expect(ordersOf(scriptedPlayer(home, N1), miner(N1))).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: miner(N1), toTileId: '5-2' }]);
  });

  it('FR-638 a level-1 mine at $50 and 100% started on turn 38 pays its $100 once, exactly; on turn 39 it would finish too late', () => {
    const at = (turn: number) => hold(setPrice(testland(turn, 85), ResourceType.Coal, 50), COAL);
    expect(ordersOf(scriptedPlayer(at(38), N1), miner(N1))).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: miner(N1), toTileId: COAL }]);
    expect(ordersOf(scriptedPlayer(at(39), N1), miner(N1))).toEqual([]);
  });

  it('FR-638 only the Miner and the Driller go overseas: the Forester leaves a held timber tile alone', () => {
    const held = busy(hold(testland(15), TIMBER), miner(N1));
    for (const order of ordersOf(scriptedPlayer(held, N1), forester(N1))) expect(order).not.toMatchObject({ toTileId: TIMBER });
  });

  it('FR-638 FR-636 at war with the Minor Nation or under a boycott its Miner opens no held seam there, since no share is paid', () => {
    const held = hold(testland(15), COAL);
    expect(heldTileOrders(held, N1, locate(held, miner(N1))!)).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: miner(N1), toTileId: COAL }]);
    for (const patch of [{ war: { aggressors: [N1], since: 15 } }, { boycotts: [ARVELIA] }, { boycotts: [N1] }]) {
      const closed = setPair(held, N1, ARVELIA, patch);
      expect(heldTileOrders(closed, N1, locate(closed, miner(N1))!)).toEqual([]);
      expect(ordersOf(scriptedPlayer(closed, N1), miner(N1))).toEqual([]);
    }
  });

  it('FR-638 FR-454 an improver on a held tile still counts in the cash reserve of a nation without an army', () => {
    const held: GameState = { ...hold(testland(15), COAL), armies: [] };
    expect(cashReserve(put(held, miner(N1), COAL), N1)).toBe(cashReserve(held, N1));
    expect(cashReserve(put(held, miner(N1), TIMBER), N1)).toBe(cashReserve(held, N1) - 100);
  });

  it('FR-638 one End Turn flow: the scripted Testland buys coal, its Miner opens the mine, the profit arrives, every invariant holds', () => {
    // Without home seams for its Prospector to find, the Miner stays idle at home
    let state = testland(14);
    for (const tile of state.map.tiles.flat()) {
      if (tile.ownerNationId === N1 && (MINING_TERRAINS as readonly string[]).includes(tile.terrain)) state = setTile(state, tile.id, { resource: undefined });
    }
    const profits: number[][] = [];
    const expected: number[][] = [];
    for (let turn = 14; turn <= 19; turn++) {
      // FR-636: the trade phase pays at last turn's board price, which moves with the market from turn to turn
      const price = priceOf(marketOf(state), ResourceType.Coal);
      const orders = scriptedPlayer(state, N1);
      if (turn === 14) expect(purchases(orders)).toEqual([buy(COAL)]);
      if (turn === 15) expect(ordersOf(orders, miner(N1))).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: miner(N1), toTileId: COAL }]);
      const next = resolveTurn(state, { [N1]: orders });
      expect(next.events.filter(e => e.type === 'order-rejected')).toEqual([]);
      expect(invariantViolations(next.state, next.events)).toEqual([]);
      for (const e of next.events) {
        if (e.type !== 'overseas-profit') continue;
        profits.push([e.units, e.price, e.sharePercent, e.amount]);
        expected.push([2, price, 75, Math.floor((2 * price * 75) / 100)]);
      }
      state = next.state;
    }
    expect(state.overseasLand?.[COAL]?.holderId).toBe(N1);
    expect(tileAt(state, COAL).resource!.level).toBe(1);
    // The mine opens on the End Turn of turn 17 and pays on 17, 18 and 19: floor(2 units x that turn's price x 75 / 100)
    expect(profits.length).toBe(3);
    expect(profits).toEqual(expected);
  });
});

describe('FR-638 FR-640 the planner reads only what its own human could see', () => {
  /** Valdoria, the computer, with its Developer, an embassy in Arvelia and $50,000; Testland the same, human. */
  const rivals = () => deepFreeze(addDeveloper(setTreasury(embassy(testland(14), N2), N2, 50_000), N2));

  it("FR-640 Valdoria's Orders are identical with and without Testland's pending purchase, Developer move, profit or refund", () => {
    const start = rivals();
    const plan = computerOrders(start)[N2];
    expect(purchases(plan)).toEqual([buy(COAL, N2)]);
    const pending = tryApplyOrder(start, buy(COAL));
    expect(pending.result.ok).toBe(true);
    const moved = tryApplyOrder(start, { kind: 'moveWorker', nationId: N1, workerId: developer(N1), toTileId: COAL });
    expect(moved.result.ok).toBe(true);
    const paid = setTreasury(start, N1, treasury(start, N1)! + 174);
    const refunded = setTreasury(pending.state, N1, treasury(start, N1)!);
    for (const paired of [pending.state, moved.state, paid, refunded]) expect(computerOrders(paired)[N2]).toEqual(plan);
  });

  it("FR-640 validation of Valdoria's buyLand never depends on Testland's pending intent", () => {
    const start = rivals();
    const pending = tryApplyOrder(start, buy(COAL)).state;
    expect(validateOrder(pending, buy(COAL, N2))).toEqual(validateOrder(start, buy(COAL, N2)));
  });

  it("FR-640 Testland's settled holding is public: Valdoria then plans around the flag", () => {
    const held = hold(rivals(), COAL);
    expect(purchases(computerOrders(held)[N2])).toEqual([buy('10-4', N2)]);
  });
});

describe('FR-638 the frozen FR-509 diplomat refuses buyLand', () => {
  it('FR-638 the scripted policy buys; the frozen diplomat plans as it did before the Developer existed', () => {
    const withDeveloper = testland(14);
    const without = { ...setTreasury(embassy(newGame({ seed: 1, world: 'continent' }), N1, 60), N1, 50_000), turn: 14 };
    const context = { turn: 14, lastTrade: {} };
    expect(purchases(HUMANS.scripted.orders(withDeveloper, context))).toEqual([buy(COAL)]);
    // humans.ts stays frozen; its unwrapped diplomat would buy
    expect(purchases(HUMANS.diplomat.orders(withDeveloper, context))).toEqual([buy(COAL)]);
    expect(frozenDiplomat.orders(withDeveloper, context)).toEqual(HUMANS.diplomat.orders(without, context));
    expect(frozenDiplomat.name).toBe('diplomat');
    expect(POLICIES.diplomat).toBe(frozenDiplomat);
    expect({ ...POLICIES, diplomat: HUMANS.diplomat }).toEqual(HUMANS);
  });

  it('FR-638 the frozen diplomat plans no Order for its Developer', () => {
    const orders = frozenDiplomat.orders(testland(14), { turn: 14, lastTrade: {} });
    expect(ordersOf(orders, developer(N1))).toEqual([]);
  });
});
