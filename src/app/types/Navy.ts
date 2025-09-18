// types/Navy.ts
import { NationId, SeaZoneId } from "./Common";

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

export interface Fleet {
  id: string;
  name: string;
  ownerNationId: NationId;
  ships: Ship[];
  location: SeaZoneId;
  admiral?: {
    name: string;
    initiativeBonus: number;
    experience: number; // 0..4
  };
  aggression: "cautious" | "normal" | "bold";
  mission?: "patrol" | "blockade" | "landing" | "move";
  targetPortCityId?: string;
}