// The diplomacy state (FR-151, decision 4): one entry per pair of countries with at least one Great
// Power, keyed by pairKey. Pure reads and the start values; M6 adds the overtures that change it.
import type { CountryId } from "@/types/Common";
import type { DiplomacyState, PairDiplomacy } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import type { MinorNation } from "@/types/MinorNation";
import type { Nation } from "@/types/Nation";

/** The two country ids in string order joined by a bar: pairKey("nation-1", "minor-1") is "minor-1|nation-1". */
export const pairKey = (a: CountryId, b: CountryId): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** The highest relation points; a level is floor(points / 10), 0 to 8 (FR-151, Q24). */
export const MAX_RELATION_POINTS = 89;
export const POINTS_PER_LEVEL = 10;

/**
 * The nine Imp1 relation swatches, level 0 to 8 (rules 07 section 7.1, some names inferred [?]). The
 * player sees a level as "level 1 of 9" to "level 9 of 9".
 */
export const RELATION_SWATCHES = [
  "dark brown",
  "red",
  "orange",
  "yellow",
  "beige",
  "brown",
  "grey",
  "light green",
  "dark green",
] as const;
export type RelationSwatch = (typeof RELATION_SWATCHES)[number];

/** Q25: two Great Powers start neutral (beige) with embassies in each other (Imp1 manual p80). */
export const GREAT_POWER_START_POINTS = 40;
/** Q25: a Great Power and a minor start at the Imp1 human start, yellow (rules 07 section 7.1). */
export const MINOR_START_POINTS = 30;

const pair = (points: number, holders: string[] = []): PairDiplomacy => ({
  points,
  consulates: [...holders],
  embassies: [...holders],
  pact: false,
  alliance: false,
  boycotts: [],
  subsidies: {},
  lockedGrants: {},
});

/**
 * The diplomacy of a new game (FR-151): each pair of Great Powers at 40 points with consulates and
 * embassies both ways, marked as the start ones (FR-240), each Great Power and minor pair at 30 points
 * with nothing else. Two minors have no entry.
 */
export function startDiplomacy(nations: readonly Pick<Nation, "id">[], minorNations: readonly Pick<MinorNation, "id">[]): DiplomacyState {
  const diplomacy: DiplomacyState = {};
  nations.forEach((a, i) => {
    for (const b of nations.slice(i + 1)) {
      const holders = [a.id, b.id].sort();
      diplomacy[pairKey(a.id, b.id)] = { ...pair(GREAT_POWER_START_POINTS, holders), startTreaties: true };
    }
  });
  for (const nation of nations) {
    for (const minor of minorNations) diplomacy[pairKey(nation.id, minor.id)] = pair(MINOR_START_POINTS);
  }
  return diplomacy;
}

/** The pair's entry; undefined for two minors, a country paired with itself or an unknown id. */
export const relationOf = (state: GameState, a: CountryId, b: CountryId): PairDiplomacy | undefined =>
  a === b ? undefined : state.diplomacy[pairKey(a, b)];

/**
 * The level of a points value: floor(points / 10) of the points kept within 0 to 89, so 0 to 8 on
 * RELATION_SWATCHES. The one level rule: the diplomacy phase, the trade phase and the screens all read it here.
 */
export const levelOfPoints = (points: number): number =>
  Math.floor(Math.min(MAX_RELATION_POINTS, Math.max(0, points)) / POINTS_PER_LEVEL);

/** The pair's level (`levelOfPoints`); undefined where the pair has no entry. */
export function relationLevel(state: GameState, a: CountryId, b: CountryId): number | undefined {
  const entry = relationOf(state, a, b);
  return entry ? levelOfPoints(entry.points) : undefined;
}
