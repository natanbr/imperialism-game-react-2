import { TransportNetwork } from "@/types/Transport";
import { StateCreator } from "zustand";
import { GameStore } from "./rootStore";

export interface TransportSlice {
  transportNetwork: TransportNetwork;
}

export const createTransportSlice: StateCreator<GameStore, [], [], TransportSlice> = (set) => ({
  transportNetwork: {
    railroads: [],
    shippingLanes: [],
    capacity: 0,
  },
});