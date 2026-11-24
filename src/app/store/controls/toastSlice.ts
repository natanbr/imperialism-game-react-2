import { StateCreator } from 'zustand';
import { GameStore } from '../rootStore';

/** "error": a refused order or a failure (the assertive live region); "info": anything else (the polite one). */
export type ToastTone = 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  text: string;
}

/** FR-569: at most this many toasts at once; a newer one pushes the oldest out. */
export const MAX_TOASTS = 4;

/**
 * FR-569: the short messages that slide in over the page (components/Toasts.tsx). View state only: never in a save,
 * never game state. The ids count up per store, so a repeated text is a new toast.
 */
export interface ToastSlice {
  toasts: Toast[];
  nextToastId: number;
  showToast: (text: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

export const createToastSlice: StateCreator<GameStore, [], [], ToastSlice> = (set) => ({
  toasts: [],
  nextToastId: 1,
  showToast: (text, tone = 'error') =>
    set((s) => ({ toasts: [...s.toasts, { id: s.nextToastId, tone, text }].slice(-MAX_TOASTS), nextToastId: s.nextToastId + 1 })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
});
