import { StateCreator } from "zustand";
import {
  isGameOver,
  newGame,
  resolveTurn,
  tryApplyOrder,
  type GameEvent,
  type Order,
  type RejectReason,
  type ValidationResult,
} from "@/engine";
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { GameStore } from "./rootStore";

/** How many resolved turns the event log keeps. */
export const EVENT_LOG_TURNS = 20;

/** What one resolved turn produced, for the HUD's news. */
export interface TurnReport {
  /** The turn that was resolved (the game is now on the next one). */
  turn: number;
  year: number;
  events: GameEvent[];
}

export interface OrderRejection {
  order: Order;
  reason: RejectReason;
}

/**
 * The game and the session around it. `game` is the only state the engine sees; everything else
 * here is UI state (FR-018). The UI changes `game` only through `submitOrder` and `advanceTurn`.
 */
export interface GameSlice {
  game: GameState;
  /** The nation this client plays. Orders for any other nation are refused. */
  activeNationId: NationId;
  /** The most recent refused order, until the next accepted one or the end of the turn. */
  lastRejection: OrderRejection | null;
  /** Oldest first, at most EVENT_LOG_TURNS entries. */
  eventLog: TurnReport[];

  /** Validates the order against `game` and, if valid, applies it now (FR-020). */
  submitOrder: (order: Order) => ValidationResult;
  /** Resolves the turn: `resolveTurn(game, {}, game.seed)`, then logs its events (FR-021); nothing after game over (FR-077). */
  advanceTurn: () => void;
}

export interface GameSliceOptions {
  /** Start from this state instead of a new game (tests). */
  game?: GameState;
  /** Seed for a new game; drawn at random when missing (FR-019). */
  seed?: number;
  activeNationId?: NationId;
}

/** A positive 31-bit integer from a [0, 1) random source. */
export const randomSeed = (random: () => number = Math.random): number => 1 + Math.floor(random() * 0x7ffffffe);

export const createGameSlice =
  (options: GameSliceOptions = {}): StateCreator<GameStore, [], [], GameSlice> =>
  (set, get) => {
    const game = options.game ?? newGame({ seed: options.seed ?? randomSeed() });
    return {
      game,
      activeNationId: options.activeNationId ?? game.nations[0]?.id ?? "nation-1",
      lastRejection: null,
      eventLog: [],

      submitOrder: (order) => {
        const { game: current, activeNationId } = get();
        const { state, result } =
          order.nationId === activeNationId
            ? tryApplyOrder(current, order)
            : { state: current, result: { ok: false, reason: "not-owner" } as const };
        if (result.ok) set({ game: state, lastRejection: null });
        else set({ lastRejection: { order, reason: result.reason } });
        return result;
      },

      // Orders were applied when submitted, so the turn resolves with none (ARCHITECTURE.md, turn flow).
      advanceTurn: () => {
        const { game: current, eventLog } = get();
        // After the end resolveTurn is a no-op that would still log an empty turn (FR-077).
        if (isGameOver(current)) return;
        const { state, events } = resolveTurn(current, {}, current.seed);
        const report: TurnReport = { turn: current.turn, year: current.year, events };
        set({ game: state, eventLog: [...eventLog, report].slice(-EVENT_LOG_TURNS), lastRejection: null });
      },
    };
  };
