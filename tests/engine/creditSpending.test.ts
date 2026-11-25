import { describe, expect, it } from "vitest";
import { newGame } from "@/engine/newGame";
import type { Order } from "@/engine/orders/Order";
import { applyOrder, tryApplyOrder } from "@/engine/orders/apply";
import { diplomacyAfterThisTurn } from "@/engine/market/partners";
import { createTurnContext, type GameEvent } from "@/engine/turn/context";
import { tradeSystem } from "@/engine/systems/tradeSystem";
import { diplomacySystem } from "@/engine/systems/diplomacySystem";
import type { GameState } from "@/types/GameState";
import { ResourceType } from "@/types/Resource";
import { WorkerType } from "@/types/Workers";
import { deepFreeze, game, N1, N2, setIndustry, setPair, setTreasury, setWarehouse, T, treasury, workerId } from "./fixtures";

const open = (s: GameState) => applyOrder(s, { kind: "openCredit", nationId: N1 });
const continent = () => newGame({ seed: 1, world: "continent" });
const minor = "minor-1";
const embassyHeld = () => setPair(continent(), N1, minor, { consulates: [N1], embassies: [N1] });
const engineer = workerId(N1, WorkerType.Engineer);
const coalBid = (amount: number, nationId = N1): Order => ({ kind: "buyCommodity", nationId, commodity: ResourceType.Coal, amount });
const skilled = () => setIndustry(setWarehouse(game(), N1, { paper: 3 }), N1, { workers: { untrained: 2, trained: 1, expert: 1 } });
const grant = (amount: 1000 | 3000, locked = false): Order => ({ kind: "giveGrant", nationId: N1, targetId: minor, amount, locked });

function order(s: GameState, action: Order): GameState {
  const attempt = tryApplyOrder(s, action);
  expect(attempt.result).toEqual({ ok: true });
  return attempt.state;
}

function phase(s: GameState, system: typeof tradeSystem) {
  const events: GameEvent[] = [];
  const state = system(s, createTurnContext({ turn: s.turn, seed: s.seed, emit: e => events.push(e) }));
  return { events, state };
}

interface SpendCase {
  order: Order;
  cost: number;
  setup: () => GameState;
}

const purchases: SpendCase[] = [
  { order: { kind: "moveAndBuildRail", nationId: N1, workerId: engineer, toTileId: T.farm1 }, cost: 100, setup: game },
  { order: { kind: "moveAndStartProspecting", nationId: N1, workerId: workerId(N1, WorkerType.Prospector), toTileId: T.mountains1 }, cost: 100, setup: game },
  { order: { kind: "moveAndStartDevelopment", nationId: N1, workerId: workerId(N1, WorkerType.Farmer), toTileId: T.farm1 }, cost: 100, setup: game },
  { order: { kind: "moveAndStartConstruction", nationId: N1, workerId: engineer, toTileId: T.coastFarm1, structure: "port" }, cost: 3000, setup: game },
  { order: { kind: "setRecruitment", nationId: N1, regiment: "skirmishers", count: 1 }, cost: 200, setup: () => setWarehouse(continent(), N1, { armaments: 1 }) },
  { order: { kind: "setUniversity", nationId: N1, civilianType: WorkerType.Prospector, count: 1 }, cost: 500, setup: skilled },
  { order: { kind: "trainWorkers", nationId: N1, from: "untrained", delta: 1 }, cost: 100, setup: skilled },
  { order: { kind: "buyTechnology", nationId: N1, techId: "cottonGin" }, cost: 1000, setup: () => newGame(1) },
  { order: { kind: "proposeOverture", nationId: N1, targetId: minor, overture: "consulate" }, cost: 500, setup: continent },
  { order: grant(1000), cost: 1000, setup: embassyHeld },
  { order: coalBid(2), cost: 200, setup: () => newGame(1) },
  { order: coalBid(2), cost: 200, setup: () => setPair(continent(), N1, minor, { consulates: [N1] }) },
];

describe("FR-600 order-time reservations", () => {
  it.each(purchases)("charges $order.kind to exactly the line and refuses a dollar more atomically", ({ order: action, cost, setup }) => {
    const initial = open(setup());
    const short = deepFreeze(setTreasury(initial, N1, cost - 201));
    const attempt = tryApplyOrder(short, action);
    expect(attempt.state).toBe(short);
    expect(attempt.result).toEqual({ ok: false, reason: "insufficient-funds", cost, buyingPower: cost - 1 });
    expect(treasury(order(setTreasury(initial, N1, cost - 200), action), N1)).toBe(-200);
  });

  it("requires cash on hand for an embassy and the ordinary noncash prerequisites for recruitment", () => {
    const embassy: Order = { kind: "proposeOverture", nationId: N1, targetId: minor, overture: "embassy" };
    const s = setPair(open(continent()), N1, minor, { consulates: [N1] });
    expect(tryApplyOrder(setTreasury(s, N1, 4999), embassy).result).toMatchObject({ ok: false, reason: "insufficient-funds", cost: 5000, buyingPower: 4999 });
    expect(treasury(order(setTreasury(s, N1, 5000), embassy), N1)).toBe(0);
    expect(tryApplyOrder(setWarehouse(s, N1, { armaments: 0 }), { kind: "setRecruitment", nationId: N1, regiment: "regulars", count: 1 }).result).toEqual({ ok: false, reason: "insufficient-resources" });
  });

  it("checks only a grant edit's net cost and permits a refund or free pact even while over limit", () => {
    const s = order(setTreasury(open(embassyHeld()), N1, 2800), grant(1000));
    const raised = order(s, grant(3000));
    expect(treasury(raised, N1)).toBe(-200);
    const over = setTreasury(raised, N1, -3500);
    const lowered = order(over, grant(1000));
    expect(treasury(lowered, N1)).toBe(-1500);
    expect(treasury(order(lowered, { kind: "proposeOverture", nationId: N1, targetId: minor, overture: "pact" }), N1)).toBe(-1500);
  });

  it("funds a new locked grant on the line, while its later automatic repeat still needs cash", () => {
    const s = order(setTreasury(open(embassyHeld()), N1, 800), grant(1000, true));
    const first = phase(s, diplomacySystem);
    expect(first.events).toContainEqual(expect.objectContaining({ type: "grant-paid", nationId: N1, amount: 1000 }));
    // Now the line alone could pay the next grant: the treasury has $800 and buying power is $1000.
    const following = { ...setTreasury(first.state, N1, 800), turn: s.turn + 1, intents: [] };
    const repeat = phase(following, diplomacySystem);
    expect(repeat.events).toContainEqual(expect.objectContaining({ type: "grant-stopped", nationId: N1, reason: "insufficient-funds" }));
    expect(treasury(repeat.state, N1)).toBe(800);
  });
});

describe("FR-600 partner settlements", () => {
  it.each([
    { cash: 50, units: 2, ending: -200 },
    { cash: 49, units: 1, ending: -76 },
  ])("buys $units coal at $125 with $cash cash and a $200 credit line", ({ cash, units, ending }) => {
    const partners = setPair(continent(), N1, minor, { consulates: [N1], subsidies: { [N1]: 25 } });
    const bid = order(setTreasury(open(partners), N1, cash), coalBid(2));
    expect(treasury(bid, N1)).toBe(cash - 200);
    const trade = phase(deepFreeze(bid), tradeSystem);
    expect(trade.events).toContainEqual(expect.objectContaining({ type: "goods-bought", nationId: N1, amount: units, price: 125, cost: units * 125 }));
    expect(treasury(trade.state, N1)).toBe(ending);
    if (units < 2) expect(trade.events).toContainEqual(expect.objectContaining({ type: "offer-missed", reason: "no-cash", amount: 1 }));
  });

  it("refunds an unfilled reservation and does not expose a rival opening credit in its forecast", () => {
    const s = setTreasury(continent(), N1, 100);
    const active = open(s);
    const reserved = order(active, { kind: "buyCommodity", nationId: N1, commodity: ResourceType.Wool, amount: 2 });
    expect(treasury(reserved, N1)).toBe(-100);
    const trade = phase(reserved, tradeSystem);
    expect(trade.events).toContainEqual(expect.objectContaining({ type: "bid-unfilled", nationId: N1, amount: 2 }));
    expect(treasury(trade.state, N1)).toBe(100);
    expect(diplomacyAfterThisTurn(reserved, N2)).toEqual(diplomacyAfterThisTurn(s, N2));
  });

  it("keeps a cash-only partner's premium constrained when the other power opens credit", () => {
    const partners = setPair(open(continent()), N2, minor, { consulates: [N2], subsidies: { [N2]: 25 } });
    const reserved = order(setTreasury(partners, N2, 249), coalBid(2, N2));
    const trade = phase(reserved, tradeSystem);
    expect(trade.events).toContainEqual(expect.objectContaining({ type: "goods-bought", nationId: N2, amount: 1, cost: 125 }));
    expect(treasury(trade.state, N2)).toBe(124);
  });
});
