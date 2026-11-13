// The numbers of the M6 diplomacy rules (rules 07; the hidden Imp1 sizes are remake choices, Q24, Q29).
import type { GrantAmount, Overture, SubsidyPercent } from "@/types/Diplomacy";

/** What an overture costs when ordered (FR-161; Imp1 manual p79: consulate $500, embassy $5,000). */
export const OVERTURE_COST: Readonly<Record<Overture, number>> = {
  consulate: 500,
  embassy: 5000,
  pact: 0,
  alliance: 0,
  war: 0,
  peace: 0,
};

/** The four Imp1 grant sizes (Foreign Grants screen [07:W21]). */
export const GRANT_AMOUNTS: readonly GrantAmount[] = [1000, 3000, 5000, 10000];

/** Relation points a grant adds (FR-170; ratio 1:2:3:4 from the Imp1 guide [07:W23], sizes remake, Q24). */
export const GRANT_POINTS: Readonly<Record<GrantAmount, number>> = { 1000: 2, 3000: 4, 5000: 6, 10000: 8 };

/** The subsidy steps a trade policy may set; 0 removes the subsidy (FR-162; Imp1 Trade Policies panel, gaps F14). */
export const SUBSIDY_PERCENTS: readonly (0 | SubsidyPercent)[] = [0, 5, 10, 25, 50, 75, 100];

/** A pact adds one level ("significantly", Imp1 manual p80; FR-165, Q24). */
export const PACT_POINTS = 10;

/** FR-168 (rules 07 sections 2 and 7.1; sizes remake, Q24). */
export const WAR_RELATION = {
  /** The pair of a declaration loses this, once per war. */
  pair: -40,
  /** An aggressor that had a pact or an alliance with the target, with every other country. */
  brokenTreaty: -20,
  /** Every other minor with an aggressor that attacked a minor. */
  minorSolidarity: -5,
  /** Every other country at level 7 or 8 with the target, with the aggressor. */
  victimFriend: -10,
  /** Every other country at level 0 or 1 with the target, with the aggressor. */
  victimEnemy: 5,
} as const;

/** The levels (0 to 8) at which another country counts as the victim's friend or enemy (FR-168). */
export const VICTIM_FRIEND_LEVELS: readonly number[] = [7, 8];
export const VICTIM_ENEMY_LEVELS: readonly number[] = [0, 1];

/** FR-174 (Q29): the scripted Great Power's answers and peace offers. */
export const SCRIPTED_DIPLOMACY = {
  /** It accepts an alliance from this level (grey) up. */
  allianceLevel: 6,
  /** (c) a war that began this many turns ago or more... */
  peaceAfterTurns: 6,
  /** ...with no province changed hands between the two in this many turns. */
  quietTurns: 3,
  /** It proposes peace at most once in this many turns. */
  offerEveryTurns: 3,
} as const;
