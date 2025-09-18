// types/City.ts
import { IndustryType } from './Industry';
import { ShipType } from './Navy';
import { RegimentCategory } from "./Unit";

export interface City {
  id: string;
  name: string;
  population: number;
  ownerNationId: string;
  garrison: string[]; // unitIds
  productionQueue: ProductionItem[];
  isCapital?: boolean;
  port?: boolean;
  depot?: boolean;
  fortLevel?: number;
  buildings: IndustryType[];
}


export type ProductionItem =
  | {
      id: string;
      type: "unit";
      turnsRemaining: number;
      payload: {
        category: RegimentCategory;
        era: 1 | 2 | 3;
      };
    }
  | {
      id: string;
      type: "ship";
      turnsRemaining: number;
      payload: {
        shipType: ShipType;
      };
    }
  | {
      id: string;
      type: "building";
      turnsRemaining: number;
      payload: {
        buildingType: IndustryType;
      };
    }
  | {
      id: string;
      type: "upgrade";
      turnsRemaining: number;
      payload: {
        upgradeType: "fort" | "depot" | "port" | "rail";
        newLevel?: number; // e.g., fort level 1 → 2
      };
    };
