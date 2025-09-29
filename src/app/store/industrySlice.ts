import { StateCreator } from "zustand";
import { ConversionRecipe, Recipes } from "../definisions/RecipeTypes";
import { ProductionRecipes } from "../definisions/ResourceConversions";
import { GameState } from "../types/GameState";
import { Nation } from "../types/Nation";
import { Fungible, GoodsType, MaterialType, ResourceType, WarehouseCommodities, WorkerType } from "../types/Resource";

export interface IndustrySlice {
  processIndustryProduction: (nationId: string, recipeName: Recipes) => void;
}

function isWarehouseCommodity(type: string): type is WarehouseCommodities {
  return Object.values(ResourceType).includes(type as ResourceType) ||
    Object.values(MaterialType).includes(type as MaterialType) ||
    Object.values(GoodsType).includes(type as GoodsType);
}

function isFungible(type: string): boolean {
  return type === Fungible.Labour || type === Fungible.Cash;
}

function isWorker(type: string): boolean {
  return type === WorkerType.Untrained || type === WorkerType.Trained || type === WorkerType.Expert;
}

function getWarehouseResource(nation: Nation, type: WarehouseCommodities): number {
  return nation.warehouse?.[type] ?? 0;
}

function getFungibleResource(nation: Nation, type: string): number {
  if (type === Fungible.Labour) return nation.industry.power.available ?? 0;
  if (type === Fungible.Cash) return nation.treasury ?? 0;
  return 0;
}

function getWorkerResource(nation: Nation, type: string): number {
  if (type === WorkerType.Untrained) return nation.industry.workers.untrained ?? 0;
  if (type === WorkerType.Trained) return nation.industry.workers.trained ?? 0;
  if (type === WorkerType.Expert) return nation.industry.workers.expert ?? 0;
  return 0;
}

function getResource(nation: Nation, type: string): number {
  if (isWarehouseCommodity(type)) return getWarehouseResource(nation, type);
  if (isFungible(type)) return getFungibleResource(nation, type);
  if (isWorker(type)) return getWorkerResource(nation, type);
  return 0;
}

function setWarehouseResource(nation: Nation, type: WarehouseCommodities, amount: number) {
  if (!nation.warehouse) nation.warehouse = createWarehouse();
  nation.warehouse[type] = amount;
}

function setFungibleResource(nation: Nation, type: string, amount: number) {
  if (type === Fungible.Labour)
    nation.industry.power.available = amount;
  else if (type === Fungible.Cash)
    nation.treasury = amount;
}

function setWorkerResource(nation: Nation, type: string, amount: number) {
  if (type === WorkerType.Untrained) nation.industry.workers.untrained = amount;
  else if (type === WorkerType.Trained) nation.industry.workers.trained = amount;
  else if (type === WorkerType.Expert) nation.industry.workers.expert = amount;
}

function setResource(nation: Nation, type: string, amount: number) {
  if (isWarehouseCommodity(type)) setWarehouseResource(nation, type, amount);
  else if (isFungible(type)) setFungibleResource(nation, type, amount);
  else if (isWorker(type)) setWorkerResource(nation, type, amount);
}

function hasEnoughInputs(nation: Nation, recipe: ConversionRecipe): boolean {
  for (const input of recipe.inputs) {
    if (Array.isArray(input.type)) {
      const total = (input.type as string[]).reduce((sum: number, t: string) => sum + getResource(nation, t), 0);
      if (total < input.amount) return false;
    } else {
      if (getResource(nation, input.type as string) < input.amount) {
        return false;
      }
    }
  }
  return true;
}

function updateResource(nation: Nation, type: string, delta: number) {
  if (isWarehouseCommodity(type)) {
    if (!nation.warehouse) nation.warehouse = createWarehouse();
    nation.warehouse[type] = (nation.warehouse[type] ?? 0) + delta;
  } else if (isFungible(type)) {
    if (type === Fungible.Labour) {
       nation.industry.power.available = (nation.industry.power.available ?? 0) + delta;
             nation.industry.power.total = (nation.industry.power.total ?? 0) + delta;
    }
    else if (type === Fungible.Cash) nation.treasury = (nation.treasury ?? 0) + delta;
  } else if (isWorker(type)) {
    if (type === WorkerType.Untrained) nation.industry.workers.untrained = (nation.industry.workers.untrained ?? 0) + delta;
    else if (type === WorkerType.Trained) nation.industry.workers.trained = (nation.industry.workers.trained ?? 0) + delta;
    else if (type === WorkerType.Expert) nation.industry.workers.expert = (nation.industry.workers.expert ?? 0) + delta;
  }
}

function deductOrInputs(nation: Nation, input: { type: string[]; amount: number }) {
  let remaining = input.amount;
  // Get all available amounts
  const amounts = input.type.map(t => ({ t, amt: getResource(nation, t) }));
  // Sort descending by amount
  amounts.sort((a, b) => b.amt - a.amt);

  for (let i = 0; i < amounts.length; i++) {
    const { t, amt } = amounts[i];
    if (remaining === 0) break;
    const toDeduct = Math.min(amt, remaining);
    updateResource(nation, t, -toDeduct);
    remaining -= toDeduct;
  }
}

function deductInputs(nation: Nation, recipe: ConversionRecipe) {
  for (const input of recipe.inputs) {
    if (input.type === Fungible.Labour || input.type === Fungible.Cash) {
      deductFungible(nation, input.type, input.amount);
      continue;
    }
    if (Array.isArray(input.type)) {
      deductOrInputs(nation, input as { type: string[]; amount: number });
    } else {
      setResource(nation, input.type, getResource(nation, input.type) - input.amount);
    }
  }
}

function deductTreasury(nation: Nation, recipe: ConversionRecipe) {
  const price = recipe.inputs.find(i => i.type === Fungible.Cash)?.amount ?? 0;
  if (price > 0)
    nation.treasury = (nation.treasury ?? 0) - price;
}

function addOutputs(nation: Nation, recipe: ConversionRecipe) {
  for (const output of recipe.outputs) {
    // Only add to warehouse if not Fungible (labour, cash)
    if (output.type === Fungible.Labour || output.type === Fungible.Cash)
      continue;

    setResource(nation, output.type, getResource(nation, output.type) + output.amount);
  }
}

function createWarehouse(): Record<string, number> {
  const warehouse: Record<string, number> = {};
  Object.values(ResourceType).forEach(type => { warehouse[type] = 0; });
  Object.values(MaterialType).forEach(type => { warehouse[type] = 0; });
  Object.values(GoodsType).forEach(type => { warehouse[type] = 0; });
  return warehouse;
}

function deductFungible(nation: Nation, type: string, amount: number) {
  if (type === Fungible.Labour) {
    nation.industry.power.available = (nation.industry.power.available ?? 0) - amount;
  } else if (type === Fungible.Cash) {
    nation.treasury = (nation.treasury ?? 0) - amount;
  }
}

function addFungibleOutputs(nation: Nation, recipe: ConversionRecipe) {
  for (const output of recipe.outputs) {
    if (output.type === Fungible.Labour) {
      // bug add total
      nation.industry.power.available = (nation.industry.power.available ?? 0) + output.amount;
    } else if (output.type === Fungible.Cash) {
      nation.treasury = (nation.treasury ?? 0) + output.amount;
    }
  }
}

export const createIndustrySlice: StateCreator<GameState, [], [], IndustrySlice> = (set) => ({
  processIndustryProduction: (nationId: string, recipeName: Recipes) => {
    set((state: GameState) => {
      const nation = state.nations.find((n: Nation) => n.id === nationId);
      if (!nation) return {};
      const recipe = ProductionRecipes.find((r: ConversionRecipe) => r.name === recipeName);
      if (!recipe) return {};

      if (!hasEnoughInputs(nation, recipe))
        return {};

      deductInputs(nation, recipe);
      deductTreasury(nation, recipe);
      addOutputs(nation, recipe);
      addFungibleOutputs(nation, recipe);

      return {
        nations: state.nations.map((n: Nation) => n.id === nationId ? { ...nation } : n)
      };
    });
  },
}
);
