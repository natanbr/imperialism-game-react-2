// The diplomacy phase (FR-163 to FR-173, decision 5): the turn's diplomacy intents resolve together, by kind
// in this order: peace, war, consulate, embassy, pact, alliance, grants (this turn's, then the locked
// repeats), trade policies; within a kind in `intentOrder`, so no nation always goes first. Every intent is
// checked again when it resolves; one that is no longer valid fails with its cost refunded. The phase
// works on its own copies (the diplomacy record entry by entry, the proposals, the intents, the
// treasuries) and never changes its input. It draws no random number.
import type { CountryId, NationId } from "@/types/Common";
import type { DiplomacyState, Overture, PairDiplomacy, Proposal, ProposalKind } from "@/types/Diplomacy";
import type { GameState } from "@/types/GameState";
import type { AnswerIntent, DiplomacyIntent, GrantIntent, GrantStopIntent, Intent, OvertureIntent, TradePolicyIntent } from "@/types/Intent";
import {
  GRANT_POINTS,
  PACT_POINTS,
  VICTIM_ENEMY_LEVELS,
  VICTIM_FRIEND_LEVELS,
  WAR_RELATION,
} from "@/definisions/diplomacyRules";
import type { RejectReason } from "../orders/Order";
import type { GameEvent, TurnContext, TurnSystem, WarCause } from "../turn/context";
import { byIntentOrder } from "../turn/intents";
import { MAX_RELATION_POINTS, pairKey, POINTS_PER_LEVEL } from "../diplomacy/relations";
import { intentCost, isDiplomacyIntent, proposalsOf } from "../diplomacy/queries";
import { acceptsAlliance, acceptsPeace } from "../diplomacy/scriptedAnswers";

const clampPoints = (points: number): number => Math.min(MAX_RELATION_POINTS, Math.max(0, points));
const levelOf = (points: number): number => Math.floor(clampPoints(points) / POINTS_PER_LEVEL);
/** The list with the id added once, in id order (consulates, embassies, boycotts). */
const withId = (ids: readonly string[], id: string): string[] => (ids.includes(id) ? [...ids] : [...ids, id].sort());

/** The working copies of one diplomacy phase. */
interface Work {
  readonly state: GameState;
  readonly ctx: TurnContext;
  /** Proposals made before this turn: answered, refused or dropped in this phase. */
  readonly expiring: readonly Proposal[];
  readonly startProposals: readonly Proposal[];
  diplomacy: DiplomacyState;
  proposals: Proposal[];
  intents: Intent[];
  treasury: Map<NationId, number>;
  /** By pair key: the declarations of this phase that moved the pair's points (FR-239). */
  warCauses: Map<string, WarCause[]>;
}

const entry = (w: Work, a: CountryId, b: CountryId): PairDiplomacy => w.diplomacy[pairKey(a, b)];
const setEntry = (w: Work, a: CountryId, b: CountryId, next: PairDiplomacy): void => {
  w.diplomacy = { ...w.diplomacy, [pairKey(a, b)]: next };
};
const emit = (w: Work, event: GameEvent): void => w.ctx.emit(event);
const isGreatPower = (w: Work, id: CountryId): boolean => w.state.nations.some((n) => n.id === id);
const isMinor = (w: Work, id: CountryId): boolean => w.state.minorNations.some((m) => m.id === id);
const isHuman = (w: Work, id: CountryId): boolean => w.state.nations.find((n) => n.id === id)?.controller === "human";
/** The state as it stands in this phase, for the scripted answers. */
const view = (w: Work): GameState => ({ ...w.state, diplomacy: w.diplomacy });
const pay = (w: Work, nationId: NationId, amount: number): void => {
  w.treasury.set(nationId, (w.treasury.get(nationId) ?? 0) - amount);
};

/** The intent no longer holds when resolved (FR-173): its cost comes back and the nation hears why. */
function fail(w: Work, intent: OvertureIntent | GrantIntent | TradePolicyIntent, reason: RejectReason): void {
  const refund = intentCost(intent);
  if (refund > 0) pay(w, intent.nationId, -refund);
  emit(w, { type: "overture-failed", nationId: intent.nationId, overture: intent.kind, targetId: intent.targetId, reason, refund });
}

/** An alliance or a peace took effect: the proposer's news first, then the target's when it is a Great Power. */
function done(w: Work, overture: "alliance" | "peace", proposerId: NationId, targetId: CountryId): void {
  emit(w, { type: "overture-done", nationId: proposerId, overture, targetId });
  if (isGreatPower(w, targetId)) emit(w, { type: "overture-done", nationId: targetId, overture, targetId: proposerId });
}

const refuse = (w: Work, proposerId: NationId, overture: ProposalKind, targetId: CountryId): void =>
  emit(w, { type: "overture-refused", nationId: proposerId, overture, targetId });

/** A proposal to a human Great Power, answered next turn (FR-166); "proposal-<turn>-<n>". */
function propose(w: Work, fromId: NationId, toId: NationId, kind: ProposalKind): void {
  const prefix = `proposal-${w.ctx.turn}-`;
  const id = `${prefix}${w.proposals.filter((p) => p.id.startsWith(prefix)).length + 1}`;
  w.proposals = [...w.proposals, { id, fromId, toId, kind, turn: w.ctx.turn }];
  emit(w, { type: "proposal-received", nationId: toId, fromId, proposalId: id, kind });
}

/** The proposal an answer intent answers, if it is one of the nation's that expire now. */
const answered = (w: Work, answer: AnswerIntent): Proposal | undefined =>
  w.expiring.find((p) => p.id === answer.proposalId && p.toId === answer.nationId);

/** The other side's own overture of the same kind toward the proposer this turn, not yet used: both agree. */
const mutualIntent = (list: readonly DiplomacyIntent[], used: Set<string>, kind: ProposalKind, proposerId: NationId, targetId: CountryId) =>
  list.find((j) => j.kind === kind && j.nationId === targetId && j.targetId === proposerId && !used.has(j.id));

/**
 * The expiring proposals of this kind leave the state; one that was not answered is refused (FR-166) unless
 * it no longer applies (the peace or the alliance came about another way this turn).
 */
function closeProposals(w: Work, kind: ProposalKind, handled: Set<string>, stillOpen: (p: Proposal) => boolean): void {
  const closing = w.expiring.filter((p) => p.kind === kind);
  for (const p of closing) if (!handled.has(p.id) && stillOpen(p)) refuse(w, p.fromId, kind, p.toId);
  const ids = new Set(closing.map((p) => p.id));
  if (ids.size > 0) w.proposals = w.proposals.filter((p) => !ids.has(p.id));
}

// --- peace (FR-169) ------------------------------------------------------------------------------

/** The war ends; relations stay, nothing is restored; the attacks between the two this turn are dropped. */
function makePeace(w: Work, proposerId: NationId, targetId: CountryId): void {
  const rest = { ...entry(w, proposerId, targetId) };
  delete rest.war;
  setEntry(w, proposerId, targetId, rest);
  done(w, "peace", proposerId, targetId);
  const between = (i: Intent) =>
    i.kind === "attack" && ((i.nationId === proposerId && i.targetId === targetId) || (i.nationId === targetId && i.targetId === proposerId));
  const dropped = w.intents.filter(between);
  if (dropped.length === 0) return;
  w.intents = w.intents.filter((i) => !between(i));
  for (const [nationId, otherId] of [[proposerId, targetId], [targetId, proposerId]]) {
    const count = dropped.filter((i) => i.nationId === nationId).length;
    if (count > 0) emit(w, { type: "attacks-cancelled", nationId, targetId: otherId, count });
  }
}

/** FR-174: the war remembers when each side last proposed peace, so a scripted side waits 3 turns. */
function noteOffer(w: Work, nationId: NationId, targetId: CountryId): void {
  const e = entry(w, nationId, targetId);
  if (!e.war) return;
  setEntry(w, nationId, targetId, { ...e, war: { ...e.war, lastPeaceOffer: { ...e.war.lastPeaceOffer, [nationId]: w.ctx.turn } } });
}

function resolvePeace(w: Work, list: readonly DiplomacyIntent[]): void {
  const handled = new Set<string>();
  const used = new Set<string>();
  for (const i of list) {
    if (used.has(i.id)) continue;
    if (i.kind === "answer") {
      const p = answered(w, i);
      if (!p) continue;
      handled.add(p.id);
      if (!entry(w, p.fromId, p.toId).war) continue;
      if (i.accept) makePeace(w, p.fromId, p.toId);
      else refuse(w, p.fromId, "peace", p.toId);
      continue;
    }
    if (i.kind !== "peace") continue;
    const { nationId, targetId } = i;
    if (!entry(w, nationId, targetId).war) {
      fail(w, i, "not-at-war");
      continue;
    }
    noteOffer(w, nationId, targetId);
    const mutual = mutualIntent(list, used, "peace", nationId, targetId);
    if (mutual) used.add(mutual.id);
    // Imp1 manual p77-78: a minor always accepts peace; a Great Power answers by its rule or its player.
    if (mutual || isMinor(w, targetId)) makePeace(w, nationId, targetId);
    else if (isHuman(w, targetId)) propose(w, nationId, targetId, "peace");
    else if (acceptsPeace(view(w), targetId, nationId, w.ctx.turn)) makePeace(w, nationId, targetId);
    else refuse(w, nationId, "peace", targetId);
  }
  closeProposals(w, "peace", handled, (p) => entry(w, p.fromId, p.toId).war !== undefined);
}

// --- war (FR-167, FR-168) ------------------------------------------------------------------------

function resolveWars(w: Work, list: readonly OvertureIntent[]): void {
  if (list.length === 0) return;
  // Relation effects are measured on the levels at the start of this step and summed per pair, then
  // clamped once, so the order of the declarations changes nothing (FR-173).
  const start = w.diplomacy;
  const groups = new Map<string, { a: CountryId; b: CountryId; declarers: NationId[] }>();
  for (const i of list) {
    const key = pairKey(i.nationId, i.targetId);
    if (start[key].war) {
      fail(w, i, "already-in-place");
      continue;
    }
    const group = groups.get(key) ?? { a: i.nationId, b: i.targetId, declarers: [] };
    group.declarers.push(i.nationId);
    groups.set(key, group);
    emit(w, { type: "war-declared", nationId: i.nationId, targetId: i.targetId, startsTurn: w.ctx.turn + 1 });
  }

  const countries = [...w.state.nations.map((n) => n.id), ...w.state.minorNations.map((m) => m.id)];
  const levelAtStart = (a: CountryId, b: CountryId): number | undefined => {
    const e = a === b ? undefined : start[pairKey(a, b)];
    return e ? levelOf(e.points) : undefined;
  };
  const deltas = new Map<string, number>();
  const add = (a: CountryId, b: CountryId, delta: number, cause: WarCause) => {
    const key = pairKey(a, b);
    if (a === b || !start[key]) return;
    if (delta !== 0) deltas.set(key, (deltas.get(key) ?? 0) + delta);
    const causes = w.warCauses.get(key) ?? [];
    if (!causes.some((c) => c.aggressorId === cause.aggressorId && c.targetId === cause.targetId)) w.warCauses.set(key, [...causes, cause]);
  };

  for (const [key, { a, b, declarers }] of groups) {
    const before = start[key];
    // The pair's own loss is counted once per war; each declaration of it is named (FR-239)
    declarers.forEach((aggressor, i) => add(a, b, i === 0 ? WAR_RELATION.pair : 0, { aggressorId: aggressor, targetId: aggressor === a ? b : a }));
    for (const aggressor of declarers) {
      const target = aggressor === a ? b : a;
      const cause: WarCause = { aggressorId: aggressor, targetId: target };
      const others = countries.filter((x) => x !== aggressor && x !== target);
      if (before.pact || before.alliance) for (const x of others) add(aggressor, x, WAR_RELATION.brokenTreaty, cause);
      if (isMinor(w, target)) for (const x of others.filter((id) => isMinor(w, id))) add(aggressor, x, WAR_RELATION.minorSolidarity, cause);
      for (const x of others) {
        const level = levelAtStart(x, target);
        if (level === undefined) continue;
        if (VICTIM_FRIEND_LEVELS.includes(level)) add(x, aggressor, WAR_RELATION.victimFriend, cause);
        else if (VICTIM_ENEMY_LEVELS.includes(level)) add(x, aggressor, WAR_RELATION.victimEnemy, cause);
      }
    }
    // The war ends the pair's treaties, subsidies and locked grants (Imp1 manual p80).
    for (const granter of Object.keys(before.lockedGrants).sort()) {
      const amount = before.lockedGrants[granter]!;
      emit(w, { type: "grant-stopped", nationId: granter, targetId: granter === a ? b : a, amount, reason: "war" });
    }
    // ... and with them the mark of the start treaties (FR-240)
    const rest = { ...entry(w, a, b) };
    delete rest.startTreaties;
    setEntry(w, a, b, {
      ...rest,
      consulates: [],
      embassies: [],
      pact: false,
      alliance: false,
      subsidies: {},
      lockedGrants: {},
      war: { aggressors: [...new Set(declarers)].sort(), since: w.ctx.turn + 1 },
    });
  }
  for (const [key, delta] of deltas) {
    const e = w.diplomacy[key];
    w.diplomacy = { ...w.diplomacy, [key]: { ...e, points: clampPoints(e.points + delta) } };
  }
}

// --- consulate, embassy, pact (FR-163 to FR-165) -------------------------------------------------

function resolveEstablished(w: Work, list: readonly OvertureIntent[]): void {
  for (const i of list) {
    const { nationId, targetId, kind } = i;
    const e = entry(w, nationId, targetId);
    const reason: RejectReason | undefined = e.war
      ? "at-war"
      : (kind === "consulate" && e.consulates.includes(nationId)) || (kind === "embassy" && e.embassies.includes(nationId)) || (kind === "pact" && e.pact)
        ? "already-in-place"
        : kind === "embassy" && !e.consulates.includes(nationId)
          ? "needs-consulate"
          : kind === "pact" && !e.embassies.includes(nationId)
            ? "needs-embassy"
            : undefined;
    if (reason) {
      fail(w, i, reason);
      continue;
    }
    if (kind === "consulate") setEntry(w, nationId, targetId, { ...e, consulates: withId(e.consulates, nationId) });
    else if (kind === "embassy") setEntry(w, nationId, targetId, { ...e, embassies: withId(e.embassies, nationId) });
    else setEntry(w, nationId, targetId, { ...e, pact: true, points: clampPoints(e.points + PACT_POINTS) });
    emit(w, { type: "overture-done", nationId, overture: kind as "consulate" | "embassy" | "pact", targetId });
  }
}

// --- alliance (FR-166) ---------------------------------------------------------------------------

function makeAlliance(w: Work, proposerId: NationId, targetId: NationId): void {
  setEntry(w, proposerId, targetId, { ...entry(w, proposerId, targetId), alliance: true });
  done(w, "alliance", proposerId, targetId);
}

function resolveAlliances(w: Work, list: readonly DiplomacyIntent[]): void {
  const handled = new Set<string>();
  const used = new Set<string>();
  for (const i of list) {
    if (used.has(i.id)) continue;
    if (i.kind === "answer") {
      const p = answered(w, i);
      if (!p) continue;
      handled.add(p.id);
      const e = entry(w, p.fromId, p.toId);
      if (e.alliance) continue;
      if (!i.accept) refuse(w, p.fromId, "alliance", p.toId);
      else if (e.war) emit(w, { type: "overture-failed", nationId: p.fromId, overture: "alliance", targetId: p.toId, reason: "at-war", refund: 0 });
      else makeAlliance(w, p.fromId, p.toId);
      continue;
    }
    if (i.kind !== "alliance") continue;
    const { nationId, targetId } = i;
    const e = entry(w, nationId, targetId);
    if (e.war) {
      fail(w, i, "at-war");
      continue;
    }
    if (e.alliance) {
      fail(w, i, "already-in-place");
      continue;
    }
    const mutual = mutualIntent(list, used, "alliance", nationId, targetId);
    if (mutual) used.add(mutual.id);
    if (mutual) makeAlliance(w, nationId, targetId);
    else if (isHuman(w, targetId)) propose(w, nationId, targetId, "alliance");
    else if (acceptsAlliance(view(w), targetId, nationId)) makeAlliance(w, nationId, targetId);
    else refuse(w, nationId, "alliance", targetId);
  }
  closeProposals(w, "alliance", handled, (p) => !entry(w, p.fromId, p.toId).alliance);
}

// --- grants (FR-170) -----------------------------------------------------------------------------

function resolveGrants(w: Work, stops: readonly GrantStopIntent[], grants: readonly GrantIntent[]): void {
  for (const i of stops) {
    const e = entry(w, i.nationId, i.targetId);
    const amount = e.lockedGrants[i.nationId];
    if (amount === undefined) continue;
    const lockedGrants = { ...e.lockedGrants };
    delete lockedGrants[i.nationId];
    setEntry(w, i.nationId, i.targetId, { ...e, lockedGrants });
    emit(w, { type: "grant-stopped", nationId: i.nationId, targetId: i.targetId, amount, reason: "withdrawn" });
  }

  // This turn's grants, paid when ordered; a locked one becomes (or replaces) the standing grant.
  const paidNow = new Set<string>();
  for (const i of grants) {
    const e = entry(w, i.nationId, i.targetId);
    if (e.war) {
      fail(w, i, "at-war");
      continue;
    }
    if (!e.embassies.includes(i.nationId)) {
      fail(w, i, "needs-embassy");
      continue;
    }
    const lockedGrants = i.locked ? { ...e.lockedGrants, [i.nationId]: i.amount } : e.lockedGrants;
    if (i.locked) paidNow.add(`${pairKey(i.nationId, i.targetId)}#${i.nationId}`);
    setEntry(w, i.nationId, i.targetId, { ...e, lockedGrants, points: clampPoints(e.points + GRANT_POINTS[i.amount]) });
    emit(w, { type: "grant-paid", nationId: i.nationId, targetId: i.targetId, amount: i.amount });
  }

  // The standing locked grants repeat while the treasury holds the amount (pairs and granters in id order).
  for (const key of Object.keys(w.diplomacy).sort()) {
    const [a, b] = key.split("|");
    for (const granter of Object.keys(w.diplomacy[key].lockedGrants).sort()) {
      if (paidNow.has(`${key}#${granter}`)) continue;
      const e = w.diplomacy[key];
      const amount = e.lockedGrants[granter]!;
      const targetId = granter === a ? b : a;
      if ((w.treasury.get(granter) ?? 0) >= amount) {
        pay(w, granter, amount);
        w.diplomacy = { ...w.diplomacy, [key]: { ...e, points: clampPoints(e.points + GRANT_POINTS[amount]) } };
        emit(w, { type: "grant-paid", nationId: granter, targetId, amount });
      } else {
        const lockedGrants = { ...e.lockedGrants };
        delete lockedGrants[granter];
        w.diplomacy = { ...w.diplomacy, [key]: { ...e, lockedGrants } };
        emit(w, { type: "grant-stopped", nationId: granter, targetId, amount, reason: "insufficient-funds" });
      }
    }
  }
}

// --- trade policies (FR-171) ---------------------------------------------------------------------

function resolveTradePolicies(w: Work, list: readonly TradePolicyIntent[]): void {
  for (const i of list) {
    const e = entry(w, i.nationId, i.targetId);
    if (i.subsidyPercent > 0 && e.war) {
      fail(w, i, "at-war");
      continue;
    }
    if (i.subsidyPercent > 0 && !e.consulates.includes(i.nationId)) {
      fail(w, i, "needs-consulate");
      continue;
    }
    const subsidies = { ...e.subsidies };
    if (i.subsidyPercent === 0) delete subsidies[i.nationId];
    else subsidies[i.nationId] = i.subsidyPercent;
    const boycotts = i.boycott ? withId(e.boycotts, i.nationId) : e.boycotts.filter((id) => id !== i.nationId);
    setEntry(w, i.nationId, i.targetId, { ...e, subsidies, boycotts });
  }
}

// --- the phase -----------------------------------------------------------------------------------

/** FR-172: one event per Great Power of each pair whose level differs from the phase's start. */
function emitRelationChanges(w: Work, before: DiplomacyState): void {
  for (const key of Object.keys(w.diplomacy).sort()) {
    if (!before[key]) continue;
    const from = levelOf(before[key].points);
    const to = levelOf(w.diplomacy[key].points);
    if (from === to) continue;
    const [a, b] = key.split("|");
    const wars = w.warCauses.get(key);
    for (const nationId of [a, b].filter((id) => isGreatPower(w, id))) {
      emit(w, { type: "relation-changed", nationId, otherId: nationId === a ? b : a, from, to, ...(wars ? { wars: [...wars] } : {}) });
    }
  }
}

function finish(w: Work): GameState {
  const { state } = w;
  const moved = state.nations.some((n) => w.treasury.get(n.id) !== (n.treasury ?? 0));
  const nations = moved
    ? state.nations.map((n) => (w.treasury.get(n.id) === (n.treasury ?? 0) ? n : { ...n, treasury: w.treasury.get(n.id)! }))
    : state.nations;
  // A hand-built state without `proposals` keeps none unless the phase made one.
  const proposalsChanged = w.proposals !== w.startProposals && (state.proposals !== undefined || w.proposals.length > 0);
  return {
    ...state,
    nations,
    diplomacy: w.diplomacy,
    intents: w.intents,
    ...(proposalsChanged ? { proposals: w.proposals } : {}),
  };
}

export const diplomacySystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => {
  const intents = byIntentOrder(
    state,
    ctx.turn,
    state.intents.filter((i): i is DiplomacyIntent => i.turn === ctx.turn && isDiplomacyIntent(i))
  );
  const proposals = proposalsOf(state);
  const expiring = proposals.filter((p) => p.turn < ctx.turn);
  const locked = Object.values(state.diplomacy).some((e) => Object.keys(e.lockedGrants).length > 0);
  if (intents.length === 0 && expiring.length === 0 && !locked) return state;

  const w: Work = {
    state,
    ctx,
    expiring,
    startProposals: proposals,
    diplomacy: state.diplomacy,
    proposals,
    intents: state.intents,
    treasury: new Map(state.nations.map((n) => [n.id, n.treasury ?? 0])),
    warCauses: new Map(),
  };
  const before = state.diplomacy;
  const proposalKind = (i: AnswerIntent) => expiring.find((p) => p.id === i.proposalId)?.kind;
  const overtures = (kind: Overture) => intents.filter((i): i is OvertureIntent => i.kind === kind);
  const withAnswers = (kind: ProposalKind) => intents.filter((i) => i.kind === kind || (i.kind === "answer" && proposalKind(i) === kind));

  resolvePeace(w, withAnswers("peace"));
  resolveWars(w, overtures("war"));
  resolveEstablished(w, overtures("consulate"));
  resolveEstablished(w, overtures("embassy"));
  resolveEstablished(w, overtures("pact"));
  resolveAlliances(w, withAnswers("alliance"));
  resolveGrants(
    w,
    intents.filter((i): i is GrantStopIntent => i.kind === "grant-stop"),
    intents.filter((i): i is GrantIntent => i.kind === "grant")
  );
  resolveTradePolicies(w, intents.filter((i): i is TradePolicyIntent => i.kind === "trade-policy"));
  emitRelationChanges(w, before);
  return finish(w);
};
