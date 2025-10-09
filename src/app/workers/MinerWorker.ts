import { WorkerType } from "../types/Workers";
import { MINING_TERRAINS } from "../definisions/terrainDefinitions";
import { createStartDevelopmentWork, createGetDevelopmentActions } from "./developmentWorkerFactory";

const minerConfig = {
  workerType: WorkerType.Miner,
  terrainTypes: MINING_TERRAINS,
  jobDescriptionPrefix: "Mining",
};

export const startMinerWork = createStartDevelopmentWork(minerConfig);
export const getMinerActions = createGetDevelopmentActions(minerConfig);
