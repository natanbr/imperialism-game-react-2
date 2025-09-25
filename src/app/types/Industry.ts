// types/Industry.ts
import { ResourceType } from "./Resource";
import { BuildingId } from "./Common";

export type IndustryType =
  | "textileMill"
  | "clothingFactory"
  | "lumberMill"
  | "furnitureFactory"
  | "steelMill"
  | "metalWorks"
  | "refinery"
  | "foodProcessing"
  | "railyard"
  | "university"
  | "armoury"
  | "shipyard"
  | "powerPlant"
  | "warehouse"
  | "capitol"
  | "tradeSchool";

export interface IndustryBuilding {
  id: BuildingId;
  type: IndustryType;
  capacity: number;           // factory/mill capacity (units/turn)
  inputs: ResourceType[];     // possible inputs
  outputs: ResourceType[];    // possible outputs
}


export interface Workers {
  untrained: number;  // supply 1 labour each
  trained: number;    // supply 2 labour each
  expert: number;     // supply 4 labour each
}

export interface PowerState {
  total: number;
  available: number;
  electricity: number;
}

export interface IndustryState {
  buildings: IndustryBuilding[];
  workers: Workers;
  power: PowerState;
}