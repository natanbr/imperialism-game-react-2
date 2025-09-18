import { Relation } from "./Diplomacy";

export interface Nation {
  id: string;
  name: string;
  treasury: number;
  relations: Relation[];
  cities: string[];
  armies: string[];
  fleets: string[];
  colonies: string[];
  provinces: string[];
}
