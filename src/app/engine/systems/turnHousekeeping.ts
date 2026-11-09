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

/**
 * The freight cars built this turn go into service (FR-101, NR-016): the production phase left
 * them in `transportCapacityPendingIncrease`; after every phase has run they join the capacity,
 * so they carry goods from the next turn.
 */
export const promoteFreightCars: TurnSystem = (state: GameState): GameState => ({
  ...state,
  nations: state.nations.map((nation) => {
    const built = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));
    if (built === 0 && (nation.transportCapacityPendingIncrease ?? 0) === 0) return nation;
    return { ...nation, transportCapacity: (nation.transportCapacity ?? 0) + built, transportCapacityPendingIncrease: 0 };
  }),
});

/** One turn is one season; the year advances after winter (FR-027). */
export const advanceClock: TurnSystem = (state: GameState): GameState => ({
  ...state,
  turn: state.turn + 1,
  year: state.year + (isLastTurnOfYear(state.turn) ? 1 : 0),
});
