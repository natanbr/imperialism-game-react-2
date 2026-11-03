// The game calendar (rules 01 section 2): one turn is one season, four turns a year, and a
// random world starts in Spring 1815 (FR-027).
import { TIME_CONFIG } from "@/constants/gameConstants";

export type Season = "spring" | "summer" | "fall" | "winter";

export const SEASONS: readonly Season[] = ["spring", "summer", "fall", "winter"];

const PER_YEAR = TIME_CONFIG.TURNS_PER_YEAR;

/** The season of a turn; turn 1 is the first spring. */
export const seasonOf = (turn: number): Season =>
  SEASONS[(((turn - TIME_CONFIG.STARTING_TURN) % PER_YEAR) + PER_YEAR) % PER_YEAR];

/** True for winter, the last turn of a year: the year advances after it. */
export const isLastTurnOfYear = (turn: number): boolean => seasonOf(turn) === "winter";
