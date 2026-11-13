// How a scripted Great Power answers alliance and peace, and when it is losing a war (FR-174; no Imp1 rule is
// visible, rules 07 section 7.2, gaps E2; remake rule Q29). Pure reads of the state.
import type { CountryId, NationId } from "@/types/Common";
import type { War } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import { SCRIPTED_DIPLOMACY } from "@/definisions/diplomacyRules";
import { pairKey, relationLevel } from "./relations";
import { militaryStrength, warBetween } from "./queries";

/** `byId` took at least one of `ofId`'s provinces in this war. */
const tookProvince = (war: War, byId: CountryId, ofId: CountryId): boolean =>
  (war.captures ?? []).some((c) => c.toId === byId && c.fromId === ofId);

/**
 * The nation is losing its war with the enemy (FR-174 (a) or (b)): the enemy took at least one of its
 * provinces in this war, or its strength is below the enemy's. False at peace. In M6 there are no armies
 * and no conquest, so it is always false.
 */
export function losingWar(state: GameState, nationId: CountryId, enemyId: CountryId): boolean {
  const war = warBetween(state, nationId, enemyId);
  if (!war) return false;
  return tookProvince(war, enemyId, nationId) || militaryStrength(state, nationId) < militaryStrength(state, enemyId);
}

/** It accepts an alliance at level 6 (grey) or higher with the proposer, and never while at war with it. */
export function acceptsAlliance(state: GameState, answererId: NationId, proposerId: NationId): boolean {
  if (warBetween(state, answererId, proposerId)) return false;
  return (relationLevel(state, answererId, proposerId) ?? 0) >= SCRIPTED_DIPLOMACY.allianceLevel;
}

/**
 * It accepts peace, resolved on `turn`, when (a) the proposer took one of its provinces in this war, or
 * (b) its strength is below the proposer's, or (c) the war began 6 or more turns ago and no province
 * changed hands between the two in the last 3 turns (a capture recorded on turn t holds (c) back in the
 * diplomacy phases of turns t + 1 to t + 3). Example: war since turn 5, refused on turn 10, accepted on 11.
 */
export function acceptsPeace(state: GameState, answererId: NationId, proposerId: CountryId, turn: number): boolean {
  const war = warBetween(state, answererId, proposerId);
  if (!war) return false;
  if (losingWar(state, answererId, proposerId)) return true;
  const between = (war.captures ?? []).filter((c) => pairKey(c.fromId, c.toId) === pairKey(answererId, proposerId));
  const recent = between.some((c) => c.turn >= turn - SCRIPTED_DIPLOMACY.quietTurns);
  return turn - war.since >= SCRIPTED_DIPLOMACY.peaceAfterTurns && !recent;
}
