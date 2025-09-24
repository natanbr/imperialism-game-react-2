import { StateCreator } from "zustand";
import { GameStore } from "./types";
import {
  createClearTile,
  moveSelectedWorkerToTileHelper,
  startConstructionHelper,
  startDevelopmentHelper,
  startProspectingHelper,
} from "./helpers/workerHelpers";
import { WorkerType } from "@/types/Workers";

export interface WorkerSlice {
  selectedWorkerId: string | undefined;
  selectWorker: (workerId: string | undefined) => void;
  moveSelectedWorkerToTile: (tileId: string) => void;
  clearTile: (tileId: string) => void;
  startProspecting: (tileId: string, workerId: string) => void;
  startDevelopment: (
    tileId: string,
    workerId: string,
    workerType: WorkerType,
    targetLevel: 1 | 2 | 3
  ) => void;
  startConstruction: (
    tileId: string,
    workerId: string,
    kind: "depot" | "port" | "fort" | "rail"
  ) => void;
}

export const createWorkerSlice: StateCreator<
  GameStore,
  [],
  [],
  WorkerSlice
> = (set, get) => ({
  selectedWorkerId: undefined,
  selectWorker: (workerId: string | undefined) => set({ selectedWorkerId: workerId }),
  moveSelectedWorkerToTile: (tileId: string) => {
    const { selectedWorkerId } = get();
    if (selectedWorkerId) {
      set((state) => moveSelectedWorkerToTileHelper(state, tileId, selectedWorkerId));
    }
  },
  clearTile: (tileId: string) => {
    const { nations, activeNationId } = get();
    const nation = nations.find((n) => n.id === activeNationId);
    if (!nation) return;

    const modifiedNation = createClearTile(tileId, nation);

    set((state) => ({
      nations: state.nations.map((n) =>
        n.id === activeNationId ? modifiedNation : n
      ),
    }));
  },
  startProspecting: (tileId: string, workerId: string) => {
    set((state) => startProspectingHelper(state, tileId, workerId));
  },
  startDevelopment: (
    tileId: string,
    workerId: string,
    workerType: WorkerType,
    targetLevel: 1 | 2 | 3
  ) => {
    set((state) =>
      startDevelopmentHelper(state, tileId, workerId, workerType, targetLevel)
    );
  },
  startConstruction: (
    tileId: string,
    workerId: string,
    kind: "depot" | "port" | "fort" | "rail"
  ) => {
    set((state) => startConstructionHelper(state, tileId, workerId, kind));
  },
});