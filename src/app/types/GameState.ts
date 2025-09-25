// types/GameState.ts
import { Nation } from "./Nation";
import { City } from "./City";
import { Army } from "./Army";
import { Fleet } from "./Navy";
import { TradeRoute } from "./TradeRoute";
import { TransportNetwork } from "./Transport";
import { GameMap } from "./Map";
import { IndustryState } from "./Industry";
import { Technology, TechnologyState } from "./Technology";
import { NewsItem } from "./Common";
import { Relation, Treaty, TradePolicy, Grant } from "./Diplomacy";

export interface TurnOrderSummary {
  // Per manual:
  // 1. Diplomatic offers exchange
  // 2. Trade deals resolve
  // 3. Industrial production
  // 4. Military conflicts
  // 5. Interceptions/blockades cancel trades
  // 6. Internal transport + successful trades to warehouse
  phases: [
    "diplomacy",
    "trade",
    "production",
    "combat",
    "interceptions",
    "logistics"
  ];
}

export interface GameState {
  turn: number;
  year: number;
  activeNationId: string;

  nations: Nation[];
  cities: City[];
  armies: Army[];
  fleets: Fleet[];

  relations: Relation[];
  treaties: Treaty[];
  tradePolicies: TradePolicy[];
  grants: Grant[];

  map: GameMap;
  transportNetwork: TransportNetwork;

  // Player-chosen distribution of transport capacity per nation for this turn
  transportAllocationsByNation?: Record<string, Record<string, number>>;

  tradeRoutes: TradeRoute[]; // optional if you model manual trade as global rather than fixed routes

  industry: IndustryState;   // if centralized; otherwise per-nation industry states in Nation extensions
  technologyState: TechnologyState;

  newsLog: NewsItem[];
  turnOrder: TurnOrderSummary;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
}