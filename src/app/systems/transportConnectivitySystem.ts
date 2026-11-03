// Moved to the engine in M1. Adapter with the pre-M1 signature (state) for old callers;
// part B removes it.
import { GameState } from "@/types/GameState";
import { createTurnContext } from "@/engine/turn/context";
import { transportConnectivitySystem as runConnectivity } from "@/engine/systems/transportConnectivitySystem";

export const transportConnectivitySystem = (state: GameState): GameState =>
  runConnectivity(state, createTurnContext({ turn: state.turn }));
