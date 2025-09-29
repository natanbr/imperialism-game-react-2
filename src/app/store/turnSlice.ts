import { StateCreator } from 'zustand';
import { runTurnPhases } from '@/systems/runTurnPhases';
import { GameState } from '@/types/GameState';
import { Worker, WorkerStatus } from '@/types/Workers';

export interface TurnSlice {
  turn: number;
  year: number;
  turnOrder: {
    phases: [
      "diplomacy",
      "trade", 
      "production",
      "combat",
      "interceptions",
      "logistics"
    ];
  };
  advanceTurn: () => void;
}

export const createTurnSlice: StateCreator<
  GameState,
  [],
  [],
  TurnSlice
> = (set) => ({
  turn: 1,
  year: 1900,
  turnOrder: {
    phases: ["diplomacy", "trade", "production", "combat", "interceptions", "logistics"]
  },
  
  advanceTurn: () => set((state) => {
    const nextTurn = state.turn + 1;
    const nextYear = state.year + (state.turn % 4 === 0 ? 1 : 0);

    const nationsWithAppliedCapacity = state.nations.map((n) => {
      const inc = n.transportCapacityPendingIncrease ?? 0;
      if (inc > 0) {
        return {
          ...n,
          transportCapacity: Math.max(0, Math.floor((n.transportCapacity ?? 0) + inc)),
          transportCapacityPendingIncrease: 0,
        };
      }
      return n;
    });

    const prePhasesState = { ...state, nations: nationsWithAppliedCapacity };

    const phasedState = runTurnPhases(prePhasesState, nextTurn, { seed: nextYear });

    const finalTiles = phasedState.map.tiles.map(row =>
      row.map(tile => {
        if (tile.workers.length === 0) {
          return tile;
        }

        const newWorkers = tile.workers.map((w: Worker) => {
          const isWorking =
            (tile.prospecting && tile.prospecting.workerId === w.id) ||
            (tile.developmentJob && !tile.developmentJob.completed && tile.developmentJob.workerId === w.id) ||
            (tile.constructionJob && !tile.constructionJob.completed && tile.constructionJob.workerId === w.id);

          return {
            ...w,
            justMoved: false,
            previousTileId: undefined,
            status: isWorking ? WorkerStatus.Working : WorkerStatus.Available,
            jobDescription: isWorking ? w.jobDescription : undefined,
          };
        });

        return {
            ...tile,
            workers: newWorkers,
        };
      })
    );

    return {
      ...phasedState,
      map: {
          ...phasedState.map,
          tiles: finalTiles,
      },
      turn: nextTurn,
      year: nextYear,
    };
  }),
});