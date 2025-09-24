import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
import { TransportNetwork } from "@/types/Transport";

export interface TransportSlice {
  transportNetwork: TransportNetwork;
  setTransportNetwork: (network: TransportNetwork) => void;
}

export const createTransportSlice: StateCreator<GameState, [], [], TransportSlice> = (set) => ({
  transportNetwork: { railroads: [], shippingLanes: [], capacity: 0 },
  setTransportNetwork: (network: TransportNetwork) => set({ transportNetwork: network }),
});
