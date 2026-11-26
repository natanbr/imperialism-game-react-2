// The scripted garrison (FR-213; Imp1 Defense Minister: "Strengthen the Army" when a rival army is more than twice ours
// [08:W26]; the rule is remake). Under a threat, or while its campaign needs a larger field army (FR-274, FR-488), it
// recruits 1 regiment a turn: the first of its list it can raise (FR-482, card Q119 (a)), under a threat down to its
// upkeep reserve (FR-483); its production run (economy.ts) first makes the armaments and keeps them. A recruit beyond the
// capital keep is a field regiment that marches and attacks by FR-228 (FR-484, scriptedWar.ts). On a world without
// provinces there is never a threat or a campaign, so its orders there are as before M8.
import type { GameState } from "@/types/GameState";
import type { CountryId, NationId } from "@/types/Common";
import type { RegimentType } from "@/types/Unit";
import { GoodsType } from "@/types/Resource";
import { REGIMENTS, SCRIPTED_GARRISON, UPKEEP_PER_ARMS } from "@/definisions/regiments";
import { SCRIPTED_WAR } from "@/definisions/combatRules";
import { recruitingOf, strengthIn, upkeepOf } from "../army/armies";
import { warBetween } from "../diplomacy/queries";
import { warOfChoice } from "../diplomacy/scriptedAnswers";
import { nationById } from "../orders/queries";
import { turnLimitOf } from "../turn/gameOver";
import { adjacentProvinces, provincesOf } from "../world/provinces";
import type { Order } from "../orders/Order";
import { campaignRecruit, hasFieldArmy, hasRecruitFor } from "./scriptedWar";
import { embassySaving } from "./scriptedInfluence";

/**
 * A country at war with the nation has a strength (FR-204) in a province bordering one of the nation's provinces above
 * the nation's own strength in that province (FR-213).
 */
export function armyThreat(state: GameState, nationId: NationId): boolean {
  if (state.provinces.length === 0) return false;
  const countries: CountryId[] = [...state.nations.map((n) => n.id), ...state.minorNations.map((m) => m.id)];
  const enemies = countries.filter((id) => id !== nationId && warBetween(state, nationId, id) !== undefined);
  if (enemies.length === 0) return false;
  return provincesOf(state, nationId).some((own) => {
    const ours = strengthIn(state, nationId, own.id);
    return adjacentProvinces(state, own.id).some((near) => enemies.some((enemy) => strengthIn(state, enemy, near.id) > ours));
  });
}

/**
 * The nation wants a regiment this turn: under a threat (FR-213), or while its campaign needs a larger field army
 * (FR-274, FR-488). Then its run makes and keeps the armaments for it (economy.ts) and it recruits `wantedRegiment`.
 */
export const armsWanted = (state: GameState, nationId: NationId): boolean => armyThreat(state, nationId) || campaignRecruit(state, nationId);

/** FR-488, FR-489: the nation is at war with a Great Power it declared war on (`warOfChoice`). */
const inWarOfChoiceWithGreatPower = (state: GameState, nationId: string): boolean =>
  state.nations.some((n) => n.id !== nationId && warOfChoice(state, nationId, n.id));

/** FR-202, FR-483: the upkeep a turn of the regiments the nation recruits this turn ($25 a turn per ARMS). */
function recruitsUpkeep(state: GameState, nationId: string): number {
  const recruiting = nationById(state, nationId)?.recruiting ?? {};
  return (Object.entries(recruiting) as [RegimentType, number][]).reduce((sum, [type, count]) => sum + count * REGIMENTS[type].stats.armamentsCost * UPKEEP_PER_ARMS, 0);
}

/**
 * FR-213 (a): the cash the scripted player keeps for its army upkeep (FR-202): two turns of it, and in the last 8 turns
 * the upkeep of every turn left (this one included), so the field army is paid to the end even when the sales stop.
 * Review E1: with two turns only, 6 of the 20 partners-market nation-games of seeds 1 to 10 lost their field army in
 * the last turns; with this rule none did, while a flat reserve of 6 or more turns cost about 100 points at turn 40.
 * FR-275 (M9 review R1): with regiments beyond its capital keep (a field army, FR-274) the reserve rises by one turn of
 * upkeep a turn into the last 8 turns (turn 28: 3 turns ... turn 32: 7) instead of stepping from 2 to 8 at turn 33:
 * after its campaign, a nation that spent down to 2 turns on turn 31 and sold nothing for two turns lost its army.
 * FR-483: the regiments recruited this turn count (they are paid for from next turn), so the orders planned after a
 * recruit keep its upkeep too; `extraUpkeep` counts a regiment not ordered yet (its ARMS x $25).
 * FR-488, FR-489, FR-497: in a war it declared on a Great Power it keeps the upkeep of every turn left, since that
 * country may never accept its peace. Measured on the 24 idle sim games: 3 lost regiments for want of pay without it
 * (seeds 4, 5, 6, turns 31 to 38, sales stopped from about turn 26), none with it; mean score at turn 40 1,383 -> 1,413.
 * Set `purchase` to `"depot"` when budgeting a new depot. In a weak world market a field army then keeps six payrolls.
 * Omit it when funding connecting rail or other orders, which use the ordinary world-market reserve.
 */
export const upkeepReserve = (state: GameState, nationId: string, extraUpkeep = 0, purchase?: "depot"): number => {
  const left = Math.max(0, turnLimitOf(state) - state.turn) + 1;
  const upkeep = upkeepOf(state, nationId) + recruitsUpkeep(state, nationId) + extraUpkeep;
  const { upkeepTurns, endgameTurns } = SCRIPTED_GARRISON;
  if (left <= endgameTurns || inWarOfChoiceWithGreatPower(state, nationId)) return upkeep * left;
  const field = hasFieldArmy(state, nationId);
  const ramp = field ? 2 * endgameTurns - left : 0;
  const history = nationById(state, nationId)?.merchantMarine.tradeHistory;
  let reserveTurns = Math.max(upkeepTurns, ramp);
  const partners = state.market?.mode === "partners";
  if (history?.length && (partners || purchase === "depot")) {
    const closingPartners = partners && state.intents.some(intent => intent.nationId === nationId && intent.kind === "war");
    const totalHolds = history.reduce((sum, phase) => sum + phase.holds, 0);
    const usedHolds = history.reduce((sum, phase) => sum + phase.used, 0);
    const halfEmpty = field && history.length === 4 && usedHolds * 2 <= totalHolds;
    // On the world market, weak sales defer a new depot while the existing railway can still be joined.
    if (closingPartners || halfEmpty) reserveTurns = Math.max(reserveTurns, SCRIPTED_GARRISON.disruptedTradeUpkeepTurns);
  }
  return upkeep * Math.min(left, reserveTurns);
};

/**
 * FR-482: the regiment the nation recruits this turn, or undefined; pure. While arms are wanted (`armsWanted`) it is the
 * first of its list (`SCRIPTED_WAR.threatRegiments` under a threat, else `campaignRegiments`) it can raise now: a
 * healthy worker of the grade and the horses (`hasRecruitFor`), the armaments in stock, and the cash: the treasury after
 * the order stays at SCRIPTED_GARRISON.treasuryFloor ($2,500) or more, under a threat at `upkeepReserve` counted with the
 * new regiment instead (FR-483). Example: invaded with no untrained worker, 4 trained, 4 horses, $3,118 and an armament:
 * Cuirassiers (Regulars need an untrained worker). FR-542: a campaign recruit also leaves the embassy's $5,000 while one
 * is wanted (`embassySaving`); under a threat it does not wait.
 */
export function wantedRegiment(state: GameState, nationId: NationId): RegimentType | undefined {
  const nation = nationById(state, nationId);
  if (!nation) return undefined;
  const threat = armyThreat(state, nationId);
  if (!threat && !campaignRecruit(state, nationId)) return undefined;
  const armaments = (nation.warehouse as Record<string, number>)[GoodsType.Armaments] ?? 0;
  const list = threat ? SCRIPTED_WAR.threatRegiments : SCRIPTED_WAR.campaignRegiments;
  const saving = threat ? 0 : embassySaving(state, nationId);
  const canRaise = (regiment: RegimentType): boolean => {
    const def = REGIMENTS[regiment];
    return hasRecruitFor(nation, regiment) && armaments >= def.stats.armamentsCost &&
      (threat || nation.treasury - def.cash >= SCRIPTED_GARRISON.treasuryFloor + saving);
  };
  const leavesUpkeep = (regiment: RegimentType): boolean => {
    const def = REGIMENTS[regiment];
    return nation.treasury - def.cash >= upkeepReserve(state, nationId, def.stats.armamentsCost * UPKEEP_PER_ARMS);
  };
  const candidates = list.filter(canRaise);
  if (threat) return candidates.find(leavesUpkeep);
  const preferred = candidates[0];
  if (preferred === undefined || leavesUpkeep(preferred)) return preferred;
  // The campaign's preferred recruit would spend its upkeep. Keep the cheaper force it can pay for.
  return candidates.sort((a, b) => REGIMENTS[a].cash - REGIMENTS[b].cash).find(leavesUpkeep);
}

/**
 * FR-213, FR-274, FR-482: 1 regiment this turn (`wantedRegiment`), kept only when it validates (`propose`). Planned after
 * the standing orders are cleared and before anything else takes labour or cash.
 */
export function planGarrison(view: () => GameState, nationId: NationId, propose: (order: Order) => boolean): void {
  const state = view();
  const regiment = wantedRegiment(state, nationId);
  if (regiment === undefined) return;
  propose({ kind: "setRecruitment", nationId, regiment, count: recruitingOf(nationById(state, nationId)!, regiment) + 1 });
}
