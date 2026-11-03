// Headless game loop used by the determinism and two-nation tests. Not a test file.
import { scriptedPlayer, Player } from '@/engine/ai/scriptedPlayer';
import { OrdersByNation, resolveTurn } from '@/engine/turn/resolveTurn';
import { GameEvent } from '@/engine/turn/context';
import { createTwoNationGame, TWO_NATION_IDS } from '@/testing/mockNation';
import { GameState } from '@/types/GameState';

export interface PlayedTurn {
  orders: OrdersByNation;
  events: GameEvent[];
  state: GameState;
}

/** Plays `turns` turns; every nation's orders come from `player` through the order API. */
export function play(initial: GameState, turns: number, player: Player = scriptedPlayer): PlayedTurn[] {
  const played: PlayedTurn[] = [];
  let state = initial;
  for (let i = 0; i < turns; i++) {
    const orders: Record<string, ReturnType<Player>> = {};
    for (const nationId of TWO_NATION_IDS) orders[nationId] = player(state, nationId);
    const result = resolveTurn(state, orders, state.seed);
    state = result.state;
    played.push({ orders, events: result.events, state });
  }
  return played;
}

/** Replays a recorded order log from an initial state. */
export function replay(initial: GameState, log: readonly OrdersByNation[]): GameState {
  return log.reduce((state, orders) => resolveTurn(state, orders, state.seed).state, initial);
}

export const newGame = (seed: number) => createTwoNationGame(seed);
