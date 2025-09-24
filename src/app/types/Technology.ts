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
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
}

export interface TechnologyState {
  oilDrillingTechUnlocked: boolean;
  technologies: Technology[];
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
}