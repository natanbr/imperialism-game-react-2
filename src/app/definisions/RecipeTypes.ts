// RecipeTypes.ts
// Shared enums and interfaces for industry/resource recipes

import { CommoditiesType } from '../types/Resource';

export enum Recipes {
    FoodProcessing = "FoodProcessing",
    LumberMillLumber = "LumberMillLumber",
    LumberMillPaper = "LumberMillPaper",
    FurnitureFactory = "FurnitureFactory",
    TextileMillFabric = "TextileMillFabric",
    ClothingFactory = "ClothingFactory",
    SteelMill = "SteelMill",
    Hardware = "Hardware",
    FuelProcessing = "FuelProcessing",
    ElectricityProduction = "ElectricityProduction",
    // Worker training/production
    ProduceUntrainedWorker = "ProduceUntrainedWorker",
    TrainWorkerUntrainedToTrainedWithLabour = "TrainWorkerUntrainedToTrainedWithLabour",
    TrainWorkerTrainedToExpertWithLabour = "TrainWorkerTrainedToExpertWithLabour",
}

export interface ConversionRecipe {
    name: Recipes;
    inputs: Array<{ type: CommoditiesType | Array<CommoditiesType>; amount: number }>;
    outputs: Array<{ type: CommoditiesType; amount: number }>;
    note?: string;
}
