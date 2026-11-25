// The score (FR-067, FR-402, FR-403): a pure query on any state, for the HUD, the game-over record and AI players.
import type { GameState } from "@/types/GameState";
import type { BuildingType } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import type { Score } from "@/types/Score";
import { BUILDINGS } from "@/definisions/industryBuildings";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
import { constructionCost, DEVELOPMENT_COST } from "@/definisions/workPrices";
import { hasOpenCredit } from "../credit/account";
import { isConqueredProvince } from "../world/provinces";
import { collectingHub } from "../systems/logisticsSystem";
import { nationById } from "../orders/queries";

/** Capacity of the capped buildings; food processing has none, this turn's expansions count next turn. */
function capacityOf(nation: Nation): number {
  let sum = 0;
  for (const [name, building] of Object.entries(nation.industry.buildings)) {
    if (!building || !Object.hasOwn(BUILDINGS, name) || BUILDINGS[name as BuildingType].unlimited) continue;
    sum += Math.max(0, building.capacity);
  }
  return sum;
}

/** FR-403: the points of one resource level, the sum of `levelPoints` up to it (a level above 3 counts as 3). */
const levelWorth = (level: number): number =>
  SCORE_WEIGHTS.levelPoints.slice(0, Math.max(0, Math.floor(level))).reduce((sum, points) => sum + points, 0);

/** Resource levels on the nation's tiles and their points; an undiscovered resource gives nothing. */
function developmentOf(state: GameState, nationId: string) {
  const conquered = new Set(state.provinces.filter(p => p.ownerId === nationId && isConqueredProvince(p)).map(p => p.id));
  let uncollectedLevels = 0;
  let levels = 0;
  let points = 0;
  for (const tile of state.map.tiles.flat()) {
    if (tile.ownerNationId !== nationId || !tile.resource || tile.resource.discovered === false) continue;
    const level = Math.max(0, tile.resource.level ?? 0);
    if (level > 0 && tile.provinceId && conquered.has(tile.provinceId) && !collectingHub(state, nationId, tile.id)) {
      uncollectedLevels += level;
      continue;
    }
    levels += level;
    points += levelWorth(level);
  }
  return { levels, points, uncollectedLevels };
}

/**
 * FR-402: the nation's development and construction jobs not yet finished (a job leaves its tile when it finishes),
 * by its worker's nation: the cash paid for them and their points, floor(price / 100) each.
 */
function jobsOf(state: GameState, nationId: string): { paid: number; points: number } {
  let paid = 0;
  let points = 0;
  const count = (price: number) => {
    paid += price;
    points += Math.floor(price / SCORE_WEIGHTS.dollarsPerPoint);
  };
  for (const tile of state.map.tiles.flat()) {
    const ours = (workerId: string) => tile.workers.some((w) => w.id === workerId && w.nationId === nationId);
    if (tile.developmentJob && ours(tile.developmentJob.workerId)) count(DEVELOPMENT_COST[tile.developmentJob.targetLevel] ?? 0);
    if (tile.constructionJob && ours(tile.constructionJob.workerId)) count(constructionCost(tile.constructionJob.kind, tile.terrain));
  }
  return { paid, points };
}

export function scoreOf(state: GameState, nationId: string): Score {
  const nation = nationById(state, nationId);
  const treasury = nation?.treasury ?? 0;
  const scoringCash = hasOpenCredit(nation) ? treasury : Math.max(0, treasury);
  const capacity = nation ? capacityOf(nation) : 0;
  const development = nation ? developmentOf(state, nationId) : { levels: 0, points: 0, uncollectedLevels: 0 };
  const jobs = nation ? jobsOf(state, nationId) : { paid: 0, points: 0 };
  const points = {
    treasury: Math.floor(scoringCash / SCORE_WEIGHTS.dollarsPerPoint),
    industry: capacity * SCORE_WEIGHTS.pointsPerCapacity,
    development: development.points,
    workInProgress: jobs.points,
  };
  return {
    nationId,
    treasury,
    capacity,
    developedLevels: development.levels,
    ...(development.uncollectedLevels && { uncollectedConqueredLevels: development.uncollectedLevels }),
    jobsPaid: jobs.paid,
    points,
    total: points.treasury + points.industry + points.development + points.workInProgress,
  };
}

/** Every nation's score, highest total first; ties keep the nation order (the sort is stable). */
export const scoreTable = (state: GameState): Score[] =>
  state.nations.map((n) => scoreOf(state, n.id)).sort((a, b) => b.total - a.total);
