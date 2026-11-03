// Moved to the engine in M1. Adapter with the pre-M1 signature (state) for old callers;
// part B removes it.
import { GameState } from "@/types/GameState";
import { createTurnContext } from "@/engine/turn/context";
import { logisticsSystem as runLogistics } from "@/engine/systems/logisticsSystem";

export {
  computeLogisticsTransport,
  updateNationStateWithTransportedResources,
} from "@/engine/systems/logisticsSystem";

export const logisticsSystem = (state: GameState): GameState =>
  runLogistics(state, createTurnContext({ turn: state.turn }));
