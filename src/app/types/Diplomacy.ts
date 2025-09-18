// types/Diplomacy.ts
import { NationId } from "./Common";

export type TreatyType =
  | "alliance"
  | "nonAggression"
  | "peace"
  | "trade"
  | "colony";

export interface Treaty {
  id: string;
  type: TreatyType;
  withNationId: NationId;
  duration: number; // in turns
}

export interface Relation {
  nationId: NationId;
  attitude: number; // -100..+100
  atWar: boolean;
  allied: boolean;
  tradePartner: boolean;
  treaties: Treaty[];
}

export interface TradePolicy {
  nationId: NationId;
  subsidyPercent?: number; // e.g., 0, 5, 10
  boycott?: boolean;
}

export interface Grant {
  nationId: NationId;
  amount: number;     // one-time or per-turn if locked
  locked?: boolean;   // repeats each turn
}