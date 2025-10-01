import { GameState } from "@/types/GameState";
import { createMulberry32 } from "@/systems/utils/rng";
import { developmentSystem } from "@/systems/developmentSystem";
import { transportConnectivitySystem } from "@/systems/transportConnectivitySystem";
import { logisticsSystem } from "@/systems/logisticsSystem";
import { diplomacySystem } from "@/systems/systems/diplomacySystem";
import { tradeSystem } from "@/systems/systems/tradeSystem";
import { productionSystem } from "@/systems/systems/productionSystem";
import { combatSystem } from "@/systems/systems/combatSystem";
import { interceptionsSystem } from "@/systems/systems/interceptionsSystem";

export interface TurnOptions {
  seed?: number;
}

// Orchestrate all systems for a single turn and return a new GameState
export const runTurnPhases = (state: GameState, nextTurn: number, opts?: TurnOptions): GameState => {
  const seed = (opts?.seed ?? 0) ^ (nextTurn * 2654435761);
  const rng = createMulberry32(seed >>> 0);

  // Apply systems in order per manual: diplomacy, trade, production, combat, interceptions, logistics
  let s = state;
  s = developmentSystem(s, rng);
  s = diplomacySystem(s);
  s = tradeSystem(s);
  s = productionSystem(s);
  s = combatSystem(s);
  s = interceptionsSystem(s);
  s = transportConnectivitySystem(s);
  s = logisticsSystem(s);

  return s;
};
