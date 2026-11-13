// Pure reads of the diplomacy state, the turn's diplomacy intents and the open proposals (M6). The order
// validation, the diplomacy phase, the scripted player and the Diplomacy screen all ask here.
import type { CountryId, NationId } from "@/types/Common";
import type { Overture, Proposal, War } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import type { AnswerIntent, DiplomacyIntent, Intent } from "@/types/Intent";
import { regimentsOf, strength } from "../army/armies";
import { relationOf } from "./relations";

/** The overtures of `proposeOverture`, in the Imp1 panel's order (FR-161). */
export const OVERTURES: readonly Overture[] = ["consulate", "embassy", "pact", "alliance", "war", "peace"];

export const isOverture = (kind: unknown): kind is Overture => typeof kind === "string" && (OVERTURES as readonly string[]).includes(kind);

const DIPLOMACY_INTENT_KINDS: readonly string[] = [...OVERTURES, "grant", "grant-stop", "trade-policy", "answer"];

/** An intent a diplomacy order stored (FR-161); other milestones' intents (army moves, attacks) are not. */
export const isDiplomacyIntent = (intent: Intent): intent is DiplomacyIntent => DIPLOMACY_INTENT_KINDS.includes(intent.kind);

/** The war between the two, if they are at war. */
export const warBetween = (state: GameState, a: CountryId, b: CountryId): War | undefined => relationOf(state, a, b)?.war;

/**
 * The war has begun (FR-167): a declaration ordered on turn T is recorded at its End Turn with `since`
 * T + 1, and a hostile act (an M9 attack) is valid only in orders of turn `since` or later.
 */
export function warActive(state: GameState, a: CountryId, b: CountryId): boolean {
  const war = warBetween(state, a, b);
  return war !== undefined && state.turn >= war.since;
}

/** What an intent took from the treasury when it was ordered and gives back if withdrawn or failed; 0 when free. */
export const intentCost = (intent: DiplomacyIntent): number => ("cost" in intent ? intent.cost : 0);

/**
 * This turn's diplomacy intents of the nation, in the order they were ordered, each with its cost (0 when
 * free); only those toward `targetId` when it is given (FR-177: the ordered overtures and their Withdraw
 * buttons). An answer to a proposal has no target.
 */
export function diplomacyIntentsOf(state: GameState, nationId: NationId, targetId?: CountryId): (DiplomacyIntent & { cost: number })[] {
  return state.intents
    .filter(isDiplomacyIntent)
    .filter((i) => i.nationId === nationId && (targetId === undefined || i.targetId === targetId))
    .map((i) => ({ ...i, cost: intentCost(i) }));
}

/** The open proposals (FR-166); none on a hand-built state without the field. */
export const proposalsOf = (state: GameState): Proposal[] => state.proposals ?? [];

/** A proposal may be answered on the turn after it was made, by the nation it was made to (FR-162). */
export const isAnswerable = (state: GameState, proposal: Proposal, nationId: NationId): boolean =>
  proposal.toId === nationId && proposal.turn === state.turn - 1;

const answerIntentOf = (state: GameState, proposalId: string): AnswerIntent | undefined =>
  state.intents.find((i): i is AnswerIntent => i.kind === "answer" && (i as AnswerIntent).proposalId === proposalId);

/** This turn's answer to the proposal: true accepted, false rejected, undefined not answered yet. */
export const proposalAnswer = (state: GameState, proposalId: string): boolean | undefined => answerIntentOf(state, proposalId)?.accept;

/**
 * The proposals the nation may answer this turn and has not answered yet, oldest first (FR-175: each opens
 * the Accept Offer dialog at the start of the human's turn).
 */
export const pendingProposalsFor = (state: GameState, nationId: NationId): Proposal[] =>
  proposalsOf(state).filter((p) => isAnswerable(state, p, nationId) && proposalAnswer(state, p.id) === undefined);

/**
 * A country's military strength (FR-174, FR-204): `strength` of all its regiments, every province counted, the sum
 * over those that are not militia of FPN x health / 100. A new continent game gives each Great Power the start army's
 * 36 and each minor 0 (militia only, FR-203); two-islands 0.
 */
export const militaryStrength = (state: GameState, countryId: CountryId): number => strength(regimentsOf(state, countryId));
