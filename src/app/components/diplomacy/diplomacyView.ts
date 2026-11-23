// What the Diplomacy screen and the Accept Offer dialog show, derived from the game (FR-175, FR-177, FR-178). No
// React, no store: the dialogs render these rows and send the orders they hold; validateOrder stays the judge, and a
// control it would refuse carries the refusal text so the dialog can disable it and say why.
import {
  COUNCIL,
  countryName,
  diplomacyIntentsOf,
  GRANT_AMOUNTS,
  GRANT_POINTS,
  isMilitia,
  isLastMeeting,
  marketModeOf,
  militaryStrength,
  nextCouncilTurn,
  OVERTURE_COST,
  OVERTURES,
  pendingProposalsFor,
  provincesOf,
  RELATION_SWATCHES,
  regimentsOf,
  relationLevel,
  relationOf,
  scoreOf,
  SUBSIDY_PERCENTS,
  upkeepForecastWithGrant,
  validateOrder,
  type CountryId,
  type DiplomacyIntent,
  type GrantAmount,
  type Order,
  type Overture,
  type Proposal,
  type SubsidyPercent,
} from "@/engine";
import { PACT_POINTS, SCRIPTED_DIPLOMACY, WAR_RELATION } from "@/definisions/diplomacyRules";
import { seaWarRequirement } from "@/engine/navy/seaArmy";
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { GrantIntent } from "@/types/Intent";
import { money, REFUSAL_TEXT, upkeepWarningText } from "../gameText";

export type CountryKind = "Great Power" | "Minor nation";

/** A button and the order it sends; `refusal` is the FR-162 text when validateOrder would refuse the order. */
export interface ControlView {
  label: string;
  /** The control's short name, without its cost, for the line that gives its refusal ("Embassy"; FR-237). */
  name: string;
  order: Order;
  refusal?: string;
  /** FR-416: an overture's line beside its button: its cost and what it does, the numbers read from the rules. */
  help?: string;
}

/** One fact of the Strength block (FR-418): "Provinces" "6". */
export interface FactView {
  term: string;
  value: string;
}

/** A treaty chip (FR-177): its words, and for a treaty of the start "since the start" with why (FR-240). */
export interface TreatyView {
  text: string;
  note?: string;
  title?: string;
  war?: boolean;
}

/** One line under a control group: the controls that share a refusal, and the refusal (FR-237). */
export interface ReasonLine {
  names: string[];
  reason: string;
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

/** An offer from the country the player has not answered yet (FR-410): it stays answerable here until End Turn. */
export interface OfferView {
  id: string;
  /** "Valdoria asks for peace", "Valdoria offers an alliance". */
  text: string;
  /** What accepting does (FR-411). */
  effect: string;
  accept: ControlView;
  reject: ControlView;
}

export interface CountryRowView {
  id: CountryId;
  name: string;
  kind: CountryKind;
  /** 0 to 8; undefined where the pair has no relation entry. */
  level?: number;
  /** "Yellow, level 4 of 9" (FR-177: never by colour alone). */
  relationText: string;
  /** "Consulate", "At war since turn 5", ...; empty when there is none. */
  treaties: TreatyView[];
  ordered: OrderedView[];
  /** The overtures that exist for this kind of country, in the Imp1 panel's order (FR-178). */
  overtures: ControlView[];
  /**
   * "Stop grant" while a locked grant stands and no stop is queued; undefined otherwise. Disabled while a grant is
   * ordered this turn: its order would take that grant back instead (FR-161), so the player withdraws it first.
   */
  stopGrant?: ControlView;
  /** The treaty a declaration of war would break, which costs relations with every other country (FR-168). */
  brokenByWar?: "pact" | "alliance";
  /** A minor nation: a war on it lowers relations with every other minor nation (FR-168, FR-238). */
  warOnMinor: boolean;
  /** The trade policy now: this turn's order if there is one, else the standing policy (the form's start values). */
  policy: PolicyView;
  /** Its offers to the player still unanswered this turn, oldest first (FR-410). */
  offers: OfferView[];
  /** FR-418: its provinces, army and (a Great Power) industry; a minor its provinces and militia. */
  strength: FactView[];
  /**
   * FR-417: a free minor on a world with a Council, "Arvelia: 30 with us, 46 with Valdoria; a vote needs 50 and more than
   * the rival"; undefined otherwise.
   */
  vote?: string;
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

const control = (state: GameState, label: string, order: Order, name = label): ControlView => {
  const result = validateOrder(state, order);
  return result.ok ? { label, name, order } : { label, name, order, refusal: REFUSAL_TEXT[result.reason] };
};

/** "Declare war" at war (FR-241): FR-162's `already-in-place` says it plainly there. */
const ALREADY_AT_WAR = "we are already at war with them";

/**
 * The refusals of a control group, each once (FR-237): the controls with the same refusal share a line, in the order
 * of their first control. Controls without a refusal (or absent) are left out.
 */
export function reasonLines(controls: readonly (ControlView | undefined)[]): ReasonLine[] {
  const lines: ReasonLine[] = [];
  for (const c of controls) {
    if (!c?.refusal) continue;
    const line = lines.find((l) => l.reason === c.refusal);
    if (line) line.names.push(c.name);
    else lines.push({ names: [c.name], reason: c.refusal });
  }
  return lines;
}

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

const isMinor = (state: GameState, id: CountryId): boolean => state.minorNations.some((m) => m.id === id);

/**
 * FR-395: what a subsidy toward the country costs (FR-189's deal prices): a minor "Subsidy 20%: no fee; Sundmark pays us
 * 20% less for our goods and charges us 20% more for its own."; a Great Power only pays us less (with a Great Power the
 * seller's subsidy sets the price); 0 "no fee". In the world market no deal price reads a subsidy.
 */
export function subsidyCostText(state: GameState, targetId: CountryId, percent: number): string {
  if (percent <= 0) return "no fee";
  const name = countryName(state, targetId) ?? targetId;
  const head = `Subsidy ${percent}%: no fee;`;
  if (marketModeOf(state) !== "partners") return `${head} it changes no price in the world market.`;
  return isMinor(state, targetId)
    ? `${head} ${name} pays us ${percent}% less for our goods and charges us ${percent}% more for its own.`
    : `${head} ${name} pays us ${percent}% less for our goods.`;
}

/** FR-395, FR-416: the trade policy's line for the subsidy step chosen; a minor also ranks us higher (FR-187). */
export function subsidyHelp(state: GameState, targetId: CountryId, percent: number): string {
  if (percent <= 0) return "No subsidy: we trade at the Board price.";
  const cost = subsidyCostText(state, targetId, percent);
  return isMinor(state, targetId) && marketModeOf(state) === "partners" ? `${cost} In return it ranks us higher as a trading partner.` : cost;
}

/** FR-416: what a boycott does (FR-185: no trade either way while either side boycotts). */
export function boycottHelp(state: GameState, targetId: CountryId): string {
  const name = countryName(state, targetId) ?? targetId;
  return marketModeOf(state) === "partners"
    ? `Boycott (free): no trade between us and ${name} while it stands.`
    : "Boycott (free): no effect in the world market.";
}

/** FR-416: what the grant chosen adds (FR-170, GRANT_POINTS): "$1,000 once: +2 relation points; needs our embassy." */
export const grantHelp = (amount: GrantAmount, locked: boolean): string =>
  `${money(amount)} ${locked ? "each turn" : "once"}: +${GRANT_POINTS[amount]} relation points${locked ? " each turn" : ""}; needs our embassy.`;

/** FR-422 (card Q82): a grant of this much or more asks once before it is ordered. */
export const GRANT_ASK_FROM = 1000;

/** The question a large grant asks first (FR-422). */
export interface GrantAsk {
  /** "Give $10,000 to Arvelia? The treasury will hold $40,000 after it." */
  question: string;
  /** FR-393's warning when the cash left would be short of the army upkeep; null when it is not. */
  upkeep: string | null;
  /** "Give $10,000". */
  confirm: string;
}

/**
 * FR-422: the question for a grant of GRANT_ASK_FROM or more; undefined below it. The UI never applies an order (FR-022):
 * the engine's `upkeepForecastWithGrant` counts the grant as End Turn will (FR-393), with a grant ordered this turn to the
 * same country taken back first (FR-161) and the standing locked grants paid as FR-170 says.
 */
export function grantAsk(state: GameState, nationId: NationId, targetId: CountryId, amount: GrantAmount, locked: boolean): GrantAsk | undefined {
  if (amount < GRANT_ASK_FROM) return undefined;
  const replaced = state.intents.find((i) => i.nationId === nationId && i.kind === "grant" && i.targetId === targetId) as GrantIntent | undefined;
  const refund = replaced?.cost ?? 0;
  const name = countryName(state, targetId) ?? targetId;
  const treasury = (state.nations.find((n) => n.id === nationId)?.treasury ?? 0) + refund - amount;
  return {
    question: `Give ${money(amount)} to ${name}${locked ? " each turn" : ""}? The treasury will hold ${money(treasury)} after it.`,
    upkeep: upkeepWarningText(upkeepForecastWithGrant(state, { kind: "giveGrant", nationId, targetId, amount, locked })),
    confirm: `Give ${money(amount)}`,
  };
}

function orderedView(state: GameState, nationId: NationId, targetId: CountryId, intent: DiplomacyIntent & { cost: number }): OrderedView {
  const text = orderedText(intent);
  // FR-395: a trade policy says what its subsidy costs, never "free"
  const costText = intent.kind === "trade-policy" ? subsidyCostText(state, targetId, intent.subsidyPercent) : intent.cost > 0 ? money(intent.cost) : "free";
  const view: OrderedView = { id: intent.id, text, cost: intent.cost, costText };
  if (intent.kind === "grant-stop" || intent.kind === "answer") return view;
  const overture = intent.kind;
  return { ...view, withdraw: control(state, `Withdraw ${lowerFirst(text)}`, { kind: "withdrawOverture", nationId, overture, targetId }) };
}

/** Why two Great Powers hold a consulate and an embassy on turn 1 (FR-151, FR-240). */
const SINCE_THE_START = { note: "since the start", title: "Great Powers begin the game with a consulate and an embassy in each other." };

/** The pair's standing treaties as chips, in the FR-177 order. */
function treatiesOf(state: GameState, nationId: NationId, otherId: CountryId): TreatyView[] {
  // FR-224, FR-233: a minor whose capital fell is a colony, ours or another Great Power's; first, as it outranks the rest
  const colonyOf = state.minorNations.find((m) => m.id === otherId)?.colonyOf;
  const colony: TreatyView[] =
    colonyOf === undefined ? [] : [{ text: colonyOf === nationId ? "Colony" : `Colony of ${countryName(state, colonyOf) ?? colonyOf}` }];
  const pair = relationOf(state, nationId, otherId);
  if (!pair) return colony;
  const chips: TreatyView[] = [...colony];
  const fromStart = pair.startTreaties === true ? SINCE_THE_START : {};
  if (pair.consulates.includes(nationId)) chips.push({ text: "Consulate", ...fromStart });
  if (pair.embassies.includes(nationId)) chips.push({ text: "Embassy", ...fromStart });
  if (pair.pact) chips.push({ text: "Pact" });
  if (pair.alliance) chips.push({ text: "Alliance" });
  if (pair.war) chips.push({ text: `At war since turn ${pair.war.since}`, war: true });
  if (pair.boycotts.includes(nationId)) chips.push({ text: "We boycott them" });
  if (pair.boycotts.includes(otherId)) chips.push({ text: "They boycott us" });
  const subsidy = pair.subsidies[nationId];
  if (subsidy) chips.push({ text: `Subsidy ${subsidy}%` });
  const grant = pair.lockedGrants[nationId];
  if (grant) chips.push({ text: `Grant ${money(grant)} each turn` });
  return chips;
}

function policyOf(state: GameState, nationId: NationId, otherId: CountryId, intents: readonly DiplomacyIntent[]): PolicyView {
  const ordered = intents.find((i) => i.kind === "trade-policy");
  if (ordered?.kind === "trade-policy") return { subsidyPercent: ordered.subsidyPercent, boycott: ordered.boycott };
  const pair = relationOf(state, nationId, otherId);
  return { subsidyPercent: pair?.subsidies[nationId] ?? 0, boycott: pair?.boycotts.includes(nationId) ?? false };
}

/** The text of a "Stop grant" that waits for this turn's grant to be withdrawn. */
const STOP_GRANT_WAITS = "withdraw this turn's grant first";

/** "Stop grant" for a standing locked grant with no stop queued (FR-161, FR-178); undefined when there is nothing to stop. */
function stopGrantOf(state: GameState, nationId: NationId, id: CountryId, intents: readonly DiplomacyIntent[]): ControlView | undefined {
  if (relationOf(state, nationId, id)?.lockedGrants[nationId] === undefined) return undefined;
  if (intents.some((i) => i.kind === "grant-stop")) return undefined;
  const order: Order = { kind: "withdrawOverture", nationId, overture: "grant", targetId: id };
  if (intents.some((i) => i.kind === "grant")) return { label: "Stop grant", name: "Stop grant", order, refusal: STOP_GRANT_WAITS };
  const stop = control(state, "Stop grant", order);
  return stop.refusal ? undefined : stop;
}

/** The country's unanswered offers to the player, with the orders that answer them (FR-410, FR-411). */
function offersOf(state: GameState, nationId: NationId, id: CountryId): OfferView[] {
  const name = countryName(state, id) ?? id;
  return pendingProposalsFor(state, nationId)
    .filter((p) => p.fromId === id)
    .map((p) => {
      const answer = (accept: boolean): Order => ({ kind: "answerProposal", nationId, proposalId: p.id, accept });
      return {
        id: p.id,
        text: p.kind === "alliance" ? `${name} offers an alliance` : `${name} asks for peace`,
        effect: offerEffectText(state, p),
        accept: control(state, "Accept", answer(true)),
        reject: control(state, "Reject", answer(false)),
      };
    });
}

/**
 * FR-416: an overture's cost and what it does, its numbers read from the rules (OVERTURE_COST, PACT_POINTS,
 * SCRIPTED_DIPLOMACY, WAR_RELATION): "Free: Valdoria accepts at level 7 (grey) or higher."
 */
function overtureHelp(state: GameState, id: CountryId, kind: CountryKind, overture: Overture): string {
  const name = countryName(state, id) ?? id;
  const minor = kind === "Minor nation";
  const cost = OVERTURE_COST[overture] > 0 ? money(OVERTURE_COST[overture]) : "Free";
  const { allianceLevel, peaceAfterTurns, quietTurns } = SCRIPTED_DIPLOMACY;
  const effect: Record<Overture, string> = {
    // FR-185: in the partners market a minor trades only with a Great Power holding a consulate there
    consulate:
      minor && marketModeOf(state) === "partners"
        ? `opens at End Turn; then ${name} trades with us and we may set a subsidy and build an embassy`
        : "opens at End Turn; then we may set a subsidy and build an embassy",
    embassy: `needs our consulate; then we may give grants${minor ? " and offer a pact" : ""}`,
    pact: `needs our embassy; ${name} accepts at End Turn and relations rise by ${PACT_POINTS} points`,
    alliance: `${name} accepts at level ${allianceLevel + 1} (${RELATION_SWATCHES[allianceLevel]}) or higher`,
    war: `the war starts next turn; relations with ${name} fall by ${-WAR_RELATION.pair} points`,
    // Imp1 manual p77-78: a minor always accepts peace; a scripted Great Power by FR-174's rule
    peace: minor
      ? `${name} always accepts; the war ends at End Turn`
      : `${name} accepts when it is losing, or after ${peaceAfterTurns} turns of war if no province changed hands in the last ${quietTurns}`,
  };
  return `${cost}: ${effect[overture]}.`;
}

/** FR-418: within this share of our strength the other army is "about equal". */
export const ABOUT_EQUAL = 0.1;

/** FR-418: their military strength against ours; a hair of float error does not tip "about equal" (36 x 1.1). */
export function compareStrength(theirs: number, ours: number): "weaker" | "about equal" | "stronger" {
  if (Math.abs(theirs - ours) <= ABOUT_EQUAL * ours + 1e-9) return "about equal";
  return theirs > ours ? "stronger" : "weaker";
}

const regimentCount = (n: number) => `${n} regiment${n === 1 ? "" : "s"}`;

/** FR-418: a Great Power's provinces, regiments (no militia) against our strength, industry capacity; a minor's provinces and militia. */
function strengthOf(state: GameState, nationId: NationId, id: CountryId, kind: CountryKind): FactView[] {
  const provinces: FactView = { term: "Provinces", value: String(provincesOf(state, id).length) };
  const regiments = regimentsOf(state, id);
  if (kind === "Minor nation") return [provinces, { term: "Militia", value: regimentCount(regiments.filter((r) => isMilitia(r.type)).length) }];
  const word = compareStrength(militaryStrength(state, id), militaryStrength(state, nationId));
  const army = `${regimentCount(regiments.filter((r) => !isMilitia(r.type)).length)}, ${word === "about equal" ? "about equal to" : `${word} than`} ours`;
  return [provinces, { term: "Army", value: army }, { term: "Industry", value: `capacity ${scoreOf(state, id).capacity}` }];
}

/**
 * FR-417: a free minor's relation points with us and with each other Great Power, and what its Council vote needs
 * (FR-293: COUNCIL.minRelationPoints and more than the rival); undefined for a Great Power, a colony (its province votes
 * with its owner) and a world without provinces (no Council).
 */
function voteOf(state: GameState, nationId: NationId, id: CountryId, kind: CountryKind): string | undefined {
  if (kind !== "Minor nation" || state.provinces.length === 0) return undefined;
  if (state.minorNations.find((m) => m.id === id)?.colonyOf !== undefined) return undefined;
  const points = (gp: NationId) => relationOf(state, gp, id)?.points ?? 0;
  const rivals = state.nations.filter((n) => n.id !== nationId);
  const withEach = [`${points(nationId)} with us`, ...rivals.map((n) => `${points(n.id)} with ${n.name}`)].join(", ");
  const relations = `${countryName(state, id) ?? id}: ${withEach}`;
  const next = nextCouncilTurn(state);
  if (next === undefined) return `${relations}. No further Council meeting is scheduled.`;
  if (isLastMeeting(state, next)) {
    return `${relations}. At the last meeting the nominee at peace with this minor with more relation points gets its vote. With equal points, the higher-ranked nominee gets it. At war with both, the minor abstains.`;
  }
  return `${relations}; a vote needs ${COUNCIL.minRelationPoints} and more than the rival${rivals.length > 1 ? "s" : ""}`;
}

function rowOf(state: GameState, nationId: NationId, id: CountryId, kind: CountryKind): CountryRowView {
  const level = relationLevel(state, nationId, id);
  const intents = diplomacyIntentsOf(state, nationId, id);
  // A pact is between a Great Power and a minor, an alliance between Great Powers (FR-162)
  const offered = OVERTURES.filter((o) => (kind === "Great Power" ? o !== "pact" : o !== "alliance"));
  const pair = relationOf(state, nationId, id);
  const name = countryName(state, id) ?? id;
  return {
    id,
    name,
    kind,
    level,
    relationText: level === undefined ? "No relations" : relationText(level),
    treaties: treatiesOf(state, nationId, id),
    ordered: intents.map((i) => orderedView(state, nationId, id, i)),
    overtures: offered.map((o) => {
      const c = { ...control(state, overtureLabel(o), { kind: "proposeOverture", nationId, overture: o, targetId: id }, OVERTURE_LABEL[o]), help: overtureHelp(state, id, kind, o) };
      if (o !== "war") return c;
      if (pair?.war && c.refusal === REFUSAL_TEXT["already-in-place"]) return { ...c, refusal: ALREADY_AT_WAR };
      if (c.refusal === REFUSAL_TEXT["no-land-route"]) {
        const requirement = seaWarRequirement(state, nationId, id);
        return { ...c, refusal: `No army can reach ${name} over land. ${requirement ?? "No sea route is available."}` };
      }
      return c;
    }),
    stopGrant: stopGrantOf(state, nationId, id, intents),
    brokenByWar: pair?.alliance ? "alliance" : pair?.pact ? "pact" : undefined,
    warOnMinor: kind === "Minor nation",
    policy: policyOf(state, nationId, id, intents),
    offers: offersOf(state, nationId, id),
    strength: strengthOf(state, nationId, id, kind),
    vote: voteOf(state, nationId, id, kind),
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

/**
 * What accepting the offer does here (FR-411), under the Imp1 sentence: for peace "Accepting ends the war at End Turn.
 * Relations stay dark brown; treaties are not restored." (FR-169: the war ends, nothing else changes), for an alliance
 * "We become allies at End Turn."
 */
export function offerEffectText(state: GameState, proposal: Proposal): string {
  if (proposal.kind === "alliance") return "We become allies at End Turn.";
  const level = relationLevel(state, proposal.toId, proposal.fromId);
  const relations = level === undefined ? "as they are" : RELATION_SWATCHES[level];
  return `Accepting ends the war at End Turn. Relations stay ${relations}; treaties are not restored.`;
}
