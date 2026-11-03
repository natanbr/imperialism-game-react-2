import { WorkerType } from "../types/Workers";
import { FARMING_TERRAINS } from "../definisions/terrainDefinitions";
import { createGetDevelopmentActions } from "./developmentWorkerFactory";

const farmerConfig = {
  workerType: WorkerType.Farmer,
  terrainTypes: FARMING_TERRAINS,
};

export const getFarmerActions = createGetDevelopmentActions(farmerConfig);
