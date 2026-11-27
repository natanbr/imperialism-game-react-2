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
import { resolveTurn } from '@/engine/turn/resolveTurn';
import type { Order } from '@/engine/orders/Order';
import type { GameState } from '@/types/GameState';
import type { TradeCommodity } from '@/types/Market';
import { ResourceType } from '@/types/Resource';
import { TerrainType } from '@/types/Tile';
import { MINING_TERRAINS } from '@/definisions/terrainDefinitions';
import { WorkerStatus, WorkerType, type Worker } from '@/types/Workers';
import { deepFreeze, invariantViolations, N1, N2, put, setPair, setTechnologies, setTile, setTreasury, tileAt, treasury } from '../fixtures';
import { HUMANS } from '../sim/humans';
import { frozenDiplomat, POLICIES } from '../sim/policies';

// Imported when a test runs, so each test of this file reports its own result before the module exists.
const planner = async () => await import('@/engine/ai/scriptedDeveloper');

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

async function developerPlan(state: GameState, nationId = N1): Promise<Order[]> {
  const { developerOrders } = await planner();
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

  it('FR-638 without an idle Miner it buys no mineral, only a tile that yields at level 0 (timber, first in map order)', async () => {
    expect(await developerPlan(testland(14))).toEqual([buy(COAL), buy('10-4'), buy(IRON), buy('11-5'), buy('12-5'), buy(TIMBER), buy('11-3'), buy('13-3'), buy('13-4'), buy('13-5')]);
    expect(await developerPlan(busy(testland(14), miner(N1)))).toEqual([buy(TIMBER), buy('11-3'), buy('13-3'), buy('13-4'), buy('13-5')]);
    // The Driller cannot open a seam in the hills; nor can a Miner that is already working
    expect(purchases(scriptedPlayer(busy(testland(14), miner(N1)), N1))).toEqual([buy(TIMBER)]);
  });

  it('FR-638 a level-0 tile at 100%: bought on turn 21 its 20 paid End Turns return exactly the $2,000; on turn 22 it is one short', async () => {
    const at = (turn: number) => busy(testland(turn, 85), miner(N1));
    expect((await developerPlan(at(21)))[0]).toEqual(buy(TIMBER));
    expect(await developerPlan(at(22))).toEqual([]);
  });

  it('FR-638 a coal tile at $50 and 100%: bought on turn 27 its mine pays 11 x $100 = the $1,000 + $100 exactly; on turn 28 it is one short', async () => {
    const at = (turn: number) => setPrice(setPrice(testland(turn, 85), ResourceType.Coal, 50), ResourceType.IronOre, 40);
    expect(await developerPlan(at(27))).toEqual([buy(COAL), buy('10-4'), buy('12-5')]);
    expect(await developerPlan(at(28))).toEqual([]);
  });

  it('FR-638 a better relation pays back sooner: Sundmark at 100% before Arvelia at 75%', async () => {
    const both = busy(embassy(testland(14), N1, 85, SUNDMARK), miner(N1));
    expect((await developerPlan(both))[0]).toEqual(buy(SUNDMARK_TIMBER));
  });

  it('FR-638 it buys after the reserves: the cash reserve, the upkeep reserve and the grants before the next meeting', async () => {
    const { purchaseReserve } = await planner();
    const at = (cash: number) => busy(testland(14, 60, cash), miner(N1));
    const reserve = purchaseReserve(at(0), N1);
    expect(reserve).toBeGreaterThan(4000);
    expect((await developerPlan(at(2000 + reserve)))[0]).toEqual(buy(TIMBER));
    expect(await developerPlan(at(2000 + reserve - 1))).toEqual([]);
    // Four $1,000 grants on turns 16 to 19 before the turn-20 meeting; two are left after turn 17
    expect(purchaseReserve(testland(15), N1) - purchaseReserve(testland(17), N1)).toBe(2000);
  });

  it('FR-638 an oil tile needs an idle Driller with Oil Drilling', async () => {
    const oil = (s: GameState) => busy(setTile(s, COAL, { terrain: TerrainType.Swamp, resource: { type: ResourceType.Oil, level: 1, discovered: true } }), miner(N1));
    expect((await developerPlan(oil(testland(14))))[0]).toEqual(buy(TIMBER));
    expect((await developerPlan(oil(setTechnologies(testland(14), N1, 'oilDrilling'))))[0]).toEqual(buy(COAL));
    expect((await developerPlan(busy(oil(setTechnologies(testland(14), N1, 'oilDrilling')), driller(N1))))[0]).toEqual(buy(TIMBER));
  });

  it('FR-638 a held seam still waiting for its Miner takes the idle Miner: no second mineral is bought', async () => {
    expect((await developerPlan(hold(testland(14), '10-4')))[0]).toEqual(buy(TIMBER));
    expect((await developerPlan(hold(testland(14), '10-4', N1, 1)))[0]).toEqual(buy(COAL));
  });

  it('FR-638 nothing to buy without an open Minor Nation, a Developer at work, or the cash', async () => {
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

  it('FR-638 FR-454 an improver on a held tile still counts in the cash reserve of a nation without an army', async () => {
    const { cashReserve } = await import('@/engine/ai/economy');
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
    const profits: number[] = [];
    for (let turn = 14; turn <= 19; turn++) {
      const orders = scriptedPlayer(state, N1);
      if (turn === 14) expect(purchases(orders)).toEqual([buy(COAL)]);
      if (turn === 15) expect(ordersOf(orders, miner(N1))).toEqual([{ kind: 'moveAndStartDevelopment', nationId: N1, workerId: miner(N1), toTileId: COAL }]);
      const next = resolveTurn(state, { [N1]: orders });
      expect(next.events.filter(e => e.type === 'order-rejected')).toEqual([]);
      expect(invariantViolations(next.state, next.events)).toEqual([]);
      profits.push(...next.events.flatMap(e => (e.type === 'overseas-profit' ? [e.amount] : [])));
      state = next.state;
    }
    expect(state.overseasLand?.[COAL]?.holderId).toBe(N1);
    expect(tileAt(state, COAL).resource!.level).toBe(1);
    // The mine opens on the End Turn of turn 17 and pays on 17, 18 and 19
    expect(profits.length).toBe(3);
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
