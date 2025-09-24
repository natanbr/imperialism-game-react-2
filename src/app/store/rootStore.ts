import { create } from "zustand";
import { createTileSelectionSlice } from "./controls/tileSelectionSlice";
import { createCameraSlice } from "./controls/cameraSlice";
import { createOverlaySlice } from "./controls/overlaySlice";
import { createNationSlice } from "./nationSlice";
import { createWorkerSlice } from "./workerSlice";
import { createMapSlice } from "./mapSlice";
import { createPlayerSlice } from "./playerSlice";
import { createTurnSlice } from "./turnSlice";
import { createTechnologySlice } from "./technologySlice";
import { createTransportSlice } from "./transportSlice";
import { GameStore } from "./types";

import { createCitySlice } from "./citySlice";
import { createArmySlice } from "./armySlice";
import { createNavySlice } from "./navySlice";
import { createDiplomacySlice } from "./diplomacySlice";
import { createTradeSlice } from "./tradeSlice";
import { createIndustrySlice } from "./industrySlice";

export const useGameStore = create<GameStore>()((...a) => ({
  ...createPlayerSlice(...a),
  ...createTurnSlice(...a),
  ...createMapSlice(...a),
  ...createNationSlice(...a),
  ...createWorkerSlice(...a),
  ...createTransportSlice(...a),
  ...createTechnologySlice(...a),
  ...createCitySlice(...a),
  ...createArmySlice(...a),
  ...createNavySlice(...a),
  ...createDiplomacySlice(...a),
  ...createTradeSlice(...a),
  ...createIndustrySlice(...a),
  ...createCameraSlice(...a),
  ...createOverlaySlice(...a),
  ...createTileSelectionSlice(...a),
}));
