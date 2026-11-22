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
import { upkeepOf } from "../army/armies";
import { planProduction } from "../industry/productionPlan";
import { recordHolds, tradeCapacityOf, tradeOrdersOf, marketOf, priceOf } from "../market/market";
import { boardOfTrade, diplomacyAfterThisTurn, marketModeOf, partnerRanking, settledTradeBarrier } from "../market/partners";
import type { SetUniversityOrder } from "../orders/Order";
import { validateCivilianOrder } from "../orders/civilianOrders";
import { nationById, nextResourceLevel, owns, workersOf } from "../orders/queries";
import { checkDevelopment } from "../orders/validate";
import { collectingHub, logisticsSystem } from "../systems/logisticsSystem";
import { productionSystem } from "../systems/productionSystem";
import { foodSystem } from "../systems/foodSystem";
import { transportConnectivitySystem } from "../systems/transportConnectivitySystem";
import { advanceClock, promoteFreightCars } from "../systems/turnHousekeeping";
import { createTurnContext } from "../turn/context";
import { tryApplyOrder } from "../orders/apply";
import { upkeepReserve } from "./scriptedArmy";
import type { TradeCommodity } from "@/types/Market";
import { availableTechnologies } from "../technology";
import { turnLimitOf } from "../turn/gameOver";
import type { Propose, planEconomy } from "./economy";
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
export function fullTradePhases(state: GameState, nation: Nation, nextSeason = false): number {
  if (!state.provinces.length) return 0;
  const marine = nation.merchantMarine;
  if (Object.values(marine.pendingShips ?? {}).some(Boolean)
    || (marine.lastShipOrderTurn !== undefined && state.turn + Number(nextSeason) - marine.lastShipOrderTurn < 4)) return 0;
  const full = (marine.tradeHistory ?? []).slice(nextSeason ? -3 : -4).filter(phase => phase.holds > 0 && phase.used === phase.holds).length;
  return nextSeason && full === 2 && currentTradeWillFill(state, nation) ? full + 1 : full;
}

/** The world market settles every filed order. In the partners market only count units a
 * visible minor can fill before a rival, without relying on that rival's private orders. */
function currentTradeWillFill(state: GameState, nation: Nation): boolean {
  const capacity = tradeCapacityOf(state, nation.id);
  if (!capacity.holds || capacity.used !== capacity.holds) return false;
  if (marketModeOf(state) === "world") return true;
  const after = diplomacyAfterThisTurn(state, nation.id);
  const first = new Set(after.minorNations.filter(minor =>
    partnerRanking(after, minor.id).find(id => !settledTradeBarrier(after, id, minor.id)) === nation.id).map(minor => minor.id));
  return boardOfTrade(state, nation.id).every(row => {
    const demand = row.buyers.reduce((n, m) => n + (first.has(m.minorId) ? m.units : 0), 0);
    // The bid already escrowed the board price. A subsidised bid may need more cash at settlement.
    const supply = row.sellers.reduce((n, m) => n + (first.has(m.minorId) && !m.subsidy ? m.units : 0), 0);
    return row.offer <= demand && row.bid <= supply;
  });
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

/** Forecast the next rolling window after the current trade phase.
 * Commit research only when the mills leave a buildable Clipper and even the nation's open
 * material bids or returned offers would leave the standard Indiaman short. */
function needsClipper(state: GameState, nation: Nation): boolean {
  if (fullTradePhases(state, nation, true) < 3) return false;
  const { stock, made } = planProduction(nation);
  const lumber = (stock.lumber ?? 0) + (made.lumber ?? 0);
  const fabric = (stock.fabric ?? 0) + (made.fabric ?? 0);
  const { buy, sell } = tradeOrdersOf(state, nation.id);
  if (marketModeOf(state) === "world") {
    const arrivingLumber = lumber + (buy.lumber ?? 0);
    const arrivingFabric = fabric + (buy.fabric ?? 0);
    return canBuild("clipper", arrivingLumber, arrivingFabric) && !canBuild("indiaman", arrivingLumber, arrivingFabric);
  }
  return canBuild("clipper", lumber, fabric)
    && !canBuild("indiaman", lumber + (buy.lumber ?? 0) + (sell.lumber ?? 0), fabric + (buy.fabric ?? 0) + (sell.fabric ?? 0));
}

const RESEARCH_HORIZON = 3;

/** Project our committed industry, freight, meal and funded world deals at known board
 * prices. Another power's unfiled trade cannot supply this forecast. */
function nextEconomicSeason(state: GameState, nationId: string): GameState {
  const afterDiplomacy = diplomacyAfterThisTurn(state, nationId);
  const ctx = createTurnContext({ turn: state.turn });
  const produced = productionSystem(afterDiplomacy, ctx);
  const shipped = logisticsSystem(transportConnectivitySystem(produced, ctx), ctx);
  const nation = nationById(shipped, nationId)!;
  const warehouse = { ...nation.warehouse };
  const board = marketOf(state);
  const { buy, sell } = tradeOrdersOf(state, nationId);
  const world = marketModeOf(state) === "world";
  let cash = nation.treasury - upkeepOf(state, nationId);
  if (world) {
    for (const [good, quantity] of Object.entries(buy) as [TradeCommodity, number][]) warehouse[good] = (warehouse[good] ?? 0) + quantity;
    for (const [good, quantity] of Object.entries(sell) as [TradeCommodity, number][]) cash += priceOf(board, good) * quantity;
  }
  const used = world || currentTradeWillFill(state, nation) ? tradeCapacityOf(state, nationId).used : 0;
  const following = recordHolds({ ...nation, treasury: Math.max(0, cash), warehouse }, used);
  const withTrade = { ...shipped, intents: [], market: { ...board, orders: {}, deliveries: {} },
    nations: shipped.nations.map(n => n.id === nationId ? following : n) };
  return advanceClock(promoteFreightCars(foodSystem(withTrade, ctx), ctx), ctx);
}

/** A Clipper adds the same four holds as an Indiaman. Keep the research money when the
 * existing economic orders can commission the standard hull inside the same planning window. */
function ordinaryHullWithinWindow(state: GameState, nationId: string, economy: typeof planEconomy): boolean {
  let next = nextEconomicSeason(state, nationId);
  const last = Math.min(turnLimitOf(state), state.turn + RESEARCH_HORIZON);
  while (next.turn <= last) {
    let ordered = false;
    economy(() => next, nationId, order => {
      const attempt = tryApplyOrder(next, order);
      if (!attempt.result.ok) return false;
      const cash = nationById(attempt.state, nationId)!.treasury;
      if (cash < nationById(next, nationId)!.treasury && cash < upkeepReserve(attempt.state, nationId)) return false;
      next = attempt.state;
      if (order.kind === "setShipyard" && order.ship === "indiaman" && order.count > 0) ordered = true;
      return true;
    });
    if (ordered) return true;
    if (next.turn === last) break;
    next = nextEconomicSeason(next, nationId);
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

function replacementPlans(state: GameState, nation: Nation, hireTurn: number): ReplacementPlan[] {
  const roster = new Set(workersOf(state, nation.id).filter(({ worker }) => !worker.pendingDisband).map(({ worker }) => worker.type));
  const missing = specialists.filter(type => !roster.has(type) && !nation.university?.[type]);
  if (!missing.length) return [];
  // The University gets first access to the next season's experts after standing factory
  // orders clear. This season's meal can leave an otherwise eligible expert sick.
  let staff = nation;
  if (hireTurn > state.turn) {
    const next = nationById(nextEconomicSeason(state, nation.id), nation.id)!;
    const buildings = Object.fromEntries(Object.entries(next.industry.buildings).map(([id, b]) => [id, { ...b, orders: {} }]));
    staff = { ...next, industry: { ...next.industry, buildings } };
  }
  const rail = pendingRailTiles(state, nation.id);
  const sites = tilesByReach(state, nation.id).filter(tile => !rail.has(tile.id));
  const plans: ReplacementPlan[] = [];
  for (const type of missing) {
    const order: SetUniversityOrder = { kind: "setUniversity", nationId: nation.id, civilianType: type, count: 1 };
    if (!validateCivilianOrder(state, staff, order, false).ok) continue;
    const worker = { type, nationId: nation.id };
    const site = orderedDevelopmentSites(state, worker, sites).find(tile => checkDevelopment(state, worker, tile).ok);
    if (!site || !collectingHub(state, nation.id, site.id)) continue;
    const level = developmentLevel(state, site, type, hireTurn + 1);
    if (level) plans.push({ order, technology: UNIVERSITY_TECHNOLOGY[type]!, cost: UNIVERSITY_FEES[type] + DEVELOPMENT_COST[level] });
  }
  return plans;
}

export function planReplacement(state: GameState, nationId: string, reserve: number, propose: Propose): void {
  const nation = nationById(state, nationId)!;
  if (nation.controller !== "scripted" || state.technologyState) return;
  for (const plan of replacementPlans(state, nation, state.turn)) {
    if (nation.treasury >= reserve + plan.cost && owns(state, nationId, plan.technology) && propose(plan.order)) return;
  }
}

/** FR-547: both supported unlocks have a realizable next-season order inside the three-turn
 * window. Resource development itself has no gate. Research follows already committed work. */
export function planTechnology(state: GameState, nationId: string, reserve: number, propose: Propose, economy: typeof planEconomy): void {
  const nation = nationById(state, nationId)!;
  if (nation.controller !== "scripted" || state.technologyState || nation.pendingTechnologies?.length
    || !hasAnotherPlanningSeason(state)) return;
  const offers = availableTechnologies(state, nationId)
    .filter(tech => tech.cost <= nation.treasury - reserve)
    .sort((a, b) => a.cost - b.cost);
  const university = offers.some(tech => specialists.some(type => UNIVERSITY_TECHNOLOGY[type] === tech.id))
    ? replacementPlans(state, nation, state.turn + 1) : [];
  for (const tech of offers) {
    const hire = university.find(plan => plan.technology === tech.id);
    if ((tech.id === SHIPS.clipper.requiredTechnology && needsClipper(state, nation) && !ordinaryHullWithinWindow(state, nationId, economy))
      || (hire && nation.treasury >= reserve + tech.cost + hire.cost)) {
      propose({ kind: "buyTechnology", nationId, techId: tech.id });
      return;
    }
  }
}
