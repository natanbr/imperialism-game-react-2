<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
// Empty createTransportSlice for Zustand store composition
export const createTransportSlice = () => ({});
import { TransportNetwork } from "@/types/Transport";

export interface TransportSlice {
  transportNetwork: TransportNetwork;
  // actions: buildRail, buildDepot, allocateTransportCapacity...
}
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
=======
import { TransportNetwork } from "@/types/Transport";
>>>>>>> b7a3834 (Apply patch /tmp/46f53035-1478-4341-ab41-5f71f2cb01d9.patch)
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
>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
