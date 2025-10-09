import { WorkerType } from "../types/Workers";
import { DRILLING_TERRAINS } from "../definisions/terrainDefinitions";
import { createStartDevelopmentWork, createGetDevelopmentActions } from "./developmentWorkerFactory";

const drillerConfig = {
  workerType: WorkerType.Driller,
  terrainTypes: DRILLING_TERRAINS,
  jobDescriptionPrefix: "Drilling",
};

export const startDrillerWork = createStartDevelopmentWork(drillerConfig);
export const getDrillerActions = createGetDevelopmentActions(drillerConfig);
