import { WorkerType } from "../types/Workers";
import { FORESTRY_TERRAINS } from "../definisions/terrainDefinitions";
import { createStartDevelopmentWork, createGetDevelopmentActions } from "./developmentWorkerFactory";

const foresterConfig = {
  workerType: WorkerType.Forester,
  terrainTypes: FORESTRY_TERRAINS,
  jobDescriptionPrefix: "Forestry",
};

export const startForesterWork = createStartDevelopmentWork(foresterConfig);
export const getForesterActions = createGetDevelopmentActions(foresterConfig);
