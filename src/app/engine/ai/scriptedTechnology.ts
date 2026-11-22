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
import { pendingRailTiles } from "./railPlan";

/** FR-131: a level must repay its price in score and complete by the final turn. */
export function developmentLevel(state: GameState, tile: Tile, worker: Worker, startTurn = state.turn): number | undefined {
  const level = nextResourceLevel(tile) as 1 | 2 | 3;
  const price = DEVELOPMENT_COST[level];
  if (price === undefined || price / SCORE_WEIGHTS.dollarsPerPoint > SCORE_WEIGHTS.pointsPerLevel) return undefined;
  const duration = WorkerLevelDurationsTurns[worker.type]?.[level] ?? 1;
  return turnLimitOf(state) - startTurn >= duration - 1 ? level : undefined;
}

/** Public construction and development orders already specify their finish. */
function freeFrom(tile: Tile, nextTurn: number, workerId?: string): number {
  return [tile.developmentJob, tile.constructionJob].reduce((turn, job) =>
    job && (!workerId || job.workerId === workerId) ? Math.max(turn, job.startedOnTurn + job.durationTurns) : turn, nextTurn);
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
    .map(({ tile, worker }) => ({ worker, ready: freeFrom(tile, nextTurn, worker.id) }));
  const reservedTiles = pendingRailTiles(state, nationId);
  const sites = state.map.tiles.flat().filter(tile => tile.ownerNationId === nationId
    && tile.resource && tile.resource.discovered !== false && !reservedTiles.has(tile.id)
    && collectingHub(state, nationId, tile.id)).map(current => {
    const ready = freeFrom(current, nextTurn);
    return { tile: completeScheduledJobs(current, ready), ready };
  });
  for (const tech of candidates) {
    for (const site of sites) {
      const tile = site.tile;
      const level = nextResourceLevel(tile) as 1 | 2 | 3;
      if (developmentTechnology(tile.resource!.type, level) !== tech.id || nation.treasury - tech.cost < DEVELOPMENT_COST[level]) continue;
      for (const { worker, ready } of workers) {
        if (!developmentLevel(state, tile, worker, Math.max(ready, site.ready))) continue;
        const result = checkDevelopment(state, worker, tile);
        if (!result.ok && result.reason === "missing-technology" && result.techId === tech.id) {
          propose({ kind: "buyTechnology", nationId, techId: tech.id });
          return;
        }
      }
    }
  }
}
