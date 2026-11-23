// types/Navy.ts
import type { NationId, ProvinceId, SeaZoneId } from "./Common";
import type { Intent } from "./Intent";

export enum ShipType {
  Frigate = "frigate",
  ShipOfTheLine = "shipOfTheLine",
  Raider = "raider",
  Ironclad = "ironclad",
  ArmouredCruiser = "armouredCruiser",
  AdvancedIronclad = "advancedIronclad",
  BattleCruiser = "battleCruiser",
  Dreadnought = "dreadnought",
}

export interface Ship {
  id: string;
  type: ShipType;
  firepower: number;
  range: number;      // combat range
  armour: number;
  hull: number;
  battleMove: number;
  speed: number;      // sea zones per turn
  experience: number; // medals 0..4
  flagship?: boolean;
}

export interface Approach {
  provinceId: ProvinceId;
  /** The lowest ocean tile in this connected sea, in row then column order. */
  seaId: SeaZoneId;
}

export interface FleetMissionIntent extends Intent {
  kind: "fleet-mission";
  fleetId: string;
  mission: "sail" | "station" | "return";
  provinceId?: ProvinceId;
}

export interface Fleet {
  id: string;
  name: string;
  ownerNationId: NationId;
  ships: Ship[];
  location: SeaZoneId;
  /** At the home berth when absent. */
  approach?: Approach;
  /** The turn the landing site was established. Embarkation starts on the following turn. */
  siteSinceTurn?: number;
  contested?: boolean;
  /** Opposing fleet ids in the last resolved tie, for announcing new contact exactly once. */
  contestedWith?: string[];
  admiral?: {
    name: string;
    initiativeBonus: number;
    experience: number; // 0..4
  };
  aggression: "cautious" | "normal" | "bold";
  mission?: "patrol" | "blockade" | "landing" | "move";
  targetPortCityId?: string;
}
