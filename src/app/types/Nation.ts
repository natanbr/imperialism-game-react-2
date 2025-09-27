// types/Nation.ts
import { Relation, TradePolicy, Grant } from "./Diplomacy";
import { CityId, NationId, ProvinceId, FleetId, ArmyId } from "./Common";
import { IndustryState } from './Industry';
import { WarehouseCommodities } from './Resource';

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
  // Queued increase purchased this turn; applied at the start of next turn
  transportCapacityPendingIncrease?: number;

  warehouse: Record<WarehouseCommodities, number>;
  industry: IndustryState;
}