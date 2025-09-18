// types/Unit.ts

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

export interface UnitStats {
  fpNormal: number;     // firepower normal
  fpMelee: number;      // melee firepower
  range: number;        // max range (defensive range may be +1 in tactical)
  defense: number;      // base defense
  defenseEntrenched: number; // entrenched
  move: number;         // tactical move
  armamentsCost: number;// ARMS (also rails cost = 5 per ARMS to transport)
}

export interface Unit {
  id: string;
  name?: string;
  category: RegimentCategory;
  era: 1 | 2 | 3;       // 1: ~1815-45, 2: ~1845-80, 3: ~1880+
  health: number;       // 0..100
  experience: number;   // 0..4 medals
  horsesRequired?: number; // cavalry/artillery
  fuelRequired?: number;   // late units
  stats: UnitStats;
  entrenched?: boolean;
}
