// The score (FR-067) and the end of the game (FR-068).
import type { NationId } from "./Common";
import type { CouncilVote } from "./Council";

export interface Score {
  nationId: NationId;
  /** Cash in dollars. */
  treasury: number;
  /** Capacity points of the mills, factories and refinery (not food processing, not this turn's expansions). */
  capacity: number;
  /** Resource levels on the nation's own tiles (a level-2 farm counts 2). */
  developedLevels: number;
  /** FR-402: the cash paid for the nation's development and construction jobs not yet finished. */
  jobsPaid: number;
  /**
   * `development`: each level's points (FR-403: 10, 10 more, 50 more); `workInProgress`: floor(price / 100) for each
   * unfinished job (FR-402), until its own points replace them.
   */
  points: { treasury: number; industry: number; development: number; workInProgress: number };
  total: number;
}

/** Set when the last turn has resolved; the state does not change after it (FR-069). */
export interface GameOver {
  /** The last turn played and its year. */
  turn: number;
  year: number;
  /** Every nation's final score, highest first (`scoreTable`). */
  scores: Score[];
  /**
   * FR-223: "conquest" when one Great Power was left standing; FR-295: "council" when the Council of Governors elected a
   * winner; absent when the turn limit ended the game (FR-068).
   */
  reason?: "conquest" | "council";
  /** The Great Power left standing (FR-223) or elected (FR-295), with a `reason`. */
  winnerId?: NationId;
  /** FR-295: the vote that elected `winnerId`, with `reason` "council". */
  council?: CouncilVote;
}
