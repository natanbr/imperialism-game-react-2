// types/Technology.ts
import { TechId } from "./Common";

export interface Technology {
  id: TechId;
  name: string;
  description?: string;
  approximateArrival: [number, number]; // year range
  prerequisites: TechId[];
  benefits: string[]; // freeform: unlocks, upgrades, build permissions
  purchased: boolean;
  cost: number;
}

export interface TechnologyState {
  oilDrillingTechUnlocked: boolean;
  technologies: Technology[];
}