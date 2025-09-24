import { TransportNetwork } from "@/types/Transport";
import { StateCreator } from "zustand";

export interface TransportSlice {
  transportNetwork: TransportNetwork;
}

export const createTransportSlice: StateCreator<TransportSlice> = (set) => ({
  transportNetwork: {
    railroads: [],
    shippingLanes: [],
    capacity: 0,
  },
});
