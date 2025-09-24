// types/Nation.ts
import { Relation, TradePolicy, Grant } from "./Diplomacy";
import { CityId, NationId, ProvinceId, FleetId, ArmyId } from "./Common";

export interface Nation {
  id: NationId;
  name: string;
  color: string;
  treasury: number;
  debt?: number;
  creditLimit?: number;

  relations: Relation[];
  tradePolicies: TradePolicy[];
  grants: Grant[];

  cities: CityId[];
  provinces: ProvinceId[];
  armies: ArmyId[];
  fleets: FleetId[];
  colonies: NationId[]; // Minor Nations controlled as colonies

  merchantMarine: {
    holds: number;       // total cargo holds
    avgSpeed: number;    // affects interception odds
  };

  // Per-turn internal transport capacity (units of resources)
  transportCapacity: number;

  warehouse: Record<string, number>; // ResourceType -> amount
}