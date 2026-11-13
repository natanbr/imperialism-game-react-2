import type { GameState } from "@/types/GameState";
import type { TurnContext, TurnSystem } from "./context";
import { developmentSystem } from "../systems/developmentSystem";
import { diplomacySystem } from "../systems/diplomacySystem";
import { tradeSystem } from "../systems/tradeSystem";
import { disbandSystem, recruitSystem, upkeepSystem } from "../systems/armySystem";
import { productionSystem } from "../systems/productionSystem";
import { combatSystem } from "../systems/combatSystem";
import { interceptionsSystem } from "../systems/interceptionsSystem";
import { transportConnectivitySystem } from "../systems/transportConnectivitySystem";
import { logisticsSystem } from "../systems/logisticsSystem";
import { tradeDeliverySystem } from "../systems/tradeDeliverySystem";
import { foodSystem } from "../systems/foodSystem";

/**
 * The turn phases in manual order: jobs first, then diplomacy, trade (the world-market deals and
 * the price step), the ordered disbands and the army upkeep (FR-207, FR-202), production (which also
 * builds the freight cars ordered this turn), combat (the marches and the healing, FR-206, FR-208),
 * the new regiments (FR-201), interceptions, internal transport, the delivery of the units bought,
 * and the workers' meal once the shipments have arrived. resolveTurn wraps them with the order phase,
 * the worker reset and the clock.
 */
export const TURN_PHASES: readonly TurnSystem[] = [
  developmentSystem,
  diplomacySystem,
  tradeSystem,
  disbandSystem,
  upkeepSystem,
  productionSystem,
  combatSystem,
  recruitSystem,
  interceptionsSystem,
  transportConnectivitySystem,
  logisticsSystem,
  tradeDeliverySystem,
  foodSystem,
];

export const runTurnPhases = (state: GameState, ctx: TurnContext): GameState =>
  TURN_PHASES.reduce((s, system) => system(s, ctx), state);
