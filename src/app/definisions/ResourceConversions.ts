import { Recipes, ConversionRecipe } from './RecipeTypes';
import { ResourceType, MaterialType, GoodsType, WorkerType, Fungible } from '../types/Resource';

export const ProductionRecipes: ConversionRecipe[] = [
    {
        name: Recipes.FoodProcessing,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: [ResourceType.Fish, ResourceType.Livestock], amount: 1 },
            { type: ResourceType.Grain, amount: 1, },
            { type: ResourceType.Fruit, amount: 1 },
        ],
        outputs: [{ type: MaterialType.CannedFood, amount: 1 }],
        note: "Food Processing: 1 grain, 1 fruit, 1 fish or livestock, 2 labour -> 1 canned food",
    },
    {
        name: Recipes.LumberMillLumber,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: ResourceType.Timber, amount: 2 },
        ],
        outputs: [{ type: MaterialType.Lumber, amount: 1 }],
        note: "Lumber Mill: 2 timber, 2 labour -> 1 lumber",
    },
    {
        name: Recipes.LumberMillPaper,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: ResourceType.Timber, amount: 2 },
        ],
        outputs: [{ type: MaterialType.Paper, amount: 1 }],
        note: "Lumber Mill: 2 timber, 2 labour -> 1 paper",
    },
    {
        name: Recipes.FurnitureFactory,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: MaterialType.Lumber, amount: 2 },
        ],
        outputs: [{ type: GoodsType.Furniture, amount: 1 }],
        note: "Furniture Factory: 2 lumber, 2 labour -> 1 furniture",
    },
    {
        name: Recipes.TextileMillFabric,
        inputs: [
            { type: [ResourceType.Cotton, ResourceType.Wool], amount: 2 },
            { type: Fungible.Labour, amount: 2 },
        ],
        outputs: [{ type: MaterialType.Fabric, amount: 1 }],
        note: "Textile Mill: 2 cotton or 2 wool, 2 labour -> 1 fabric",
    },
    {
        name: Recipes.ClothingFactory,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: MaterialType.Fabric, amount: 2 },
        ],
        outputs: [{ type: GoodsType.Clothing, amount: 1 }],
        note: "Clothing Factory: 2 fabric, 2 labour -> 1 clothing",
    },
    {
        name: Recipes.SteelMill,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: ResourceType.Coal, amount: 2 },
            { type: ResourceType.IronOre, amount: 2 },
        ],
        outputs: [{ type: MaterialType.Steel, amount: 1 }],
        note: "Steel Mill: 2 coal, 2 iron ore, 2 labour -> 1 steel",
    },
    {
        name: Recipes.Hardware,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: MaterialType.Steel, amount: 2 },
        ],
        outputs: [{ type: GoodsType.Hardware, amount: 1 }],
        note: "Hardware: 2 steel, 2 labour -> 1 hardware",
    },
    {
        name: Recipes.FuelProcessing,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: ResourceType.Oil, amount: 2 },
        ],
        outputs: [{ type: MaterialType.Fuel, amount: 1 }],
        note: "Fuel Processing: 2 oil, 2 labour -> 1 fuel",
    },
    {
        name: Recipes.TrainWorkerUntrainedToTrained,
        inputs: [
            { type: Fungible.Cash, amount: 500 },
            { type: Fungible.Labour, amount: 2 },
            { type: WorkerType.Untrained, amount: 2 },
        ],
        outputs: [{ type: WorkerType.Trained, amount: 1 }],
        note: "Train Worker: 2 untrained_worker, 2 labour, 500 cash -> 1 trained_worker",
    },
    {
        name: Recipes.TrainWorkerTrainedToExpert,
        inputs: [
            { type: Fungible.Cash, amount: 1000 },
            { type: Fungible.Labour, amount: 2 },
            { type: WorkerType.Trained, amount: 2 },
        ],
        outputs: [{ type: WorkerType.Expert, amount: 1 }],
        note: "Train Worker: 2 trained_worker, 2 labour, 1000 cash -> 1 expert_worker",
    },
    {
        name: Recipes.ProduceUntrainedWorker,
        inputs: [
            { type: MaterialType.CannedFood, amount: 1 },
            { type: GoodsType.Hardware, amount: 1 },
            { type: GoodsType.Clothing, amount: 1 },
        ],
        outputs: [
            { type: WorkerType.Untrained, amount: 1 },
            { type: Fungible.Labour, amount: 1 },
        ],
        note: "Produce Untrained Worker: 1 canned food, 1 hardware, 1 paper, 2 labour, 100 cash -> 1 untrained_worker, 1 labour",
    },
    {
        name: Recipes.TrainWorkerUntrainedToTrainedWithLabour,
        inputs: [
            { type: Fungible.Labour, amount: 1 },
            { type: WorkerType.Untrained, amount: 1 },
            { type: MaterialType.Paper, amount: 1 },
            { type: Fungible.Cash, amount: 100 },
        ],
        outputs: [
            { type: WorkerType.Trained, amount: 1 },
            { type: Fungible.Labour, amount: 2 },
        ],
        note: "Train Worker: 1 untrained_worker, 2 labour, 500 cash -> 1 trained_worker, 2 labour",
    },
    {
        name: Recipes.TrainWorkerTrainedToExpertWithLabour,
        inputs: [
            { type: Fungible.Labour, amount: 2 },
            { type: WorkerType.Trained, amount: 1 },
            { type: MaterialType.Paper, amount: 2 },
            { type: Fungible.Cash, amount: 1000 },
        ],
        outputs: [
            { type: WorkerType.Expert, amount: 1 },
            { type: Fungible.Labour, amount: 4 },
        ],
        note: "Train Worker: 1 trained_worker, 2 labour, 1000 cash -> 1 expert_worker, 4 labour",
    },
];

export const CashPerTransport: Record<ResourceType, number> = {
    gold: 200, gems: 500,
} as unknown as Record<ResourceType, number>; // narrow use; guard in code