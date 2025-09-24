import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { Relation, Treaty, TradePolicy, Grant } from "@/types/Diplomacy";

export interface DiplomacySlice {
  relations: Relation[];
  treaties: Treaty[];
  tradePolicies: TradePolicy[];
  grants: Grant[];
}

export const createDiplomacySlice: StateCreator<
  GameStore,
  [],
  [],
  DiplomacySlice
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
> = (_set) => ({
  relations: [],
  treaties: [],
  tradePolicies: [],
  grants: [],
});
