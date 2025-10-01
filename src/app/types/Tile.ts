// types/Tile.ts
import { ResourceType } from "./Resource";
import { Worker } from "./Workers";
import { DevelopmentJob } from "./jobs/DevelopmentJob";
import { ConstructionJob } from "./jobs/ConstructionJob";

export enum TerrainType {
  DryPlains = "dryPlains",      // Grain (not improvable)
  OpenRange = "openRange",      // Livestock (Rancher)
  HorseRanch = "horseRanch",    // Horses (not improvable)
  Plantation = "plantation",    // Cotton (Farmer)
  Farm = "farm",                // Grain (Farmer)
  Orchard = "orchard",          // Fruit (Farmer)
  FertileHills = "fertileHills",// Wool (Rancher)
  BarrenHills = "barrenHills",  // Minerals (Prospector/Miner)
  Mountains = "mountains",      // Minerals (Prospector/Miner); gold/gems
  HardwoodForest = "hardwoodForest", // Timber (Forester)
  ScrubForest = "scrubForest",  // Timber (not improvable)
  Swamp = "swamp",              // Oil (Prospector/Driller after tech)
  Desert = "desert",            // Oil (Prospector/Driller after tech)
  Tundra = "tundra",            // Oil (Prospector/Driller after tech)
  Water = "water",
  River = "river",
  Town = "town",
  Capital = "capital",
  Coast = "coast",
}

export interface Resource {
  type: ResourceType;
  level: number;              // 0..3 (minerals/oil can be 0=none until improved/opened)
  discovered?: boolean;       // for hidden resources (minerals/oil)
}

export interface Tile {
  id: string;
  x: number;
  y: number;
  terrain: TerrainType;
  hasRiver?: boolean;           // enables fish + river ports
  resource?: Resource;
  // Prospecting action state (resolved on next turn)
  prospecting?: { startedOnTurn: number; workerId: string };

  // Active development job (Farmer/Rancher/Forester/Miner/Driller)
  developmentJob?: DevelopmentJob;

  // Active construction job (Engineer)
  constructionJob?: ConstructionJob;

  ownerNationId?: string;
  cityId?: string;              // capital or town id
  workers: Worker[];
  explored: boolean;
  visible: boolean;
  port?: boolean;               // built port
  depot?: boolean;              // built rail depot
  activePort?: boolean;         // computed in transportation-connectivity
  activeDepot?: boolean;        // computed in transportation-connectivity
  fortLevel?: number;           // 0..3
  connected?: boolean;          // transport connection status
}