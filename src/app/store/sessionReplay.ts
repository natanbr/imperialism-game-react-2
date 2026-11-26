import { newGame, resolveTurn, tryApplyOrder, type Order } from "@/engine";
import { applyCivilianOrder, validateCivilianOrder } from "@/engine/orders/civilianOrders";
import { cargoHolds, isWarship, shipsOf } from "@/definisions/ships";
import type { GameState } from "@/types/GameState";
import type { TechnologyState } from "@/types/Technology";
import type { GameSession } from "./gameSlice";

/** A v1 save can be made between two orders. Everything before this point used the older rules. */
export interface ReplayBoundary {
  turn: number;
  appliedOrders: number;
  /** Present before national technology purchases existed. Shared permissions never changed during those games. */
  sharedTechnology?: TechnologyState;
  /** When rules change the result of earlier orders, replay later orders from the position the player saved. */
  checkpoint?: GameState;
}

/** The loader and the replay cross the same boundary and preserve the resources and people already earned. */
export function withCurrentRules(state: GameState): GameState {
  const { technologyState: shared, ...game } = state;
  const inherited = new Set(shared?.technologies.filter(t => t.purchased).map(t => t.id));
  if (shared?.oilDrillingTechUnlocked) inherited.add("oilDrilling");
  const nations = game.nations.map(nation => {
    const current = { ...nation };
    delete current.legacyOilSupply;
    const marine = nation.merchantMarine;
    return {
      ...current,
      fleets: current.fleets ?? [],
      technologies: current.technologies ?? [...inherited],
      ...(marine && { merchantMarine: { ...marine, ships: shipsOf(marine), holds: cargoHolds(marine) } }),
    };
  });
  return { ...game, fleets: game.fleets ?? [], rulesRevision: game.rulesRevision ?? "m16.1", nations };
}

function applyHumanOrders(state: GameState, orders: readonly Order[], historical = false): GameState {
  for (const order of orders) {
    const applied = tryApplyOrder(state, order);
    state = applied.state;
    // The first M16 loader erased a v1 game's shared-tech marker. Its human log contains only accepted orders.
    if (historical && order.kind === "setUniversity" && !applied.result.ok && applied.result.reason === "missing-technology") {
      const nation = state.nations.find(n => n.id === order.nationId);
      if (nation && validateCivilianOrder(state, nation, order, false).ok) state = applyCivilianOrder(state, order);
    }
  }
  return state;
}

/** Rebuild from the original settings, or the preserved position of a divergent historical campaign. */
export function replaySession(session: GameSession): GameState {
  const { game, activeNationId, replayBoundary } = session;
  const checkpoint = replayBoundary?.checkpoint;
  let state = checkpoint ?? newGame({ seed: game.seed, world: game.worldId, market: game.market?.mode ?? "world", turnLimit: game.turnLimit,
    difficulty: game.difficulty, randomMapSize: game.randomMapSize });
  if (replayBoundary && !checkpoint) {
    const shared = replayBoundary.sharedTechnology;
    state = {
      ...state,
      technologyState: shared,
      nations: state.nations.map(n => ({ ...n, legacyOilSupply: true, technologies: shared ? undefined : n.technologies })),
    };
  }

  const turns = new Map<number, Record<string, Order[]>>();
  for (const entry of session.orderLog) {
    if (entry.turn < state.turn) continue;
    const byNation = turns.get(entry.turn) ?? Object.create(null) as Record<string, Order[]>;
    byNation[entry.nationId] = entry.orders;
    turns.set(entry.turn, byNation);
  }
  for (let turn = state.turn; turn <= game.turn; turn++) {
    const { [activeNationId]: logged = [], ...computer } = turns.get(turn) ?? {};
    const human = turn === game.turn ? session.ordersThisTurn : logged;
    if (turn === replayBoundary?.turn) {
      if (!checkpoint) {
        state = applyHumanOrders(state, human.slice(0, replayBoundary.appliedOrders), true);
        state = withCurrentRules(state);
      }
      state = applyHumanOrders(state, human.slice(replayBoundary.appliedOrders));
    } else {
      state = applyHumanOrders(state, human, !!replayBoundary && turn < replayBoundary.turn);
    }
    if (turn < game.turn) state = resolveTurn(state, computer).state;
  }
  return state;
}

export function usedM17CombatRules(session: GameSession): boolean {
  if (session.game.worldId !== "continent") return false;
  if (session.game.fleets?.length) return true;
  const movers = new Map<string, string>();
  const entries = [...session.orderLog, { turn: session.game.turn, orders: session.ordersThisTurn }];
  for (const { turn, orders } of entries) {
    for (const order of orders) {
      if (order.kind === "setFleetMission" || (order.kind === "setShipyard" && isWarship(order.ship))) return true;
      if (order.kind !== "moveArmy") continue;
      if (order.via === "rail" || order.via === "sea") return true;
      const key = turn + "/" + order.toProvinceId;
      const previous = movers.get(key);
      if (previous && previous !== order.nationId) return true;
      movers.set(key, order.nationId);
    }
  }
  return false;
}

/** Compare the JSON that saves contain, independent of property insertion order. */
const gameJson = (state: GameState) => JSON.stringify(state, (_key, value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
    : value);

export function replayBoundaryForSave(session: GameSession): ReplayBoundary | undefined {
  try {
    const start = session.replayBoundary?.checkpoint?.turn ?? 1;
    // Settling even one turn under fishing changes the rules revision of a historical campaign.
    // Only a same-turn replay can still match this save and preserve an earlier boundary.
    if (session.game.turn === start && gameJson(replaySession(session)) === gameJson(session.game)) {
      return session.replayBoundary;
    }
  } catch {
    // A formerly accepted sequence may no longer replay. Keep the authoritative position the player saved.
  }
  return { turn: session.game.turn, appliedOrders: session.ordersThisTurn.length, checkpoint: session.game };
}
