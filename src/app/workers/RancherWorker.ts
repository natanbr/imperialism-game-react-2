import { WorkerType } from "../types/Workers";
import { RANCHING_TERRAINS } from "../definisions/terrainDefinitions";
import { createStartDevelopmentWork, createGetDevelopmentActions } from "./developmentWorkerFactory";

const rancherConfig = {
  workerType: WorkerType.Rancher,
  terrainTypes: RANCHING_TERRAINS,
  jobDescriptionPrefix: "Ranching",
};

export const startRancherWork = createStartDevelopmentWork(rancherConfig);
export const getRancherActions = createGetDevelopmentActions(rancherConfig);
