// types/Nation.ts
import { Relation, TradePolicy, Grant } from "./Diplomacy";
import { CityId, NationId, ProvinceId, FleetId, ArmyId } from "./Common";
import { IndustryState } from './Industry';
import { WarehouseCommodities } from './Resource';

/** Who gives a nation its orders (FR-099): the person at this client, or a scripted player. */
export type NationController = "human" | "scripted";

export interface Nation {
  id: NationId;
  name: string;
  /** Palette slot, 1 for the first nation founded: the map draws it in --color-nation-<slot> (FR-097). */
  colorSlot: number;
  /** At End Turn the store asks the player of every non-human nation for its orders (FR-099). */
  controller: NationController;
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