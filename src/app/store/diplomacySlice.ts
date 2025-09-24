<<<<<<< HEAD
=======
<<<<<<< HEAD
// Empty createDiplomacySlice for Zustand store composition
export const createDiplomacySlice = () => ({});
import { Relation, Treaty, TradePolicy, Grant } from "@/types/Diplomacy";
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
// Empty createDiplomacySlice for Zustand store composition
export const createDiplomacySlice = () => ({});
import { Relation, Treaty, TradePolicy, Grant } from "@/types/Diplomacy";

export interface DiplomacySlice {
  relations: Relation[];
  treaties: Treaty[];
  tradePolicies: TradePolicy[];
  grants: Grant[];
  // actions: proposeTreaty, declareWar, sendGrant, setTradePolicy...
}
<<<<<<< HEAD
=======
=======
import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)

export interface DiplomacySlice {
  relations: Relation[];
  treaties: Treaty[];
  tradePolicies: TradePolicy[];
  grants: Grant[];
  // actions: proposeTreaty, declareWar, sendGrant, setTradePolicy...
}
<<<<<<< HEAD
=======

export const createDiplomacySlice: StateCreator<GameState, [], [], DiplomacySlice> = (set) => ({
  // initial state for diplomacy slice
});
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
