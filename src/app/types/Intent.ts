// An intent (FR-152): what an order that involves a second country leaves in the state when it is
// applied. A turn phase resolves the turn's intents together, in `intentOrder` (engine/turn/intents.ts),
// and resolveTurn leaves none of the resolved turn. `Intent` is the stored shape every phase can read;
// each milestone adds its own kinds as narrower types (M6: the diplomacy intents below).
import type { CountryId, NationId, ProvinceId, RegimentId } from "./Common";
import type { GrantAmount, Overture, SubsidyPercent } from "./Diplomacy";

export interface Intent {
  /** "intent-<turn>-<n>", unique in the state. */
  id: string;
  kind: string;
  /** The Great Power whose order stored it. */
  nationId: NationId;
  /** The turn it was ordered on. */
  turn: number;
  /** The other country the order involves. */
  targetId?: CountryId;
}

/** `proposeOverture` (FR-161): `cost` left the treasury when ordered and comes back on a withdrawal or a failure. */
export interface OvertureIntent extends Intent {
  kind: Overture;
  targetId: CountryId;
  cost: number;
}

/** `giveGrant` (FR-161, FR-170): the amount is paid when ordered (`cost`). */
export interface GrantIntent extends Intent {
  kind: "grant";
  targetId: CountryId;
  amount: GrantAmount;
  locked: boolean;
  cost: number;
}

/** `withdrawOverture` "grant" with no grant this turn: ends the standing locked grant at End Turn (FR-161). */
export interface GrantStopIntent extends Intent {
  kind: "grant-stop";
  targetId: CountryId;
}

/** `setTradePolicy` (FR-161, FR-171): 0 removes the subsidy. */
export interface TradePolicyIntent extends Intent {
  kind: "trade-policy";
  targetId: CountryId;
  subsidyPercent: 0 | SubsidyPercent;
  boycott: boolean;
}

/** `answerProposal` (FR-161, FR-166). */
export interface AnswerIntent extends Intent {
  kind: "answer";
  proposalId: string;
  accept: boolean;
}

export type DiplomacyIntent = OvertureIntent | GrantIntent | GrantStopIntent | TradePolicyIntent | AnswerIntent;

/**
 * `moveArmy` (FR-205): the nation's regiments in `fromProvinceId` ordered into the bordering `toProvinceId`; the combat
 * phase marches them (FR-206). A regiment has at most one army intent: a later order for it replaces the earlier one.
 */
export interface ArmyMoveIntent extends Intent {
  kind: "army-move";
  fromProvinceId: ProvinceId;
  toProvinceId: ProvinceId;
  regimentIds: RegimentId[];
}

/** `disbandRegiments` (FR-207): the regiments leave at End Turn, before the upkeep step. */
export interface DisbandIntent extends Intent {
  kind: "disband";
  provinceId: ProvinceId;
  regimentIds: RegimentId[];
}

export type ArmyIntent = ArmyMoveIntent | DisbandIntent;
