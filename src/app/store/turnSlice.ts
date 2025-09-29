import { StateCreator } from 'zustand';
import { runTurnPhases } from '@/systems/runTurnPhases';
import { GameState } from '@/types/GameState';
import { WorkerStatus } from '@/types/Workers';

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
    const nextYear = state.year + (state.turn % 4 === 0 ? 1 : 0); // Advance year every 4 turns (seasons)

    // Apply any pending transport capacity increases before running phases
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

    // Run all phases via systems orchestrator (deterministic RNG seeded per turn)
    const phasedState = runTurnPhases(prePhasesState, nextTurn, { seed: nextYear });

    // After turn phases, reset worker states for the new turn
    const newTiles = phasedState.map.tiles.map(row =>
      row.map(tile => {
        if (tile.workers.length === 0) {
          return tile;
        }
        const newWorkers = tile.workers.map(worker => {
          // A worker is 'working' if their assigned job on this tile is active and not completed.
          const isWorking =
            tile.prospecting?.workerId === worker.id ||
            (tile.developmentJob && !tile.developmentJob.completed && tile.developmentJob.workerId === worker.id) ||
            (tile.constructionJob && !tile.constructionJob.completed && tile.constructionJob.workerId === worker.id);

          return {
            ...worker,
            justMoved: false,
            status: isWorking ? WorkerStatus.Working : WorkerStatus.Available,
          };
        });
        return { ...tile, workers: newWorkers };
      })
    );

    const finalState = {
      ...phasedState,
      map: {
        ...phasedState.map,
        tiles: newTiles,
      },
    };

    return {
      ...finalState,
      turn: nextTurn,
      year: nextYear,
    };
  }),
});
