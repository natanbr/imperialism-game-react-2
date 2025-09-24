import { StateCreator } from "zustand";
import {
  moveSelectedWorkerToTileHelper,
  startConstructionHelper,
  startDevelopmentHelper,
  startProspectingHelper,
} from "./helpers/workerHelpers";
import { WorkerType } from "@/types/Workers";
import { GameStore } from "./rootStore";

export interface WorkerSlice {
  moveSelectedWorkerToTile: (targetTileId: string, selectedWorkerId: string) => void;
  startProspecting: (tileId: string, workerId: string) => void;
  startDevelopment: (tileId: string, workerId: string, workerType: WorkerType, targetLevel: 1 | 2 | 3) => void;
  startConstruction: (tileId: string, workerId: string, kind: "depot" | "port" | "fort" | "rail") => void;
}

export const createWorkerSlice: StateCreator<GameStore, [], [], WorkerSlice> = (set, get) => ({
  moveSelectedWorkerToTile: (targetTileId, selectedWorkerId) => {
    set(moveSelectedWorkerToTileHelper(get(), targetTileId, selectedWorkerId));
  },
  startProspecting: (tileId, workerId) => {
    set(startProspectingHelper(get(), tileId, workerId));
  },
  startDevelopment: (tileId, workerId, workerType, targetLevel) => {
    set(startDevelopmentHelper(get(), tileId, workerId, workerType, targetLevel));
  },
  startConstruction: (tileId, workerId, kind) => {
    set(startConstructionHelper(get(), tileId, workerId, kind));
  },
});
