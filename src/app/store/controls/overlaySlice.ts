import { StateCreator } from 'zustand';
import { GameStore } from '../rootStore';
import type { BattleReport } from '@/types/Battle';
import type { CouncilMetEvent } from '@/engine';

/** The regiments the player ticked in one province's Army screen (FR-230): kept when the screen closes. */
export interface ArmySelection {
  provinceId: string;
  regimentIds: string[];
}

/** What the Attack screen shows and its Attack button orders (FR-230). */
export interface AttackPlan {
  fromProvinceId: string;
  toProvinceId: string;
  regimentIds: string[];
  /** Opened from the Army screen, which it replaces (FR-279): closing it brings that screen back. */
  fromArmyScreen?: boolean;
}

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

  // Deal Book dialog controls (FR-195): it only reads the last turn's events, so no refusal to clear
  isDealBookOpen: boolean;
  openDealBook: () => void;
  closeDealBook: () => void;

  // Diplomacy dialog controls (FR-177)
  isDiplomacyOpen: boolean;
  openDiplomacy: () => void;
  closeDiplomacy: () => void;

  // Accept Offer (FR-175): the proposals the player closed without an answer; they stay open in the game and
  // End Turn refuses them, but their dialog does not come back
  dismissedProposalIds: string[];
  dismissProposal: (proposalId: string) => void;

  // The Army screen (FR-211): the province whose army it shows, opened from our marker on the map (FR-210); the "March
  // to" entry it opens on, the attacked province when the Attack screen gives it back (FR-279), else null (the first)
  armyProvinceId: string | null;
  armyTargetId: string | null;
  openArmy: (provinceId: string, targetId?: string) => void;
  closeArmy: () => void;

  // The army selection (FR-230): the Army screen's ticks, kept when it closes, so a click on a bordering enemy province
  // opens the Attack screen with them; End Turn and a click elsewhere on the map drop it
  armySelection: ArmySelection | null;
  selectRegiments: (provinceId: string, regimentIds: string[]) => void;
  clearArmySelection: () => void;

  // The Attack screen (FR-230), opened from the Army screen (in its place, FR-279) or from the map
  attackPlan: AttackPlan | null;
  openAttack: (plan: AttackPlan) => void;
  closeAttack: () => void;

  // The Battle screen (FR-231, FR-232): the battle reports still to see, the first shown; End Turn queues the battles
  // the player fought, a news line one battle
  battleQueue: BattleReport[];
  showBattle: (report: BattleReport) => void;
  closeBattle: () => void;

  // The Council screen (FR-298, FR-299): the meeting it shows, or null. End Turn sets the meeting just held, so it opens by
  // itself once (after the Battle screens: it waits while `battleQueue` has one); a news line sets its meeting (FR-297)
  councilShown: CouncilMetEvent | null;
  showCouncil: (event: CouncilMetEvent) => void;
  closeCouncil: () => void;

  // The Armoury (FR-212), opened from the capital dialog
  isArmouryOpen: boolean;
  openArmoury: () => void;
  closeArmoury: () => void;

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

  isDealBookOpen: false,
  openDealBook: () => set({ isDealBookOpen: true }),
  closeDealBook: () => set({ isDealBookOpen: false }),

  // Diplomacy dialog: same stale-refusal rule as the capital (FR-178, FR-055)
  isDiplomacyOpen: false,
  openDiplomacy: () => set({ isDiplomacyOpen: true, lastRejection: null }),
  closeDiplomacy: () => set({ isDiplomacyOpen: false }),

  dismissedProposalIds: [],
  dismissProposal: (proposalId) =>
    set((s) => (s.dismissedProposalIds.includes(proposalId) ? {} : { dismissedProposalIds: [...s.dismissedProposalIds, proposalId] })),

  // Army screen and Armoury: same stale-refusal rule as the capital (FR-055)
  armyProvinceId: null,
  armyTargetId: null,
  openArmy: (provinceId, targetId) => set({ armyProvinceId: provinceId, armyTargetId: targetId ?? null, lastRejection: null }),
  closeArmy: () => set({ armyProvinceId: null, armyTargetId: null }),

  armySelection: null,
  selectRegiments: (provinceId, regimentIds) =>
    set({ armySelection: regimentIds.length > 0 ? { provinceId, regimentIds: [...regimentIds] } : null }),
  clearArmySelection: () => set({ armySelection: null }),

  // Same stale-refusal rule as the capital (FR-055). One dialog at a time (FR-279): the Attack screen closes the Army
  // screen, and one opened from it gives it back on close (Cancel, Escape, the backdrop, or after Attack) on the same
  // "March to" entry; the ticks are the selection, which the store keeps
  attackPlan: null,
  openAttack: (plan) => set({ attackPlan: plan, armyProvinceId: null, armyTargetId: null, lastRejection: null }),
  closeAttack: () =>
    set((s) =>
      s.attackPlan?.fromArmyScreen
        ? { attackPlan: null, armyProvinceId: s.attackPlan.fromProvinceId, armyTargetId: s.attackPlan.toProvinceId, lastRejection: null }
        : { attackPlan: null }
    ),

  battleQueue: [],
  showBattle: (report) => set({ battleQueue: [report] }),
  closeBattle: () => set((s) => ({ battleQueue: s.battleQueue.slice(1) })),

  councilShown: null,
  showCouncil: (event) => set({ councilShown: event }),
  closeCouncil: () => set({ councilShown: null }),

  isArmouryOpen: false,
  openArmoury: () => set({ isArmouryOpen: true, lastRejection: null }),
  closeArmoury: () => set({ isArmouryOpen: false }),

  isGameOverHidden: false,
  hideGameOver: () => set({ isGameOverHidden: true }),
  showGameOver: () => set({ isGameOverHidden: false }),

  // Transport Allocation modal
  isTransportAllocationOpen: false,
  openTransportAllocation: () => set({ isTransportAllocationOpen: true }),
  closeTransportAllocation: () => set({ isTransportAllocationOpen: false }),
});