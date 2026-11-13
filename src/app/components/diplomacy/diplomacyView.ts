// What the Diplomacy screen and the Accept Offer dialog show, derived from the game (FR-175, FR-177, FR-178). No
// React, no store: the dialogs render these rows and send the orders they hold; validateOrder stays the judge, and a
// control it would refuse carries the refusal text so the dialog can disable it and say why.
import {
  countryName,
  diplomacyIntentsOf,
  GRANT_AMOUNTS,
  OVERTURE_COST,
  OVERTURES,
  RELATION_SWATCHES,
  relationLevel,
  relationOf,
  SUBSIDY_PERCENTS,
  validateOrder,
  type CountryId,
  type DiplomacyIntent,
  type GrantAmount,
  type Order,
  type Overture,
  type Proposal,
  type SubsidyPercent,
} from "@/engine";
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import { money, REFUSAL_TEXT } from "../gameText";

export type CountryKind = "Great Power" | "Minor nation";

/** A button and the order it sends; `refusal` is the FR-162 text when validateOrder would refuse the order. */
export interface ControlView {
  label: string;
  order: Order;
  refusal?: string;
}

/** One of this turn's diplomacy orders toward the country, with its cost and the order that takes it back. */
export interface OrderedView {
  id: string;
  text: string;
  /** What left the treasury when it was ordered and a withdrawal gives back. */
  cost: number;
  /** "$500", or "free". */
  costText: string;
  /** Absent for a stop of a standing grant, which cannot be taken back (FR-161). */
  withdraw?: ControlView;
}

export type PolicyView = { subsidyPercent: 0 | SubsidyPercent; boycott: boolean };

export interface CountryRowView {
  id: CountryId;
  name: string;
  kind: CountryKind;
  /** 0 to 8; undefined where the pair has no relation entry. */
  level?: number;
  /** "Yellow, level 4 of 9" (FR-177: never by colour alone). */
  relationText: string;
  /** "Consulate", "At war since turn 5", ...; empty when there is none. */
  treaties: string[];
  ordered: OrderedView[];
  /** The overtures that exist for this kind of country, in the Imp1 panel's order (FR-178). */
  overtures: ControlView[];
  /** "Stop grant" for a standing locked grant that may be stopped now; undefined otherwise. */
  stopGrant?: ControlView;
  /** The trade policy now: this turn's order if there is one, else the standing policy (the form's start values). */
  policy: PolicyView;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** "Yellow, level 4 of 9": the swatch name and the level counted from 1. */
export const relationText = (level: number): string => `${capitalize(RELATION_SWATCHES[level])}, level ${level + 1} of ${RELATION_SWATCHES.length}`;

const OVERTURE_LABEL: Record<Overture, string> = {
  consulate: "Consulate",
  embassy: "Embassy",
  pact: "Pact",
  alliance: "Alliance",
  war: "Declare war",
  peace: "Propose peace",
};

/** How this turn's overture reads in the ordered list. */
const ORDERED_TEXT: Record<Overture, string> = {
  consulate: "Consulate",
  embassy: "Embassy",
  pact: "Pact",
  alliance: "Alliance",
  war: "Declaration of war",
  peace: "Peace proposal",
};

/** The button text of an overture, with its cost when it has one: "Consulate ($500)", "Pact" (FR-178). */
export const overtureLabel = (overture: Overture): string =>
  OVERTURE_COST[overture] > 0 ? `${OVERTURE_LABEL[overture]} (${money(OVERTURE_COST[overture])})` : OVERTURE_LABEL[overture];

const control = (state: GameState, label: string, order: Order): ControlView => {
  const result = validateOrder(state, order);
  return result.ok ? { label, order } : { label, order, refusal: REFUSAL_TEXT[result.reason] };
};

/** "Give": a grant of that amount, once or each turn (FR-170, FR-178). */
export const grantControl = (state: GameState, nationId: NationId, targetId: CountryId, amount: GrantAmount, locked: boolean): ControlView =>
  control(state, "Give", { kind: "giveGrant", nationId, targetId, amount, locked });

/** "Set policy": the subsidy (0 for none) and the boycott toward the country (FR-171, FR-178). */
export const policyControl = (state: GameState, nationId: NationId, targetId: CountryId, subsidyPercent: 0 | SubsidyPercent, boycott: boolean): ControlView =>
  control(state, "Set policy", { kind: "setTradePolicy", nationId, targetId, subsidyPercent, boycott });

/** The grant amounts and subsidy steps the controls offer, with their display text. */
export const GRANT_OPTIONS: readonly { value: GrantAmount; text: string }[] = GRANT_AMOUNTS.map((value) => ({ value, text: money(value) }));
export const SUBSIDY_OPTIONS: readonly { value: 0 | SubsidyPercent; text: string }[] = SUBSIDY_PERCENTS.map((value) => ({
  value,
  text: value === 0 ? "none" : `${value}%`,
}));

function orderedText(intent: DiplomacyIntent): string {
  switch (intent.kind) {
    case "grant":
      return `Grant ${money(intent.amount)}, ${intent.locked ? "each turn" : "once"}`;
    case "grant-stop":
      return "Grant stops at End Turn";
    case "trade-policy":
      return `Trade policy: ${intent.subsidyPercent > 0 ? `subsidy ${intent.subsidyPercent}%` : "no subsidy"}${intent.boycott ? ", boycott" : ""}`;
    case "answer":
      return "Answer";
    default:
      return ORDERED_TEXT[intent.kind];
  }
}

function orderedView(state: GameState, nationId: NationId, targetId: CountryId, intent: DiplomacyIntent & { cost: number }): OrderedView {
  const text = orderedText(intent);
  const view: OrderedView = { id: intent.id, text, cost: intent.cost, costText: intent.cost > 0 ? money(intent.cost) : "free" };
  if (intent.kind === "grant-stop" || intent.kind === "answer") return view;
  const overture = intent.kind;
  return { ...view, withdraw: control(state, `Withdraw ${lowerFirst(text)}`, { kind: "withdrawOverture", nationId, overture, targetId }) };
}

/** The pair's standing treaties in words, in the FR-177 order. */
function treatiesOf(state: GameState, nationId: NationId, otherId: CountryId): string[] {
  const pair = relationOf(state, nationId, otherId);
  if (!pair) return [];
  const words: string[] = [];
  if (pair.consulates.includes(nationId)) words.push("Consulate");
  if (pair.embassies.includes(nationId)) words.push("Embassy");
  if (pair.pact) words.push("Pact");
  if (pair.alliance) words.push("Alliance");
  if (pair.war) words.push(`At war since turn ${pair.war.since}`);
  if (pair.boycotts.includes(nationId)) words.push("We boycott them");
  if (pair.boycotts.includes(otherId)) words.push("They boycott us");
  const subsidy = pair.subsidies[nationId];
  if (subsidy) words.push(`Subsidy ${subsidy}%`);
  const grant = pair.lockedGrants[nationId];
  if (grant) words.push(`Grant ${money(grant)} each turn`);
  return words;
}

function policyOf(state: GameState, nationId: NationId, otherId: CountryId, intents: readonly DiplomacyIntent[]): PolicyView {
  const ordered = intents.find((i) => i.kind === "trade-policy");
  if (ordered?.kind === "trade-policy") return { subsidyPercent: ordered.subsidyPercent, boycott: ordered.boycott };
  const pair = relationOf(state, nationId, otherId);
  return { subsidyPercent: pair?.subsidies[nationId] ?? 0, boycott: pair?.boycotts.includes(nationId) ?? false };
}

function rowOf(state: GameState, nationId: NationId, id: CountryId, kind: CountryKind): CountryRowView {
  const level = relationLevel(state, nationId, id);
  const intents = diplomacyIntentsOf(state, nationId, id);
  // A pact is between a Great Power and a minor, an alliance between Great Powers (FR-162)
  const offered = OVERTURES.filter((o) => (kind === "Great Power" ? o !== "pact" : o !== "alliance"));
  const stop = control(state, "Stop grant", { kind: "withdrawOverture", nationId, overture: "grant", targetId: id });
  const standingGrant = relationOf(state, nationId, id)?.lockedGrants[nationId] !== undefined;
  return {
    id,
    name: countryName(state, id) ?? id,
    kind,
    level,
    relationText: level === undefined ? "No relations" : relationText(level),
    treaties: treatiesOf(state, nationId, id),
    ordered: intents.map((i) => orderedView(state, nationId, id, i)),
    overtures: offered.map((o) => control(state, overtureLabel(o), { kind: "proposeOverture", nationId, overture: o, targetId: id })),
    stopGrant: standingGrant && !stop.refusal ? stop : undefined,
    policy: policyOf(state, nationId, id, intents),
  };
}

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, "en", { numeric: true });

/** One row per other country: the other Great Powers in founding order, then the minor nations in id order (FR-177). */
export function diplomacyRows(state: GameState, nationId: NationId): CountryRowView[] {
  const powers = state.nations.filter((n) => n.id !== nationId).map((n) => rowOf(state, nationId, n.id, "Great Power"));
  const minors = [...state.minorNations].sort(byId).map((m) => rowOf(state, nationId, m.id, "Minor nation"));
  return [...powers, ...minors];
}

/**
 * The Accept Offer sentence (FR-175, the Imp1 text): "Valdoria seeks to enter into an alliance with our great Empire.
 * Do you accept their offer?"; for peace "Valdoria asks for an end to our war. Do you accept?".
 */
export function proposalText(state: GameState, proposal: Proposal): string {
  const from = countryName(state, proposal.fromId) ?? proposal.fromId;
  return proposal.kind === "alliance"
    ? `${from} seeks to enter into an alliance with our great Empire. Do you accept their offer?`
    : `${from} asks for an end to our war. Do you accept?`;
}
