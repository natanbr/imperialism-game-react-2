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
 * at war with no one, it recruits one regiment a turn (FR-213's limits) until its field army is `strengthFactor` times
 * the weakest bordering minor's defence, then declares war; at war it attacks when the estimate is `attackRatio` or more.
 * From `greatPowerFromTurn`, with no minor left to take, the other Great Power is the target (FR-488).
 */
export const SCRIPTED_WAR = {
  fromTurn: 10,
  strengthFactor: 2,
  attackRatio: 1.5,
  /**
   * FR-482 (card Q119 (a), remake): it recruits the first regiment of the list it can raise this turn (a healthy worker of
   * the grade, the horses, the armaments in stock, the cash within the floor). Under a threat (FR-213) Regulars come
   * first; a campaign (FR-274, FR-488) starts with Cuirassiers, FR-274's tuned regiment (M9 decision card): the economy
   * trains every untrained worker by turn 4 (FR-130), and a Cuirassiers takes a trained worker and one of the 4 start
   * horses (FR-203); 3 of them (45) are twice Arvelia's 18.75. Every type here takes 1 or 2 armaments, so the 2 the
   * garrison's run keeps (SCRIPTED_GARRISON.armaments) cover any of them.
   */
  threatRegiments: ["regulars", "cuirassiers", "grenadiers", "artillery", "hussars", "skirmishers", "lightArtillery"] as readonly RegimentType[],
  campaignRegiments: ["cuirassiers", "grenadiers", "hussars", "regulars", "lightArtillery", "artillery", "skirmishers"] as readonly RegimentType[],
  /** FR-488 (card Q114 (b)): the first turn the other Great Power can be the campaign's target. */
  greatPowerFromTurn: 20,
  /** FR-488: no campaign on a Great Power within this many turns of a peace with it (a peace on turn 11 allows one from turn 21). */
  greatPowerPeaceTurns: 10,
  /**
   * M13 T-15 (FR-497, FR-247): a war on a minor is declared only while the treasury holds this many turns of the army's
   * upkeep: the minor's trade stops with the war (FR-185), and a minor falls 2 or 3 turns after it (measured). Without it a
   * both-scripted Valdoria declared on Arvelia, its only trade partner, with $336 and lost 6 regiments for want of pay.
   */
  minorWarUpkeepTurns: 4,
} as const;
