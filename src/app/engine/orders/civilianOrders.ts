import { UNIVERSITY_FEES, UNIVERSITY_PAPER_COST, UNIVERSITY_TECHNOLOGY, type UniversityCivilian } from "@/definisions/universityFees";
import type { GameState } from "@/types/GameState";
import { canAfford } from "../credit/account";
import type { Nation } from "@/types/Nation";
import { MaterialType } from "@/types/Resource";
import { WorkerType } from "@/types/Workers";
import { freeWorkersOf } from "../army/armies";
import type { CivilianOrder, ValidationResult } from "./Order";
import { findWorker, hasMovedThisTurn, isWorkerBusy, owns } from "./queries";

export function universityCapital(state: GameState, nation: Nation) {
  const cityId = nation.cities[0];
  return cityId ? state.map.tiles.flat().find(tile => tile.cityId === cityId && tile.ownerNationId === nation.id) : undefined;
}

export function validateCivilianOrder(state: GameState, nation: Nation, order: CivilianOrder, requireTechnology = !state.technologyState): ValidationResult {
  if (order.kind === "setUniversity") {
    const { civilianType, count } = order;
    if (!Object.hasOwn(UNIVERSITY_FEES, civilianType)) return { ok: false, reason: "invalid-target" };
    if (!Number.isSafeInteger(count) || count < 0) return { ok: false, reason: "invalid-amount" };
    const increase = count - (nation.university?.[civilianType] ?? 0);
    if (increase <= 0) return { ok: true };
    if (!universityCapital(state, nation)) return { ok: false, reason: "invalid-target" };
    const techId = UNIVERSITY_TECHNOLOGY[civilianType];
    if (requireTechnology && techId && !owns(state, nation.id, techId)) return { ok: false, reason: "missing-technology", techId };
    if (freeWorkersOf(nation, "expert") < increase) return { ok: false, reason: "no-expert" };
    if ((nation.warehouse[MaterialType.Paper] ?? 0) < increase * UNIVERSITY_PAPER_COST) return { ok: false, reason: "insufficient-resources" };
    return canAfford(nation, increase * UNIVERSITY_FEES[civilianType]);
  }

  const actor = findWorker(state, order.workerId);
  if (!actor) return { ok: false, reason: "unknown-worker" };
  if (actor.worker.nationId !== nation.id) return { ok: false, reason: "not-owner" };
  // FR-629: the Developer is a diplomatic reward with no price, so it cannot be returned to the workforce
  if (order.kind === "disbandCivilian" && actor.worker.type === WorkerType.Developer) return { ok: false, reason: "wrong-worker-type" };
  if (order.kind === "cancelDisbandCivilian") return actor.worker.pendingDisband ? { ok: true } : { ok: false, reason: "invalid-target" };
  if (isWorkerBusy(actor.tile, actor.worker)) return { ok: false, reason: "worker-busy" };
  if (hasMovedThisTurn(actor.worker)) return { ok: false, reason: "worker-moved" };
  return { ok: true };
}

/** Also used to refund orders if the capital changes hands during combat. */
export function withUniversity(nation: Nation, type: UniversityCivilian, count: number): Nation {
  const increase = count - (nation.university?.[type] ?? 0);
  if (increase === 0) return nation;
  const university = { ...nation.university, [type]: count };
  if (!count) delete university[type];
  const workers = { ...nation.industry.workers, expert: nation.industry.workers.expert - increase };
  return {
    ...nation,
    university,
    treasury: nation.treasury - UNIVERSITY_FEES[type] * increase,
    warehouse: { ...nation.warehouse, [MaterialType.Paper]: (nation.warehouse[MaterialType.Paper] ?? 0) - UNIVERSITY_PAPER_COST * increase },
    industry: { ...nation.industry, workers },
  };
}

export function applyCivilianOrder(state: GameState, order: CivilianOrder): GameState {
  if (order.kind === "setUniversity") {
    return { ...state, nations: state.nations.map(n => n.id === order.nationId ? withUniversity(n, order.civilianType, order.count) : n) };
  }
  const { tile } = findWorker(state, order.workerId)!;
  const workers = tile.workers.map(worker => {
    if (worker.id !== order.workerId) return worker;
    const updated = { ...worker };
    if (order.kind === "disbandCivilian") updated.pendingDisband = true;
    else delete updated.pendingDisband;
    return updated;
  });
  const tiles = state.map.tiles.map((row, y) => y === tile.y ? row.map(t => t.id === tile.id ? { ...t, workers } : t) : row);
  return { ...state, map: { ...state.map, tiles } };
}
