import { WorkerType } from "../types/Workers";
import { RANCHING_TERRAINS } from "../definisions/terrainDefinitions";
import { createGetDevelopmentActions } from "./developmentWorkerFactory";

const rancherConfig = {
  workerType: WorkerType.Rancher,
  terrainTypes: RANCHING_TERRAINS,
};

export const getRancherActions = createGetDevelopmentActions(rancherConfig);
