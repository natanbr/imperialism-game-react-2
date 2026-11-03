// Moved to the engine in M1; this re-export keeps old imports working until part B removes it.
export {
  initializeRailroadNetworks,
  addRailroad,
  addDepot,
  addPort,
} from "@/engine/systems/railroadSystem";
