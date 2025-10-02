// types/Transport.ts
import { CityId } from "./Common";

export interface RailroadNode {
  x: number;
  y: number;
}

export interface PortNode extends RailroadNode {
  isActive: boolean;
}

export interface DepotNode extends RailroadNode {
  isActive: boolean;
}

export type RailroadAdjacencyList = Record<string, RailroadNode[]>;

export interface RailroadNetwork {
  graph: RailroadAdjacencyList;
  capital?: RailroadNode;
  ports: PortNode[];
  depots: DepotNode[];
}

export type RailroadNetworks = Record<string, RailroadNetwork>;

export interface TransportNetwork {
  shippingLanes: TransportRoute[];
  capacity: number; // total per turn for resources + shared with troop rail moves by rule
  railroadNetworks?: RailroadNetworks;
}

export interface TransportRoute {
  id: string;
  from: CityId | string; // cityId or depot/port id if modeled
  to: CityId | string;
  capacity: number;
  active: boolean;
}