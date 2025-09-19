// Empty createTransportSlice for Zustand store composition
export const createTransportSlice = () => ({});
import { TransportNetwork } from "@/types/Transport";

export interface TransportSlice {
  transportNetwork: TransportNetwork;
  // actions: buildRail, buildDepot, allocateTransportCapacity...
}
