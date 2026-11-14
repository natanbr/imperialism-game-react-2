// The M9 combat numbers (FR-218 to FR-220, FR-226; Imp1 hides its hit chance, damage per shot and morale, gaps D3, so
// these are remake rules a test can check, decision card Q32) and the scripted war rule (FR-228, FR-274 which replaces FR-229; Q35).
import type { RegimentType } from "../types/Unit";
import type { RegimentArm } from "./regiments";

export const COMBAT = {
  /** A battle runs at most this many rounds (FR-218). */
  maxRounds: 8,
  /** A shot hits when its draw from the combat stream is below this (FR-219). */
  hitChance: 0.7,
  /** Damage of a hit before protection: FPN x 4 - DEF x 2, at least 1 (FR-219). */
  firepowerFactor: 4,
  defenceFactor: 2,
  /** Protection in percent: a defender of a type that entrenches (Imp1 manual p89: 20% less damage). */
  entrenchedPercent: 20,
  /** Behind a fort of level L: 20 + 10 x L (Imp1 manual p89: levels 1 to 3 give 30, 40, 50%). */
  fortBasePercent: 20,
  fortPercentPerLevel: 10,
  /** A non-militia regiment hit to this health or less routs (FR-220). */
  routHealth: 25,
} as const;

/**
 * The firing order within a side (FR-218; Imp1 manual p87: cavalry before infantry before artillery). Sappers, the one
 * "engineers" type, are not recruitable in v2 (Q31); they fire last.
 */
export const FIRING_ORDER: readonly RegimentArm[] = ["cavalry", "infantry", "artillery", "engineers"];

/** The estimate's verdict thresholds (FR-226; Imp1 players attack at 1.75 to 2.5 times the enemy [08:W24] [?]). */
export const ESTIMATE = {
  likelyVictory: 1.5,
  uncertain: 0.75,
} as const;

/**
 * The scripted war (FR-228, FR-274 replacing FR-229; Imp1: the AI picks off minor nations, thresholds unknown, gaps E2). From `fromTurn`,
 * at war with no one, it recruits one `regiment` a turn (FR-213's limits) until its field army is `strengthFactor` times
 * the weakest bordering minor's defence, then declares war; at war it attacks when the estimate is `attackRatio` or more.
 * `regiment` is Cuirassiers, not FR-229's Regulars (M9 decision card, measured in the journal): the economy trains every
 * untrained worker by turn 4 (FR-130), so from turn 10 a Regulars (untrained worker) can never be raised; a Cuirassiers
 * takes a trained worker and one of the 4 start horses (FR-203), and 3 of them (45) are twice Arvelia's 18.75.
 */
export const SCRIPTED_WAR = {
  fromTurn: 10,
  regiment: "cuirassiers" as RegimentType,
  strengthFactor: 2,
  attackRatio: 1.5,
} as const;
