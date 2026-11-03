// Pre-M1 entry point, kept as an adapter for its old test until part B removes it.
// New code calls resolveTurn from "@/engine/turn/resolveTurn".
import { GameState } from "@/types/GameState";
import { runTurnPhases as runEnginePhases } from "@/engine/turn/phases";
import { createTurnContext } from "@/engine/turn/context";

export interface TurnOptions {
  seed?: number;
}

export const runTurnPhases = (state: GameState, nextTurn: number, opts?: TurnOptions): GameState =>
  runEnginePhases(state, createTurnContext({ turn: nextTurn - 1, seed: opts?.seed ?? 0 }));
