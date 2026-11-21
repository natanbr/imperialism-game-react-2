import { describe, expect, it } from "vitest";
import type { SetUniversityOrder } from "@/engine/orders/Order";
import { applyOrder, tryApplyOrder } from "@/engine/orders/apply";
import { validateOrder } from "@/engine/orders/validate";
import { resolveTurn } from "@/engine/turn/resolveTurn";
import { MaterialType } from "@/types/Resource";
import { WorkerStatus, WorkerType } from "@/types/Workers";
import {
  deepFreeze, game, industryOf, locate, N1, N2, nationOf, put, setBuilding, setIndustry,
  setTechnologies, setTile, setTreasury, setWarehouse, stockOf, T, tileAt, treasury, workerId,
} from "./fixtures";

function university(civilianType: SetUniversityOrder["civilianType"], count = 1): SetUniversityOrder {
  return { kind: "setUniversity", nationId: N1, civilianType, count };
}

function start(expert = 2) {
  const state = setWarehouse(setTreasury(game(), N1, 3000), N1, { paper: 6, timber: 2 });
  return setIndustry(state, N1, { workers: { untrained: 0, trained: 0, expert }, buildings: {} });
}

const engineer = workerId(N1, WorkerType.Engineer);
const disband = { kind: "disbandCivilian", nationId: N1, workerId: engineer } as const;
const cancel = { ...disband, kind: "cancelDisbandCivilian" } as const;
const move = { kind: "moveWorker", nationId: N1, workerId: engineer, toTileId: T.farm1 } as const;

describe("FR-524 University technology", () => {
  it.each([
    [WorkerType.Rancher, "feedGrasses"],
    [WorkerType.Forester, "ironRailroadBridge"],
    [WorkerType.Driller, "oilDrilling"],
  ] as const)("requires the nation's own technology to train a %s and preserves its starting unit", (type, techId) => {
    const state = setTechnologies(setTechnologies(start(), N1), N2, techId);
    const order = university(type);
    const attempt = tryApplyOrder(state, order);
    expect(attempt.result).toEqual({ ok: false, reason: "missing-technology", techId });
    expect(attempt.state).toBe(state);
    expect(locate(state, workerId(N1, type))).toBeDefined();
    expect(tryApplyOrder(setTechnologies(state, N1, techId), order).result).toEqual({ ok: true });
  });
});

describe("FR-511 University", () => {
  it.each([
    [WorkerType.Prospector, 500], [WorkerType.Miner, 1500], [WorkerType.Engineer, 1000],
    [WorkerType.Rancher, 1000], [WorkerType.Farmer, 1000], [WorkerType.Forester, 1000], [WorkerType.Driller, 1000],
  ] as const)("charges the %s fee of %i, two paper and one healthy expert immediately", (type, fee) => {
    const initial = deepFreeze(setTechnologies(start(), N1, "feedGrasses", "ironRailroadBridge", "oilDrilling"));
    const { result, state } = tryApplyOrder(initial, university(type));
    expect(result).toEqual({ ok: true });
    expect(treasury(state, N1)).toBe(3000 - fee);
    expect(stockOf(state, N1, "paper")).toBe(4);
    expect(industryOf(state, N1).workers.expert).toBe(1);
    expect(nationOf(state, N2)).toBe(nationOf(initial, N2));
    expect(state.map).toBe(initial.map);
  });

  it("sets absolute counts, refunds only the difference, and delivers distinct available units exactly once", () => {
    const initial = start(3);
    const order = university(WorkerType.Engineer, 2);
    let ordered = applyOrder(initial, order);
    ordered = applyOrder(ordered, order);
    ordered = applyOrder(ordered, university(WorkerType.Engineer));
    ordered = applyOrder(ordered, university(WorkerType.Prospector, 2));
    expect(treasury(ordered, N1)).toBe(1000);
    expect(stockOf(ordered, N1, "paper")).toBe(0);
    expect(industryOf(ordered, N1).workers.expert).toBe(0);
    const saved = JSON.parse(JSON.stringify(ordered));
    const next = resolveTurn(saved, {}).state;
    const oldIds = new Set(initial.map.tiles.flat().flatMap(t => t.workers.map(w => w.id)));
    const graduates = tileAt(next, T.capital1).workers.filter(w => !oldIds.has(w.id));
    expect(graduates.map(w => w.type).sort()).toEqual(["engineer", "prospector", "prospector"]);
    expect(new Set(graduates.map(w => w.id)).size).toBe(3);
    for (const w of graduates) {
      expect(w).toMatchObject({ nationId: N1, status: WorkerStatus.Available, justMoved: false, assignedTileId: T.capital1 });
      expect(validateOrder(next, { ...move, workerId: w.id })).toEqual({ ok: true });
    }
    const again = resolveTurn(next, {}).state;
    expect(tileAt(again, T.capital1).workers).toHaveLength(tileAt(next, T.capital1).workers.length);
  });

  it("allows a full refund with no experts or money left, and cancels graduation", () => {
    const initial = setTreasury(start(1), N1, 1000);
    const cleared = applyOrder(applyOrder(initial, university(WorkerType.Engineer)), university(WorkerType.Engineer, 0));
    expect(treasury(cleared, N1)).toBe(1000);
    expect(stockOf(cleared, N1, "paper")).toBe(6);
    expect(industryOf(cleared, N1).workers.expert).toBe(1);
    expect(tileAt(resolveTurn(cleared, {}).state, T.capital1).workers).toHaveLength(tileAt(initial, T.capital1).workers.length);
  });

  it("refuses an absent, sick, training or production-committed expert and never spends on refusal", () => {
    const single = start(1);
    const unavailable = { expert: 1, trained: 0, untrained: 0 };
    for (const state of [
      start(0), setIndustry(single, N1, { sick: unavailable }), setIndustry(single, N1, { training: unavailable }),
      setBuilding(single, N1, "lumberMill", { capacity: 1, orders: { [MaterialType.Lumber]: 1 } }),
    ]) {
      const attempt = tryApplyOrder(state, university(WorkerType.Engineer));
      expect(attempt.result).toEqual({ ok: false, reason: "no-expert" });
      expect(attempt.state).toBe(state);
    }
  });

  it("rejects missing inputs, bad counts and unbuildable types", () => {
    const order = university(WorkerType.Miner);
    expect(validateOrder(setWarehouse(start(), N1, { paper: 1 }), order)).toEqual({ ok: false, reason: "insufficient-resources" });
    expect(validateOrder(setTreasury(start(), N1, 1499), order)).toEqual({ ok: false, reason: "insufficient-funds" });
    for (const count of [-1, 0.5, Infinity, NaN]) {
      expect(validateOrder(start(), { ...order, count })).toEqual({ ok: false, reason: "invalid-amount" });
    }
    expect(validateOrder(start(), { ...order, civilianType: WorkerType.Developer } as unknown as SetUniversityOrder)).toEqual({ ok: false, reason: "invalid-target" });
  });

  it("refunds an undeliverable order if the capital was lost before graduation", () => {
    const initial = start(1);
    const lost = (s: typeof initial) => setTile(s, T.capital1, { ownerNationId: N2 });
    const state = lost(applyOrder(initial, university(WorkerType.Engineer)));
    expect(validateOrder(state, university(WorkerType.Engineer, 2))).toEqual({ ok: false, reason: "invalid-target" });
    const next = resolveTurn(state, {}).state;
    expect(treasury(next, N1)).toBe(treasury(initial, N1));
    expect(stockOf(next, N1, "paper")).toBe(stockOf(initial, N1, "paper"));
    expect(industryOf(next, N1).workers.expert).toBe(1);
    expect(tileAt(next, T.capital1).workers).toHaveLength(tileAt(initial, T.capital1).workers.length);
  });
});

describe("FR-512 civilian disband", () => {
  it("reserves only the specified civilian, forbids work and duplicate orders, and allows cancellation", () => {
    const initial = deepFreeze(start(0));
    const { state, result } = tryApplyOrder(initial, disband);
    expect(result).toEqual({ ok: true });
    expect(locate(state, engineer)).toBeDefined();
    expect(validateOrder(state, move)).toEqual({ ok: false, reason: "worker-busy" });
    expect(validateOrder(state, disband)).toEqual({ ok: false, reason: "worker-busy" });
    expect(validateOrder(state, { ...disband, workerId: workerId(N1, WorkerType.Farmer) })).toEqual({ ok: true });
    expect(industryOf(state, N1).workers.expert).toBe(0);
    const cancelled = applyOrder(state, cancel);
    expect(validateOrder(cancelled, move)).toEqual({ ok: true });
    expect(validateOrder(cancelled, cancel)).toEqual({ ok: false, reason: "invalid-target" });
    expect(locate(resolveTurn(cancelled, {}).state, engineer)).toBeDefined();
  });

  it("returns one healthy expert after this turn's production and meal, once, without paper or cash", () => {
    const initial = start(0);
    const pending = applyOrder(initial, disband);
    expect(validateOrder(pending, university(WorkerType.Engineer))).toEqual({ ok: false, reason: "no-expert" });
    const baseline = resolveTurn(initial, {});
    const { state: next, events } = resolveTurn(JSON.parse(JSON.stringify(pending)), {});
    expect(locate(next, engineer)).toBeUndefined();
    expect(industryOf(next, N1).workers.expert).toBe(1);
    expect(industryOf(next, N1).sick.expert).toBe(0);
    expect(validateOrder(next, university(WorkerType.Engineer))).toEqual({ ok: true });
    expect(treasury(next, N1)).toBe(treasury(baseline.state, N1));
    expect(nationOf(next, N1).warehouse).toEqual(nationOf(baseline.state, N1).warehouse);
    expect(events.filter(e => e.type === "workers-fed" && e.nationId === N1)).toEqual([]);
    expect(validateOrder(next, cancel)).toEqual({ ok: false, reason: "unknown-worker" });
    expect(industryOf(resolveTurn(next, {}).state, N1).workers.expert).toBe(1);
  });

  it("rejects moved, working, missing and foreign civilians", () => {
    const initial = start();
    expect(validateOrder(applyOrder(initial, move), disband)).toEqual({ ok: false, reason: "worker-moved" });
    expect(validateOrder(put(initial, engineer, T.capital1, { status: WorkerStatus.Working }), disband)).toEqual({ ok: false, reason: "worker-busy" });
    expect(validateOrder(initial, { ...disband, workerId: "missing" })).toEqual({ ok: false, reason: "unknown-worker" });
    expect(validateOrder(initial, { ...disband, nationId: N2 })).toEqual({ ok: false, reason: "not-owner" });
    expect(validateOrder(applyOrder(initial, disband), { ...cancel, nationId: N2 })).toEqual({ ok: false, reason: "not-owner" });
  });
});
