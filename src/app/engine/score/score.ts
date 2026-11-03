// The score (FR-067): a pure query on any state, for the HUD, the game-over record and AI players.
import type { GameState } from "@/types/GameState";
import type { BuildingType } from "@/types/Industry";
import type { Nation } from "@/types/Nation";
import type { Score } from "@/types/Score";
import { BUILDINGS } from "@/definisions/industryBuildings";
import { SCORE_WEIGHTS } from "@/definisions/scoreWeights";
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

/** Resource levels on the nation's tiles; an undiscovered resource gives nothing. */
function developedLevelsOf(state: GameState, nationId: string): number {
  let sum = 0;
  for (const tile of state.map.tiles.flat()) {
    if (tile.ownerNationId !== nationId || !tile.resource || tile.resource.discovered === false) continue;
    sum += Math.max(0, tile.resource.level ?? 0);
  }
  return sum;
}

export function scoreOf(state: GameState, nationId: string): Score {
  const nation = nationById(state, nationId);
  const treasury = nation?.treasury ?? 0;
  const capacity = nation ? capacityOf(nation) : 0;
  const developedLevels = nation ? developedLevelsOf(state, nationId) : 0;
  const points = {
    treasury: Math.max(0, Math.floor(treasury / SCORE_WEIGHTS.dollarsPerPoint)),
    industry: capacity * SCORE_WEIGHTS.pointsPerCapacity,
    development: developedLevels * SCORE_WEIGHTS.pointsPerLevel,
  };
  return { nationId, treasury, capacity, developedLevels, points, total: points.treasury + points.industry + points.development };
}

/** Every nation's score, highest total first; ties keep the nation order (the sort is stable). */
export const scoreTable = (state: GameState): Score[] =>
  state.nations.map((n) => scoreOf(state, n.id)).sort((a, b) => b.total - a.total);
