// types/Industry.ts
import { GoodsType, MaterialType } from "./Resource";

/** Every building of the capital the original game has (rules 05 section 1); cities list them. */
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

/** The production buildings v1 models (FR-033). The railyard is the transport-capacity order. */
export type BuildingType =
  | "textileMill"
  | "clothingFactory"
  | "lumberMill"
  | "furnitureFactory"
  | "steelMill"
  | "metalWorks"
  | "refinery"
  | "foodProcessing";

/** What the production buildings make (FR-034). */
export type ProductionOutput =
  | MaterialType.Fabric
  | GoodsType.Clothing
  | MaterialType.Lumber
  | MaterialType.Paper
  | GoodsType.Furniture
  | MaterialType.Steel
  | GoodsType.Hardware
  | GoodsType.Armaments
  | MaterialType.Fuel
  | MaterialType.CannedFood;

export interface IndustryBuilding {
  /** Most output per turn; 0 = not built. Food processing has no limit and ignores it. */
  capacity: number;
  /** Capacity ordered this turn; it counts from next turn, after this turn's production (FR-038). */
  pendingCapacity: number;
  /** Standing production orders by output (FR-036). */
  orders: Partial<Record<ProductionOutput, number>>;
}

/** Worker counts by grade. */
export interface Workers {
  untrained: number; // 1 labour each
  trained: number; // 2 labour each
  expert: number; // 4 labour each
}

export type WorkerGrade = keyof Workers;

/** A nation's industry: its buildings and its industrial workforce (the workers that eat). */
export interface IndustryState {
  buildings: Partial<Record<BuildingType, IndustryBuilding>>;
  workers: Workers;
  /** Ate the wrong food at the last meal: no labour until the next good meal (FR-040). */
  sick: Workers;
  /** In training this turn: no labour; promoted after the production phase (FR-041). */
  training: Workers;
  /** Migrants ordered this turn; they join after this turn's meal (FR-042). */
  recruits: number;
}
