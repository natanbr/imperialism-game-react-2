import { Relation, Treaty, TradePolicy, Grant } from "@/types/Diplomacy";

export interface DiplomacySlice {
  relations: Relation[];
  treaties: Treaty[];
  tradePolicies: TradePolicy[];
  grants: Grant[];
  // actions: proposeTreaty, declareWar, sendGrant, setTradePolicy...
}
