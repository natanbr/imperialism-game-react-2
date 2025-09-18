// types/Conversions.ts

import { CommoditiesType, GoodsType, MaterialType, ResourceType } from '../types/Resource';

export interface ConversionRecipe {
    inputs: { type: CommoditiesType; amount: number }[];
    outputs: { type: CommoditiesType; amount: number }[];
    // Optional notes: capacity handled by building, labour cost handled by industry sim
    note?: string;
}

// Two-for-one and linked recipes based on manual
export const ProductionRecipes: ConversionRecipe[] = [
    // Textile economy
    {
        inputs: [{ type: ResourceType.Cotton, amount: 2 }],
        outputs: [{ type: MaterialType.Fabric, amount: 1 }],
        note: "Textile Mill: 2 cotton -> 1 fabric"
    },
    {
        inputs: [{ type: ResourceType.Wool, amount: 2 }],
        outputs: [{ type: MaterialType.Fabric, amount: 1 }],
        note: "Textile Mill: 2 wool -> 1 fabric"
    },
    {
        inputs: [{ type: MaterialType.Fabric, amount: 2 }],
        outputs: [{ type: GoodsType.Clothing, amount: 1 }],
        note: "Clothing Factory: 2 fabric -> 1 clothing"
    },

    // Wood economy
    {
        inputs: [{ type: ResourceType.Timber, amount: 2 }],
        outputs: [{ type: MaterialType.Lumber, amount: 1 }],
        note: "Lumber Mill: 2 timber -> 1 lumber"
    },
    {
        inputs: [{ type: ResourceType.Timber, amount: 2 }],
        outputs: [{ type: MaterialType.Paper, amount: 1 }],
        note: "Lumber Mill: 2 timber -> 1 paper"
    },
    {
        inputs: [{ type: MaterialType.Lumber, amount: 2 }],
        outputs: [{ type: GoodsType.Furniture, amount: 1 }],
        note: "Furniture Factory: 2 lumber -> 1 furniture"
    },

    // Metal economy
    {
        inputs: [{ type: ResourceType.IronOre, amount: 1 }, { type: ResourceType.Coal, amount: 1 }],
        outputs: [{ type: MaterialType.Steel, amount: 1 }],
        note: "Steel Mill: 1 iron + 1 coal -> 1 steel"
    },
    {
        inputs: [{ type: MaterialType.Steel, amount: 2 }],
        outputs: [{ type: GoodsType.Hardware, amount: 1 }],
        note: "Metal Works: 2 steel -> 1 hardware"
    },
    {
        inputs: [{ type: MaterialType.Steel, amount: 2 }],
        outputs: [{ type: GoodsType.Armaments, amount: 1 }],
        note: "Metal Works: 2 steel -> 1 armaments"
    },

    // Oil economy
    {
        inputs: [{ type: ResourceType.Oil, amount: 2 }],
        outputs: [{ type: MaterialType.Fuel, amount: 1 }],
        note: "Refinery: 2 oil -> 1 fuel"
    },

    // Food economy (balanced mix)
    {
        inputs: [
            { type: ResourceType.Grain, amount: 2 },
            { type: ResourceType.Fruit, amount: 1 },
            { type: ResourceType.Livestock, amount: 1 }, // or fish interchangeably in your sim rules
        ],
        outputs: [{ type: MaterialType.CannedFood, amount: 2 }],
        note: "Food Processing: 4 raw foods -> 2 canned food (2 grain, 1 fruit, 1 livestock or fish)",
    },
];

export const CashPerTransport: Record<ResourceType, number> = {
    gold: 200, gems: 500,
} as unknown as Record<ResourceType, number>; // narrow use; guard in code
