// The scripted Great Power's influence on the minors (M13, FR-490, card Q117 (a); FR-542, card Q117 (b)): an embassy and a
// pact, then grants before each Council meeting. Called by economy.ts `planTrade` right after the consulate
// (planConsulate), on every world and in both market modes; the rule itself keeps to a world with provinces (FR-498).
import type { MinorNationId, NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { PairDiplomacy } from "@/types/Diplomacy";
import type { Order } from "../orders/Order";
import { GRANT_POINTS, OVERTURE_COST, SCRIPTED_INFLUENCE } from "@/definisions/diplomacyRules";
import { COUNCIL } from "@/definisions/council";
import { SHIPS } from "@/definisions/ships";
import { ResourceType } from "@/types/Resource";
import type { TradeCommodity } from "@/types/Market";
import { councilNominees, lastCouncilTurn, nextCouncilTurn } from "../council/council";
import { tradeCapacityOf, tradeOrdersOf } from "../market/market";
import { diplomacyAfterThisTurn, partnerRanking, sellersOf, settledTradeBarrier } from "../market/partners";
import { turnLimitOf } from "../turn/gameOver";
import { warBetween } from "../diplomacy/queries";
import { relationOf } from "../diplomacy/relations";
import { nationById } from "../orders/queries";
import { adjacentProvinces, provincesOf } from "../world/provinces";
import { campaignTarget } from "./scriptedWar";

type Propose = (order: Order) => boolean;

/** Buy one scarce input with spare shipping before the final vote. Trade can earn support for an existing embassy. */
export function councilTradeInputs(state: GameState, nationId: NationId, stock: Readonly<Record<string, number>>): TradeCommodity[] {
  if (turnLimitOf(state) - state.turn < 2) return []; // FR-245: raw inputs need two more turns.
  const { holds, free } = tradeCapacityOf(state, nationId);
  const meeting = lastCouncilTurn(state);
  if (!free || holds <= SHIPS.indiaman.holds || state.gameOver || meeting === undefined) return [];
  // Q141: start on the preceding meeting itself (turn 30 for a turn-40 final Council).
  if (state.turn < meeting - COUNCIL.interval || state.turn > meeting) return [];
  const after = diplomacyAfterThisTurn(state, nationId);
  const bids = tradeOrdersOf(state, nationId).buy;
  return ([ResourceType.Timber, ResourceType.Coal, ResourceType.IronOre, ResourceType.Cotton] as const)
    .filter(c => {
      if (bids[c] || (stock[c] ?? 0) >= 2 * holds) return false;
      // One unit goes to the first open seller in settlement order. A higher-ranked buyer
      // could take its supply first; its current bids are private (FR-497).
      const seller = sellersOf(after, c).find(id => !settledTradeBarrier(after, nationId, id));
      if (!seller) return false;
      const pair = relationOf(after, nationId, seller);
      return pair?.embassies.includes(nationId) && pair.points < COUNCIL.minRelationPoints
        && partnerRanking(after, seller).find(id => !settledTradeBarrier(after, id, seller)) === nationId;
    })
    .sort((a, b) => (stock[a] ?? 0) - (stock[b] ?? 0));
}

interface Candidate {
  id: MinorNationId;
  pair: PairDiplomacy;
}

/**
 * FR-542: one of the minor's provinces borders one of the nation's. The campaign takes a bordering minor from turn 10
 * (FR-274), and a war on a pact partner costs 20 points with every country (FR-168), so it courts none of them.
 */
const bordersNation = (state: GameState, nationId: NationId, minorId: MinorNationId): boolean =>
  provincesOf(state, minorId).some((p) => adjacentProvinces(state, p.id).some((q) => q.ownerId === nationId));

/** The free minors it may court: not at war with it, not its campaign's target (it would be soon), not on its border. */
function courtable(state: GameState, nationId: NationId): MinorNationId[] {
  const target = campaignTarget(state, nationId);
  return state.minorNations
    .filter((m) => m.colonyOf === undefined && m.id !== target && warBetween(state, nationId, m.id) === undefined && !bordersNation(state, nationId, m.id))
    .map((m) => m.id);
}

/**
 * The minors worth winning over for the meeting, in id order: `courtable`, with `from` to `SCRIPTED_INFLUENCE.toPoints`
 * relation points with it and at least the rival nominee's. Reads what Diplomacy shows a human (FR-417, FR-497) and the
 * nation's own plan.
 */
function candidates(state: GameState, nationId: NationId, rivalId: NationId, from: number): Candidate[] {
  return courtable(state, nationId)
    .flatMap((id) => {
      const pair = relationOf(state, nationId, id);
      const rival = relationOf(state, rivalId, id)?.points ?? 0;
      return pair && pair.points >= from && pair.points <= SCRIPTED_INFLUENCE.toPoints && pair.points >= rival ? [{ id, pair }] : [];
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The next meeting and the rival nominee, while one is ahead on a world with provinces and the nation is the other nominee (FR-291). */
function councilAhead(state: GameState, nationId: NationId): { meeting: number; rivalId: NationId } | undefined {
  if (state.provinces.length === 0) return undefined;
  const meeting = nextCouncilTurn(state);
  if (meeting === undefined || state.turn >= meeting) return undefined;
  const nominees = councilNominees(state);
  const rivalId = nominees.find((id) => id !== nationId);
  return rivalId !== undefined && nominees.includes(nationId) ? { meeting, rivalId } : undefined;
}

/**
 * FR-542: the minor the nation wants its embassy in this turn, or undefined: while a meeting after the first is ahead and
 * it holds an embassy in no minor, of the `candidates` from `embassyFromPoints` the one with the most points (then the
 * lowest id) it holds a consulate in (FR-162). Not for the first meeting: a minor at the start's 30 points (FR-151) cannot
 * reach a vote's 50 by then with a pact and the grants (30 + 10 + 4 x 2 = 48), and an embassy on turn 7 took half of a
 * scripted Testland's start treasury: in 24 both-scripted games 3 then lost regiments for want of pay, none without.
 * The meeting and its nominees come from `state`; the embassies and candidates from `record`, by default the same.
 */
function wantedEmbassy(state: GameState, nationId: NationId, record: GameState = state): MinorNationId | undefined {
  const ahead = councilAhead(state, nationId);
  if (ahead === undefined || ahead.meeting <= COUNCIL.firstTurn) return undefined;
  if (record.minorNations.some((m) => relationOf(record, nationId, m.id)?.embassies.includes(nationId))) return undefined;
  return embassyCandidates(record, nationId, ahead.rivalId)
    .find((c) => c.pair.consulates.includes(nationId))?.id;
}

/**
 * FR-542: the cash the campaign recruits (scriptedArmy.ts `wantedRegiment`) and the training (economy.ts) leave for the
 * embassy while one is wanted: its $5,000, else 0. Without it the embassy waited for a turn with $5,000 spare, which came
 * on turns 26 to 30, after the war on the player began and froze the treasury at its upkeep reserve. FR-638: a land
 * purchase passes the `record` its own diplomacy of this turn leaves (`diplomacyAfterThisTurn`), as `grantSaving` reads,
 * so an embassy it paid for this turn is not saved for again.
 */
export const embassySaving = (state: GameState, nationId: NationId, record: GameState = state): number =>
  wantedEmbassy(state, nationId, record) === undefined ? 0 : OVERTURE_COST.embassy;

/** FR-490: the minor a grant goes to on a grant turn: the first of `candidates` from `fromPoints` it holds an embassy in. */
const grantTarget = (state: GameState, nationId: NationId, rivalId: NationId): Candidate | undefined =>
  candidates(state, nationId, rivalId, SCRIPTED_INFLUENCE.fromPoints).find((c) => c.pair.embassies.includes(nationId));

/**
 * FR-638 (inferred): what `planInfluence` will still give after this turn before the next meeting, kept from a land
 * purchase, while the nation is a nominee; else 0. It reads the record its own diplomacy of this turn leaves
 * (`diplomacyAfterThisTurn`): this turn's grant has added its points, and a war it declares now ends the courting. Each
 * grant turn to come gives one grant to the first `grantTarget` still within the band, adding GRANT_POINTS, so a target
 * the grants take past `toPoints` takes no more. A grant needs an embassy and `embassySaving` none, so at most one of the
 * two is ever above 0.
 */
export function grantSaving(state: GameState, nationId: NationId): number {
  const ahead = councilAhead(state, nationId);
  if (ahead === undefined) return 0;
  const targets = candidates(diplomacyAfterThisTurn(state, nationId), nationId, ahead.rivalId, SCRIPTED_INFLUENCE.fromPoints)
    .filter((c) => c.pair.embassies.includes(nationId))
    .map((c) => ({ points: c.pair.points }));
  let grants = 0;
  for (let turn = Math.max(state.turn + 1, ahead.meeting - SCRIPTED_INFLUENCE.grantTurns); turn < ahead.meeting; turn++) {
    const to = targets.find((t) => t.points <= SCRIPTED_INFLUENCE.toPoints);
    if (!to) break;
    to.points += GRANT_POINTS[SCRIPTED_INFLUENCE.grant];
    grants++;
  }
  return grants * SCRIPTED_INFLUENCE.grant;
}

/** FR-542: embassies and pacts use the same relation band and ranking. Equal scores retain the candidates' id order. */
function embassyCandidates(state: GameState, nationId: NationId, rivalId: NationId): Candidate[] {
  return candidates(state, nationId, rivalId, SCRIPTED_INFLUENCE.embassyFromPoints)
    .sort((a, b) => b.pair.points - a.pair.points);
}

/**
 * FR-490, FR-542: this turn's influence. On a world with provinces, while a meeting is ahead and the nation and a rival
 * are its nominees (FR-291):
 * - after the first meeting, a pact (free, +10 points, FR-165) with an eligible minor where it holds an embassy;
 * - on the `grantTurns` turns before the meeting, one grant of `grant` to the first minor of `candidates` (from
 *   `fromPoints`) it holds an embassy in, while the treasury after it stays at `reserve` (`cashReserve` at the turn's
 *   start) or more;
 * - else the `wantedEmbassy`, kept by `propose` only while the treasury after its $5,000 stays at the upkeep reserve
 *   (FR-213 (a)), the floor of every order of the scripted player.
 */
export function planInfluence(view: () => GameState, nationId: NationId, reserve: number, propose: Propose): void {
  const state = view();
  const ahead = councilAhead(state, nationId);
  if (ahead === undefined) return;
  const { meeting, rivalId } = ahead;

  if (meeting > COUNCIL.firstTurn) {
    const pact = embassyCandidates(state, nationId, rivalId).find((c) => c.pair.embassies.includes(nationId) && !c.pair.pact);
    if (pact) propose({ kind: "proposeOverture", nationId, overture: "pact", targetId: pact.id });
  }

  if (state.turn >= meeting - SCRIPTED_INFLUENCE.grantTurns) {
    const to = grantTarget(view(), nationId, rivalId);
    if (to) {
      const treasury = nationById(view(), nationId)?.treasury ?? 0;
      if (treasury - SCRIPTED_INFLUENCE.grant >= reserve) propose({ kind: "giveGrant", nationId, targetId: to.id, amount: SCRIPTED_INFLUENCE.grant, locked: false });
      return;
    }
  }

  const site = wantedEmbassy(state, nationId);
  if (site !== undefined) propose({ kind: "proposeOverture", nationId, overture: "embassy", targetId: site });
}
