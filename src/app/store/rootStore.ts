import { GameSlice } from "./gameSlice";
import { MapSlice } from "./mapSlice";
import { CitySlice } from "./citySlice";
import { ArmySlice } from "./armySlice";
import { NavySlice } from "./navySlice";
import { DiplomacySlice } from "./diplomacySlice";
import { NationSlice } from "./nationSlice";
import { TradeSlice } from "./tradeSlice";
import { TransportSlice } from "./transportSlice";
import { IndustrySlice } from "./industrySlice";
import { TechnologySlice } from "./technologySlice";
import { UiSlice } from "./uiSlice";

export type GameStore =
  & GameSlice
  & MapSlice
  & CitySlice
  & ArmySlice
  & NavySlice
  & DiplomacySlice
  & NationSlice
  & TradeSlice
  & TransportSlice
  & IndustrySlice
  & TechnologySlice
  & UiSlice;
