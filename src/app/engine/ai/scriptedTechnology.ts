import { developmentTechnology } from "@/definisions/developmentTechnology";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { DEVELOPMENT_COST } from "@/definisions/workPrices";
import { WorkerLevelDurationsTurns } from "@/definisions/workerDurations";
import type { GameState } from "@/types/GameState";
import type { Tile } from "@/types/Tile";
import type { Worker } from "@/types/Workers";
import { DEVELOPMENT_WORKER_TYPES, nationById, nextResourceLevel, workersOf } from "../orders/queries";
import { checkDevelopment } from "../orders/validate";
import { completeScheduledJobs } from "../systems/developmentSystem";
import { collectingHub } from "../systems/logisticsSystem";
import { availableTechnologies } from "../technology";
import { turnLimitOf } from "../turn/gameOver";
import type { Propose } from "./economy";
import { pendingRailTiles, tilesByReach } from "./railPlan";
import { upkeepReserve } from "./scriptedArmy";

/** FR-131: a level must repay its price in score and complete by the final turn. */
export function developmentLevel(state: GameState, tile: Tile, worker: Worker, startTurn = state.turn): number | undefined {
  const level = nextResourceLevel(tile) as 1 | 2 | 3;
  const price = DEVELOPMENT_COST[level];
  if (price === undefined || price / SCORE_WEIGHTS.dollarsPerPoint > SCORE_WEIGHTS.pointsPerLevel) return undefined;
  const duration = WorkerLevelDurationsTurns[worker.type]?.[level] ?? 1;
  return turnLimitOf(state) - startTurn >= duration - 1 ? level : undefined;
}

/** Public construction and development orders already specify their finish. */
export function freeFrom(tile: Tile, nextTurn: number, workerId?: string): number {
  return [tile.developmentJob, tile.constructionJob].reduce((turn, job) =>
    job && (!workerId || job.workerId === workerId) ? Math.max(turn, job.startedOnTurn + job.durationTurns) : turn, nextTurn);
}

/** FR-131 and FR-123: cheapest payable level first, preserving reach order within a level. */
export function orderedDevelopmentSites(state: GameState, worker: Worker, byReach: Tile[], turn = state.turn): Tile[] {
  return byReach.map(tile => ({ tile, level: developmentLevel(state, tile, worker, turn) }))
    .filter((job): job is { tile: Tile; level: number } => job.level !== undefined)
    .sort((a, b) => a.level - b.level)
    .map(job => job.tile);
}

type Developer = { worker: Worker; tile: Tile; ready: number; arrival: number };

/** Follow the known development queue using current cash, committed finishes and actual job
 * priority. New discoveries, future hires, future income and unbuilt collection hubs cannot fund a match. */
function schedulesProject(state: GameState, developers: Developer[], byReach: Tile[], targets: Map<string, number>, budget: number): boolean {
  const workers = developers.map(d => ({ ...d }));
  const ready = new Map(byReach.map(t => [t.id, freeFrom(t, state.turn)]));
  const sites = byReach.map(t => completeScheduledJobs(t, ready.get(t.id)!));
  let arrival = workers.length;
  for (let turn = state.turn; turn <= turnLimitOf(state) && budget >= DEVELOPMENT_COST[1];) {
    // workersOf reads the map row by row. A worker moving onto an occupied tile joins the end.
    workers.sort((a, b) => a.tile.y - b.tile.y || a.tile.x - b.tile.x || a.arrival - b.arrival);
    for (const actor of workers) {
      if (actor.ready > turn) continue;
      const open = sites.filter(t => ready.get(t.id)! <= turn);
      const site = orderedDevelopmentSites(state, actor.worker, open, turn).find(t =>
        DEVELOPMENT_COST[nextResourceLevel(t) as 1 | 2 | 3] <= budget && checkDevelopment(state, actor.worker, t).ok);
      if (!site) continue;
      const level = nextResourceLevel(site) as 1 | 2 | 3;
      if (targets.get(site.id) === level && developmentLevel(state, site, actor.worker, Math.max(state.turn + 1, turn))) return true;

      budget -= DEVELOPMENT_COST[level];
      actor.ready = turn + (WorkerLevelDurationsTurns[actor.worker.type]?.[level] ?? 1);
      if (actor.tile.id !== site.id) actor.arrival = arrival++;
      actor.tile = site;
      ready.set(site.id, actor.ready);
      sites[sites.indexOf(site)] = { ...site, resource: { ...site.resource!, level } };
    }
    const nextWorker = workers.reduce((next, w) => w.ready > turn ? Math.min(w.ready, next) : next, Infinity);
    const nextSite = sites.reduce((next, t) => {
      const available = ready.get(t.id)!;
      return available > turn ? Math.min(available, next) : next;
    }, Infinity);
    turn = Math.min(nextWorker, nextSite);
  }
  return false;
}

export function planTechnology(state: GameState, nationId: string, reserve: number, propose: Propose): void {
  const nation = nationById(state, nationId)!;
  if (nation.pendingTechnologies?.length) return;
  const candidates = availableTechnologies(state, nationId)
    .filter(tech => tech.cost <= nation.treasury - reserve)
    .sort((a, b) => a.cost - b.cost);
  if (!candidates.length) return;

  const nextTurn = state.turn + 1;
  const workers = workersOf(state, nationId)
    .filter(({ worker }) => !worker.pendingDisband && DEVELOPMENT_WORKER_TYPES.includes(worker.type))
    .map(({ tile, worker }, arrival) => ({ tile, worker, arrival, ready: freeFrom(tile, worker.justMoved ? nextTurn : state.turn, worker.id) }));
  const reservedTiles = pendingRailTiles(state, nationId);
  const owned = tilesByReach(state, nationId).filter(tile =>
    tile.resource && tile.resource.discovered !== false && !reservedTiles.has(tile.id));
  const collected = owned.filter(tile => collectingHub(state, nationId, tile.id))
    .map(tile => completeScheduledJobs(tile, freeFrom(tile, nextTurn)));
  const cashForJobs = nation.treasury - upkeepReserve(state, nationId);
  for (const tech of candidates) {
    const targets = new Map(collected.filter(t => developmentTechnology(t.resource!.type, nextResourceLevel(t)) === tech.id)
      .map(t => [t.id, nextResourceLevel(t)]));
    if (targets.size && schedulesProject(state, workers, owned, targets, cashForJobs - tech.cost)) {
      propose({ kind: "buyTechnology", nationId, techId: tech.id });
      return;
    }
  }
}
