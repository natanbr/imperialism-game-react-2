import type { Fleet } from "@/types/Navy";
import type { GameState } from "@/types/GameState";
import { warActive } from "../diplomacy/queries";
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
  const positioned = state.fleets.map(f => missionPosition(state, f, ctx));
  const contacts = positioned.filter(f => f.approach).map(f => ({fleet:f, power:fleetFirepower(f)}));
  contacts.sort((a,b) => b.power - a.power || a.fleet.ownerNationId.localeCompare(b.fleet.ownerNationId) || a.fleet.id.localeCompare(b.fleet.id));
  const returned = new Set<string>();
  const ties = new Map<string, string[]>();
  const reports: { a: Fleet; b: Fleet; winner?: Fleet }[] = [];
  const oldSite = new Set(state.fleets.filter(f => f.siteSinceTurn !== undefined).map(f => f.id));
  for (let i = 0; i < contacts.length; i++) {
    const {fleet:a, power:aPower} = contacts[i];
    if (returned.has(a.id)) continue;
    for (let j = i + 1; j < contacts.length; j++) {
      const {fleet:b, power:bPower} = contacts[j];
      const at = a.approach!;
      if (returned.has(b.id) || at.provinceId !== b.approach!.provinceId || at.seaId !== b.approach!.seaId ||
          !warActive(state, a.ownerNationId, b.ownerNationId)) continue;
      const winner = aPower > bPower ? a : undefined;
      const site = a.siteSinceTurn !== undefined || b.siteSinceTurn !== undefined;
      if (winner) {
        returned.add(b.id);
      } else {
        ties.set(a.id, [...(ties.get(a.id) ?? []), b.id]);
        ties.set(b.id, [...(ties.get(b.id) ?? []), a.id]);
      }
      // A standing tie remains visible on the map. Report again only when contact or its effect changes.
      const previousSite = oldSite.has(a.id) || oldSite.has(b.id);
      if (!winner && a.contestedWith?.includes(b.id) && b.contestedWith?.includes(a.id) && site === previousSite) continue;
      reports.push({ a, b, winner });
    }
  }
  // Winning one engagement can still leave the landing site tied against a third squadron.
  for (const { a, b, winner } of reports) {
    const winnerContested = winner && ties.has(winner.id);
    const site = a.siteSinceTurn !== undefined || b.siteSinceTurn !== undefined;
    const landing = !site ? "none" : winner?.siteSinceTurn !== undefined && !winnerContested ? "held" : "blocked";
    const sides = [a, b].sort((x, y) => x.ownerNationId.localeCompare(y.ownerNationId));
    const stats = (f: Fleet) => ({ nationId: f.ownerNationId, firepower: fleetFirepower(f) });
    ctx.emit({ type: "naval-engagement", ...a.approach!, sides: [stats(sides[0]), stats(sides[1])],
      ...(winner && { winnerId: winner.ownerNationId }), ...(winnerContested && { winnerContested: true }), landing });
  }
  const fleets = positioned.map(f => {
    if (returned.has(f.id)) return atBerth(f);
    // A tie can only be recorded after every stronger attacker has already had its contact.
    const opponents = ties.get(f.id);
    if (opponents) return { ...f, contested: true, contestedWith: opponents };
    if (!f.contested && !f.contestedWith) return f;
    const clear = { ...f };
    delete clear.contested;
    delete clear.contestedWith;
    return clear;
  });
  if (fleets.every((f,i) => f === state.fleets[i])) return state;
  return withFleets(state, consolidateBerths(fleets));
};
