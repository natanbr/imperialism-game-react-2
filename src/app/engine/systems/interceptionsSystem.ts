import type { Fleet } from "@/types/Navy";
import type { GameState } from "@/types/GameState";
import { warActive } from "../diplomacy/queries";
import { repairAtBerth, seaBattle } from "../navy/battle";
import { fleetApproach, fleetFirepower, pendingFleetMission, withFleets } from "../navy/fleets";
import { validateFleetMission } from "../orders/fleetOrders";
import type { SetFleetMissionOrder } from "../orders/Order";
import type { TurnContext, TurnSystem } from "../turn/context";

function atBerth(fleet: Fleet): Fleet {
  const home = { ...fleet, location: "berth" };
  delete home.approach;
  delete home.siteSinceTurn;
  delete home.contested;
  delete home.contestedWith;
  return home;
}

function missionPosition(state: GameState, fleet: Fleet, ctx: TurnContext): Fleet {
  const intent = pendingFleetMission(state, fleet.ownerNationId);
  if (!intent || intent.fleetId !== fleet.id) return fleet;
  const order: SetFleetMissionOrder = {kind:"setFleetMission",nationId:intent.nationId,fleetId:intent.fleetId,mission:intent.mission,
    ...(intent.provinceId && {provinceId:intent.provinceId})};
  const result = validateFleetMission(state, order);
  if (!result.ok) {
    ctx.emit({type:"order-rejected", nationId:intent.nationId, order, reason:result.reason});
    return fleet;
  }
  if (intent.mission === "return") return atBerth(fleet);
  if (intent.mission === "station") return { ...fleet, siteSinceTurn: state.turn };
  const seaId = fleetApproach(state, fleet)!.seaId;
  return { ...atBerth(fleet), location: seaId, approach: { provinceId: intent.provinceId!, seaId } };
}

function consolidateBerths(fleets: Fleet[]): Fleet[] {
  const result: Fleet[] = [];
  for (const fleet of fleets) {
    const berth = !fleet.approach && result.find(f => f.ownerNationId === fleet.ownerNationId && !f.approach);
    if (berth) {
      const i = result.indexOf(berth);
      result[i] = { ...berth, ships: [...berth.ships, ...fleet.ships] };
    } else result.push(fleet);
  }
  return result;
}

/** All squadrons sail first. The strongest resolve contact first; ties use public nation and fleet ids. */
export const interceptionsSystem: TurnSystem = (state, ctx) => {
  if (!state.fleets.length) return state;
  const positioned = state.fleets.map(f => {
    const moved = missionPosition(state, f, ctx);
    return !f.approach && !moved.approach ? repairAtBerth(moved) : moved;
  });
  const current = new Map(positioned.map(f => [f.id, f]));
  const contacts = positioned.filter(f => f.approach).map(f => ({fleet:f, power:fleetFirepower(f)}));
  contacts.sort((a,b) => b.power - a.power || a.fleet.ownerNationId.localeCompare(b.fleet.ownerNationId) || a.fleet.id.localeCompare(b.fleet.id));
  const reports: ReturnType<typeof seaBattle>[] = [];
  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = current.get(contacts[i].fleet.id);
      if (!a?.approach) break;
      const b = current.get(contacts[j].fleet.id);
      if (!b?.approach || a.approach.provinceId !== b.approach.provinceId || a.approach.seaId !== b.approach.seaId ||
          !warActive(state, a.ownerNationId, b.ownerNationId)) continue;
      const result = seaBattle(a, b, ctx.rngFor("naval"));
      reports.push(result);
      for (const fleet of [result.afterLeft, result.afterRight]) {
        if (!fleet.ships.length) current.delete(fleet.id);
        else current.set(fleet.id, result.winner && result.winner.id !== fleet.id ? atBerth(fleet) : fleet);
      }
    }
  }
  // A later engagement may sink or repel an opponent from an earlier tie.
  const ties = new Map<string, string[]>();
  for (const { afterLeft: a, afterRight: b, winner } of reports) {
    if (!winner && current.get(a.id)?.approach && current.get(b.id)?.approach) {
      ties.set(a.id, [...(ties.get(a.id) ?? []), b.id]);
      ties.set(b.id, [...(ties.get(b.id) ?? []), a.id]);
    }
  }
  for (const { afterLeft: a, afterRight: b, winner, rounds, sides } of reports) {
    const winnerContested = winner && ties.has(winner.id);
    const winnerDisplaced = winner && !current.get(winner.id)?.approach;
    const laterHolder = !winner && [a, b].find(f => current.get(f.id)?.approach && !ties.has(f.id));
    const site = a.siteSinceTurn !== undefined || b.siteSinceTurn !== undefined;
    const siteHeld = [a, b].some(f => current.get(f.id)?.siteSinceTurn !== undefined && !ties.has(f.id));
    const landing = !site ? "none" : siteHeld ? "held" : "blocked";
    if (!winner && ties.get(a.id)?.includes(b.id) && a.contestedWith?.includes(b.id) && b.contestedWith?.includes(a.id)) {
      const previouslyHadSite = state.fleets.some(f => (f.id === a.id || f.id === b.id) && f.siteSinceTurn !== undefined);
      if (previouslyHadSite === site && sides.every(side => side.ships?.every(ship => ship.hullBefore === ship.hullAfter))) continue;
    }
    ctx.emit({ type: "naval-engagement", ...a.approach!, rounds, sides,
      ...(winner && { winnerId: winner.ownerNationId }), ...(winnerContested && { winnerContested: true }),
      ...(winnerDisplaced && { winnerDisplaced: true }), ...(laterHolder && { laterHolderId: laterHolder.ownerNationId }), landing });
  }
  const fleets = Array.from(current.values(), f => {
    const opponents = ties.get(f.id);
    if (opponents) return { ...f, contested: true, contestedWith: opponents };
    if (!f.contested && !f.contestedWith) return f;
    const clear = { ...f };
    delete clear.contested;
    delete clear.contestedWith;
    return clear;
  });
  if (fleets.length === state.fleets.length && fleets.every((f,i) => f === state.fleets[i])) return state;
  return withFleets(state, consolidateBerths(fleets));
};
