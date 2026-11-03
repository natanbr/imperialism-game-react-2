// Production buildings of the capital (FR-033, FR-038). Source: docs/rules/05 sections 1 and 3.
import type { BuildingType } from "../types/Industry";
import { GoodsType, MaterialType } from "../types/Resource";
import type { BuildingDefinition, BuildingKind } from "./RecipeTypes";

const capped = (kind: BuildingKind, outputs: BuildingDefinition["outputs"], extra: Partial<BuildingDefinition> = {}): BuildingDefinition => ({
  kind,
  outputs,
  unlimited: false,
  keepsOrders: true,
  needsOilDrilling: false,
  builtAtStart: true,
  ...extra,
});

export const BUILDINGS: Readonly<Record<BuildingType, BuildingDefinition>> = {
  textileMill: capped("mill", [MaterialType.Fabric]),
  lumberMill: capped("mill", [MaterialType.Lumber, MaterialType.Paper]),
  steelMill: capped("mill", [MaterialType.Steel]),
  clothingFactory: capped("factory", [GoodsType.Clothing]),
  furnitureFactory: capped("factory", [GoodsType.Furniture]),
  metalWorks: capped("factory", [GoodsType.Hardware, GoodsType.Armaments]),
  refinery: capped("mill", [MaterialType.Fuel], { needsOilDrilling: true, builtAtStart: false }),
  foodProcessing: {
    kind: "factory",
    outputs: [MaterialType.CannedFood],
    unlimited: true,
    keepsOrders: false,
    needsOilDrilling: false,
    builtAtStart: false,
  },
};

/**
 * The order production runs in when labour or a shared input is short: materials before the goods
 * made from them, food processing in the middle. [NEEDS CLARIFICATION] gaps.md B6: the original
 * order is not documented.
 */
export const BUILDING_ORDER: readonly BuildingType[] = [
  "steelMill",
  "lumberMill",
  "textileMill",
  "foodProcessing",
  "refinery",
  "metalWorks",
  "furnitureFactory",
  "clothingFactory",
];

const LADDER: Record<BuildingKind, { steps: readonly number[]; then: number }> = {
  mill: { steps: [2, 4, 8, 16, 24], then: 8 },
  factory: { steps: [1, 2, 4, 8, 12], then: 4 },
};

/** The capacity one expansion step reaches from `capacity` (0 is the first construction). */
export function nextCapacity(kind: BuildingKind, capacity: number): number {
  const { steps, then } = LADDER[kind];
  return steps.find((step) => step > capacity) ?? capacity + then;
}

/** A building's size in a new game: the first step if built at the start, else 0. */
export const startCapacity = (building: BuildingType): number =>
  BUILDINGS[building].builtAtStart ? nextCapacity(BUILDINGS[building].kind, 0) : 0;
