import { StateCreator } from 'zustand';
import type { Order } from '@/engine';
import { GameStore } from '../rootStore';
import { isPlayersWorker } from './playersWorker';

/** FR-373: the map's status line; `id` is new for every line, so the same text twice shows (and is timed) again. */
export interface MapStatusLine {
  text: string;
  id: number;
}

/**
 * FR-383: an order of $1,000 or more waiting for the player's answer: the question, the price its Spend button names, the
 * order Spend sends, and for a map click the tile it selects after Spend (the civilian selection ends there, as after
 * any job ordered by a click).
 */
export interface PendingSpend {
  question: string;
  price: number;
  order: Order;
  selectTileId?: string;
}

export interface ControlsSlice {
  selectedWorkerId: string | undefined;
  /** Same rule as selectWorker: only the player's civilians (FR-108). */
  setSelectedWorkerId: (workerId: string | undefined) => void;
  isConstructionModalOpen: boolean;
  constructionModalTileId: string | null;
  constructionModalWorkerId: string | null;
  openConstructionModal: (tileId: string, workerId: string) => void;
  closeConstructionModal: () => void;
  /** FR-373, FR-374: a refusal (or a fallback move) from a map click, Tile Info or Construction Options; null when none. */
  mapStatus: MapStatusLine | null;
  showMapStatus: (text: string) => void;
  clearMapStatus: () => void;
  /** FR-383: the costly order the spend question waits on; null when none. */
  pendingSpend: PendingSpend | null;
  askSpend: (spend: PendingSpend) => void;
  closeSpend: () => void;
}

export const createControlsSlice: StateCreator<GameStore, [], [], ControlsSlice> = (set) => ({
  selectedWorkerId: undefined,
  setSelectedWorkerId: (workerId) =>
    set((s) => (workerId === undefined || isPlayersWorker(s, workerId) ? { selectedWorkerId: workerId } : {})),
  isConstructionModalOpen: false,
  constructionModalTileId: null,
  constructionModalWorkerId: null,
  openConstructionModal: (tileId, workerId) => set({
    isConstructionModalOpen: true,
    constructionModalTileId: tileId,
    constructionModalWorkerId: workerId,
  }),
  closeConstructionModal: () => set({
    isConstructionModalOpen: false,
    constructionModalTileId: null,
    constructionModalWorkerId: null,
  }),
  mapStatus: null,
  showMapStatus: (text) => set((s) => ({ mapStatus: { text, id: (s.mapStatus?.id ?? 0) + 1 } })),
  clearMapStatus: () => set((s) => (s.mapStatus ? { mapStatus: null } : {})),
  pendingSpend: null,
  askSpend: (spend) => set({ pendingSpend: spend }),
  closeSpend: () => set({ pendingSpend: null }),
});
