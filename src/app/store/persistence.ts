// Saving the game in this browser (FR-357 to FR-363, card Q79). The engine knows nothing of it (FR-018): this store helper
// writes the store's session to one localStorage slot and reads it back for page.tsx, the only place that loads a save
// (the store never does by itself). Its writes are the autosave page.tsx starts once the game in play is decided.
import type { StoreApi } from "zustand";
import { checkpointDifference, restoreCheckpoint, type CheckpointEdit } from "./checkpointStorage";
import { validSavedCredit } from "./creditSave";
import { inventionNews } from "@/engine/technology";
import { turnLimitOf } from "@/engine/turn/gameOver";
import { normalizeRandomMapSize } from "@/types/World";
import { replayBoundaryForSave, usedM17CombatRules, withCurrentRules } from "./sessionReplay";
import type { GameSession } from "./gameSlice";
import { isRecord } from "./isRecord";
import { readRankHistory } from "./rankHistory";
import type { GameStore } from "./rootStore";

/** The one save slot (FR-357). */
export const SAVE_KEY = "imperialism-remake.save";
/** A save of another version is refused, never guessed at (FR-362). */
export const SAVE_VERSION = 1;
/** Set when the player closed "How to play" (FR-430). */
export const HOW_TO_PLAY_SEEN_KEY = "imperialism-remake.howto-seen";
/** An accepted order is written this long after it, together with the orders that follow it (FR-358: within 1 second). */
export const SAVE_DELAY_MS = 500;

/** What the slot holds (FR-357): the session as JSON, with its version and when it was written. */
export interface SavedGame extends GameSession {
  version: number;
  /** Continent saves from before the Q145 sea and land battle revision lack this marker. */
  combatRevision?: "q145";
  /** ISO date of the write. */
  savedAt: string;
}

type StoredGame = SavedGame & {
  replayBoundary?: SavedGame["replayBoundary"] & { checkpointChanges?: CheckpointEdit };
};

/** The slot read at the start (FR-359, FR-360, FR-362). */
export type SaveSlot = { kind: "empty" } | { kind: "usable"; save: SavedGame } | { kind: "unusable" };

/** The browser's localStorage, or undefined where there is none or the browser blocks it (reading it can throw). */
export function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** The save of a store's session (FR-357). */
export function saveOf(session: GameSession, now: Date = new Date()): SavedGame {
  const { game, activeNationId, eventLog, orderLog, ordersThisTurn, turnStartTreasuries, replayBoundary, rankHistory } = session;
  return { version: SAVE_VERSION, savedAt: now.toISOString(), game, activeNationId, eventLog, orderLog, ordersThisTurn, turnStartTreasuries,
    ...(usedM17CombatRules(session) && { combatRevision: "q145" }), ...(replayBoundary && { replayBoundary }),
    ...(rankHistory?.length && { rankHistory }) };
}

/** This version's save with a game that has a turn, nations and a map, and the session's logs (FR-362's shape check). */
function isUsable(value: unknown): value is StoredGame {
  if (!isRecord(value) || value.version !== SAVE_VERSION) return false;
  const { game } = value;
  return (
    isRecord(game) &&
    typeof game.turn === "number" &&
    Array.isArray(game.nations) &&
    isRecord(game.map) &&
    typeof value.activeNationId === "string" &&
    Array.isArray(value.eventLog) &&
    Array.isArray(value.orderLog) &&
    Array.isArray(value.ordersThisTurn)
  );
}

/** The slot, never throwing: a blocked storage reads as empty, a slot that fails to parse or to pass the check as unusable. */
export function readSave(storage: Pick<Storage, "getItem"> | undefined = browserStorage()): SaveSlot {
  let raw: string | null;
  try {
    raw = storage?.getItem(SAVE_KEY) ?? null;
  } catch {
    return { kind: "empty" };
  }
  if (raw === null) return { kind: "empty" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isUsable(parsed)) return { kind: "unusable" };
    if (parsed.replayBoundary?.checkpointChanges !== undefined) {
      const { checkpointChanges, ...boundary } = parsed.replayBoundary;
      const restored = { ...parsed, game: restoreCheckpoint(parsed.game, checkpointChanges) };
      if (!isUsable(restored) || restored.game.turn !== boundary.turn || boundary.turn > parsed.game.turn) return { kind: "unusable" };
      parsed.replayBoundary = { ...boundary, checkpoint: restored.game };
    }
    if (!validSavedCredit(parsed)) return { kind: "unusable" };
    if (parsed.game.worldId === "random" && parsed.game.randomMapSize !== undefined) {
      parsed.game.randomMapSize = normalizeRandomMapSize(parsed.game.randomMapSize);
    }
    const shared = parsed.game.technologyState;
    if (shared || !parsed.game.rulesRevision) {
      parsed.replayBoundary ??= { turn: parsed.game.turn, appliedOrders: parsed.ordersThisTurn.length,
        ...(shared && { sharedTechnology: shared }) };
      for (const report of parsed.eventLog) {
        if (report.turn >= turnLimitOf(parsed.game) || report.events.some(e => e.type === "new-invention")) continue;
        const released = inventionNews(parsed.game, report.turn + 1);
        const end = report.events.findIndex(e => e.type === "turn-ended");
        report.events.splice(end < 0 ? report.events.length : end, 0, ...released);
      }
    }
    parsed.game = withCurrentRules(parsed.game);
    if (parsed.game.rulesRevision !== "m18d") {
      const boundary = replayBoundaryForSave(parsed);
      if (boundary) parsed.replayBoundary = boundary;
      if (!parsed.combatRevision && usedM17CombatRules(parsed)) parsed.combatRevision = "q145";
    }
    if (parsed.rankHistory !== undefined) parsed.rankHistory = readRankHistory(parsed.rankHistory, parsed.game);
    return { kind: "usable", save: parsed };
  } catch {
    return { kind: "unusable" };
  }
}

/** Encode the full session in the browser slot format, including compact historical replay data. */
export function serializeSave(save: SavedGame): string {
  let stored: StoredGame = save;
  if (save.replayBoundary?.checkpoint) {
    const { checkpoint, ...boundary } = save.replayBoundary;
    stored = { ...save, replayBoundary: { ...boundary, checkpointChanges: checkpointDifference(save.game, checkpoint) ?? {} } };
  }
  return JSON.stringify(stored);
}

/** Writes the save; false when the browser refused it (storage full or blocked, FR-363). */
export function writeSave(save: SavedGame, storage: Storage | undefined = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, serializeSave(save));
    return true;
  } catch {
    return false;
  }
}

/** Whether a flag is set in the browser (How to play seen); false where storage is blocked. */
export function readFlag(key: string, storage: Storage | undefined = browserStorage()): boolean {
  try {
    return (storage?.getItem(key) ?? null) !== null;
  } catch {
    return false;
  }
}

/** Sets a flag in the browser; nothing where storage is blocked. */
export function writeFlag(key: string, storage: Storage | undefined = browserStorage()): void {
  try {
    storage?.setItem(key, "1");
  } catch {
    // Blocked: the flag is not kept, which only shows How to play again
  }
}

/** The running autosave. */
export interface Autosave {
  /** Writes the session now (End Turn, a new game); false when the browser refused it. */
  saveNow: () => boolean;
  /** A write within SAVE_DELAY_MS, unless one is already waiting (an accepted order, FR-358). */
  saveSoon: () => void;
  isPending: () => boolean;
  /**
   * For the page's `beforeunload` (FR-363): writes a pending save at once, then true only when the last write failed,
   * so the page asks before leaving only while the game is not stored.
   */
  beforeUnload: () => boolean;
  stop: () => void;
}

/**
 * Keeps the slot up to date with the store (FR-357, FR-358): a change of `game` with a new event log (a turn resolved, a
 * new game, a restore) is written at once; one without (an accepted order) within SAVE_DELAY_MS, one write per burst.
 * Each write sets the store's `saveFailed` (FR-363).
 */
export function startAutosave(
  store: StoreApi<GameStore>,
  { storage = browserStorage(), delayMs = SAVE_DELAY_MS }: { storage?: Storage; delayMs?: number } = {}
): Autosave {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const saveNow = () => {
    cancel();
    const ok = writeSave(saveOf(store.getState()), storage);
    if (store.getState().saveFailed === ok) store.getState().setSaveFailed(!ok);
    return ok;
  };
  const saveSoon = () => {
    if (timer === undefined) timer = setTimeout(saveNow, delayMs);
  };
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.game === previous.game) return;
    if (state.eventLog !== previous.eventLog) saveNow();
    else saveSoon();
  });
  return {
    saveNow,
    saveSoon,
    isPending: () => timer !== undefined,
    beforeUnload: () => {
      if (timer !== undefined) saveNow();
      return store.getState().saveFailed;
    },
    stop: () => {
      unsubscribe();
      cancel();
    },
  };
}
