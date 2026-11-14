// A Council of Governors vote (M10, FR-292 to FR-294; the Imp1 vote screen, rules 11 section 8.1).
import type { NationId, ProvinceId } from "./Common";

/** The four rows of the vote screen, in its order: where a nominee's votes come from (FR-292). */
export type CouncilRow = "controlled" | "colonies" | "otherGreatPowers" | "otherMinorNations";

/** One province's governor: the nominee it voted for and the row it counts in; both absent for an abstention. */
export interface CouncilBallot {
  provinceId: ProvinceId;
  forId?: NationId;
  row?: CouncilRow;
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
