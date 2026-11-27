import { settlesUnder, type GameState } from "@/types/GameState";
import type { TurnContext, TurnSystem } from "./context";
import { developmentSystem } from "../systems/developmentSystem";
import { landPurchaseSystem } from "../overseas/holdings";
import { diplomacySystem } from "../systems/diplomacySystem";
import { tradeSystem } from "../systems/tradeSystem";
import { creditSettlementSystem, reportClosingCredit } from "../credit/settlement";
import { disbandSystem, recruitSystem, upkeepSystem } from "../systems/armySystem";
import { productionSystem } from "../systems/productionSystem";
import { combatSystem } from "../systems/combatSystem";
import { interceptionsSystem } from "../systems/interceptionsSystem";
import { transportConnectivitySystem } from "../systems/transportConnectivitySystem";
import { townDevelopmentSystem } from "../systems/townDevelopmentSystem";
import { logisticsSystem } from "../systems/logisticsSystem";
import { tradeDeliverySystem } from "../systems/tradeDeliverySystem";
import { foodSystem } from "../systems/foodSystem";
import { universitySystem } from "../systems/universitySystem";
import { developerSystem } from "../systems/developerSystem";
import { shipyardSystem } from "../systems/shipyardSystem";
import { technologySystem } from "../systems/technologySystem";

/**
 * The turn phases in manual order: jobs first, and the Developers' land purchases (FR-633), then diplomacy, trade (the world-market deals and
 * the price step), the ordered disbands and the army upkeep (FR-207, FR-202), credit interest and forced sales, production (which also
 * builds the freight cars ordered this turn), naval movements and contact, then combat (the marches
 * and the healing, FR-206, FR-208), the new regiments and ships, internal transport, the delivery of the units bought,
 * and the workers' meal once the shipments have arrived, then the graduates and the Developer granted by diplomacy
 * (FR-629). resolveTurn wraps them with the order phase,
 * the worker reset and the clock.
 */
export const TURN_PHASES: readonly TurnSystem[] = [
  developmentSystem,
  // FR-633: right after the jobs, on the settled record, before this turn's diplomacy changes it
  landPurchaseSystem,
  diplomacySystem,
  tradeSystem,
  disbandSystem,
  upkeepSystem,
  creditSettlementSystem,
  productionSystem,
  interceptionsSystem,
  combatSystem,
  recruitSystem,
  shipyardSystem,
  transportConnectivitySystem,
  townDevelopmentSystem,
  logisticsSystem,
  tradeDeliverySystem,
  foodSystem,
  // Disbanded civilians join the workforce healthy for the following turn, after this turn's meal.
  universitySystem,
  // FR-629: reads the settled record, after the trade phase's relation gains; Available next turn like a graduate.
  developerSystem,
  technologySystem,
  reportClosingCredit,
];

/** FR-641: the phases M18j added, which a replayed turn settled under older rules did not run. */
const M18J_PHASES: ReadonlySet<TurnSystem> = new Set([landPurchaseSystem, developerSystem]);
const BEFORE_M18J = TURN_PHASES.filter((system) => !M18J_PHASES.has(system));

export const runTurnPhases = (state: GameState, ctx: TurnContext): GameState =>
  (settlesUnder(ctx.rulesRevision, "m18j") ? TURN_PHASES : BEFORE_M18J).reduce((s, system) => system(s, ctx), state);
