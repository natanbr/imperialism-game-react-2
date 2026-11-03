// Turn steps that used to live in the store's advanceTurn (moved into resolveTurn in M1).
import { GameState } from "@/types/GameState";
import { Worker, WorkerStatus } from "@/types/Workers";
import type { TurnSystem } from "../turn/context";
import { holdsJob } from "../orders/queries";

/** Transport capacity bought last turn becomes usable at the start of this resolution. */
export const applyQueuedTransportCapacity: TurnSystem = (state: GameState): GameState => ({
  ...state,
  nations: state.nations.map((n) => {
    const inc = n.transportCapacityPendingIncrease ?? 0;
    if (inc <= 0) return n;
    return {
      ...n,
      transportCapacity: Math.max(0, Math.floor((n.transportCapacity ?? 0) + inc)),
      transportCapacityPendingIncrease: 0,
    };
  }),
});

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

/** The year advances after every fourth turn (pre-M1 rule, kept until M2 fixes the calendar). */
export const advanceClock: TurnSystem = (state: GameState): GameState => ({
  ...state,
  turn: state.turn + 1,
  year: state.year + (state.turn % 4 === 0 ? 1 : 0),
});
