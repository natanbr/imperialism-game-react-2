// The era-1 regiments (FR-199): stats from the Imp1 manual p91, costs from rules 08 sections 1 and 7.1 (Armoury
// screens [08:W20]; derived costs marked). [NEEDS CLARIFICATION] Q31: the derived costs stand until a screen shows them.
// Also the M8 rule numbers: upkeep (FR-202), start forces (FR-203), healing (FR-208), the scripted garrison (FR-213).
import type { WorkerGrade } from "../types/Industry";
import { RegimentCategory, type RegimentType, type UnitStats } from "../types/Unit";

/** How a regiment fights (M9's firing order, FR-218): Minutemen are militia but fire with the infantry. */
export type RegimentArm = "infantry" | "cavalry" | "artillery" | "engineers";

export interface RegimentDefinition {
  /** The Imp1 display name, a plural noun: "Regulars", "Light Artillery". */
  name: string;
  category: RegimentCategory;
  arm: RegimentArm;
  stats: UnitStats;
  /** The grade of the worker a recruit takes out of the workforce for good; none for militia. */
  worker?: WorkerGrade;
  horses: number;
  cash: number;
}

const stats = (
  fpNormal: number,
  fpMelee: number,
  [range, rangeEntrenched]: [number, number?],
  [defense, defenseEntrenched]: [number, number?],
  move: number,
  armamentsCost: number
): UnitStats => ({
  fpNormal,
  fpMelee,
  range,
  ...(rangeEntrenched === undefined ? {} : { rangeEntrenched }),
  defense,
  ...(defenseEntrenched === undefined ? {} : { defenseEntrenched }),
  move,
  armamentsCost,
});

/** FPN / FPM / RNG / DEF (entrenched) / MVR, ARMS, worker grade, horses and cash (FR-199). */
export const REGIMENTS: Readonly<Record<RegimentType, RegimentDefinition>> = {
  minutemen: { name: "Minutemen", category: RegimentCategory.Militia, arm: "infantry", stats: stats(5, 5, [5], [4, 5], 4, 0), horses: 0, cash: 0 },
  // Imp1 Armoury screen
  skirmishers: { name: "Skirmishers", category: RegimentCategory.LightInfantry, arm: "infantry", stats: stats(5, 5, [5], [7, 8], 6, 1), worker: "untrained", horses: 0, cash: 200 },
  // Imp1 wiki [?]
  regulars: { name: "Regulars", category: RegimentCategory.RegularInfantry, arm: "infantry", stats: stats(10, 10, [5], [5, 6], 4, 1), worker: "untrained", horses: 0, cash: 500 },
  // Imp1 screen, by subtraction [?]
  grenadiers: { name: "Grenadiers", category: RegimentCategory.HeavyInfantry, arm: "infantry", stats: stats(12, 12, [5], [5, 6], 4, 1), worker: "trained", horses: 0, cash: 1000 },
  // derived from the 1998 guide, low [?]
  hussars: { name: "Hussars", category: RegimentCategory.LightCavalry, arm: "cavalry", stats: stats(7, 10, [3], [7], 11, 1), worker: "untrained", horses: 1, cash: 100 },
  // derived, medium
  cuirassiers: { name: "Cuirassiers", category: RegimentCategory.HeavyCavalry, arm: "cavalry", stats: stats(15, 19, [3], [5], 9, 1), worker: "trained", horses: 1, cash: 500 },
  // derived, low [?]
  lightArtillery: { name: "Light Artillery", category: RegimentCategory.LightArtillery, arm: "artillery", stats: stats(10, 3, [9, 10], [3, 4], 5, 2), worker: "trained", horses: 1, cash: 1000 },
  // Imp1 screen
  artillery: { name: "Artillery", category: RegimentCategory.HeavyArtillery, arm: "artillery", stats: stats(16, 4, [11, 12], [2, 3], 3, 2), worker: "trained", horses: 0, cash: 1000 },
  // derived, medium; not recruitable in v2 (Q31: Sappers dig walls, which v2 does not model)
  sappers: { name: "Sappers", category: RegimentCategory.CombatEngineers, arm: "engineers", stats: stats(0, 0, [5], [3, 4], 4, 2), worker: "expert", horses: 0, cash: 5000 },
};

/** The 9 types in the Imp1 table's order; recruits of one turn are raised in this order (FR-201). */
export const REGIMENT_TYPES: readonly RegimentType[] = [
  "minutemen",
  "skirmishers",
  "regulars",
  "grenadiers",
  "hussars",
  "cuirassiers",
  "lightArtillery",
  "artillery",
  "sappers",
];

export const isRegimentType = (type: unknown): type is RegimentType => typeof type === "string" && Object.hasOwn(REGIMENTS, type);

export const isMilitia = (type: RegimentType): boolean => REGIMENTS[type].category === RegimentCategory.Militia;

/** The Armoury's types (FR-200, FR-212): neither militia nor Sappers. */
export const RECRUITABLE_REGIMENTS: readonly RegimentType[] = REGIMENT_TYPES.filter((t) => !isMilitia(t) && t !== "sappers");

/**
 * A type entrenches (takes 20% less damage when defending, M9) only if it has an entrenched DEF and is not artillery
 * (Imp1 manual p37-38, v1.0 readme): Minutemen, Skirmishers, Regulars, Grenadiers, Sappers (FR-199).
 */
export const entrenches = (type: RegimentType): boolean =>
  REGIMENTS[type].stats.defenseEntrenched !== undefined && REGIMENTS[type].arm !== "artillery";

/** Upkeep: $25 a turn per arms point of each non-militia regiment (Imp1 ledgers 1815 to 1836, FR-202). */
export const UPKEEP_PER_ARMS = 25;

/** Health a regiment that neither moved nor fought gains at the end of the combat phase, up to 100 (FR-208, Q32: remake). */
export const HEALING_PER_TURN = 10;
export const FULL_HEALTH = 100;

/**
 * The start forces of a new game with provinces (FR-203, Q30; the composition is remake): each Great Power's field army
 * in its capital province (force size 4, upkeep $100), Minutemen in each of its provinces and in each minor's, a fort
 * on each Great Power capital tile, and horses in its warehouse.
 */
export const START_FORCES = {
  field: [
    ["regulars", 2],
    ["artillery", 1],
  ] as readonly (readonly [RegimentType, number])[],
  militiaPerGreatPowerProvince: 4,
  militiaPerMinorProvince: 3,
  capitalFortLevel: 1,
  extraHorses: 4,
} as const;

/**
 * The scripted garrison (FR-213; Imp1 Defense Minister, rule remake): under a threat it recruits 1 Regulars a turn while
 * its treasury after the order stays at `treasuryFloor` or more; its run first makes armaments up to `armaments` in
 * stock; its orders keep `upkeepTurns` turns of its upkeep, and in the last `endgameTurns` turns the upkeep of every
 * turn left; it never moves or disbands, so its capital province keeps the start army's `capitalArms` (asserted by the
 * FR-213, FR-247 and FR-260 tests).
 */
export const SCRIPTED_GARRISON = {
  regiment: "regulars" as RegimentType,
  treasuryFloor: 2500,
  armaments: 2,
  upkeepTurns: 2,
  endgameTurns: 8,
  capitalArms: 4,
} as const;
