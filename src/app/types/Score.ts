// The score (FR-067) and the end of the game (FR-068).
import type { NationId } from "./Common";

export interface Score {
  nationId: NationId;
  /** Cash in dollars. */
  treasury: number;
  /** Capacity points of the mills, factories and refinery (not food processing, not this turn's expansions). */
  capacity: number;
  /** Resource levels on the nation's own tiles (a level-2 farm counts 2). */
  developedLevels: number;
  points: { treasury: number; industry: number; development: number };
  total: number;
}

/** Set when the last turn has resolved; the state does not change after it (FR-069). */
export interface GameOver {
  /** The last turn played and its year. */
  turn: number;
  year: number;
  /** Every nation's final score, highest first (`scoreTable`). */
  scores: Score[];
  /** FR-223: "conquest" when one Great Power was left standing; absent when the turn limit ended the game (FR-068). */
  reason?: "conquest";
  /** FR-223: the Great Power left standing, with `reason` "conquest". */
  winnerId?: NationId;
}
