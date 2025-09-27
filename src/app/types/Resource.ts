export enum CommodityClass {
  Resource = "resource",
  Material = "material",
  Good = "good",
}

export enum ResourceType {
  Grain = "grain",
  Livestock = "livestock",
  Fruit = "fruit",
  Fish = "fish",
  Cotton = "cotton",
  Wool = "wool",
  Horses = "horses",
  Timber = "timber",
  Coal = "coal",
  IronOre = "ironOre",
  Oil = "oil",
  Gold = "gold",
  Gems = "gems",
}

export enum MaterialType {
  CannedFood = "cannedFood",
  Fabric = "fabric",
  Paper = "paper",
  Lumber = "lumber",
  Steel = "steel",
  Fuel = "fuel",
}
export enum GoodsType {
  // Gods
  Clothing = "clothing",
  Furniture = "furniture",
  Hardware = "hardware",
  Armaments = "armaments",
}

export type CommoditiesType = ResourceType | MaterialType | GoodsType | WorkerType | Fungible;

export type WarehouseCommodities = ResourceType | MaterialType | GoodsType;

export interface Commodities {
  type: CommoditiesType;
  amount: number;
  category: CommodityClass;
}

export enum WorkerType {
  Untrained = "untrained",
  Trained = "trained",
  Expert = "expert",
}

export enum Fungible {
  Labour = "labour",
  Cash = "cash",
}