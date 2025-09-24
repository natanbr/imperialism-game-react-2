import { StateCreator } from "zustand";
import { GameStore } from "./types";
import { TransportNetwork } from "@/types/Transport";

export interface TransportSlice {
  transportNetwork: TransportNetwork;
}

export const createTransportSlice: StateCreator<
  GameStore,
  [],
  [],
  TransportSlice
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
> = (_set) => ({
  transportNetwork: { railroads: [], shippingLanes: [], capacity: 0 },
});
