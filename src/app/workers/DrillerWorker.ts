import { WorkerType } from "../types/Workers";
import { DRILLING_TERRAINS } from "../definisions/terrainDefinitions";
import { createGetDevelopmentActions } from "./developmentWorkerFactory";

const drillerConfig = {
  workerType: WorkerType.Driller,
  terrainTypes: DRILLING_TERRAINS,
};

export const getDrillerActions = createGetDevelopmentActions(drillerConfig);
