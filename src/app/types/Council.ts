// A Council of Governors vote (M10, FR-292 to FR-294, FR-310; the Imp1 vote screen, rules 11 section 8.1).
import type { CountryId, NationId, ProvinceId } from "./Common";

/** The four rows of the vote screen, in its order: where a nominee's votes come from (FR-292). */
export type CouncilRow = "controlled" | "colonies" | "otherGreatPowers" | "otherMinorNations";

/** A nominee as a free minor's governor weighs it (FR-293): their relation points and whether they are at war. */
export interface CouncilRelation {
  nationId: NationId;
  points: number;
  atWar: boolean;
}

/**
 * Why a governor abstained (FR-310), so the screen can say it: a free minor with no nominee at peace with it at 50 points
 * or more, or two tied ("relations", each nominee in nominee order); the province of a Great Power not nominated whose two
 * nominees are equally strong ("equal-strength"); a colony that still holds a province ("colony", hand-built states only).
 */
export type CouncilAbstention =
  | { reason: "relations"; nominees: CouncilRelation[] }
  | { reason: "equal-strength"; ownerId: NationId }
  | { reason: "colony"; ownerId: CountryId };

/**
 * One province's governor: the nominee it voted for and the row it counts in; both absent for an abstention, which says
 * why instead (FR-310; absent only for a province of no known country, which no valid state has).
 */
export interface CouncilBallot {
  provinceId: ProvinceId;
  forId?: NationId;
  row?: CouncilRow;
  abstention?: CouncilAbstention;
}

/** A nominee's column: its standing (FR-291), its votes by row and their total. */
export interface CouncilNominee {
  nationId: NationId;
  standing: number;
  controlled: number;
  colonies: number;
  otherGreatPowers: number;
  otherMinorNations: number;
  total: number;
}

export interface CouncilVote {
  /** One per province, abstentions included (a winner needs more than two thirds of all votes, not of those cast). */
  totalVotes: number;
  /** floor(2 x totalVotes / 3) + 1. */
  needed: number;
  /** The two nominees, the higher standing first (the left column of the screen). */
  nominees: [CouncilNominee, CouncilNominee];
  /** One per province, in `state.provinces` order. */
  ballots: CouncilBallot[];
  /** The nominee with at least `needed` votes; absent when there is none. */
  winnerId?: NationId;
}
