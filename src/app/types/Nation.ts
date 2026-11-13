// types/Nation.ts
import { CityId, NationId, FleetId } from "./Common";
import { IndustryState } from './Industry';
import { WarehouseCommodities } from './Resource';
import type { RegimentType } from "./Unit";

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

  // Relations, treaties, trade policies and grants live in state.diplomacy (FR-151); the provinces
  // a nation holds are the state.provinces it owns (FR-148, provincesOf); its colonies are the minor
  // nations whose `colonyOf` names it (FR-146).

  cities: CityId[];
  // Its regiments are the state.armies it owns (FR-204, armiesOf).
  fleets: FleetId[];

  merchantMarine: {
    holds: number;       // total cargo holds
    avgSpeed: number;    // affects interception odds
  };

  /** Freight cars in service: units of goods shipped to the warehouse per turn. */
  transportCapacity: number;
  /**
   * Freight cars ordered this turn, paid when ordered. The production phase builds the ones the
   * labour covers and leaves that count here; the turn housekeeping then adds them to
   * transportCapacity, so they carry goods from the next turn (NR-016, FR-101).
   */
  transportCapacityPendingIncrease?: number;

  warehouse: Record<WarehouseCommodities, number>;
  industry: IndustryState;
  /**
   * The regiments ordered this turn by type (FR-200, `setRecruitment`), paid when ordered; they join the army in the
   * capital province at End Turn (FR-201). Absent or empty when none.
   */
  recruiting?: Partial<Record<RegimentType, number>>;
}