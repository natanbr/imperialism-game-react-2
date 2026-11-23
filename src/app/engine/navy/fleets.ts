import { WARSHIPS, isWarship } from "@/definisions/ships";
import type { GameState } from "@/types/GameState";
import type { Approach, Fleet, FleetMissionIntent } from "@/types/Navy";
import { warActive } from "../diplomacy/queries";
import { provinceById } from "../world/provinces";
import { homeApproach, portApproach } from "./approaches";

export { approachesOf, homeApproach, portApproach } from "./approaches";
export type { Approach } from "@/types/Navy";

/** A sail and a station order each occupy one fleet phase. Troops can embark from the turn after station resolution. */
const LANDING_DELAY_TURNS = 1;
export const firstLandingTurn = (stationTurn: number) => stationTurn + LANDING_DELAY_TURNS;

export const homeFleet = (state: GameState, nationId: string) =>
  state.fleets.find(f => f.ownerNationId === nationId && !f.approach && f.ships.length > 0);

export const deployedFleet = (state: GameState, nationId: string) =>
  state.fleets.find(f => f.ownerNationId === nationId && f.approach && f.ships.length > 0);

export const fleetArms = (fleet?: Fleet): number =>
  fleet?.ships.reduce((sum, s) => sum + (isWarship(s.type) ? WARSHIPS[s.type].armaments : 0), 0) ?? 0;

export const fleetFirepower = (fleet?: Fleet): number =>
  fleet?.ships.reduce((sum, s) => sum + s.firepower, 0) ?? 0;

export const fleetApproach = (state: GameState, fleet: Fleet) => fleet.approach ?? homeApproach(state, fleet.ownerNationId);

export const pendingFleetMission = (state: GameState, nationId: string) =>
  state.intents.find((i): i is FleetMissionIntent => i.kind === "fleet-mission" && i.nationId === nationId && i.turn === state.turn);

const sameApproach = (a: Approach | undefined, b: Approach) => a?.provinceId === b.provinceId && a.seaId === b.seaId;

function portApproaches(state: GameState, nationId: string, provinceId: string): Approach[] {
  if (provinceById(state, provinceId)?.ownerId !== nationId) return [];
  const home = homeApproach(state, nationId);
  const result = home?.provinceId === provinceId ? [home] : [];
  for (const tile of state.map.tiles.flat()) {
    if (tile.provinceId !== provinceId || !tile.port || tile.ownerNationId !== nationId) continue;
    const a = portApproach(state, tile);
    if (a && !result.some(p => sameApproach(p, a))) result.push(a);
  }
  return result;
}

export function isPortClosed(state: GameState, nationId: string, provinceId: string, seaId: string): boolean {
  const at = { provinceId, seaId };
  return state.fleets.some(f => f.ships.length > 0 && !f.contested && sameApproach(f.approach, at) && warActive(state, nationId, f.ownerNationId));
}

export const openPortApproaches = (state: GameState, nationId: string, provinceId: string) =>
  portApproaches(state, nationId, provinceId).filter(p => !isPortClosed(state, nationId, provinceId, p.seaId));

/** Public resolved positions only; a blockaded home berth still permits a relief sortie. */
export function threatenedPorts(state: GameState, nationId: string): Approach[] {
  const threats: Approach[] = [];
  for (const fleet of state.fleets) {
    const at = fleet.approach;
    if (!at || !fleet.ships.length || !warActive(state, nationId, fleet.ownerNationId)) continue;
    if (portApproaches(state, nationId, at.provinceId).some(p => sameApproach(p, at)) && !threats.some(p => sameApproach(p, at))) threats.push(at);
  }
  if (threats.length > 1) {
    const capital = homeApproach(state, nationId)?.provinceId;
    threats.sort((a,b) => Number(b.provinceId === capital) - Number(a.provinceId === capital) || a.provinceId.localeCompare(b.provinceId));
  }
  return threats;
}

/** Keep the nation's fleet index synchronized after deployment, consolidation or defeat. */
export function withFleets(state: GameState, fleets: Fleet[]): GameState {
  const nations = state.nations.map(n => {
    const ids = fleets.filter(f => f.ownerNationId === n.id).map(f => f.id);
    return ids.length === n.fleets.length && ids.every((id,i) => n.fleets[i] === id) ? n : { ...n, fleets: ids };
  });
  return { ...state, fleets, nations };
}
