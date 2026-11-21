import { StateCreator } from "zustand";
import {
  battlesFoughtBy,
  computerOrders,
  isGameOver,
  newGame,
  resolveTurn,
  tryApplyOrder,
  type CouncilMetEvent,
  type GameEvent,
  type Order,
  type RejectReason,
  type ValidationResult,
} from "@/engine";
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { WorldId } from "@/types/World";
import type { MarketMode } from "@/types/Market";
import type { GameStore } from "./rootStore";
import type { ReplayBoundary } from "./sessionReplay";
import { isPlayersWorker } from "./controls/playersWorker";

/** How many resolved turns the event log keeps. */
export const EVENT_LOG_TURNS = 20;

/** What one resolved turn produced, for the HUD's news and the Deal Book. */
export interface TurnReport {
  /** The turn that was resolved (the game is now on the next one). */
  turn: number;
  year: number;
  events: GameEvent[];
  /**
   * Each nation's treasury when the turn began (before the human's first order of it) and after it resolved (FR-256:
   * the Deal Book's treasury change). Absent in reports made by hand.
   */
  treasuries?: Record<NationId, { start: number; end: number }>;
}

const treasuriesOf = (state: GameState): Record<NationId, number> => Object.fromEntries(state.nations.map((n) => [n.id, n.treasury ?? 0]));

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

/** The game and what the store keeps of its session: what a save holds and a restore puts back (FR-357, FR-359). */
export interface GameSession {
  game: GameState;
  /** The point at which this game was first opened under the current rules. */
  replayBoundary?: ReplayBoundary;
  /** The nation this client plays. Orders for any other nation are refused. */
  activeNationId: NationId;
  /** Oldest first, at most EVENT_LOG_TURNS entries. */
  eventLog: TurnReport[];
  /** Every nation's orders of every resolved turn, oldest first (FR-100). */
  orderLog: OrderLogEntry[];
  /** The active nation's orders applied this turn, in order; logged at End Turn (FR-100). */
  ordersThisTurn: Order[];
  /** The treasuries just before the first of `ordersThisTurn` was applied; null while there is none (FR-256). */
  turnStartTreasuries: Record<NationId, number> | null;
}

/** FR-423: how long Advance Turn (the button and the key "n") stays locked after it ended a turn. */
export const END_TURN_LOCK_MS = 600;

/**
 * The game and the session around it. `game` is the only state the engine sees; everything else
 * here is UI state (FR-018). The UI changes `game` only through `submitOrder` and `advanceTurn`, and
 * replaces it with `startNewGame` or, from a save, `restoreGame`.
 */
export interface GameSlice extends GameSession {
  /** The most recent refused order, until the next accepted one or the end of the turn. */
  lastRejection: OrderRejection | null;
  /** The last write of the autosave failed (FR-363: the HUD says so until one succeeds); written by store/persistence.ts. */
  saveFailed: boolean;
  setSaveFailed: (failed: boolean) => void;

  /** Validates the order against `game` and, if valid, applies it now (FR-020). */
  submitOrder: (order: Order) => ValidationResult;
  /**
   * Resolves the turn with the computer nations' orders (FR-099) and logs its events (FR-021) and
   * every nation's orders (FR-100); nothing after game over (FR-077).
   */
  advanceTurn: () => void;
  /** FR-423: Advance Turn is locked from the moment it ends a turn until END_TURN_LOCK_MS later (the button: aria-busy). */
  endTurnLocked: boolean;
  /**
   * The HUD's Advance Turn and the key "n" (FR-423): `advanceTurn`, then nothing until END_TURN_LOCK_MS have passed, so a
   * double click ends one turn. `advanceTurn` itself stays unguarded for tests and headless runs.
   */
  endTurn: () => void;
  /**
   * Replaces the game with a new one and clears what belonged to the old one (FR-105, FR-109); on the
   * continent unless `world` names another (FR-144).
   */
  startNewGame: (options?: { seed?: number; turnLimit?: number; world?: WorldId; market?: MarketMode }) => void;
  /**
   * Replaces the game and its session with a saved one (FR-359), with nothing selected and no dialog open, as a new game
   * starts. Only page.tsx calls it, at the start: the store never loads a save by itself.
   */
  restoreGame: (session: GameSession) => void;
}

export interface GameSliceOptions {
  /** Start from this state instead of a new game (tests). */
  game?: GameState;
  /** Seed for a new game; drawn at random when missing (FR-019). */
  seed?: number;
  /** The world of a new game; the continent when missing (FR-144). */
  world?: WorldId;
  /** The market mode of a new game; the world's own when missing (FR-242: the continent's is "partners"). */
  market?: MarketMode;
  activeNationId?: NationId;
}

/** The app plays the v2 world (FR-144); the engine's own default stays "two-islands". */
export const APP_WORLD: WorldId = "continent";

/** A positive 31-bit integer from a [0, 1) random source. */
export const randomSeed = (random: () => number = Math.random): number => 1 + Math.floor(random() * 0x7ffffffe);

export const createGameSlice =
  (options: GameSliceOptions = {}): StateCreator<GameStore, [], [], GameSlice> =>
  (set, get) => {
    const game = options.game ?? newGame({ seed: options.seed ?? randomSeed(), world: options.world ?? APP_WORLD, market: options.market });
    return {
      game,
      activeNationId: options.activeNationId ?? game.nations[0]?.id ?? "nation-1",
      lastRejection: null,
      eventLog: [],
      orderLog: [],
      ordersThisTurn: [],
      turnStartTreasuries: null,

      submitOrder: (order) => {
        const { game: current, activeNationId, ordersThisTurn, turnStartTreasuries } = get();
        const { state, result } =
          order.nationId === activeNationId
            ? tryApplyOrder(current, order)
            : { state: current, result: { ok: false, reason: "not-owner" } as const };
        if (result.ok)
          set({
            game: state,
            lastRejection: null,
            ordersThisTurn: [...ordersThisTurn, order],
            turnStartTreasuries: ordersThisTurn.length === 0 ? treasuriesOf(current) : turnStartTreasuries,
          });
        else set({ lastRejection: { order, reason: result.reason } });
        return result;
      },

      // The human's orders were applied when submitted; the computer nations plan on that state and
      // their orders resolve with the turn (FR-099, ARCHITECTURE.md turn flow).
      advanceTurn: () => {
        const { game: current, eventLog, orderLog, ordersThisTurn, activeNationId, selectedWorkerId, turnStartTreasuries } = get();
        // After the end resolveTurn is a no-op that would still log an empty turn (FR-077).
        if (isGameOver(current)) return;
        const computer = computerOrders(current);
        const { state, events } = resolveTurn(current, computer, current.seed);
        // The computer nations' orders apply inside resolveTurn, so `current` is their turn start (FR-256)
        const start = { ...treasuriesOf(current), ...(ordersThisTurn.length > 0 ? turnStartTreasuries : {}) };
        const end = treasuriesOf(state);
        const treasuries = Object.fromEntries(Object.keys(end).map((id) => [id, { start: start[id] ?? end[id], end: end[id] }]));
        const report: TurnReport = { turn: current.turn, year: current.year, events, treasuries };
        // In state order, the order resolveTurn applies them in, so the log replays the game (FR-100).
        const logged = current.nations.map((n): OrderLogEntry => ({
          turn: current.turn,
          nationId: n.id,
          orders: n.id === activeNationId ? ordersThisTurn : (computer[n.id] ?? []),
        }));
        set({
          game: state,
          selectedWorkerId: selectedWorkerId && isPlayersWorker({ game: state, activeNationId }, selectedWorkerId) ? selectedWorkerId : undefined,
          eventLog: [...eventLog, report].slice(-EVENT_LOG_TURNS),
          orderLog: [...orderLog, ...logged],
          ordersThisTurn: [],
          turnStartTreasuries: null,
          lastRejection: null,
          // FR-232: the player's next turn starts with the Battle screen of each battle it fought, one after another;
          // FR-230: this turn's selection and attack plan are spent
          battleQueue: battlesFoughtBy(events, activeNationId),
          // FR-299: and with the Council screen of a meeting just held, once, after those Battle screens
          councilShown: events.find((e): e is CouncilMetEvent => e.type === "council-met") ?? null,
          armySelection: null,
          attackPlan: null,
        });
      },

      endTurnLocked: false,
      // The turn renders synchronously after advanceTurn (a click is a discrete update), so the timer cannot fire before
      // the new turn is on screen: the lock lasts until both have happened (FR-423)
      endTurn: () => {
        if (get().endTurnLocked) return;
        set({ endTurnLocked: true });
        get().advanceTurn();
        setTimeout(() => set({ endTurnLocked: false }), END_TURN_LOCK_MS);
      },

      // Nothing of the old game's session survives: selection, dialogs, news, logs (FR-105, FR-109).
      startNewGame: ({ seed, turnLimit, world, market } = {}) => {
        const next = newGame({ seed: seed ?? randomSeed(), turnLimit, world: world ?? APP_WORLD, market });
        set({
          ...NO_SELECTION_NO_DIALOG,
          game: next,
          replayBoundary: undefined,
          activeNationId: next.nations[0]?.id ?? "nation-1",
          eventLog: [],
          orderLog: [],
          ordersThisTurn: [],
          turnStartTreasuries: null,
        });
      },

      saveFailed: false,
      setSaveFailed: (failed) => set({ saveFailed: failed }),

      // FR-359: the saved session, and of the UI only what a new game starts with; a finished game shows its final scores
      restoreGame: ({ game: saved, replayBoundary, activeNationId, eventLog, orderLog, ordersThisTurn, turnStartTreasuries }) =>
        set({ ...NO_SELECTION_NO_DIALOG, game: saved, replayBoundary, activeNationId, eventLog, orderLog, ordersThisTurn, turnStartTreasuries }),
    };
  };

/** The UI of a game just started or restored: no refusal, nothing selected, no dialog open (FR-105, FR-109, FR-359). */
const NO_SELECTION_NO_DIALOG: Partial<GameStore> = {
  lastRejection: null,
  isGameOverHidden: false,
  selectedTileId: undefined,
  hoveredTileId: undefined,
  selectedWorkerId: undefined,
  isCapitalOpen: false,
  isMarketOpen: false,
  isDealBookOpen: false,
  isDiplomacyOpen: false,
  dismissedProposalIds: [],
  armyProvinceId: null,
  armyTargetId: null,
  armySelection: null,
  attackPlan: null,
  battleQueue: [],
  councilShown: null,
  isArmouryOpen: false,
  isWarehouseOpen: false,
  isTransportAllocationOpen: false,
  isConstructionModalOpen: false,
  constructionModalTileId: null,
  constructionModalWorkerId: null,
  isHowToPlayOpen: false,
  // M12 lane L2: the map's status line (FR-373) and a spend still asked (FR-383) belong to the old game
  mapStatus: null,
  pendingSpend: null,
  // FR-160: a new session starts unlocked; the autosave writes the new or restored game at once and sets saveFailed again
  endTurnLocked: false,
  saveFailed: false,
};
