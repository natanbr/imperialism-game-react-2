import { WorkerType } from "../types/Workers";
import { MINING_TERRAINS } from "../definisions/terrainDefinitions";
import { createGetDevelopmentActions } from "./developmentWorkerFactory";

const minerConfig = {
  workerType: WorkerType.Miner,
  terrainTypes: MINING_TERRAINS,
};

export const getMinerActions = createGetDevelopmentActions(minerConfig);
