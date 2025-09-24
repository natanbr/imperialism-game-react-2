// types/Nation.ts
import { Relation, TradePolicy, Grant } from "./Diplomacy";
import { CityId, NationId, ProvinceId, FleetId, ArmyId } from "./Common";

export interface Nation {
  id: NationId;
  name: string;
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
  color: string;
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
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

  warehouse: Record<string, number>; // ResourceType -> amount
}