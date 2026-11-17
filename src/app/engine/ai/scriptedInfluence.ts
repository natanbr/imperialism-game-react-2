// The scripted Great Power's influence on the minors (M13, FR-490, card Q117 (a)): grants before each Council meeting.
// Called by economy.ts `planTrade` right after the consulate (planConsulate), on every world and in both market modes;
// the rule itself keeps to a world with provinces (FR-498).
import type { MinorNationId, NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { PairDiplomacy } from "@/types/Diplomacy";
import type { Order } from "../orders/Order";
import { OVERTURE_COST, SCRIPTED_INFLUENCE } from "@/definisions/diplomacyRules";
import { councilNominees, nextCouncilTurn } from "../council/council";
import { warBetween } from "../diplomacy/queries";
import { relationOf } from "../diplomacy/relations";
import { nationById } from "../orders/queries";
import { campaignTarget } from "./scriptedWar";

type Propose = (order: Order) => boolean;

interface Candidate {
  id: MinorNationId;
  pair: PairDiplomacy;
}

/**
 * The minors worth winning over for the meeting, in id order: free (not a colony), not at war with the nation and not its
 * own campaign's target (it would be soon), with `from` to `SCRIPTED_INFLUENCE.toPoints` relation points with it and at
 * least the rival nominee's. Reads what Diplomacy shows a human (FR-417, FR-497) and the nation's own plan.
 */
function candidates(state: GameState, nationId: NationId, rivalId: NationId, from: number): Candidate[] {
  const target = campaignTarget(state, nationId);
  return state.minorNations
    .filter((m) => m.colonyOf === undefined && m.id !== target && warBetween(state, nationId, m.id) === undefined)
    .flatMap((m) => {
      const pair = relationOf(state, nationId, m.id);
      const rival = relationOf(state, rivalId, m.id)?.points ?? 0;
      return pair && pair.points >= from && pair.points <= SCRIPTED_INFLUENCE.toPoints && pair.points >= rival ? [{ id: m.id, pair }] : [];
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * FR-490: this turn's grant, or the embassy the grants need. On a world with provinces, while a meeting is ahead and the
 * nation and a rival are its nominees (FR-291):
 * - on the `grantTurns` turns before the meeting, one grant of `grant` to the first minor of `candidates` (from
 *   `fromPoints`) it holds an embassy in;
 * - else, while it holds an embassy in none of the `candidates` from `embassyFromPoints`, an embassy in the first one it
 *   holds a consulate in (FR-162: an embassy needs a consulate, a grant an embassy).
 * Each only while the treasury after it stays at `reserve` (`cashReserve` at the turn's start) or more; `propose` drops an
 * order that spends the upkeep reserve (FR-213 (a)).
 */
export function planInfluence(view: () => GameState, nationId: NationId, reserve: number, propose: Propose): void {
  const state = view();
  if (state.provinces.length === 0) return;
  const meeting = nextCouncilTurn(state);
  if (meeting === undefined || state.turn >= meeting) return;
  const nominees = councilNominees(state);
  const rivalId = nominees.find((id) => id !== nationId);
  if (rivalId === undefined || !nominees.includes(nationId)) return;
  const affords = (cost: number) => (nationById(view(), nationId)?.treasury ?? 0) - cost >= reserve;

  if (state.turn >= meeting - SCRIPTED_INFLUENCE.grantTurns) {
    const to = candidates(state, nationId, rivalId, SCRIPTED_INFLUENCE.fromPoints).find((c) => c.pair.embassies.includes(nationId));
    if (to) {
      if (affords(SCRIPTED_INFLUENCE.grant)) propose({ kind: "giveGrant", nationId, targetId: to.id, amount: SCRIPTED_INFLUENCE.grant, locked: false });
      return;
    }
  }

  const courted = candidates(state, nationId, rivalId, SCRIPTED_INFLUENCE.embassyFromPoints);
  if (courted.some((c) => c.pair.embassies.includes(nationId))) return;
  const site = courted.find((c) => c.pair.consulates.includes(nationId));
  if (site && affords(OVERTURE_COST.embassy)) propose({ kind: "proposeOverture", nationId, overture: "embassy", targetId: site.id });
}
