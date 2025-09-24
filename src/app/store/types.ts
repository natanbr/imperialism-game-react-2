import { CameraSlice } from "./controls/cameraSlice";
import { OverlaySlice } from "./controls/overlaySlice";
import { TileSelectionSlice } from "./controls/tileSelectionSlice";
import { MapSlice } from "./mapSlice";
import { NationSlice } from "./nationSlice";
import { PlayerSlice } from "./playerSlice";
import { TechnologySlice } from "./technologySlice";
import { TransportSlice } from "./transportSlice";
import { TurnSlice } from "./turnSlice";
import { WorkerSlice } from "./workerSlice";
import { CitySlice } from "./citySlice";
import { ArmySlice } from "./armySlice";
import { NavySlice } from "./navySlice";
import { DiplomacySlice } from "./diplomacySlice";
import { TradeSlice } from "./tradeSlice";
import { IndustrySlice } from "./industrySlice";

export type GameStore = PlayerSlice &
  TurnSlice &
  MapSlice &
  NationSlice &
  WorkerSlice &
  TransportSlice &
  TechnologySlice &
  CitySlice &
  ArmySlice &
  NavySlice &
  DiplomacySlice &
  TradeSlice &
  IndustrySlice &
  TileSelectionSlice &
  CameraSlice &
  OverlaySlice;