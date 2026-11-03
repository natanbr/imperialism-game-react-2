// The length of a game and its end (FR-068, FR-069).
import type { GameState } from "@/types/GameState";
import { TIME_CONFIG } from "@/constants/gameConstants";

/** The last turn of the game; a hand-built state without one lasts the default 40 turns. */
export const turnLimitOf = (state: GameState): number => state.turnLimit ?? TIME_CONFIG.TURN_LIMIT;

export const isGameOver = (state: GameState): boolean => state.gameOver !== undefined;
