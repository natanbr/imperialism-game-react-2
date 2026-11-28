// FR-650 (M18l; Imp1 Scouting Report, rules 11 section 5.3; rules 08: "We cannot scout this province without a nearby
// ship or neighboring armies"): what a nation's scouts see of another country's province. A read only: no Order, no RNG
// draw, no state change. Card Q32 makes defenders fully visible in the Attack preview, so the report counts the same
// regiments (`defendersOf`) exactly, by type, with no unit of unknown type.
import { REGIMENT_TYPES } from "@/definisions/regiments";
import type { CountryId, NationId, ProvinceId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { RegimentType } from "@/types/Unit";
import { adjacentProvinces, provinceById } from "../world/provinces";
import { armyAt } from "./armies";
import { defendersOf } from "./combat";

/**
 * Who sees the province, the first that applies: our garrison in a bordering province we own, our army in a bordering
 * province we do not own, our squadron lying off the province. The remake has no named sea zones (card Q144 chose
 * province approaches), so "a ship in a sea zone touching it" is a squadron whose approach is this province.
 */
export type ScoutingObserver =
  | { kind: "garrison"; provinceId: ProvinceId }
  | { kind: "army"; provinceId: ProvinceId }
  | { kind: "fleet"; fleetId: string; provinceId: ProvinceId };

export interface ScoutedForce {
  type: RegimentType;
  count: number;
}

export interface ScoutingReport {
  provinceId: ProvinceId;
  ownerId: CountryId;
  /** Absent when no one of ours can scout the province: the report is unavailable. */
  observer?: ScoutingObserver;
  /** The owner's regiments in the province by type (militia included), in REGIMENT_TYPES order; empty without an observer. */
  forces: ScoutedForce[];
}

const holdsRegiments = (state: GameState, ownerId: CountryId, provinceId: ProvinceId): boolean =>
  (armyAt(state, ownerId, provinceId)?.regiments.length ?? 0) > 0;

/** Bordering provinces in state order, so the same state always names the same estimator. */
export function scoutingObserver(state: GameState, viewerId: NationId, provinceId: ProvinceId): ScoutingObserver | undefined {
  const around = adjacentProvinces(state, provinceId);
  const garrison = around.find((p) => p.ownerId === viewerId && holdsRegiments(state, viewerId, p.id));
  if (garrison) return { kind: "garrison", provinceId: garrison.id };
  const army = around.find((p) => holdsRegiments(state, viewerId, p.id));
  if (army) return { kind: "army", provinceId: army.id };
  const fleet = state.fleets.find((f) => f.ownerNationId === viewerId && f.ships.length > 0 && f.approach?.provinceId === provinceId);
  return fleet ? { kind: "fleet", fleetId: fleet.id, provinceId } : undefined;
}

/**
 * The viewer's Scouting Report on another country's province; undefined for an unknown province or one of the viewer's
 * own (a world without provinces has none). Settled positions only: an Order queued this turn moves no regiment and no
 * squadron until settlement (FR-497).
 */
export function scoutingReport(state: GameState, viewerId: NationId, provinceId: ProvinceId): ScoutingReport | undefined {
  const province = provinceById(state, provinceId);
  if (!province || province.ownerId === viewerId) return undefined;
  const observer = scoutingObserver(state, viewerId, provinceId);
  if (!observer) return { provinceId, ownerId: province.ownerId, forces: [] };
  const counts = new Map<RegimentType, number>();
  for (const { regiment } of defendersOf(state, provinceId)) counts.set(regiment.type, (counts.get(regiment.type) ?? 0) + 1);
  const forces = REGIMENT_TYPES.flatMap((type) => {
    const count = counts.get(type);
    return count ? [{ type, count }] : [];
  });
  return { provinceId, ownerId: province.ownerId, observer, forces };
}
