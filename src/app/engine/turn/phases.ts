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

/**
 * The turn phases in manual order (jobs first, then diplomacy, trade, production, combat,
 * interceptions, and internal transport last). resolveTurn wraps them with the order phase,
 * the queued-capacity step, the worker reset and the clock.
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
];

export const runTurnPhases = (state: GameState, ctx: TurnContext): GameState =>
  TURN_PHASES.reduce((s, system) => system(s, ctx), state);
