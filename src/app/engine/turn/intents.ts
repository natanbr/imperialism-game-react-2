// Intents (FR-152, decision 5): an order that involves a second country stores an intent when applied
// and changes nothing of the other country; a turn phase resolves the turn's intents together, nation
// by nation in `intentOrder`, so no nation always goes first. Same pattern as the v1 market orders.
import type { NationId } from "@/types/Common";
import type { GameState } from "@/types/GameState";
import type { Intent } from "@/types/Intent";

/**
 * The Great Powers in founding order (`colorSlot`) rotated by the turn: turn t starts at index
 * (t - 1) mod n, so with two nations turn 1 is nation-1 then nation-2 and turn 2 the reverse. It does
 * not depend on the order of `state.nations`; minor nations give no orders and are not in it.
 */
export function intentOrder(state: GameState, turn: number): NationId[] {
  const founding = [...state.nations].sort((a, b) => a.colorSlot - b.colorSlot).map((n) => n.id);
  const n = founding.length;
  if (n === 0) return [];
  const start = (((turn - 1) % n) + n) % n;
  return [...founding.slice(start), ...founding.slice(0, start)];
}

/** The intents nation by nation in `intentOrder(state, turn)`, each nation's in the order given. */
export function byIntentOrder<T extends Pick<Intent, "nationId">>(state: GameState, turn: number, intents: readonly T[]): T[] {
  const order = intentOrder(state, turn);
  const rank = (nationId: NationId) => {
    const i = order.indexOf(nationId);
    return i < 0 ? order.length : i;
  };
  return intents
    .map((intent, index) => ({ intent, index }))
    .sort((a, b) => rank(a.intent.nationId) - rank(b.intent.nationId) || a.index - b.index)
    .map(({ intent }) => intent);
}

/**
 * Stores an intent for this turn with the next free id "intent-<turn>-<n>" and returns a new state; the
 * input and every other part of the state are unchanged. The order's validation runs before this. A
 * narrower intent type (`GrantIntent`, ...) keeps its own fields.
 */
export function addIntent<T extends Omit<Intent, "id" | "turn">>(state: GameState, intent: T): GameState {
  const prefix = `intent-${state.turn}-`;
  const used = state.intents.filter((i) => i.id.startsWith(prefix)).map((i) => Number(i.id.slice(prefix.length)) || 0);
  const id = `${prefix}${Math.max(0, ...used) + 1}`;
  return { ...state, intents: [...state.intents, { ...intent, id, turn: state.turn }] };
}

/** A new state without the intent of that id; the same state when there is none. */
export function removeIntent(state: GameState, intentId: string): GameState {
  if (!state.intents.some((i) => i.id === intentId)) return state;
  return { ...state, intents: state.intents.filter((i) => i.id !== intentId) };
}

/** Drops the intents of the resolved turn and before (FR-152); the same state when there is none. */
export function dropResolvedIntents(state: GameState, resolvedTurn: number): GameState {
  if (!state.intents.some((i) => i.turn <= resolvedTurn)) return state;
  return { ...state, intents: state.intents.filter((i) => i.turn > resolvedTurn) };
}
