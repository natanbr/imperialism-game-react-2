import { GameState } from "../types/GameState";
import { Tile } from "../types/Tile";
import { Worker } from "../types/Workers";
import { GameMap } from "../types/Map";
import { PossibleAction } from "../types/actions";

export interface WorkerAction {
  move(state: GameState, from: Tile, to: Tile, worker: Worker): GameState;
  startWork(state: GameState): GameState;
  cancel(state: GameState, tile: Tile, worker: Worker): GameState;
  getActions(tile: Tile, map: GameMap, worker: Worker): PossibleAction | null;
}
