import { StateCreator } from "zustand";
import { GameState }s from "@/types/GameState";
import { ResourceType } from "@/types/Resource";

export interface ResourceAllocation {
  [key: string]: {
    amount: number;
    max: number;
  };
}

export interface ResourceAllocationSlice {
  resourceAllocations: ResourceAllocation;
  setResourceAllocation: (allocations: ResourceAllocation) => void;
  updateResourceAllocation: (
    resource: ResourceType,
    amount: number,
    max: number
  ) => void;
}

export const createResourceAllocationSlice: StateCreator<
  GameState,
  [],
  [],
  ResourceAllocationSlice
> = (set) => ({
  resourceAllocations: {} as ResourceAllocation,
  setResourceAllocation: (allocations) => {
    set({ resourceAllocations: allocations });
  },
  updateResourceAllocation: (resource, amount, max) => {
    set((state) => {
      const currentAllocations = { ...state.resourceAllocations };
      currentAllocations[resource] = { amount, max };
      return { resourceAllocations: currentAllocations };
    });
  },
});