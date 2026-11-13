import { StateCreator } from 'zustand';
import { GameStore } from '../rootStore';

export interface OverlaySlice {
  // Warehouse modal controls
  isWarehouseOpen: boolean;
  openWarehouse: () => void;
  closeWarehouse: () => void;

  // Capital modal controls
  isCapitalOpen: boolean;
  openCapital: () => void;
  closeCapital: () => void;

  // Market dialog controls (FR-073)
  isMarketOpen: boolean;
  openMarket: () => void;
  closeMarket: () => void;

  // Diplomacy dialog controls (FR-177)
  isDiplomacyOpen: boolean;
  openDiplomacy: () => void;
  closeDiplomacy: () => void;

  // Accept Offer (FR-175): the proposals the player closed without an answer; they stay open in the game and
  // End Turn refuses them, but their dialog does not come back
  dismissedProposalIds: string[];
  dismissProposal: (proposalId: string) => void;

  // The game-over screen shows whenever the game is over, unless the player closed it (FR-076)
  isGameOverHidden: boolean;
  hideGameOver: () => void;
  showGameOver: () => void;

  // Transport Allocation modal controls (global access)
  isTransportAllocationOpen: boolean;
  openTransportAllocation: () => void;
  closeTransportAllocation: () => void;
}

export const createOverlaySlice: StateCreator<GameStore, [], [], OverlaySlice> = (set) => ({
  // Warehouse modal
  isWarehouseOpen: false,
  openWarehouse: () => set({ isWarehouseOpen: true }),
  closeWarehouse: () => set({ isWarehouseOpen: false }),

  // Capital modal
  isCapitalOpen: false,
  // A refusal from the map is stale here; only refusals of the dialog's own orders show in it (FR-055).
  openCapital: () => set({ isCapitalOpen: true, lastRejection: null }),
  closeCapital: () => set({ isCapitalOpen: false }),

  // Market dialog: same stale-refusal rule as the capital (FR-074, FR-055)
  isMarketOpen: false,
  openMarket: () => set({ isMarketOpen: true, lastRejection: null }),
  closeMarket: () => set({ isMarketOpen: false }),

  // Diplomacy dialog: same stale-refusal rule as the capital (FR-178, FR-055)
  isDiplomacyOpen: false,
  openDiplomacy: () => set({ isDiplomacyOpen: true, lastRejection: null }),
  closeDiplomacy: () => set({ isDiplomacyOpen: false }),

  dismissedProposalIds: [],
  dismissProposal: (proposalId) =>
    set((s) => (s.dismissedProposalIds.includes(proposalId) ? {} : { dismissedProposalIds: [...s.dismissedProposalIds, proposalId] })),

  isGameOverHidden: false,
  hideGameOver: () => set({ isGameOverHidden: true }),
  showGameOver: () => set({ isGameOverHidden: false }),

  // Transport Allocation modal
  isTransportAllocationOpen: false,
  openTransportAllocation: () => set({ isTransportAllocationOpen: true }),
  closeTransportAllocation: () => set({ isTransportAllocationOpen: false }),
});