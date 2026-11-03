import { WorkerType } from "../types/Workers";
import { FORESTRY_TERRAINS } from "../definisions/terrainDefinitions";
import { createGetDevelopmentActions } from "./developmentWorkerFactory";

const foresterConfig = {
  workerType: WorkerType.Forester,
  terrainTypes: FORESTRY_TERRAINS,
};

export const getForesterActions = createGetDevelopmentActions(foresterConfig);
