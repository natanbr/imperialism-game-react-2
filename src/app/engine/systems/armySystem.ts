// The army steps of End Turn outside the combat phase (M8): right after the trade phase the ordered disbands (FR-207)
// and then the upkeep (FR-202); after the combat phase the regiments recruited this turn join (FR-201). The marches and
// the healing are the combat phase's (combatSystem.ts). A world without armies (two-islands) passes unchanged.
import type { GameState } from "@/types/GameState";
import type { RegimentId } from "@/types/Common";
import type { DisbandIntent } from "@/types/Intent";
import { isMilitia, REGIMENT_TYPES, REGIMENTS, UPKEEP_PER_ARMS } from "@/definisions/regiments";
import {
  capitalProvinceOf,
  findRegiment,
  raiseRegiments,
  recruitingOf,
  regimentsOf,
  removeRegiments,
  serialOf,
  upkeepOf,
} from "../army/armies";
import { byIntentOrder, intentOrder } from "../turn/intents";
import type { TurnContext, TurnSystem } from "../turn/context";

/**
 * FR-207: the regiments of this turn's disband intents leave, with no cash, armaments or worker back; one
 * `regiments-disbanded` (reason "order") per nation, nations in `intentOrder`. Checked again: a regiment no longer in the
 * nation's army in the province named is skipped.
 */
export const disbandSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => {
  const disbands = byIntentOrder(state, ctx.turn, state.intents.filter((i): i is DisbandIntent => i.kind === "disband"));
  if (disbands.length === 0) return state;
  const gone = new Set<RegimentId>();
  const counts = new Map<string, number>();
  for (const intent of disbands) {
    for (const id of intent.regimentIds) {
      const found = findRegiment(state, id);
      if (!found || gone.has(id) || found.army.ownerId !== intent.nationId || found.army.provinceId !== intent.provinceId) continue;
      if (isMilitia(found.regiment.type)) continue;
      gone.add(id);
      counts.set(intent.nationId, (counts.get(intent.nationId) ?? 0) + 1);
    }
  }
  for (const nationId of intentOrder(state, ctx.turn)) {
    const count = counts.get(nationId) ?? 0;
    if (count > 0) ctx.emit({ type: "regiments-disbanded", nationId, reason: "order", count });
  }
  return removeRegiments(state, gone);
};

/**
 * FR-202: each Great Power pays $25 x the ARMS of its non-militia regiments and gets `army-upkeep` (none at $0). When
 * the treasury cannot pay, its newest regiments (highest id) are disbanded one at a time until it can (Q36: Imp1 goes
 * into debt; v2 has no credit), with one `regiments-disbanded` (reason "no-pay") before the payment.
 */
export const upkeepSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => {
  let s = state;
  for (const nation of state.nations) {
    let amount = upkeepOf(s, nation.id);
    if (amount === 0) continue;
    if (nation.treasury < amount) {
      const newestFirst = regimentsOf(s, nation.id)
        .filter((r) => !isMilitia(r.type))
        .sort((a, b) => serialOf(b.id) - serialOf(a.id));
      const gone = new Set<RegimentId>();
      for (const regiment of newestFirst) {
        if (nation.treasury >= amount) break;
        gone.add(regiment.id);
        amount -= UPKEEP_PER_ARMS * REGIMENTS[regiment.type].stats.armamentsCost;
      }
      s = removeRegiments(s, gone);
      ctx.emit({ type: "regiments-disbanded", nationId: nation.id, reason: "no-pay", count: gone.size });
    }
    if (amount <= 0) continue;
    const paid = amount;
    s = { ...s, nations: s.nations.map((n) => (n.id === nation.id ? { ...n, treasury: n.treasury - paid } : n)) };
    ctx.emit({ type: "army-upkeep", nationId: nation.id, amount: paid });
  }
  return s;
};

/**
 * FR-201: after the combat phase each nation's recruits of this turn join its army in its capital province at health 100,
 * one `regiments-recruited` per type (types in the Imp1 table's order, nations in founding order, so the new ids do not
 * depend on the order of `state.nations`); the order is then cleared. The workers left the workforce when ordered and
 * never come back. A nation that no longer holds its capital province (M9) raises none.
 */
export const recruitSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => {
  if (!state.nations.some((n) => n.recruiting !== undefined)) return state;
  let s = state;
  for (const nation of [...state.nations].sort((a, b) => a.colorSlot - b.colorSlot)) {
    const capital = capitalProvinceOf(s, nation.id);
    if (!capital || capital.ownerId !== nation.id) continue;
    for (const type of REGIMENT_TYPES) {
      const count = recruitingOf(nation, type);
      if (count <= 0) continue;
      s = raiseRegiments(s, nation.id, capital.id, type, count);
      ctx.emit({ type: "regiments-recruited", nationId: nation.id, regiment: type, count });
    }
  }
  return {
    ...s,
    nations: s.nations.map((n) => {
      if (n.recruiting === undefined) return n;
      const cleared = { ...n };
      delete cleared.recruiting;
      return cleared;
    }),
  };
};
