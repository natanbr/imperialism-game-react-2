// Diplomacy orders (FR-161, FR-162). Validation reads the state; apply returns a new one that holds the
// order as an intent (FR-152) and has paid its cost; nothing of the target changes until the diplomacy
// phase resolves the turn's intents together (engine/systems/diplomacySystem.ts).
import type { CountryId, NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import type { PairDiplomacy } from "@/types/Diplomacy";
import type { AnswerIntent, DiplomacyIntent, GrantIntent, GrantStopIntent, OvertureIntent, TradePolicyIntent } from "@/types/Intent";
import { GRANT_AMOUNTS, OVERTURE_COST, SUBSIDY_PERCENTS } from "@/definisions/diplomacyRules";
import { addIntent, removeIntent } from "../turn/intents";
import { relationOf } from "../diplomacy/relations";
import { intentCost, isAnswerable, isDiplomacyIntent, isOverture, proposalsOf } from "../diplomacy/queries";
import { isGreatPower, isMinorNation } from "../world/countries";
import type {
  AnswerProposalOrder,
  DiplomacyOrder,
  GiveGrantOrder,
  ProposeOvertureOrder,
  RejectReason,
  SetTradePolicyOrder,
  ValidationResult,
  WithdrawOvertureOrder,
} from "./Order";

const OK: ValidationResult = { ok: true };
const reject = (reason: RejectReason): ValidationResult => ({ ok: false, reason });

/** The other country's diplomacy entry with the nation; undefined for an unknown id or the nation itself. */
function pairWith(state: GameState, nationId: NationId, targetId: unknown): PairDiplomacy | undefined {
  if (typeof targetId !== "string" || targetId === nationId) return undefined;
  if (!isGreatPower(state, targetId) && !isMinorNation(state, targetId)) return undefined;
  return relationOf(state, nationId, targetId);
}

type KindOf<K extends DiplomacyIntent["kind"]> = Extract<DiplomacyIntent, { kind: K }>;

/** This turn's intent of the nation of that kind toward the target (all intents in the state are this turn's). */
function intentOf<K extends Exclude<DiplomacyIntent["kind"], "answer">>(state: GameState, nationId: NationId, kind: K, targetId: CountryId): KindOf<K> | undefined {
  return state.intents.find((i): i is KindOf<K> => isDiplomacyIntent(i) && i.kind === kind && i.nationId === nationId && i.targetId === targetId);
}

const treasury = (nation: Nation): number => nation.treasury ?? 0;

export function validateDiplomacyOrder(state: GameState, nation: Nation, order: DiplomacyOrder): ValidationResult {
  switch (order.kind) {
    case "proposeOverture":
      return validateOverture(state, nation, order);
    case "giveGrant":
      return validateGrant(state, nation, order);
    case "setTradePolicy":
      return validateTradePolicy(state, nation, order);
    case "withdrawOverture":
      return validateWithdraw(state, nation, order);
    case "answerProposal":
      return validateAnswer(state, nation, order);
  }
}

/** Already held: a consulate or embassy of the nation, the pair's pact or alliance (war and peace are checked apart). */
function held(pair: PairDiplomacy, overture: ProposeOvertureOrder["overture"], nationId: NationId): boolean {
  switch (overture) {
    case "consulate":
      return pair.consulates.includes(nationId);
    case "embassy":
      return pair.embassies.includes(nationId);
    case "pact":
      return pair.pact;
    case "alliance":
      return pair.alliance;
    default:
      return false;
  }
}

/**
 * FR-162: an unknown target, the nation itself, a pact with a Great Power or an alliance with a minor ->
 * invalid-target; war while at war or declared this turn -> already-in-place; peace while not at war ->
 * not-at-war; any other overture while at war -> at-war; held or ordered this turn -> already-in-place;
 * an embassy without a consulate -> needs-consulate; a pact without an embassy -> needs-embassy; the cost
 * above the treasury -> insufficient-funds. A consulate or embassy "established before this turn" is one
 * in the state: the diplomacy phase is the only place that adds them.
 */
function validateOverture(state: GameState, nation: Nation, { overture, targetId }: ProposeOvertureOrder): ValidationResult {
  const pair = pairWith(state, nation.id, targetId);
  if (!pair || !isOverture(overture)) return reject("invalid-target");
  if (overture === "pact" && !isMinorNation(state, targetId)) return reject("invalid-target");
  if (overture === "alliance" && !isGreatPower(state, targetId)) return reject("invalid-target");
  const ordered = intentOf(state, nation.id, overture, targetId) !== undefined;
  if (overture === "war") return pair.war || ordered ? reject("already-in-place") : OK;
  if (overture === "peace") {
    if (!pair.war) return reject("not-at-war");
    return ordered ? reject("already-in-place") : OK;
  }
  if (pair.war) return reject("at-war");
  if (ordered || held(pair, overture, nation.id)) return reject("already-in-place");
  if (overture === "embassy" && !pair.consulates.includes(nation.id)) return reject("needs-consulate");
  if (overture === "pact" && !pair.embassies.includes(nation.id)) return reject("needs-embassy");
  return treasury(nation) >= OVERTURE_COST[overture] ? OK : reject("insufficient-funds");
}

/** FR-162: one of the four sizes, not at war, an embassy held, and the cash (a grant replaced this turn gives its amount back first). */
function validateGrant(state: GameState, nation: Nation, { targetId, amount, locked }: GiveGrantOrder): ValidationResult {
  const pair = pairWith(state, nation.id, targetId);
  if (!pair) return reject("invalid-target");
  if (!GRANT_AMOUNTS.includes(amount) || typeof locked !== "boolean") return reject("invalid-amount");
  if (pair.war) return reject("at-war");
  if (!pair.embassies.includes(nation.id)) return reject("needs-embassy");
  const refund = intentOf(state, nation.id, "grant", targetId)?.cost ?? 0;
  return treasury(nation) + refund >= amount ? OK : reject("insufficient-funds");
}

/** FR-162, FR-171: a subsidy step (0 removes it); a subsidy above 0 needs peace and a consulate, a boycott needs nothing. */
function validateTradePolicy(state: GameState, nation: Nation, { targetId, subsidyPercent, boycott }: SetTradePolicyOrder): ValidationResult {
  const pair = pairWith(state, nation.id, targetId);
  if (!pair) return reject("invalid-target");
  if (!SUBSIDY_PERCENTS.includes(subsidyPercent) || typeof boycott !== "boolean") return reject("invalid-amount");
  if (subsidyPercent > 0) {
    if (pair.war) return reject("at-war");
    if (!pair.consulates.includes(nation.id)) return reject("needs-consulate");
  }
  return OK;
}

/** FR-161, FR-162: something of this turn to take back, or for "grant" a standing locked grant not yet stopped. */
function validateWithdraw(state: GameState, nation: Nation, { overture, targetId }: WithdrawOvertureOrder): ValidationResult {
  const pair = pairWith(state, nation.id, targetId);
  if (!pair) return reject("invalid-target");
  if (overture === "grant") {
    if (intentOf(state, nation.id, "grant", targetId)) return OK;
    const standing = pair.lockedGrants[nation.id] !== undefined;
    return standing && !intentOf(state, nation.id, "grant-stop", targetId) ? OK : reject("invalid-target");
  }
  if (overture === "trade-policy") return intentOf(state, nation.id, "trade-policy", targetId) ? OK : reject("invalid-target");
  if (!isOverture(overture)) return reject("invalid-target");
  return intentOf(state, nation.id, overture, targetId) ? OK : reject("invalid-target");
}

/** FR-162: a proposal made to the nation on the turn before this one. */
function validateAnswer(state: GameState, nation: Nation, { proposalId }: AnswerProposalOrder): ValidationResult {
  const proposal = proposalsOf(state).find((p) => p.id === proposalId);
  return proposal && isAnswerable(state, proposal, nation.id) ? OK : reject("invalid-target");
}

// --- apply (the order is valid) ------------------------------------------------------------------

function charge(state: GameState, nationId: NationId, amount: number): GameState {
  if (amount === 0) return state;
  return { ...state, nations: state.nations.map((n) => (n.id === nationId ? { ...n, treasury: (n.treasury ?? 0) - amount } : n)) };
}

/** Removes the intent and gives its cost back. */
function takeBack(state: GameState, intent: DiplomacyIntent | undefined): GameState {
  if (!intent) return state;
  return charge(removeIntent(state, intent.id), intent.nationId, -intentCost(intent));
}

export function applyDiplomacyOrder(state: GameState, order: DiplomacyOrder): GameState {
  const { nationId } = order;
  switch (order.kind) {
    case "proposeOverture": {
      const cost = OVERTURE_COST[order.overture];
      const intent: Omit<OvertureIntent, "id" | "turn"> = { kind: order.overture, nationId, targetId: order.targetId, cost };
      return addIntent(charge(state, nationId, cost), intent);
    }
    case "giveGrant": {
      const replaced = takeBack(state, intentOf(state, nationId, "grant", order.targetId));
      const intent: Omit<GrantIntent, "id" | "turn"> = {
        kind: "grant",
        nationId,
        targetId: order.targetId,
        amount: order.amount,
        locked: order.locked,
        cost: order.amount,
      };
      return addIntent(charge(replaced, nationId, order.amount), intent);
    }
    case "setTradePolicy": {
      const replaced = takeBack(state, intentOf(state, nationId, "trade-policy", order.targetId));
      const intent: Omit<TradePolicyIntent, "id" | "turn"> = {
        kind: "trade-policy",
        nationId,
        targetId: order.targetId,
        subsidyPercent: order.subsidyPercent,
        boycott: order.boycott,
      };
      return addIntent(replaced, intent);
    }
    case "withdrawOverture": {
      const kind = order.overture;
      const thisTurn = kind === "grant" || kind === "trade-policy" || isOverture(kind) ? intentOf(state, nationId, kind, order.targetId) : undefined;
      if (thisTurn) return takeBack(state, thisTurn);
      // Only "grant" means more than "take back": with no grant this turn, the standing locked grant ends at End
      // Turn, no refund (FR-161). Any other withdrawal with nothing to take back changes nothing (validate refuses it).
      if (kind !== "grant") return state;
      const stop: Omit<GrantStopIntent, "id" | "turn"> = { kind: "grant-stop", nationId, targetId: order.targetId };
      return addIntent(state, stop);
    }
    case "answerProposal": {
      const previous = state.intents.find((i) => i.kind === "answer" && i.nationId === nationId && (i as AnswerIntent).proposalId === order.proposalId);
      const answer: Omit<AnswerIntent, "id" | "turn"> = { kind: "answer", nationId, proposalId: order.proposalId, accept: order.accept === true };
      return addIntent(previous ? removeIntent(state, previous.id) : state, answer);
    }
  }
}
