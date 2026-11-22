import { SHIPS } from "@/definisions/ships";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { UNIVERSITY_FEES, UNIVERSITY_TECHNOLOGY } from "@/definisions/universityFees";
import { DEVELOPMENT_COST } from "@/definisions/workPrices";
import { WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import type { Tile } from "@/types/Tile";
import { WorkerType } from "@/types/Workers";
import { hasAnotherPlanningSeason } from "./scriptedInfluence";
import { tradeCapacityOf } from "../market/market";
import type { SetUniversityOrder } from "../orders/Order";
import { validateCivilianOrder } from "../orders/civilianOrders";
import { nationById, nextResourceLevel, owns, workersOf } from "../orders/queries";
import { checkDevelopment } from "../orders/validate";
import { collectingHub } from "../systems/logisticsSystem";
import { tryApplyOrder } from "../orders/apply";
import { nextResearchSeason, researchView } from "./researchForecast";
import type { Order } from "../orders/Order";
import { availableTechnologies } from "../technology";
import { turnLimitOf } from "../turn/gameOver";
import type { Propose } from "./economy";
import { pendingRailTiles, tilesByReach } from "./railPlan";

/** FR-131: a level must repay its price in score and complete by the final turn. */
function developmentLevel(state: GameState, tile: Tile, workerType: WorkerType, startTurn: number): 1 | 2 | 3 | undefined {
  const level = nextResourceLevel(tile) as 1 | 2 | 3;
  const price = DEVELOPMENT_COST[level];
  if (price === undefined || price / SCORE_WEIGHTS.dollarsPerPoint > SCORE_WEIGHTS.pointsPerLevel) return undefined;
  const duration = WorkerLevelDurationsTurns[workerType]?.[level] ?? 1;
  return turnLimitOf(state) - startTurn >= duration - 1 ? level : undefined;
}

/** FR-131 and FR-123: cheapest payable level first, preserving reach order within a level. */
export function orderedDevelopmentSites(state: GameState, worker: { type: WorkerType }, byReach: Tile[]): Tile[] {
  return byReach.map(tile => ({ tile, level: developmentLevel(state, tile, worker.type, state.turn) }))
    .filter((job): job is { tile: Tile; level: 1 | 2 | 3 } => job.level !== undefined)
    .sort((a, b) => a.level - b.level)
    .map(job => job.tile);
}

/** FR-516's cooldown and full phases, including the Clipper fallback. */
export function fullTradePhases(state: GameState, nation: Nation): number {
  if (!state.provinces.length) return 0;
  const marine = nation.merchantMarine;
  if (Object.values(marine.pendingShips ?? {}).some(Boolean)
    || (marine.lastShipOrderTurn !== undefined && state.turn - marine.lastShipOrderTurn < 4)) return 0;
  return (marine.tradeHistory ?? []).slice(-4).filter(phase => phase.holds > 0 && phase.used === phase.holds).length;
}

const canBuild = (ship: "indiaman" | "clipper", lumber = 0, fabric = 0): boolean =>
  lumber >= SHIPS[ship].lumber && fabric >= SHIPS[ship].fabric;

export function planMerchantShip(state: GameState, nationId: string, propose: Propose): void {
  const nation = nationById(state, nationId)!;
  if (fullTradePhases(state, nation) < 3) return;
  const { lumber, fabric } = nation.warehouse;
  if (canBuild("indiaman", lumber, fabric)) propose({ kind: "setShipyard", nationId, ship: "indiaman", count: 1 });
  else if (nation.controller === "scripted" && canBuild("clipper", lumber, fabric) && owns(state, nationId, SHIPS.clipper.requiredTechnology)) {
    propose({ kind: "setShipyard", nationId, ship: "clipper", count: 1 });
  }
}

const RESEARCH_HORIZON = 3;

/** Even fully booked future seasons cannot qualify a fleet if too few phases will remain
 * in its four-season history. Today's booked holds are an upper bound on today's clearing. */
function couldOrderHull(state: GameState, nation: Nation): boolean {
  const fleet = nation.merchantMarine;
  if (!state.provinces.length || Object.values(fleet.pendingShips ?? {}).some(Boolean)) return false;
  const history = (fleet.tradeHistory ?? []).map(phase => phase.holds > 0 && phase.used === phase.holds);
  const { holds, used } = tradeCapacityOf(state, nation.id);
  const last = Math.min(turnLimitOf(state), state.turn + RESEARCH_HORIZON);
  for (let turn = state.turn + 1; turn <= last; turn++) {
    history.push(turn === state.turn + 1 ? holds > 0 && used === holds : true);
    if (turn - (fleet.lastShipOrderTurn ?? -Infinity) >= 4 && history.slice(-4).filter(Boolean).length >= 3) return true;
  }
  return false;
}

const specialists = [WorkerType.Rancher, WorkerType.Forester, WorkerType.Driller] as const;

/** One replacement for a missing specialist, when the University's actual non-technology
 * requirements and the first job in that worker's normal queue can both be funded. */
interface ReplacementPlan {
  order: SetUniversityOrder;
  technology: string;
  cost: number;
}

function replacementPlans(state: GameState, nation: Nation): ReplacementPlan[] {
  const roster = new Set(workersOf(state, nation.id).filter(({ worker }) => !worker.pendingDisband).map(({ worker }) => worker.type));
  const missing = specialists.filter(type => !roster.has(type) && !nation.university?.[type]);
  if (!missing.length) return [];
  const rail = pendingRailTiles(state, nation.id);
  const sites = tilesByReach(state, nation.id).filter(tile => !rail.has(tile.id));
  const plans: ReplacementPlan[] = [];
  for (const type of missing) {
    const order: SetUniversityOrder = { kind: "setUniversity", nationId: nation.id, civilianType: type, count: 1 };
    if (!validateCivilianOrder(state, nation, order, false).ok) continue;
    const worker = { type, nationId: nation.id };
    const site = orderedDevelopmentSites(state, worker, sites).find(tile => checkDevelopment(state, worker, tile).ok);
    if (!site || !collectingHub(state, nation.id, site.id)) continue;
    const level = developmentLevel(state, site, type, state.turn + 1);
    if (level) plans.push({ order, technology: UNIVERSITY_TECHNOLOGY[type]!, cost: UNIVERSITY_FEES[type] + DEVELOPMENT_COST[level] });
  }
  return plans;
}

export function planReplacement(state: GameState, nationId: string, reserve: number, propose: Propose): void {
  const nation = nationById(state, nationId)!;
  if (nation.controller !== "scripted" || state.technologyState) return;
  for (const plan of replacementPlans(state, nation)) {
    if (nation.treasury >= reserve + plan.cost && owns(state, nationId, plan.technology) && propose(plan.order)) return;
  }
}

type OrdinaryTurn = (state: GameState, nationId: string) => { view: GameState; orders: Order[] };

/** The buyer and its counterfactual both run the normal planner with research disabled.
 * Each next season starts after the already filed orders, including costs, upkeep, training,
 * the meal and disband returns. A hire must qualify for a payable collected job as usual. */
function firstUse(state: GameState, nationId: string, plan: OrdinaryTurn, deadline: number, wanted: (order: Order) => boolean): number | undefined {
  while (state.turn < deadline && hasAnotherPlanningSeason(state)) {
    const next = nextResearchSeason(state, nationId);
    // The vote counts after this turn's funded grants and public trade have settled.
    if (!hasAnotherPlanningSeason(next, state.turn)) return undefined;
    const planned = plan(next, nationId);
    if (planned.orders.some(wanted)) return planned.view.turn;
    state = planned.view;
  }
  return undefined;
}

export function planTechnology(state: GameState, nationId: string, reserve: number, propose: Propose, plan: OrdinaryTurn): void {
  const nation = nationById(state, nationId)!;
  if (nation.controller !== "scripted" || state.technologyState || nation.pendingTechnologies?.length
    || state.gameOver || state.turn >= turnLimitOf(state)) return;
  const offers = availableTechnologies(state, nationId)
    .filter(tech => tech.cost <= nation.treasury - reserve)
    .sort((a, b) => a.cost - b.cost);
  const roster = new Set(workersOf(state, nationId).filter(({ worker }) => !worker.pendingDisband).map(({ worker }) => worker.type));
  for (const tech of offers) {
    const ship = tech.id === SHIPS.clipper.requiredTechnology;
    const type = specialists.find(s => UNIVERSITY_TECHNOLOGY[s] === tech.id && !roster.has(s) && !nation.university?.[s]);
    if (ship ? !couldOrderHull(state, nation) : !type) continue;
    const visible = researchView(state, nationId);
    const order = { kind: "buyTechnology" as const, nationId, techId: tech.id };
    const paid = tryApplyOrder(visible, order);
    if (!paid.result.ok) continue;
    const use = ship
      ? (o: Order) => o.kind === "setShipyard" && o.ship === "clipper" && o.count > 0
      : (o: Order) => o.kind === "setUniversity" && o.civilianType === type && o.count > 0;
    const turn = firstUse(paid.state, nationId, plan, state.turn + RESEARCH_HORIZON, use);
    if (turn === undefined) continue;
    if (ship && firstUse(visible, nationId, plan, turn, o => o.kind === "setShipyard" && o.ship === "indiaman" && o.count > 0) !== undefined) continue;
    propose(order);
    return;
  }
}
