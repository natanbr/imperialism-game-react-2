// How a scripted Great Power answers alliance and peace, and when it is losing a war (FR-174; no Imp1 rule is
// visible, rules 07 section 7.2, gaps E2; remake rule Q29). Pure reads of the state. M13 (FR-489, card Q115 (a);
// rules 10 sections 1 and 4: the AI makes peace once it got what it wanted): its own war on a Great Power is for one
// province.
import type { CountryId, NationId } from "@/types/Common";
import type { War } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import { SCRIPTED_DIPLOMACY } from "@/definisions/diplomacyRules";
import { pairKey, relationLevel } from "./relations";
import { militaryStrength, warBetween } from "./queries";
import { provinceById } from "../world/provinces";

/** `byId` took at least one of `ofId`'s provinces in this war. */
const tookProvince = (war: War, byId: CountryId, ofId: CountryId): boolean =>
  (war.captures ?? []).some((c) => c.toId === byId && c.fromId === ofId);

/** FR-488, FR-489: the nation declared its war with this Great Power (a war of limited aims, card Q115 (a)). */
export function warOfChoice(state: GameState, nationId: CountryId, enemyId: CountryId): boolean {
  const war = warBetween(state, nationId, enemyId);
  return war !== undefined && war.aggressors.includes(nationId) && state.nations.some((n) => n.id === enemyId);
}

/**
 * FR-489: in its war of choice on a Great Power the nation holds a province it took from that country in this war: it
 * got what it wanted, so it attacks no further province of that country, offers peace and accepts it.
 */
export const warAimHeld = (state: GameState, nationId: CountryId, enemyId: CountryId): boolean => warAimHeldSince(state, nationId, enemyId) !== undefined;

/** FR-489: the turn of the oldest capture that makes `warAimHeld` true (the province still held), or undefined. */
export function warAimHeldSince(state: GameState, nationId: CountryId, enemyId: CountryId): number | undefined {
  if (!warOfChoice(state, nationId, enemyId)) return undefined;
  return (warBetween(state, nationId, enemyId)!.captures ?? []).find(
    (c) => c.toId === nationId && c.fromId === enemyId && provinceById(state, c.provinceId)?.ownerId === nationId
  )?.turn;
}

/**
 * The nation is losing its war with the enemy (FR-174 (a) or (b)): the enemy took at least one of its
 * provinces in this war, or its strength (`militaryStrength`, FR-204) is below the enemy's. False at peace. With the
 * equal start armies (FR-203) and no conquest (M9) it holds only once one side has recruited more.
 */
export function losingWar(state: GameState, nationId: CountryId, enemyId: CountryId): boolean {
  const war = warBetween(state, nationId, enemyId);
  if (!war) return false;
  return tookProvince(war, enemyId, nationId) || militaryStrength(state, nationId) < militaryStrength(state, enemyId);
}

/**
 * FR-408 (card Q92): the enemy took one of the nation's provinces or won a battle against it in this war (`War.battles`).
 * What makes the scripted Great Power propose peace; its answers still read `losingWar` (FR-174). False at peace.
 */
export function beatenInWar(state: GameState, nationId: CountryId, enemyId: CountryId): boolean {
  const war = warBetween(state, nationId, enemyId);
  if (!war) return false;
  return tookProvince(war, enemyId, nationId) || (war.battles ?? []).some((b) => b.winnerId === enemyId && b.loserId === nationId);
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
 * FR-489: also when it holds what it went to war for (`warAimHeld`).
 */
export function acceptsPeace(state: GameState, answererId: NationId, proposerId: CountryId, turn: number): boolean {
  const war = warBetween(state, answererId, proposerId);
  if (!war) return false;
  if (losingWar(state, answererId, proposerId) || warAimHeld(state, answererId, proposerId)) return true;
  const between = (war.captures ?? []).filter((c) => pairKey(c.fromId, c.toId) === pairKey(answererId, proposerId));
  const recent = between.some((c) => c.turn >= turn - SCRIPTED_DIPLOMACY.quietTurns);
  return turn - war.since >= SCRIPTED_DIPLOMACY.peaceAfterTurns && !recent;
}
