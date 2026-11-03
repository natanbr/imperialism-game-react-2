// Turn steps that used to live in the store's advanceTurn (moved into resolveTurn in M1).
import { GameState } from "@/types/GameState";
import { Worker, WorkerStatus } from "@/types/Workers";
import type { TurnSystem } from "../turn/context";
import { holdsJob } from "../orders/queries";
import { isLastTurnOfYear } from "../calendar";

/** Every worker may move again; a worker keeps "working" only while its job is unfinished. */
export const resetWorkers: TurnSystem = (state: GameState): GameState => ({
  ...state,
  map: {
    ...state.map,
    tiles: state.map.tiles.map((row) =>
      row.map((tile) => {
        if (tile.workers.length === 0) return tile;
        const workers = tile.workers.map((w: Worker): Worker => {
          const isWorking = holdsJob(tile, w.id);
          return {
            ...w,
            justMoved: false,
            previousTileId: undefined,
            status: isWorking ? WorkerStatus.Working : WorkerStatus.Available,
          };
        });
        return { ...tile, workers };
      })
    ),
  },
});

/** One turn is one season; the year advances after winter (FR-027). */
export const advanceClock: TurnSystem = (state: GameState): GameState => ({
  ...state,
  turn: state.turn + 1,
  year: state.year + (isLastTurnOfYear(state.turn) ? 1 : 0),
});
