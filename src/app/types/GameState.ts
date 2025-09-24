// types/GameState.ts
import { Nation } from "./Nation";
import { City } from "./City";
import { Army } from "./Army";
import { Fleet } from "./Navy";
import { TradeRoute } from "./TradeRoute";
import { TransportNetwork } from "./Transport";
import { GameMap } from "./Map";
import { IndustryState } from "./Industry";
<<<<<<< HEAD
import { Technology } from "./Technology";
import { NewsItem } from "./Common";
=======
<<<<<<< HEAD
import { Technology } from "./Technology";
import { NewsItem } from "./Common";
=======
<<<<<<< HEAD
import { Technology } from "./Technology";
import { NewsItem } from "./Common";
=======
import { Technology, TechnologyState } from "./Technology";
import { NewsItem } from "./Common";
import { Relation, Treaty, TradePolicy, Grant } from "./Diplomacy";
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

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

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
  relations: Relation[];
  treaties: Treaty[];
  tradePolicies: TradePolicy[];
  grants: Grant[];

>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
  map: GameMap;
  transportNetwork: TransportNetwork;

  tradeRoutes: TradeRoute[]; // optional if you model manual trade as global rather than fixed routes

  industry: IndustryState;   // if centralized; otherwise per-nation industry states in Nation extensions
<<<<<<< HEAD
  technologies: Technology[];
=======
<<<<<<< HEAD
  technologies: Technology[];
=======
<<<<<<< HEAD
  technologies: Technology[];
=======
  technologyState: TechnologyState;
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)

  newsLog: NewsItem[];
  turnOrder: TurnOrderSummary;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
}