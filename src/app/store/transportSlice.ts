import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
import { TransportNetwork } from "@/types/Transport";

export interface TransportSlice {
  transportNetwork: TransportNetwork;
  setTransportNetwork: (network: TransportNetwork) => void;

  // Player-chosen per-resource allocations for transport capacity per nation
  transportAllocationsByNation: Record<string, Record<string, number>>;
  setTransportAllocations: (nationId: string, allocations: Record<string, number>) => void;
}

export const createTransportSlice: StateCreator<GameState, [], [], TransportSlice> = (set, get) => {
  // Preserve railroadNetworks if it was already initialized by mapSlice
  const existingNetwork = get().transportNetwork;

  return {
    transportNetwork: {
      shippingLanes: [],
      capacity: 0,
      // Preserve railroadNetworks if it exists, otherwise it will be lazy-initialized
      railroadNetworks: existingNetwork?.railroadNetworks,
    },
    setTransportNetwork: (network: TransportNetwork) => set({ transportNetwork: network }),

    transportAllocationsByNation: {},
    setTransportAllocations: (nationId, allocations) => set((state) => ({
      transportAllocationsByNation: {
        ...(state.transportAllocationsByNation ?? {}),
        [nationId]: { ...allocations },
      }
    })),
  };
};