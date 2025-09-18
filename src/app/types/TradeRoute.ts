// types/TradeRoute.ts
import { Commodities } from "./Resource";
import { CityId, NationId, TradeRouteId } from "./Common";

export interface TradeRoute {
  id: TradeRouteId;
  originCityId: CityId;
  destinationCityId: CityId;
  goods: Commodities[];
  capacity: number;
  active: boolean;
  ownerNationId: NationId;
}