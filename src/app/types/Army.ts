// types/Army.ts
import { Unit } from "./Unit";
import { NationId, ProvinceId } from "./Common";

export interface Army {
  id: string;
  name: string;
  ownerNationId: NationId;
  locationProvinceId: ProvinceId;
  units: Unit[];
  morale: number;   // 0–100
  supply: number;   // 0–100
  leader?: {
    name: string;
    initiativeBonus: number;
    moraleBonus: number;
    experience: number; // 0..4
  };
}