// types/Transport.ts
import { CityId } from "./Common";

export interface TransportNetwork {
  railroads: TransportRoute[];
  shippingLanes: TransportRoute[];
  capacity: number; // total per turn for resources + shared with troop rail moves by rule
}

export interface TransportRoute {
  id: string;
  from: CityId | string; // cityId or depot/port id if modeled
  to: CityId | string;
  capacity: number;
  active: boolean;
}