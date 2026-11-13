import { StateCreator } from "zustand";
import {
  computerOrders,
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
import type { WorldId } from "@/types/World";
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

/** One nation's orders for one resolved turn (FR-100); the log of these replays the game. */
export interface OrderLogEntry {
  turn: number;
  nationId: NationId;
  orders: Order[];
}

/**
 * The game and the session around it. `game` is the only state the engine sees; everything else
 * here is UI state (FR-018). The UI changes `game` only through `submitOrder` and `advanceTurn`, and
 * replaces it with `startNewGame`.
 */
export interface GameSlice {
  game: GameState;
  /** The nation this client plays. Orders for any other nation are refused. */
  activeNationId: NationId;
  /** The most recent refused order, until the next accepted one or the end of the turn. */
  lastRejection: OrderRejection | null;
  /** Oldest first, at most EVENT_LOG_TURNS entries. */
  eventLog: TurnReport[];
  /** Every nation's orders of every resolved turn, oldest first (FR-100). */
  orderLog: OrderLogEntry[];
  /** The active nation's orders applied this turn, in order; logged at End Turn (FR-100). */
  ordersThisTurn: Order[];

  /** Validates the order against `game` and, if valid, applies it now (FR-020). */
  submitOrder: (order: Order) => ValidationResult;
  /**
   * Resolves the turn with the computer nations' orders (FR-099) and logs its events (FR-021) and
   * every nation's orders (FR-100); nothing after game over (FR-077).
   */
  advanceTurn: () => void;
  /**
   * Replaces the game with a new one and clears what belonged to the old one (FR-105, FR-109); on the
   * continent unless `world` names another (FR-144).
   */
  startNewGame: (options?: { seed?: number; turnLimit?: number; world?: WorldId }) => void;
}

export interface GameSliceOptions {
  /** Start from this state instead of a new game (tests). */
  game?: GameState;
  /** Seed for a new game; drawn at random when missing (FR-019). */
  seed?: number;
  /** The world of a new game; the continent when missing (FR-144). */
  world?: WorldId;
  activeNationId?: NationId;
}

/** The app plays the v2 world (FR-144); the engine's own default stays "two-islands". */
export const APP_WORLD: WorldId = "continent";

/** A positive 31-bit integer from a [0, 1) random source. */
export const randomSeed = (random: () => number = Math.random): number => 1 + Math.floor(random() * 0x7ffffffe);

export const createGameSlice =
  (options: GameSliceOptions = {}): StateCreator<GameStore, [], [], GameSlice> =>
  (set, get) => {
    const game = options.game ?? newGame({ seed: options.seed ?? randomSeed(), world: options.world ?? APP_WORLD });
    return {
      game,
      activeNationId: options.activeNationId ?? game.nations[0]?.id ?? "nation-1",
      lastRejection: null,
      eventLog: [],
      orderLog: [],
      ordersThisTurn: [],

      submitOrder: (order) => {
        const { game: current, activeNationId, ordersThisTurn } = get();
        const { state, result } =
          order.nationId === activeNationId
            ? tryApplyOrder(current, order)
            : { state: current, result: { ok: false, reason: "not-owner" } as const };
        if (result.ok) set({ game: state, lastRejection: null, ordersThisTurn: [...ordersThisTurn, order] });
        else set({ lastRejection: { order, reason: result.reason } });
        return result;
      },

      // The human's orders were applied when submitted; the computer nations plan on that state and
      // their orders resolve with the turn (FR-099, ARCHITECTURE.md turn flow).
      advanceTurn: () => {
        const { game: current, eventLog, orderLog, ordersThisTurn, activeNationId } = get();
        // After the end resolveTurn is a no-op that would still log an empty turn (FR-077).
        if (isGameOver(current)) return;
        const computer = computerOrders(current);
        const { state, events } = resolveTurn(current, computer, current.seed);
        const report: TurnReport = { turn: current.turn, year: current.year, events };
        // In state order, the order resolveTurn applies them in, so the log replays the game (FR-100).
        const logged = current.nations.map((n): OrderLogEntry => ({
          turn: current.turn,
          nationId: n.id,
          orders: n.id === activeNationId ? ordersThisTurn : (computer[n.id] ?? []),
        }));
        set({
          game: state,
          eventLog: [...eventLog, report].slice(-EVENT_LOG_TURNS),
          orderLog: [...orderLog, ...logged],
          ordersThisTurn: [],
          lastRejection: null,
        });
      },

      // Nothing of the old game's session survives: selection, dialogs, news, logs (FR-105, FR-109).
      startNewGame: ({ seed, turnLimit, world } = {}) => {
        const next = newGame({ seed: seed ?? randomSeed(), turnLimit, world: world ?? APP_WORLD });
        set({
          game: next,
          activeNationId: next.nations[0]?.id ?? "nation-1",
          lastRejection: null,
          eventLog: [],
          orderLog: [],
          ordersThisTurn: [],
          isGameOverHidden: false,
          selectedTileId: undefined,
          hoveredTileId: undefined,
          selectedWorkerId: undefined,
          isCapitalOpen: false,
          isMarketOpen: false,
          isDiplomacyOpen: false,
          dismissedProposalIds: [],
          isWarehouseOpen: false,
          isTransportAllocationOpen: false,
          isConstructionModalOpen: false,
          constructionModalTileId: null,
          constructionModalWorkerId: null,
        });
      },
    };
  };
