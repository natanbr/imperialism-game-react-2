// types/Unit.ts: the regiment categories and stats of the rules' unit table (rules 08 section 1, Imp1 manual p91).

export enum RegimentCategory {
  Militia = "militia",             // immobile local defenders
  LightInfantry = "lightInfantry",
  RegularInfantry = "regularInfantry",
  HeavyInfantry = "heavyInfantry",
  LightCavalry = "lightCavalry",
  HeavyCavalry = "heavyCavalry",
  LightArtillery = "lightArtillery",
  HeavyArtillery = "heavyArtillery",
  CombatEngineers = "combatEngineers",
}

/** The era-1 regiment types (FR-199), keys of `REGIMENTS` (definisions/regiments.ts). */
export type RegimentType =
  | "minutemen"
  | "skirmishers"
  | "regulars"
  | "grenadiers"
  | "hussars"
  | "cuirassiers"
  | "lightArtillery"
  | "artillery"
  | "sappers";

export interface UnitStats {
  fpNormal: number;     // firepower normal (FPN)
  fpMelee: number;      // melee firepower (FPM)
  range: number;        // range (RNG)
  /** The range in brackets in the Imp1 table (artillery), if any. */
  rangeEntrenched?: number;
  defense: number;      // base defense (DEF)
  /** The entrenched DEF in brackets in the Imp1 table, if any; cavalry has none (FR-199). */
  defenseEntrenched?: number;
  move: number;         // tactical move (MVR)
  armamentsCost: number;// ARMS: armaments to raise it, its force size and upkeep (FR-202); 0 for militia
}
