import type { GameState } from "@/types/GameState";
import type { TurnContext, TurnSystem } from "./context";
import { developmentSystem } from "../systems/developmentSystem";
import { diplomacySystem } from "../systems/diplomacySystem";
import { tradeSystem } from "../systems/tradeSystem";
import { productionSystem } from "../systems/productionSystem";
import { combatSystem } from "../systems/combatSystem";
import { interceptionsSystem } from "../systems/interceptionsSystem";
import { transportConnectivitySystem } from "../systems/transportConnectivitySystem";
import { logisticsSystem } from "../systems/logisticsSystem";
import { foodSystem } from "../systems/foodSystem";

/**
 * The turn phases in manual order: jobs first, then diplomacy, trade, production (which also
 * builds the freight cars ordered this turn), combat, interceptions, internal transport, and the
 * workers' meal once the shipments have arrived. resolveTurn wraps them with the order phase, the
 * worker reset and the clock.
 */
export const TURN_PHASES: readonly TurnSystem[] = [
  developmentSystem,
  diplomacySystem,
  tradeSystem,
  productionSystem,
  combatSystem,
  interceptionsSystem,
  transportConnectivitySystem,
  logisticsSystem,
  foodSystem,
];

export const runTurnPhases = (state: GameState, ctx: TurnContext): GameState =>
  TURN_PHASES.reduce((s, system) => system(s, ctx), state);
