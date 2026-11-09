import { findWorker } from "@/engine/orders/queries";
import type { GameStore } from "../rootStore";

/** Whether the worker is one of the player's civilians: only those can be selected for orders (FR-108). */
export const isPlayersWorker = (state: GameStore, workerId: string): boolean =>
  findWorker(state.game, workerId)?.worker.nationId === state.activeNationId;
