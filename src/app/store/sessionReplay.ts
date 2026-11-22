import { newGame, resolveTurn, tryApplyOrder, type Order } from "@/engine";
import { applyCivilianOrder, validateCivilianOrder } from "@/engine/orders/civilianOrders";
import { cargoHolds, shipsOf } from "@/definisions/ships";
import type { GameState } from "@/types/GameState";
import type { TechnologyState } from "@/types/Technology";
import type { GameSession } from "./gameSlice";

/** A v1 save can be made between two orders. Everything before this point used the older rules. */
export interface ReplayBoundary {
  turn: number;
  appliedOrders: number;
  /** Present before national technology purchases existed. Shared permissions never changed during those games. */
  sharedTechnology?: TechnologyState;
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
      technologies: current.technologies ?? [...inherited],
      ...(marine && { merchantMarine: { ...marine, ships: shipsOf(marine), holds: cargoHolds(marine) } }),
    };
  });
  return { ...game, rulesRevision: game.rulesRevision ?? "m16.1", nations };
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

/** Rebuild the complete game from its original settings, all recorded turns and the current turn's accepted orders. */
export function replaySession(session: GameSession): GameState {
  const { game, activeNationId, replayBoundary } = session;
  let state = newGame({ seed: game.seed, world: game.worldId, market: game.market?.mode ?? "world", turnLimit: game.turnLimit,
    rulesRevision: game.rulesRevision ?? "m16.1" });
  if (replayBoundary) {
    const shared = replayBoundary.sharedTechnology;
    state = {
      ...state,
      technologyState: shared,
      nations: state.nations.map(n => ({ ...n, legacyOilSupply: true, technologies: shared ? undefined : n.technologies })),
    };
  }

  const turns = new Map<number, Record<string, Order[]>>();
  for (const entry of session.orderLog) {
    const byNation = turns.get(entry.turn) ?? Object.create(null) as Record<string, Order[]>;
    byNation[entry.nationId] = entry.orders;
    turns.set(entry.turn, byNation);
  }
  for (let turn = state.turn; turn <= game.turn; turn++) {
    const { [activeNationId]: logged = [], ...computer } = turns.get(turn) ?? {};
    const human = turn === game.turn ? session.ordersThisTurn : logged;
    if (turn === replayBoundary?.turn) {
      state = applyHumanOrders(state, human.slice(0, replayBoundary.appliedOrders), true);
      state = withCurrentRules(state);
      state = applyHumanOrders(state, human.slice(replayBoundary.appliedOrders));
    } else {
      state = applyHumanOrders(state, human, !!replayBoundary && turn < replayBoundary.turn);
    }
    if (turn < game.turn) state = resolveTurn(state, computer).state;
  }
  return state;
}
