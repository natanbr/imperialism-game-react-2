import { StateCreator } from "zustand";
import { GameState } from "@/types/GameState";
import { Nation } from "@/types/Nation";
import { ResourceType } from "@/types/Resource";

export interface NationSlice {
  // Nation-level actions
  setNations: (nations: Nation[]) => void;
  // Directly set current capacity (admin/debug)
  setNationTransportCapacity: (nationId: string, capacity: number) => void;
  // Queue a capacity increase to apply next turn, consuming cost now
  purchaseTransportCapacityIncrease: (nationId: string, delta: number) => void;
}

export const createNationSlice: StateCreator<GameState, [], [], NationSlice> = (set) => ({
  setNations: (nations: Nation[]) => set({ nations }),

  setNationTransportCapacity: (nationId: string, capacity: number) =>
    set((state) => ({
      nations: state.nations.map((n) =>
        n.id === nationId
          ? { ...n, transportCapacity: Math.max(0, Math.floor(capacity)) }
          : n
      ),
    })),

  purchaseTransportCapacityIncrease: (nationId: string, delta: number) =>
    set((state) => {
      if (delta === 0) return {};
      const nation = state.nations.find((n) => n.id === nationId);
      if (!nation) return {};

      const unitCostCoal = 1;
      const unitCostIron = 1;

      const currentPending = Math.max(0, Math.floor(nation.transportCapacityPendingIncrease ?? 0));

      if (delta > 0) {
        const want = Math.floor(delta);
        const availableCoal = nation.warehouse[ResourceType.Coal] ?? 0;
        const availableIron = nation.warehouse[ResourceType.IronOre] ?? 0;

        const maxByCoal = Math.floor(availableCoal / unitCostCoal);
        const maxByIron = Math.floor(availableIron / unitCostIron);
        const canBuy = Math.max(0, Math.min(want, maxByCoal, maxByIron));
        if (canBuy <= 0) return {}; // insufficient resources

        const newWarehouse = { ...nation.warehouse };
        newWarehouse[ResourceType.Coal] = (newWarehouse[ResourceType.Coal] ?? 0) - canBuy * unitCostCoal;
        newWarehouse[ResourceType.IronOre] = (newWarehouse[ResourceType.IronOre] ?? 0) - canBuy * unitCostIron;

        return {
          nations: state.nations.map((n) =>
            n.id === nationId
              ? {
                  ...n,
                  transportCapacityPendingIncrease: currentPending + canBuy,
                  warehouse: newWarehouse,
                }
              : n
          ),
        };
      } else {
        // Refund when reducing the pending increase
        const wantReduce = Math.max(0, Math.floor(-delta));
        if (wantReduce <= 0) return {};
        const refund = Math.min(wantReduce, currentPending);
        if (refund <= 0) return {};

        const newWarehouse = { ...nation.warehouse };
        newWarehouse[ResourceType.Coal] = (newWarehouse[ResourceType.Coal] ?? 0) + refund * unitCostCoal;
        newWarehouse[ResourceType.IronOre] = (newWarehouse[ResourceType.IronOre] ?? 0) + refund * unitCostIron;

        return {
          nations: state.nations.map((n) =>
            n.id === nationId
              ? {
                  ...n,
                  transportCapacityPendingIncrease: currentPending - refund,
                  warehouse: newWarehouse,
                }
              : n
          ),
        };
      }
    }),
});
