// Moved to the engine in M1. Adapter with the pre-M1 signature (state, rng) for old callers;
// part B removes it.
import { GameState } from "@/types/GameState";
import type { Rng } from "@/engine/rng";
import { createTurnContext } from "@/engine/turn/context";
import { developmentSystem as runDevelopment } from "@/engine/systems/developmentSystem";

export type RngLike = Rng;

export const developmentSystem = (state: GameState, rng: Rng): GameState =>
  runDevelopment(state, createTurnContext({ turn: state.turn, rng }));
