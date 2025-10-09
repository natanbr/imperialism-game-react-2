import { WorkerType } from "../types/Workers";
import { FARMING_TERRAINS } from "../definisions/terrainDefinitions";
import { createStartDevelopmentWork, createGetDevelopmentActions } from "./developmentWorkerFactory";

const farmerConfig = {
  workerType: WorkerType.Farmer,
  terrainTypes: FARMING_TERRAINS,
  jobDescriptionPrefix: "Farming",
};

export const startFarmerWork = createStartDevelopmentWork(farmerConfig);
export const getFarmerActions = createGetDevelopmentActions(farmerConfig);
